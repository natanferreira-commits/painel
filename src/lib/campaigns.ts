import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type CampaignCategory = "aposta_segura" | "boas_vindas" | "outro";

export const CATEGORY_LABEL: Record<string, string> = {
  aposta_segura: "Aposta Segura",
  boas_vindas: "Boas vindas",
  outro: "Outros",
};

export type CampaignFlow = {
  affiliateId: number;
  affiliateNome: string;
  botName: string | null;
  flowId: string;
  name: string;
  folderId: string | null;
  entryTag: string | null;
  entered: number | null;
  endTag: string | null;
  reached: number | null;
  ctr: number | null; // % de quem entrou e chegou no fim
  category: CampaignCategory;
  status: number | null;
  flowCreatedAt: string | null; // quando a campanha foi criada
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
  end_tag: string | null;
  reached: number | null;
  category: string | null;
  status: number | null;
  flow_created_at: string | null;
  captured_at: string;
  affiliates: { nome: string } | null;
};

// Lê o snapshot. Por padrão traz só o que interessa: categorias do time e
// fluxos com gente dentro (zerado não importa).
// sinceDays filtra pela DATA DA CAMPANHA (quando o fluxo foi criado) — a
// contagem de cada tag é acumulada, então o período escolhe quais campanhas
// entram, não fatia o número de cada uma.
export async function getCampaignFlows(opts?: {
  affiliateIds?: number[];
  category?: CampaignCategory;
  sinceDays?: number;
  todos?: boolean;
}): Promise<CampaignFlow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("campaign_flows")
    .select(
      "affiliate_id,bot_name,flow_id,name,folder_id,entry_tag,entered,end_tag,reached,category,status,flow_created_at,captured_at,affiliates(nome)",
    )
    .order("entered", { ascending: false, nullsFirst: false });

  if (opts?.affiliateIds?.length) q = q.in("affiliate_id", opts.affiliateIds);
  if (opts?.category) q = q.eq("category", opts.category);
  if (opts?.sinceDays) {
    const since = new Date(Date.now() - opts.sinceDays * 86_400_000).toISOString();
    q = q.gte("flow_created_at", since);
  }
  if (!opts?.todos) {
    if (!opts?.category) q = q.in("category", ["aposta_segura", "boas_vindas"]);
    q = q.gt("entered", 0);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  return ((data as unknown as Row[] | null) ?? []).map((r) => {
    const entered = r.entered;
    const reached = r.reached;
    const ctr =
      entered && entered > 0 && reached !== null
        ? Math.round((reached / entered) * 1000) / 10
        : null;
    return {
      affiliateId: r.affiliate_id,
      affiliateNome: r.affiliates?.nome ?? String(r.affiliate_id),
      botName: r.bot_name,
      flowId: r.flow_id,
      name: r.name,
      folderId: r.folder_id,
      entryTag: r.entry_tag,
      entered,
      endTag: r.end_tag,
      reached,
      ctr,
      category: (r.category as CampaignCategory) ?? "outro",
      status: r.status,
      flowCreatedAt: r.flow_created_at,
      capturedAt: r.captured_at,
    };
  });
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
