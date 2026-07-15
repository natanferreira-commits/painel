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
export type CampaignCategory = "aposta_segura" | "boas_vindas" | "outro";

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
  endTag: string | null; // tag(s) que marcam o fim do funil
  reached: number | null; // pessoas que chegaram no fim
  category: CampaignCategory;
  campaignDate: string | null; // data REAL da campanha (lida do nome)
};

// A data REAL da campanha está no NOME ("APOSTA SEGURA 11/07"), não no
// created_at (que é quando o fluxo foi montado/copiado — eles montam com
// antecedência e duplicam fluxos). O ano não vem no nome, então escolhemos o
// ano que deixa a data mais perto do created_at (resolve virada de ano).
export function campaignDateFromName(name: string, createdAt: string): string | null {
  const m = name.match(/(\d{2})\/(\d{2})/);
  if (!m) return null;
  const [, dd, mm] = m;
  const d = Number(dd);
  const mo = Number(mm);
  if (d < 1 || d > 31 || mo < 1 || mo > 12) return null;

  const alvo = new Date(createdAt).getTime();
  if (isNaN(alvo)) return null;
  const ano = Number(createdAt.slice(0, 4));

  let melhor: string | null = null;
  let menorDist = Infinity;
  for (const a of [ano - 1, ano, ano + 1]) {
    const iso = `${a}-${mm}-${dd}`;
    const t = new Date(`${iso}T12:00:00Z`).getTime();
    if (isNaN(t)) continue;
    const dist = Math.abs(t - alvo);
    if (dist < menorDist) {
      menorDist = dist;
      melhor = iso;
    }
  }
  return melhor;
}

// Categoria pelo nome do fluxo (regra do time).
export function categoryOf(name: string): CampaignCategory {
  const n = name.toLowerCase();
  if (/(segura|garantida)/.test(n)) return "aposta_segura";
  if (/(boas\s*-?\s*vindas|resgate|giro\s*premiado)/.test(n)) return "boas_vindas";
  return "outro";
}

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

// resposta = { data: fluxo }, e os blocos ficam em fluxo.data.operators.
function operatorsOf(detailBody: unknown): Operator[] {
  const ops = (
    detailBody as { data?: { data?: { operators?: Operator[] } } } | null
  )?.data?.data?.operators;
  return Array.isArray(ops) ? ops : [];
}

function entryTagOf(detailBody: unknown): string | null {
  const ops = operatorsOf(detailBody);
  if (ops.length === 0) return null;
  const start = ops.find((o) => o?.start_item) ?? ops[0];
  const body = start?.properties?.body;
  if (typeof body !== "string" || !body.includes("set_tags")) return null;
  const m = body.match(/<b>(.*?)<\/b>/i);
  return m ? m[1].trim() : null;
}

// Todas as tags atribuídas no fluxo (sem repetir).
function allSetTags(detailBody: unknown): string[] {
  const found: string[] = [];
  for (const o of operatorsOf(detailBody)) {
    const b = o?.properties?.body;
    if (typeof b !== "string" || !b.includes("set_tags")) continue;
    for (const m of b.matchAll(/<b>(.*?)<\/b>/gi)) found.push(m[1].trim());
  }
  // dedupe por nome normalizado (fluxo repete a mesma tag em ramos diferentes)
  return [...new Map(found.map((t) => [norm(t), t])).values()];
}

// Fim do funil: tag com "atendimento"; se não houver, soma as "apostou confirmado".
function endOf(
  tagsInFlow: string[],
  tagCount: Map<string, number>,
): { endTag: string | null; reached: number | null } {
  const pick = (re: RegExp) => tagsInFlow.filter((t) => re.test(t));
  const sum = (ts: string[]) =>
    ts.reduce((s, t) => s + (tagCount.get(norm(t)) ?? 0), 0);

  const atendimento = pick(/atendimento/i);
  if (atendimento.length) {
    return { endTag: atendimento.join(" + "), reached: sum(atendimento) };
  }
  const confirmado = pick(/apostou[\s_-]*confirmado/i);
  if (confirmado.length) {
    return { endTag: confirmado.join(" + "), reached: sum(confirmado) };
  }
  return { endTag: null, reached: null };
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

// Bot de atendimento não roda campanha — os fluxos dele (resposta padrão,
// menu de suporte, etc.) só poluem a leitura. Toda conta segue o mesmo
// padrão: um bot "Suporte X" e o principal. Ex: "Suporte ZZ",
// "suportecabreloa", "Suporte Gol do Rayo".
const EH_BOT_SUPORTE = /suporte|support/i;

// Puxa os fluxos dos bots de Telegram de uma conta + nº de entrada (via tag).
// Ignora o bot de atendimento.
export async function getSendpulseFlows(creds: SpCreds): Promise<SpFlow[]> {
  const botsRes = await spGet("/telegram/bots", creds);
  const bots = (botsRes.body as { data?: BotRow[] } | null)?.data ?? [];

  const out: SpFlow[] = [];
  for (const b of bots) {
    const botName = b.channel_data?.name ?? b.name ?? b.id;
    if (EH_BOT_SUPORTE.test(botName)) continue;
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
      const { endTag, reached } = endOf(allSetTags(detail.body), tagCount);
      return { f, entryTag, entered, endTag, reached };
    });

    for (const { f, entryTag, entered, endTag, reached } of enriched) {
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
        endTag,
        reached,
        category: categoryOf(f.name),
        campaignDate: campaignDateFromName(f.name, f.created_at),
      });
    }
  }
  return out;
}
