import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAffiliates } from "@/lib/affiliates";
import { tgChannels, tgDaily, resolveYear, tgKey } from "@/lib/trackgram";
import { fetchSheetGasto } from "@/lib/traffic";

export const runtime = "nodejs";
export const maxDuration = 60;

const JANELA_DIAS = 180;

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

// Cruza: leads (TrackGram, por canal) + gasto (planilha publicada) por dia.
async function run() {
  const supabase = getSupabaseAdmin();
  const from = isoDaysAgo(JANELA_DIAS);
  const to = new Date().toISOString().slice(0, 10);

  const affiliates = await getAffiliates();

  // canal do Telegram -> id do canal no TrackGram (de-para automático)
  const tgByTelegramId = new Map<string, number>();
  if (tgKey()) {
    try {
      for (const c of await tgChannels()) {
        tgByTelegramId.set(c.telegram_channel_id, c.id);
      }
    } catch {
      // segue sem TrackGram; ainda dá pra gravar o gasto
    }
  }

  const results: {
    afiliado: string;
    dias?: number;
    leads?: number;
    gasto?: number;
    erro?: string;
  }[] = [];

  for (const a of affiliates) {
    try {
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
          const iso = resolveYear(d.date, from, to);
          if (!iso) continue;
          porDia.set(iso, {
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
      if (a.trafficSheetUrl) {
        gastoPorDia = await fetchSheetGasto(a.trafficSheetUrl);
      }

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

      await supabase
        .from("traffic_daily")
        .delete()
        .eq("affiliate_id", a.id)
        .gte("date", from);

      if (rows.length) {
        const { error } = await supabase.from("traffic_daily").insert(rows);
        if (error) throw new Error(error.message);
      }

      results.push({
        afiliado: a.nome,
        dias: rows.length,
        leads: rows.reduce((s, r) => s + (r.leads ?? 0), 0),
        gasto: Math.round(rows.reduce((s, r) => s + (r.gasto ?? 0), 0) * 100) / 100,
      });
    } catch (e) {
      results.push({
        afiliado: a.nome,
        erro: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json({ ok: true, janela: { from, to }, results });
}

export async function POST() {
  return run();
}
export async function GET() {
  return run();
}
