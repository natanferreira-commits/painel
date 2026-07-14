import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type Affiliate = {
  id: number;
  nome: string;
  nicho: string | null;
  telegramChannelId: string | null;
  sendpulseBotId: string | null;
  ativo: boolean;
};

type Row = {
  id: number;
  nome: string;
  nicho: string | null;
  telegram_channel_id: string | null;
  id_bot_sendpulse: string | null;
  ativo: boolean | null;
};

export async function getAffiliates(): Promise<Affiliate[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("affiliates")
    .select("id,nome,nicho,telegram_channel_id,id_bot_sendpulse,ativo")
    .order("ativo", { ascending: false })
    .order("nome", { ascending: true });
  if (error) throw new Error(error.message);

  return ((data as Row[] | null) ?? []).map((r) => ({
    id: r.id,
    nome: r.nome,
    nicho: r.nicho,
    telegramChannelId: r.telegram_channel_id,
    sendpulseBotId: r.id_bot_sendpulse,
    ativo: r.ativo ?? true,
  }));
}
