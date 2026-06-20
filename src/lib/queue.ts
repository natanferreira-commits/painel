import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type WaitingConversation = {
  contactId: string;
  contactName: string | null;
  botId: string | null;
  botName: string | null;
  flowTag: string | null;
  lastText: string | null;
  waitingSince: string; // ISO
};

type Row = {
  sendpulse_contact_id: string | null;
  sendpulse_bot_id: string | null;
  contact_name: string | null;
  direction: "in" | "out";
  text: string | null;
  flow_tag: string | null;
  tags: string[] | null;
  occurred_at: string;
  raw_payload: { bot?: { name?: string } } | null;
};

// Uma conversa esta "esperando" quando a ultima mensagem do contato e do
// usuario (direction "in") e nao houve resposta do operador depois.
// O tempo de espera conta desde a primeira mensagem da sequencia sem resposta.
export async function getWaitingConversations(): Promise<WaitingConversation[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("messages_support")
    .select(
      "sendpulse_contact_id,sendpulse_bot_id,contact_name,direction,text,flow_tag,tags,occurred_at,raw_payload",
    )
    .order("occurred_at", { ascending: true })
    .limit(2000);

  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];

  const byContact = new Map<string, Row[]>();
  for (const r of rows) {
    if (!r.sendpulse_contact_id) continue;
    const arr = byContact.get(r.sendpulse_contact_id) ?? [];
    arr.push(r);
    byContact.set(r.sendpulse_contact_id, arr);
  }

  const waiting: WaitingConversation[] = [];
  for (const [contactId, msgs] of byContact) {
    const last = msgs[msgs.length - 1];
    if (last.direction !== "in") continue;

    // Anda de tras pra frente ate achar a ultima resposta do operador.
    // O que vier de "in" depois disso conta como tempo de espera.
    let waitingSince = last.occurred_at;
    let lastInText = last.text;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].direction === "out") break;
      waitingSince = msgs[i].occurred_at;
      if (msgs[i].text) lastInText = msgs[i].text;
    }

    const botName = last.raw_payload?.bot?.name ?? null;
    const flowTag =
      last.flow_tag ?? (last.tags && last.tags.length > 0 ? last.tags[0] : null);

    waiting.push({
      contactId,
      contactName: last.contact_name,
      botId: last.sendpulse_bot_id,
      botName,
      flowTag,
      lastText: lastInText,
      waitingSince,
    });
  }

  // Quem espera ha mais tempo primeiro (waitingSince mais antigo no topo).
  waiting.sort((a, b) => a.waitingSince.localeCompare(b.waitingSince));
  return waiting;
}
