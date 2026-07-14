import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type LinkedChannel = { id: string; title: string };

export type Affiliate = {
  id: number;
  nome: string;
  nicho: string | null;
  channels: LinkedChannel[];
  sendpulseBotId: string | null;
  ativo: boolean;
};

// Opção de afiliado pra filtros: o afiliado e os ids de canal que ele agrega.
// É o primitivo transversal — afiliado -> canais -> dados desses canais.
export type AffiliateOption = {
  id: number;
  nome: string;
  channelIds: string[];
};

type AffRow = {
  id: number;
  nome: string;
  nicho: string | null;
  id_bot_sendpulse: string | null;
  ativo: boolean | null;
};

type LinkRow = {
  affiliate_id: number;
  channel_id: string;
  channel_title: string | null;
};

export async function getAffiliates(): Promise<Affiliate[]> {
  const supabase = getSupabaseAdmin();

  const [affsRes, linksRes] = await Promise.all([
    supabase
      .from("affiliates")
      .select("id,nome,nicho,id_bot_sendpulse,ativo")
      .order("ativo", { ascending: false })
      .order("nome", { ascending: true }),
    supabase
      .from("affiliate_channels")
      .select("affiliate_id,channel_id,channel_title"),
  ]);

  if (affsRes.error) throw new Error(affsRes.error.message);
  if (linksRes.error) throw new Error(linksRes.error.message);

  const byAffiliate = new Map<number, LinkedChannel[]>();
  for (const l of (linksRes.data as LinkRow[] | null) ?? []) {
    const list = byAffiliate.get(l.affiliate_id) ?? [];
    list.push({ id: l.channel_id, title: l.channel_title ?? l.channel_id });
    byAffiliate.set(l.affiliate_id, list);
  }

  return ((affsRes.data as AffRow[] | null) ?? []).map((r) => ({
    id: r.id,
    nome: r.nome,
    nicho: r.nicho,
    channels: (byAffiliate.get(r.id) ?? []).sort((a, b) =>
      a.title.localeCompare(b.title),
    ),
    sendpulseBotId: r.id_bot_sendpulse,
    ativo: r.ativo ?? true,
  }));
}

// Afiliados ativos + seus canais, pra popular filtros. Reaproveita getAffiliates.
export async function getAffiliateOptions(): Promise<AffiliateOption[]> {
  const affs = await getAffiliates();
  return affs
    .filter((a) => a.ativo)
    .map((a) => ({
      id: a.id,
      nome: a.nome,
      channelIds: a.channels.map((c) => c.id),
    }));
}
