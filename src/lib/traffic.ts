import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// ---- Planilha publicada (CSV) -> gasto por dia ----
// Layout do time: cabeçalho repetido por mês, linha de total do mês no meio,
// valores em "R$ 1.700,75". A gente só confia na coluna GASTO (a de leads
// é preenchida na mão e atrasa — leads vêm do TrackGram).

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (q && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (c === "," && !q) {
      row.push(cur);
      cur = "";
    } else if (c === "\n" && !q) {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c === "\r") {
      // ignora
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

function moneyBR(s: string | undefined): number | null {
  if (!s) return null;
  const v = s
    .replace(/R\$/g, "")
    .replace(/\s/g, "")
    .replace(/\./g, "") // milhar
    .replace(",", "."); // decimal
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
}

const isDateBR = (s: string | undefined) => /^\d{2}\/\d{2}\/\d{4}$/.test((s ?? "").trim());

// "14/07/2026" -> "2026-07-14"
function toISO(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.trim().split("/");
  return `${y}-${m}-${d}`;
}

// Lê a planilha publicada e devolve gasto por data ISO.
export async function fetchSheetGasto(url: string): Promise<Map<string, number>> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`planilha: HTTP ${res.status}`);
  const text = await res.text();
  const out = new Map<string, number>();
  for (const r of parseCSV(text)) {
    if (!isDateBR(r[0])) continue; // pula cabeçalho, total do mês, TOTAL
    const gasto = moneyBR(r[1]);
    if (gasto !== null) out.set(toISO(r[0]), gasto);
  }
  return out;
}

// ---- Leitura do snapshot ----
export type TrafficDay = {
  date: string;
  gasto: number | null;
  leads: number | null;
  registrations: number | null;
  ftds: number | null;
};

export type TrafficSummary = {
  gasto: number;
  leads: number;
  custoLead: number | null;
  registrations: number;
  ftds: number;
  daily: TrafficDay[];
};

type Row = {
  date: string;
  gasto: string | number | null;
  leads: number | null;
  registrations: number | null;
  ftds: number | null;
};

export async function getTrafficSummary(opts: {
  affiliateIds?: number[];
  sinceDays: number;
}): Promise<TrafficSummary> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - opts.sinceDays * 86_400_000)
    .toISOString()
    .slice(0, 10);

  let q = supabase
    .from("traffic_daily")
    .select("date,gasto,leads,registrations,ftds")
    .gte("date", since)
    .order("date", { ascending: true });
  if (opts.affiliateIds?.length) q = q.in("affiliate_id", opts.affiliateIds);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  // soma por dia (pode ter vários afiliados no mesmo dia)
  const byDate = new Map<string, TrafficDay>();
  for (const r of ((data as Row[] | null) ?? [])) {
    const cur = byDate.get(r.date) ?? {
      date: r.date,
      gasto: 0,
      leads: 0,
      registrations: 0,
      ftds: 0,
    };
    cur.gasto = (cur.gasto ?? 0) + Number(r.gasto ?? 0);
    cur.leads = (cur.leads ?? 0) + (r.leads ?? 0);
    cur.registrations = (cur.registrations ?? 0) + (r.registrations ?? 0);
    cur.ftds = (cur.ftds ?? 0) + (r.ftds ?? 0);
    byDate.set(r.date, cur);
  }
  const daily = [...byDate.values()];
  const gasto = daily.reduce((s, d) => s + (d.gasto ?? 0), 0);
  const leads = daily.reduce((s, d) => s + (d.leads ?? 0), 0);
  const registrations = daily.reduce((s, d) => s + (d.registrations ?? 0), 0);
  const ftds = daily.reduce((s, d) => s + (d.ftds ?? 0), 0);

  return {
    gasto,
    leads,
    custoLead: leads > 0 ? Math.round((gasto / leads) * 100) / 100 : null,
    registrations,
    ftds,
    daily,
  };
}

export async function getLastTrafficSync(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("traffic_daily")
    .select("captured_at")
    .order("captured_at", { ascending: false })
    .limit(1);
  return (data as { captured_at: string }[] | null)?.[0]?.captured_at ?? null;
}
