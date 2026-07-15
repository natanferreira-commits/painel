// Cliente da API do TrackGram (funil: entradas, cadastros, FTD, depósitos).
// Uma chave só cobre os canais autorizados da conta.
// Base: https://data.trackgram.com.br · só GET · datas ISO (YYYY-MM-DD).

const BASE = "https://data.trackgram.com.br";

export function tgKey(): string | null {
  return process.env.TRACKGRAM_API_KEY || null;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// A API deles dá 500 esporádico sob carga (a mesma chamada que falha volta 200
// segundos depois) e 429 no rate limit. Então: repete em 5xx/429, com backoff.
async function fetchComRetry(url: string, key: string, tentativas = 3): Promise<Response> {
  let ultima: Response | null = null;
  for (let i = 0; i < tentativas; i++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
    if (res.status < 500 && res.status !== 429) return res;
    ultima = res;
    if (i === tentativas - 1) break;
    const retryAfter = Number(res.headers.get("retry-after") ?? 0);
    await espera(retryAfter > 0 ? retryAfter * 1000 : 700 * Math.pow(3, i));
  }
  return ultima as Response;
}

export async function tgGet(path: string): Promise<{ status: number; body: unknown }> {
  const key = tgKey();
  if (!key) throw new Error("TRACKGRAM_API_KEY não configurada");
  const res = await fetchComRetry(`${BASE}${path}`, key);
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
// A API devolve "date" como "DD/MM" (sem ano) e dá 500 em janela longa
// (testado: 90 dias OK, 180 dias quebra em canal de volume alto). Então a
// gente quebra em pedaços e resolve o ano DENTRO de cada pedaço.
export type TgDailyRow = {
  date: string; // ISO YYYY-MM-DD (já resolvido)
  page_views: number;
  clicks: number;
  entries: number;
  registrations: number;
  ftds: number;
  redeposits: number;
};

type TgDailyRaw = Omit<TgDailyRow, "date"> & { date: string };

// Testado canal a canal: 90d e 45d dão 500 nos canais de volume alto
// (Mateus/ch60 só aguenta 30). 30 dias passa em todos.
const MAX_DIAS_POR_CHAMADA = 30;

function chunkRanges(from: string, to: string, maxDays: number): [string, string][] {
  const out: [string, string][] = [];
  let start = from;
  while (start <= to) {
    const s = new Date(`${start}T00:00:00Z`).getTime();
    const tentativo = new Date(s + (maxDays - 1) * 86_400_000).toISOString().slice(0, 10);
    const end = tentativo > to ? to : tentativo;
    out.push([start, end]);
    start = new Date(new Date(`${end}T00:00:00Z`).getTime() + 86_400_000)
      .toISOString()
      .slice(0, 10);
  }
  return out;
}

export async function tgDaily(
  from: string,
  to: string,
  channelIds: number[],
): Promise<TgDailyRow[]> {
  const out: TgDailyRow[] = [];
  for (const [f, t] of chunkRanges(from, to, MAX_DIAS_POR_CHAMADA)) {
    const qs = new URLSearchParams({ from: f, to: t });
    if (channelIds.length) qs.set("channel_ids", channelIds.join(","));
    const r = await tgGet(`/v1/metrics/daily?${qs.toString()}`);
    if (r.status !== 200) {
      throw new Error(`TrackGram /v1/metrics/daily (${f}..${t}): HTTP ${r.status}`);
    }
    for (const d of (r.body as { daily?: TgDailyRaw[] } | null)?.daily ?? []) {
      const iso = resolveYear(d.date, f, t);
      if (!iso) continue;
      out.push({ ...d, date: iso });
    }
  }
  return out;
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
