// Cliente da API REST do SendPulse (chatbots). Credenciais POR CONTA (cada
// afiliado tem a sua) — passadas em cada chamada.

const BASE = "https://api.sendpulse.com";

export type SpCreds = { clientId: string; clientSecret: string };

// Cache de token por client_id.
const tokenCache = new Map<string, { token: string; exp: number }>();

// Credenciais da env (legado / conta padrão, usado pela sondagem).
export function envCreds(): SpCreds | null {
  const clientId = process.env.SENDPULSE_CLIENT_ID;
  const clientSecret = process.env.SENDPULSE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export async function spToken(creds: SpCreds): Promise<string> {
  const cached = tokenCache.get(creds.clientId);
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;

  const res = await fetch(`${BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !json.access_token) {
    throw new Error(`auth SendPulse falhou (${res.status})`);
  }
  tokenCache.set(creds.clientId, {
    token: json.access_token,
    exp: Date.now() + (json.expires_in ?? 3600) * 1000,
  });
  return json.access_token;
}

export async function spGet(
  path: string,
  creds: SpCreds,
): Promise<{ status: number; body: unknown }> {
  const token = await spToken(creds);
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    body = await res.text();
  }
  return { status: res.status, body };
}

// ---- Fluxos (campanhas) de chatbot ----
export type SpFlow = {
  id: string;
  name: string;
  status: number;
  folderId: string | null;
  createdAt: string;
  botId: string;
  botName: string;
  entryTag: string | null;
  entered: number | null;
};

type BotRow = { id: string; name?: string; channel_data?: { name?: string } };
type FlowRow = {
  id: string;
  name: string;
  status: number;
  folder_id: string | null;
  created_at: string;
};
type TagRow = { name: string; count: number };
type Operator = { start_item?: boolean; properties?: { body?: string } };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function entryTagOf(detailBody: unknown): string | null {
  // resposta = { data: fluxo }, e os blocos ficam em fluxo.data.operators.
  const ops = (
    detailBody as { data?: { data?: { operators?: Operator[] } } } | null
  )?.data?.data?.operators;
  if (!Array.isArray(ops)) return null;
  const start = ops.find((o) => o?.start_item) ?? ops[0];
  const body = start?.properties?.body;
  if (typeof body !== "string" || !body.includes("set_tags")) return null;
  const m = body.match(/<b>(.*?)<\/b>/i);
  return m ? m[1].trim() : null;
}

async function pool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// Puxa os fluxos dos bots de Telegram de uma conta + nº de entrada (via tag).
export async function getSendpulseFlows(creds: SpCreds): Promise<SpFlow[]> {
  const botsRes = await spGet("/telegram/bots", creds);
  const bots = (botsRes.body as { data?: BotRow[] } | null)?.data ?? [];

  const out: SpFlow[] = [];
  for (const b of bots) {
    const botName = b.channel_data?.name ?? b.name ?? b.id;
    const [flowsRes, tagsRes] = await Promise.all([
      spGet(`/telegram/flows?bot_id=${b.id}`, creds),
      spGet(`/telegram/tags?bot_id=${b.id}`, creds),
    ]);
    const flows = (flowsRes.body as { data?: FlowRow[] } | null)?.data ?? [];
    const tags = (tagsRes.body as { data?: TagRow[] } | null)?.data ?? [];
    const tagCount = new Map(tags.map((t) => [norm(t.name), t.count]));

    const enriched = await pool(flows, 8, async (f) => {
      const detail = await spGet(`/telegram/flows/get?bot_id=${b.id}&flow_id=${f.id}`, creds);
      const entryTag = entryTagOf(detail.body);
      const entered = entryTag ? tagCount.get(norm(entryTag)) ?? null : null;
      return { f, entryTag, entered };
    });

    for (const { f, entryTag, entered } of enriched) {
      out.push({
        id: f.id,
        name: f.name,
        status: f.status,
        folderId: f.folder_id,
        createdAt: f.created_at,
        botId: b.id,
        botName,
        entryTag,
        entered,
      });
    }
  }
  return out;
}
