import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAffiliates, type Affiliate } from "@/lib/affiliates";
import { tgChannels, tgDaily, tgKey } from "@/lib/trackgram";
import { fetchSheetGasto } from "@/lib/traffic";

export const runtime = "nodejs";
export const maxDuration = 60;

const JANELA_DIAS = 180;
// Para de pegar afiliado novo aos 40s e devolve o que deu — a Vercel corta em
// 60s (504). Rodar de novo continua de onde parou.
const DEADLINE_MS = 40_000;

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

type Resultado = {
  afiliado: string;
  dias?: number;
  leads?: number;
  gasto?: number;
  pulado?: string;
  erro?: string;
};

async function sincronizadoHoje(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  affiliateId: number,
): Promise<boolean> {
  const hoje = new Date().toISOString().slice(0, 10);
  const { count } = await supabase
    .from("traffic_daily")
    .select("*", { count: "exact", head: true })
    .eq("affiliate_id", affiliateId)
    .gte("captured_at", hoje);
  return (count ?? 0) > 0;
}

async function syncOne(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  a: Affiliate,
  tgByTelegramId: Map<string, number>,
  from: string,
  to: string,
): Promise<Resultado> {
  const tgIds = a.channels
    .map((c) => tgByTelegramId.get(c.id))
    .filter((v): v is number => typeof v === "number");

  // leads (TrackGram)
  const porDia = new Map<
    string,
    { leads: number; page_views: number; clicks: number; registrations: number; ftds: number }
  >();
  if (tgIds.length) {
    for (const d of await tgDaily(from, to, tgIds)) {
      porDia.set(d.date, {
        leads: d.entries ?? 0,
        page_views: d.page_views ?? 0,
        clicks: d.clicks ?? 0,
        registrations: d.registrations ?? 0,
        ftds: d.ftds ?? 0,
      });
    }
  }

  // gasto (planilha)
  let gastoPorDia = new Map<string, number>();
  if (a.trafficSheetUrl) gastoPorDia = await fetchSheetGasto(a.trafficSheetUrl);

  const datas = new Set<string>([...porDia.keys(), ...gastoPorDia.keys()]);
  const now = new Date().toISOString();
  const rows = [...datas]
    .filter((d) => d >= from && d <= to)
    .map((date) => {
      const m = porDia.get(date);
      return {
        affiliate_id: a.id,
        date,
        gasto: gastoPorDia.get(date) ?? null,
        leads: m?.leads ?? null,
        page_views: m?.page_views ?? null,
        clicks: m?.clicks ?? null,
        registrations: m?.registrations ?? null,
        ftds: m?.ftds ?? null,
        captured_at: now,
      };
    });

  await supabase.from("traffic_daily").delete().eq("affiliate_id", a.id).gte("date", from);
  if (rows.length) {
    const { error } = await supabase.from("traffic_daily").insert(rows);
    if (error) throw new Error(error.message);
  }

  return {
    afiliado: a.nome,
    dias: rows.length,
    leads: rows.reduce((s, r) => s + (r.leads ?? 0), 0),
    gasto: Math.round(rows.reduce((s, r) => s + (r.gasto ?? 0), 0) * 100) / 100,
  };
}

// ?affiliate=<id> sincroniza só aquele (sempre).
// Sem parâmetro: percorre todos, pulando quem já foi hoje, até o prazo.
async function run(req: NextRequest) {
  const supabase = getSupabaseAdmin();
  const alvoId = req.nextUrl.searchParams.get("affiliate");
  const force = req.nextUrl.searchParams.get("force") === "1";
  const started = Date.now();

  const from = isoDaysAgo(JANELA_DIAS);
  const to = isoDaysAgo(0);

  const tgByTelegramId = new Map<string, number>();
  if (tgKey()) {
    try {
      for (const c of await tgChannels()) tgByTelegramId.set(c.telegram_channel_id, c.id);
    } catch {
      // segue sem TrackGram; ainda dá pra gravar o gasto
    }
  }

  const todos = await getAffiliates();
  const alvos = alvoId ? todos.filter((a) => String(a.id) === alvoId) : todos;

  const results: Resultado[] = [];
  let restantes = 0;

  for (const a of alvos) {
    if (!alvoId && Date.now() - started > DEADLINE_MS) {
      restantes++;
      continue;
    }
    try {
      if (!alvoId && !force && (await sincronizadoHoje(supabase, a.id))) {
        results.push({ afiliado: a.nome, pulado: "já sincronizado hoje" });
        continue;
      }
      results.push(await syncOne(supabase, a, tgByTelegramId, from, to));
    } catch (e) {
      results.push({ afiliado: a.nome, erro: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({
    ok: true,
    janela: { from, to },
    results,
    restantes,
    dica: restantes > 0 ? "prazo atingido — rode de novo pra continuar" : "fim",
  });
}

export async function POST(req: NextRequest) {
  return run(req);
}
export async function GET(req: NextRequest) {
  return run(req);
}
