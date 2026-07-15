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
  conversao: number | null; // % de quem entrou e chegou no fim (taxa de conversão)
  category: CampaignCategory;
  status: number | null;
  campaignDate: string | null; // data REAL da campanha (lida do nome)
  flowCreatedAt: string | null; // quando o fluxo foi montado/copiado
  fluxos: string[]; // nomes dos fluxos por trás (>1 = dividem a mesma tag)
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
  campaign_date: string | null;
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
  from?: string; // intervalo pela DATA DA CAMPANHA (tem precedência sobre sinceDays)
  to?: string;
  todos?: boolean;
}): Promise<CampaignFlow[]> {
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("campaign_flows")
    .select(
      "affiliate_id,bot_name,flow_id,name,folder_id,entry_tag,entered,end_tag,reached,category,status,campaign_date,flow_created_at,captured_at,affiliates(nome)",
    )
    .order("entered", { ascending: false, nullsFirst: false });

  if (opts?.affiliateIds?.length) q = q.in("affiliate_id", opts.affiliateIds);
  if (opts?.category) q = q.eq("category", opts.category);
  // Filtra pela data REAL da campanha (do nome), não pelo created_at do fluxo.
  if (opts?.from && opts?.to) {
    q = q.gte("campaign_date", opts.from).lte("campaign_date", opts.to);
  } else if (opts?.sinceDays) {
    const since = new Date(Date.now() - opts.sinceDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    q = q.gte("campaign_date", since);
  }
  if (!opts?.todos) {
    if (!opts?.category) q = q.in("category", ["aposta_segura", "boas_vindas"]);
    q = q.gt("entered", 0);
  }

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data as unknown as Row[] | null) ?? [];

  // O número de "entrou" é a contagem da TAG de entrada. Quando dois fluxos
  // usam a mesma tag (fluxo duplicado, ou reaproveitaram a tag), os dois
  // mostram o MESMO número — somar seria contar a mesma gente duas vezes.
  // Então a campanha é identificada pela TAG, não pelo fluxo.
  const grupos = new Map<string, Row[]>();
  for (const r of rows) {
    const tag = r.entry_tag?.toLowerCase().trim();
    const chave = `${r.affiliate_id}::${tag || `__sem_tag_${r.flow_id}`}`;
    const arr = grupos.get(chave) ?? [];
    arr.push(r);
    grupos.set(chave, arr);
  }

  // Nome canônico: evita o que parece cópia — "(1)", "(old)", "- 2" — e,
  // empatando, o mais curto.
  const ehCopia = (n: string) => /\(\d+\)|\(old\)|-\s*\d+\s*$/i.test(n);
  const escolheNome = (g: Row[]) =>
    [...g].sort((a, b) => {
      const ca = ehCopia(a.name) ? 1 : 0;
      const cb = ehCopia(b.name) ? 1 : 0;
      if (ca !== cb) return ca - cb;
      return a.name.length - b.name.length;
    })[0];

  return [...grupos.values()].map((g) => {
    const p = escolheNome(g);
    // todos do grupo carregam a mesma contagem — pega uma vez, não soma
    const entered = Math.max(...g.map((r) => r.entered ?? 0)) || null;
    const reached = g.some((r) => r.reached !== null)
      ? Math.max(...g.map((r) => r.reached ?? 0))
      : null;
    const conversao =
      entered && entered > 0 && reached !== null
        ? Math.round((reached / entered) * 1000) / 10
        : null;
    const datas = g.map((r) => r.campaign_date).filter((d): d is string => !!d).sort();

    return {
      affiliateId: p.affiliate_id,
      affiliateNome: p.affiliates?.nome ?? String(p.affiliate_id),
      botName: p.bot_name,
      flowId: p.flow_id,
      name: p.name,
      folderId: p.folder_id,
      entryTag: p.entry_tag,
      entered,
      endTag: p.end_tag,
      reached,
      conversao,
      category: (p.category as CampaignCategory) ?? "outro",
      status: p.status,
      campaignDate: datas[0] ?? p.campaign_date,
      flowCreatedAt: p.flow_created_at,
      fluxos: [...new Set(g.map((r) => r.name))].sort(),
      capturedAt: p.captured_at,
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
