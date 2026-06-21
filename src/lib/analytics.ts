import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Ordem de empilhamento das categorias (de baixo pra cima).
export const TIPOS_ORDER = [
  "dica",
  "analise",
  "prova_social",
  "promo",
  "cta_cadastro",
  "motivacional",
  "educacional",
  "interacao",
  "outro",
] as const;

export const TIPO_LABEL: Record<string, string> = {
  dica: "dica",
  analise: "análise",
  promo: "promo",
  prova_social: "prova social",
  motivacional: "motivacional",
  cta_cadastro: "cadastro (CTA)",
  educacional: "educacional",
  interacao: "interação",
  outro: "outro",
};

// Cor por categoria (classes literais pro Tailwind detectar).
export const CATEGORY_COLOR: Record<string, string> = {
  dica: "bg-emerald-500",
  analise: "bg-sky-500",
  prova_social: "bg-violet-500",
  promo: "bg-amber-500",
  cta_cadastro: "bg-orange-500",
  motivacional: "bg-pink-500",
  educacional: "bg-teal-500",
  interacao: "bg-blue-500",
  outro: "bg-neutral-500",
};

export type Bucket = {
  key: string;
  label: string;
  total: number;
  byTipo: Record<string, number>;
};

export type ChannelTimeline = {
  channelId: string;
  channelTitle: string | null;
  buckets: Bucket[];
  total: number;
};

export type Timelines = {
  bucket: "day" | "week";
  keys: { key: string; label: string }[];
  channels: ChannelTimeline[];
  aggregate: Bucket[];
  maxChannelBucket: number; // maior barra entre todos os canais (escala compartilhada)
  maxAggregateBucket: number;
};

type Row = {
  channel_id: string;
  channel_title: string | null;
  posted_at: string;
  cat_tipo: string | null;
};

function spDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
}
function ddmm(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${d}/${m}`;
}
function shiftDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function mondayOf(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  const dow = d.getUTCDay(); // 0 dom .. 6 sab
  return shiftDays(dateStr, -(dow === 0 ? 6 : dow - 1));
}

function buildKeys(bucket: "day" | "week", today: string) {
  const keys: { key: string; label: string }[] = [];
  if (bucket === "day") {
    for (let i = 13; i >= 0; i--) {
      const k = shiftDays(today, -i);
      keys.push({ key: k, label: ddmm(k) });
    }
  } else {
    const mon = mondayOf(today);
    for (let i = 7; i >= 0; i--) {
      const k = shiftDays(mon, -7 * i);
      keys.push({ key: k, label: ddmm(k) });
    }
  }
  return keys;
}

function emptyBuckets(keys: { key: string; label: string }[]): Bucket[] {
  return keys.map((k) => ({ key: k.key, label: k.label, total: 0, byTipo: {} }));
}

export async function getTimelines(bucket: "day" | "week"): Promise<Timelines> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select("channel_id,channel_title,posted_at,cat_tipo")
    .not("categorized_at", "is", null)
    .limit(5000);
  if (error) throw new Error(error.message);
  const rows = (data as Row[] | null) ?? [];

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  const keys = buildKeys(bucket, today);
  const keyIndex = new Map(keys.map((k, i) => [k.key, i]));

  const byChannel = new Map<string, ChannelTimeline>();
  const aggregate = emptyBuckets(keys);

  for (const r of rows) {
    const day = spDateStr(r.posted_at);
    const bkey = bucket === "day" ? day : mondayOf(day);
    const idx = keyIndex.get(bkey);
    if (idx === undefined) continue; // fora da janela

    const tipo = r.cat_tipo ?? "outro";

    let ch = byChannel.get(r.channel_id);
    if (!ch) {
      ch = {
        channelId: r.channel_id,
        channelTitle: r.channel_title,
        buckets: emptyBuckets(keys),
        total: 0,
      };
      byChannel.set(r.channel_id, ch);
    }
    ch.buckets[idx].total++;
    ch.buckets[idx].byTipo[tipo] = (ch.buckets[idx].byTipo[tipo] ?? 0) + 1;
    ch.total++;

    aggregate[idx].total++;
    aggregate[idx].byTipo[tipo] = (aggregate[idx].byTipo[tipo] ?? 0) + 1;
  }

  const channels = [...byChannel.values()].sort((a, b) => b.total - a.total);
  const maxChannelBucket = Math.max(
    1,
    ...channels.flatMap((c) => c.buckets.map((b) => b.total)),
  );
  const maxAggregateBucket = Math.max(1, ...aggregate.map((b) => b.total));

  return {
    bucket,
    keys,
    channels,
    aggregate,
    maxChannelBucket,
    maxAggregateBucket,
  };
}
