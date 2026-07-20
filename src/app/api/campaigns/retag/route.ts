import { NextRequest, NextResponse } from "next/server";
import { getAffiliatesWithSendpulse } from "@/lib/affiliates";
import {
  spMainBot,
  spTags,
  spContactsByTag,
  spSetTag,
  spTriggersDeTag,
  type SpCreds,
} from "@/lib/sendpulse";

export const runtime = "nodejs";
export const maxDuration = 60;

const DEADLINE_MS = 45_000;

// Cria um público segmentado: pega todas as tags que casam com um termo e
// atribui uma tag nova a todo mundo que tem qualquer uma delas.
//
//   /api/campaigns/retag?affiliate=<id>&match=betgo&tag=Reengajamento Betgo
//
// PRÉVIA por padrão (não escreve nada). Só grava com &apply=1 — escrita em
// produção não pode acontecer por acidente.
// &limit=N restringe a N contatos (pra testar pequeno antes de rodar tudo).
async function run(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const affiliateId = q.get("affiliate");
  const match = (q.get("match") ?? "").trim();
  const novaTag = (q.get("tag") ?? "").trim();
  const apply = q.get("apply") === "1";
  const limit = Number(q.get("limit") ?? 0) || 0;

  if (!affiliateId || !match || !novaTag) {
    return NextResponse.json(
      {
        ok: false,
        error: "faltou parâmetro",
        uso: "/api/campaigns/retag?affiliate=<id>&match=betgo&tag=Reengajamento Betgo[&apply=1][&limit=N]",
      },
      { status: 400 },
    );
  }

  const afs = await getAffiliatesWithSendpulse();
  const af = afs.find((a) => String(a.id) === affiliateId);
  if (!af) {
    return NextResponse.json(
      { ok: false, error: "afiliado sem credencial do SendPulse" },
      { status: 404 },
    );
  }

  const creds: SpCreds = { clientId: af.clientId, clientSecret: af.clientSecret };
  const bot = await spMainBot(creds);
  if (!bot) {
    return NextResponse.json(
      { ok: false, error: "nenhum bot principal de Telegram encontrado" },
      { status: 404 },
    );
  }

  // Segurança: se algum fluxo dispara por tag, marcar em massa mandaria
  // mensagem pra todo mundo. Nesse caso não escrevemos sem revisão.
  const gatilhos = await spTriggersDeTag(creds, bot.id);

  const tags = await spTags(creds, bot.id);
  const alvo = tags.filter((t) => t.name.toLowerCase().includes(match.toLowerCase()));

  if (alvo.length === 0) {
    return NextResponse.json({
      ok: true,
      afiliado: af.nome,
      bot: bot.name,
      match,
      tags_encontradas: [],
      aviso: `nenhuma tag contém "${match}"`,
    });
  }

  // Junta os contatos de todas as tags casadas, sem repetir. Em paralelo —
  // são leituras independentes, não faz sentido enfileirar.
  const listas = await Promise.all(
    alvo.map(async (t) => ({
      tag: t.name,
      count: t.count,
      lista: await spContactsByTag(creds, bot.id, t.name),
    })),
  );
  const contatos = new Map<string, string[]>(); // id -> tags do contato
  const porTag: { tag: string; count: number; contatos: number }[] = [];
  for (const { tag, count, lista } of listas) {
    for (const c of lista) if (!contatos.has(c.id)) contatos.set(c.id, c.tags);
    porTag.push({ tag, count, contatos: lista.length });
  }

  // Quem já tem a tag nova não precisa ser marcado de novo.
  const jaTem = [...contatos.entries()].filter(([, tags]) =>
    tags.some((x) => x.toLowerCase() === novaTag.toLowerCase()),
  ).length;
  let pendentes = [...contatos.entries()]
    .filter(([, tags]) => !tags.some((x) => x.toLowerCase() === novaTag.toLowerCase()))
    .map(([id]) => id);
  if (limit > 0) pendentes = pendentes.slice(0, limit);

  const resumo = {
    ok: true,
    afiliado: af.nome,
    bot: bot.name,
    match,
    tag_nova: novaTag,
    tags_encontradas: porTag.sort((a, b) => b.count - a.count),
    publico_unico: contatos.size,
    ja_tinham_a_tag: jaTem,
    a_marcar: pendentes.length,
    fluxos_que_disparam_por_tag: gatilhos,
  };

  if (!apply) {
    return NextResponse.json({
      ...resumo,
      modo: "PRÉVIA — nada foi gravado",
      para_aplicar: `adicione &apply=1 na URL${limit ? "" : " (ou &limit=5 pra testar pequeno)"}`,
    });
  }

  if (gatilhos.length > 0) {
    return NextResponse.json(
      {
        ...resumo,
        ok: false,
        error:
          "Há fluxo(s) que disparam por tag. Marcar em massa mandaria mensagem pra todo mundo — revise antes.",
      },
      { status: 409 },
    );
  }

  // Escreve em paralelo (teto baixo pra não irritar a API), com prazo interno.
  // setTag é idempotente: rodar de novo continua de onde parou.
  const inicio = Date.now();
  let marcados = 0;
  let falhas = 0;
  let inativos = 0;
  let erroExemplo: string | null = null;
  let cursor = 0;

  async function worker() {
    while (cursor < pendentes.length && Date.now() - inicio < DEADLINE_MS) {
      const id = pendentes[cursor++];
      const r = await spSetTag(creds, id, [novaTag]);
      if (r.ok) marcados++;
      else {
        falhas++;
        // Contato inativo (bloqueou o bot / saiu) nunca vai aceitar tag —
        // e também não receberia o disparo. Não é erro nosso.
        if (/not_active/i.test(r.erro ?? "")) inativos++;
        else if (!erroExemplo) erroExemplo = r.erro ?? null;
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(6, pendentes.length) }, worker),
  );
  const restantes = Math.max(0, pendentes.length - cursor);

  return NextResponse.json({
    ...resumo,
    modo: "APLICADO",
    marcados,
    falhas,
    inativos,
    erro_exemplo: erroExemplo,
    restantes,
    dica:
      restantes > 0
        ? "prazo atingido — rode de novo pra continuar"
        : inativos > 0
          ? `fim — ${inativos} contatos inativos não aceitam tag (e também não receberiam o disparo)`
          : "fim",
  });
}

export async function GET(req: NextRequest) {
  return run(req);
}
export async function POST(req: NextRequest) {
  return run(req);
}
