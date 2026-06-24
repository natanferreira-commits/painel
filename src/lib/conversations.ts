import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { slaLevel, type SlaLevel } from "@/lib/sla";

export type Direction = "in" | "out";

export type ConversationSummary = {
  contactId: string;
  contactName: string | null;
  botId: string | null;
  botName: string | null;
  flowTag: string | null;
  allTags: string[];
  lastText: string | null;
  lastDirection: Direction;
  lastAt: string;
  waiting: boolean;
  waitingSince: string | null;
  messageCount: number;
};

export type ThreadMessage = {
  id: number;
  direction: Direction;
  text: string | null;
  occurredAt: string;
  operatorName: string | null;
};

export type ConversationDetail = {
  contactId: string;
  contactName: string | null;
  botId: string | null;
  botName: string | null;
  flowTag: string | null;
  waiting: boolean;
  waitingSince: string | null;
  messages: ThreadMessage[];
};

export type Filters = {
  onlyWaiting?: boolean;
  botId?: string;
  tag?: string;
  sla?: SlaLevel;
  q?: string;
};

export type FilterOptions = {
  bots: { id: string; name: string }[];
  tags: string[];
};

type Row = {
  id: number;
  sendpulse_contact_id: string | null;
  sendpulse_bot_id: string | null;
  contact_name: string | null;
  operator_name: string | null;
  direction: Direction;
  text: string | null;
  flow_tag: string | null;
  tags: string[] | null;
  occurred_at: string;
  raw_payload: { bot?: { name?: string } } | null;
};

const SELECT =
  "id,sendpulse_contact_id,sendpulse_bot_id,contact_name,operator_name,direction,text,flow_tag,tags,occurred_at,raw_payload";

async function fetchRows(): Promise<Row[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages_support")
    .select(SELECT)
    .order("occurred_at", { ascending: true })
    .limit(5000);
  if (error) throw new Error(error.message);
  return (data ?? []) as Row[];
}

function groupByContact(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.sendpulse_contact_id) continue;
    const arr = map.get(r.sendpulse_contact_id) ?? [];
    arr.push(r);
    map.set(r.sendpulse_contact_id, arr);
  }
  return map;
}

function summarize(contactId: string, msgs: Row[]): ConversationSummary {
  const last = msgs[msgs.length - 1];
  const waiting = last.direction === "in";

  let waitingSince: string | null = null;
  if (waiting) {
    waitingSince = last.occurred_at;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].direction === "out") break;
      waitingSince = msgs[i].occurred_at;
    }
  }

  const allTags = new Set<string>();
  for (const m of msgs) {
    if (m.flow_tag) allTags.add(m.flow_tag);
    for (const t of m.tags ?? []) allTags.add(t);
  }

  const flowTag = last.flow_tag ?? (last.tags && last.tags[0]) ?? null;

  return {
    contactId,
    contactName: last.contact_name,
    botId: last.sendpulse_bot_id,
    botName: last.raw_payload?.bot?.name ?? null,
    flowTag,
    allTags: [...allTags],
    lastText: last.text,
    lastDirection: last.direction,
    lastAt: last.occurred_at,
    waiting,
    waitingSince,
    messageCount: msgs.length,
  };
}

// Contatos que o time ocultou da fila. Se a tabela ainda nao existe
// (migration nao rodada), devolve vazio pra nao quebrar o painel.
async function getDismissedSet(): Promise<Set<string>> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("dismissed_conversations")
      .select("contact_id");
    if (error) return new Set();
    return new Set(
      (data ?? []).map((r) => (r as { contact_id: string }).contact_id),
    );
  } catch {
    return new Set();
  }
}

export async function getConversations(
  filters: Filters = {},
): Promise<ConversationSummary[]> {
  const [rows, dismissed] = await Promise.all([fetchRows(), getDismissedSet()]);
  const grouped = groupByContact(rows);

  let list: ConversationSummary[] = [];
  for (const [contactId, msgs] of grouped) {
    list.push(summarize(contactId, msgs));
  }

  const now = Date.now();
  const q = filters.q?.trim().toLowerCase();

  list = list.filter((c) => {
    if (dismissed.has(c.contactId)) return false;
    if (filters.onlyWaiting && !c.waiting) return false;
    if (filters.botId && c.botId !== filters.botId) return false;
    if (filters.tag && !c.allTags.includes(filters.tag)) return false;
    if (filters.sla) {
      if (!c.waiting || !c.waitingSince) return false;
      const level = slaLevel(now - new Date(c.waitingSince).getTime());
      if (level !== filters.sla) return false;
    }
    if (q) {
      const hay = `${c.contactName ?? ""} ${c.lastText ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  // Esperando primeiro (quem espera ha mais tempo no topo), depois o resto
  // por atividade mais recente.
  list.sort((a, b) => {
    if (a.waiting && b.waiting) {
      return (a.waitingSince ?? "").localeCompare(b.waitingSince ?? "");
    }
    if (a.waiting !== b.waiting) return a.waiting ? -1 : 1;
    return b.lastAt.localeCompare(a.lastAt);
  });

  return list;
}

export async function getFilterOptions(): Promise<FilterOptions> {
  const rows = await fetchRows();
  const bots = new Map<string, string>();
  const tags = new Set<string>();
  for (const r of rows) {
    if (r.sendpulse_bot_id) {
      bots.set(r.sendpulse_bot_id, r.raw_payload?.bot?.name ?? r.sendpulse_bot_id);
    }
    if (r.flow_tag) tags.add(r.flow_tag);
    for (const t of r.tags ?? []) tags.add(t);
  }
  return {
    bots: [...bots.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    tags: [...tags].sort((a, b) => a.localeCompare(b)),
  };
}

export async function getConversationDetail(
  contactId: string,
): Promise<ConversationDetail | null> {
  const rows = await fetchRows();
  const grouped = groupByContact(rows);
  const msgs = grouped.get(contactId);
  if (!msgs || msgs.length === 0) return null;

  const s = summarize(contactId, msgs);
  return {
    contactId,
    contactName: s.contactName,
    botId: s.botId,
    botName: s.botName,
    flowTag: s.flowTag,
    waiting: s.waiting,
    waitingSince: s.waitingSince,
    messages: msgs.map((m) => ({
      id: m.id,
      direction: m.direction,
      text: m.text,
      occurredAt: m.occurred_at,
      operatorName: m.operator_name,
    })),
  };
}
