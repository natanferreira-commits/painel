import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Diagnóstico: o que cada afiliado tem ligado e se chegou dado.
// É isso que mostra por que um card fica vazio pra um afiliado e não pra outro.
async function cobertura(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const [affs, links, traffic, camps] = await Promise.all([
    supabase
      .from("affiliates")
      .select("id,nome,sendpulse_client_id,traffic_sheet_url,ativo")
      .order("nome"),
    supabase.from("affiliate_channels").select("affiliate_id"),
    supabase.from("traffic_daily").select("affiliate_id,leads,gasto"),
    supabase.from("campaign_flows").select("affiliate_id,bot_name"),
  ]);

  type A = {
    id: number;
    nome: string;
    sendpulse_client_id: string | null;
    traffic_sheet_url: string | null;
    ativo: boolean | null;
  };
  const conta = (rows: { affiliate_id: number }[] | null, id: number) =>
    (rows ?? []).filter((r) => r.affiliate_id === id).length;

  const campRows =
    (camps.data as { affiliate_id: number; bot_name: string | null }[] | null) ?? [];

  return ((affs.data as A[] | null) ?? []).map((a) => {
    const t = ((traffic.data as { affiliate_id: number; leads: number | null; gasto: string | number | null }[] | null) ?? [])
      .filter((r) => r.affiliate_id === a.id);
    // quantas campanhas por bot — é isso que revela o bot de suporte entrando
    const porBot: Record<string, number> = {};
    for (const r of campRows.filter((r) => r.affiliate_id === a.id)) {
      const b = r.bot_name ?? "(sem bot)";
      porBot[b] = (porBot[b] ?? 0) + 1;
    }
    return {
      afiliado: a.nome,
      ativo: a.ativo ?? true,
      canais_vinculados: conta(links.data as { affiliate_id: number }[] | null, a.id),
      sendpulse_conectado: Boolean(a.sendpulse_client_id),
      planilha_conectada: Boolean(a.traffic_sheet_url),
      campanhas: conta(camps.data as { affiliate_id: number }[] | null, a.id),
      campanhas_por_bot: porBot,
      trafego_dias: t.length,
      trafego_leads: t.reduce((s, r) => s + (r.leads ?? 0), 0),
      trafego_gasto: Math.round(t.reduce((s, r) => s + Number(r.gasto ?? 0), 0) * 100) / 100,
    };
  });
}

// Saúde da ingestão/categorização — só leitura, sem efeito colateral.
// Fica fora do login (rota /api) pra dar pra checar rápido "está entrando post?".
export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    const [
      postsTotal,
      uncat,
      lastPostRes,
      lastCatRes,
      affRes,
      linkRes,
      chSample,
      whTotal,
      whLast,
    ] = await Promise.all([
      supabase.from("posts").select("*", { count: "exact", head: true }),
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .is("categorized_at", null),
      supabase
        .from("posts")
        .select("posted_at")
        .order("posted_at", { ascending: false })
        .limit(1),
      supabase
        .from("posts")
        .select("categorized_at")
        .not("categorized_at", "is", null)
        .order("categorized_at", { ascending: false })
        .limit(1),
      supabase.from("affiliates").select("*", { count: "exact", head: true }),
      supabase
        .from("affiliate_channels")
        .select("*", { count: "exact", head: true }),
      supabase.from("posts").select("channel_id,channel_title").limit(5000),
      supabase.from("webhook_events").select("*", { count: "exact", head: true }),
      supabase
        .from("webhook_events")
        .select("received_at")
        .order("received_at", { ascending: false })
        .limit(1),
    ]);

    // Contagem por canal (agregada em memória a partir da amostra).
    const chMap = new Map<string, { title: string; count: number }>();
    for (const r of (chSample.data as
      | { channel_id: string; channel_title: string | null }[]
      | null) ?? []) {
      const cur = chMap.get(r.channel_id) ?? {
        title: r.channel_title ?? r.channel_id,
        count: 0,
      };
      cur.count++;
      chMap.set(r.channel_id, cur);
    }
    const channels = [...chMap.entries()]
      .map(([id, v]) => ({ id, title: v.title, posts: v.count }))
      .sort((a, b) => b.posts - a.posts);

    const err =
      postsTotal.error ||
      uncat.error ||
      affRes.error ||
      linkRes.error ||
      chSample.error;
    if (err) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      posts: {
        total: postsTotal.count ?? 0,
        sem_categoria: uncat.count ?? 0,
        ultimo_recebido:
          (lastPostRes.data as { posted_at: string }[] | null)?.[0]
            ?.posted_at ?? null,
        ultimo_categorizado:
          (lastCatRes.data as { categorized_at: string }[] | null)?.[0]
            ?.categorized_at ?? null,
      },
      afiliados: {
        cadastrados: affRes.count ?? 0,
        canais_vinculados: linkRes.count ?? 0,
      },
      sendpulse: {
        eventos_recebidos: whTotal.count ?? 0,
        ultimo_evento:
          (whLast.data as { received_at: string }[] | null)?.[0]?.received_at ??
          null,
      },
      cobertura_por_afiliado: await cobertura(supabase),
      canais_detectados: channels.length,
      canais: channels,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
