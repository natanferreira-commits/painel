// Cliente da API REST do SendPulse (chatbots). Diferente do webhook: aqui a
// gente CONSULTA (lista fluxos, conta contatos por tag, etc.).
// Credenciais por conta (cada afiliado tem a sua) — via env por enquanto.

const BASE = "https://api.sendpulse.com";

let cached: { token: string; exp: number } | null = null;

export async function spToken(): Promise<string> {
  const id = process.env.SENDPULSE_CLIENT_ID;
  const secret = process.env.SENDPULSE_CLIENT_SECRET;
  if (!id || !secret) {
    throw new Error("SENDPULSE_CLIENT_ID / SENDPULSE_CLIENT_SECRET não configurados");
  }
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;

  const res = await fetch(`${BASE}/oauth/access_token`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: id,
      client_secret: secret,
    }),
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!res.ok || !json.access_token) {
    throw new Error(`auth SendPulse falhou (${res.status}): ${JSON.stringify(json)}`);
  }
  cached = {
    token: json.access_token,
    exp: Date.now() + (json.expires_in ?? 3600) * 1000,
  };
  return cached.token;
}

// GET genérico na API. Retorna status + corpo cru (pra sondagem/discovery).
export async function spGet(
  path: string,
): Promise<{ status: number; body: unknown }> {
  const token = await spToken();
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
  entryTag: string | null; // tag que o fluxo cola na entrada
  entered: number | null; // pessoas que iniciaram = count dessa tag
};

type BotRow = {
  id: string;
  name?: string;
  channel_data?: { name?: string };
};
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

// Lê a tag do bloco inicial de "atribuir tags" do fluxo.
function entryTagOf(detailBody: unknown): string | null {
  const ops = (detailBody as { data?: { operators?: Operator[] } } | null)?.data
    ?.operators;
  if (!Array.isArray(ops)) return null;
  const start = ops.find((o) => o?.start_item) ?? ops[0];
  const body = start?.properties?.body;
  if (typeof body !== "string" || !body.includes("set_tags")) return null;
  const m = body.match(/<b>(.*?)<\/b>/i);
  return m ? m[1].trim() : null;
}

// Roda tarefas com um teto de concorrência.
async function pool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
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

// Puxa os fluxos dos bots de Telegram + o nº de entrada (via tag de entrada).
export async function getSendpulseFlows(): Promise<SpFlow[]> {
  const botsRes = await spGet("/telegram/bots");
  const bots = (botsRes.body as { data?: BotRow[] } | null)?.data ?? [];

  const out: SpFlow[] = [];
  for (const b of bots) {
    const botName = b.channel_data?.name ?? b.name ?? b.id;

    const [flowsRes, tagsRes] = await Promise.all([
      spGet(`/telegram/flows?bot_id=${b.id}`),
      spGet(`/telegram/tags?bot_id=${b.id}`),
    ]);
    const flows = (flowsRes.body as { data?: FlowRow[] } | null)?.data ?? [];
    const tags = (tagsRes.body as { data?: TagRow[] } | null)?.data ?? [];
    const tagCount = new Map(tags.map((t) => [norm(t.name), t.count]));

    const enriched = await pool(flows, 8, async (f) => {
      const detail = await spGet(
        `/telegram/flows/get?bot_id=${b.id}&flow_id=${f.id}`,
      );
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
