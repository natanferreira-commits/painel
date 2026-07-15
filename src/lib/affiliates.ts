import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type LinkedChannel = { id: string; title: string };

export type Affiliate = {
  id: number;
  nome: string;
  nicho: string | null;
  channels: LinkedChannel[];
  sendpulseBotId: string | null;
  sendpulseConnected: boolean; // tem credencial de API salva
  trafficSheetUrl: string | null; // planilha publicada (CSV) com o GASTO
  ativo: boolean;
};

export type AffiliateCreds = {
  id: number;
  nome: string;
  clientId: string;
  clientSecret: string;
};

// Afiliados que têm credencial de API do SendPulse (pra sincronização).
export async function getAffiliatesWithSendpulse(): Promise<AffiliateCreds[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("affiliates")
    .select("id,nome,sendpulse_client_id,sendpulse_client_secret")
    .not("sendpulse_client_id", "is", null)
    .not("sendpulse_client_secret", "is", null);
  if (error) throw new Error(error.message);
  return (
    (data as
      | { id: number; nome: string; sendpulse_client_id: string; sendpulse_client_secret: string }[]
      | null) ?? []
  ).map((r) => ({
    id: r.id,
    nome: r.nome,
    clientId: r.sendpulse_client_id,
    clientSecret: r.sendpulse_client_secret,
  }));
}

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
  sendpulse_client_id: string | null;
  traffic_sheet_url: string | null;
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
      .select("id,nome,nicho,id_bot_sendpulse,sendpulse_client_id,traffic_sheet_url,ativo")
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
    sendpulseConnected: Boolean(r.sendpulse_client_id),
    trafficSheetUrl: r.traffic_sheet_url,
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
