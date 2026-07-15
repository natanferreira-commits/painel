// Cliente da API do TrackGram (funil: entradas, cadastros, FTD, depósitos).
// Uma chave só cobre os canais autorizados da conta.
// Base: https://data.trackgram.com.br · só GET · datas ISO (YYYY-MM-DD).

const BASE = "https://data.trackgram.com.br";

export function tgKey(): string | null {
  return process.env.TRACKGRAM_API_KEY || null;
}

export async function tgGet(path: string): Promise<{ status: number; body: unknown }> {
  const key = tgKey();
  if (!key) throw new Error("TRACKGRAM_API_KEY não configurada");
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

// ---- Canais ----
export type TgChannel = {
  id: number;
  channel_name: string;
  telegram_channel_id: string; // MESMO id que usamos em affiliate_channels
  username: string | null;
};

export async function tgChannels(): Promise<TgChannel[]> {
  const r = await tgGet("/v1/channels");
  if (r.status !== 200) throw new Error(`TrackGram /v1/channels: HTTP ${r.status}`);
  return (r.body as { channels?: TgChannel[] } | null)?.channels ?? [];
}

// ---- Métricas diárias (agregadas nos canais pedidos) ----
// Atenção: a resposta traz "date" como "DD/MM" (sem ano) — o ano vem da janela.
export type TgDailyRow = {
  date: string;
  page_views: number;
  clicks: number;
  entries: number;
  registrations: number;
  ftds: number;
  redeposits: number;
};

export async function tgDaily(
  from: string,
  to: string,
  channelIds: number[],
): Promise<TgDailyRow[]> {
  const qs = new URLSearchParams({ from, to });
  if (channelIds.length) qs.set("channel_ids", channelIds.join(","));
  const r = await tgGet(`/v1/metrics/daily?${qs.toString()}`);
  if (r.status !== 200) throw new Error(`TrackGram /v1/metrics/daily: HTTP ${r.status}`);
  return (r.body as { daily?: TgDailyRow[] } | null)?.daily ?? [];
}

// ---- Métricas agregadas do período (tem os VALORES: ftd_amount, deposit_amount) ----
export type TgMetrics = {
  page_views: number;
  clicks: number;
  entries: number;
  exits: number;
  registrations: number;
  ftd_count: number;
  ftd_amount: number;
  deposit_count: number;
  deposit_amount: number;
  currency: string;
  authorized_channels: number[];
};

export async function tgMetrics(
  from: string,
  to: string,
  channelIds: number[],
): Promise<TgMetrics> {
  const qs = new URLSearchParams({ from, to });
  if (channelIds.length) qs.set("channel_ids", channelIds.join(","));
  const r = await tgGet(`/v1/metrics?${qs.toString()}`);
  if (r.status !== 200) throw new Error(`TrackGram /v1/metrics: HTTP ${r.status}`);
  return r.body as TgMetrics;
}

// "DD/MM" + janela -> "YYYY-MM-DD". A API não devolve o ano na série diária.
export function resolveYear(ddmm: string, from: string, to: string): string | null {
  const m = ddmm.match(/^(\d{2})\/(\d{2})$/);
  if (!m) return null;
  const [, dd, mm] = m;
  const yFrom = Number(from.slice(0, 4));
  const yTo = Number(to.slice(0, 4));
  for (const y of yFrom === yTo ? [yFrom] : [yFrom, yTo]) {
    const iso = `${y}-${mm}-${dd}`;
    if (iso >= from && iso <= to) return iso;
  }
  return null;
}
