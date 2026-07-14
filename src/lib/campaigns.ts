import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type CampaignFlow = {
  affiliateId: number;
  affiliateNome: string;
  botName: string | null;
  flowId: string;
  name: string;
  folderId: string | null;
  entryTag: string | null;
  entered: number | null;
  status: number | null;
  capturedAt: string;
};

type Row = {
  affiliate_id: number;
  bot_name: string | null;
  flow_id: string;
  name: string;
  folder_id: string | null;
  entry_tag: string | null;
  entered: number | null;
  status: number | null;
  captured_at: string;
  affiliates: { nome: string } | null;
};

// Lê o snapshot de fluxos (rápido). affiliateIds opcional pra filtrar.
export async function getCampaignFlows(
  affiliateIds?: number[],
): Promise<CampaignFlow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("campaign_flows")
    .select(
      "affiliate_id,bot_name,flow_id,name,folder_id,entry_tag,entered,status,captured_at,affiliates(nome)",
    )
    .order("entered", { ascending: false, nullsFirst: false });
  if (affiliateIds && affiliateIds.length) q = q.in("affiliate_id", affiliateIds);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return ((data as unknown as Row[] | null) ?? []).map((r) => ({
    affiliateId: r.affiliate_id,
    affiliateNome: r.affiliates?.nome ?? String(r.affiliate_id),
    botName: r.bot_name,
    flowId: r.flow_id,
    name: r.name,
    folderId: r.folder_id,
    entryTag: r.entry_tag,
    entered: r.entered,
    status: r.status,
    capturedAt: r.captured_at,
  }));
}

export async function getLastCampaignSync(): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("campaign_flows")
    .select("captured_at")
    .order("captured_at", { ascending: false })
    .limit(1);
  return (data as { captured_at: string }[] | null)?.[0]?.captured_at ?? null;
}
