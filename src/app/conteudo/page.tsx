import { getPostChannels } from "@/lib/posts";
import { getAffiliateOptions, type AffiliateOption } from "@/lib/affiliates";
import { getTimelines, type Bucket, type Timelines } from "@/lib/analytics";
import { ChartFilter } from "@/components/ChartFilter";
import { StackedBars, CategoryLegend } from "@/components/StackedBars";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conteúdo · ToolBox Arena",
};

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

// Soma as timelines de um conjunto de canais (afiliado -> seus canais).
function sumChannels(timelines: Timelines, channelIds: string[]): Bucket[] {
  const set = new Set(channelIds);
  const buckets: Bucket[] = timelines.keys.map((k) => ({
    key: k.key,
    label: k.label,
    total: 0,
    byTipo: {},
  }));
  for (const ch of timelines.channels) {
    if (!set.has(ch.channelId)) continue;
    ch.buckets.forEach((b, i) => {
      buckets[i].total += b.total;
      for (const [t, n] of Object.entries(b.byTipo)) {
        buckets[i].byTipo[t] = (buckets[i].byTipo[t] ?? 0) + n;
      }
    });
  }
  return buckets;
}

export default async function ConteudoPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const bucket = sp.periodo === "semana" ? "week" : "day";
  const canal = str(sp.canal);
  const afiliadoId = str(sp.afiliado);

  let timelines: Timelines | null = null;
  let channels: Awaited<ReturnType<typeof getPostChannels>> = [];
  let affiliates: AffiliateOption[] = [];
  let error: string | null = null;

  try {
    [timelines, channels, affiliates] = await Promise.all([
      getTimelines(bucket),
      getPostChannels(),
      getAffiliateOptions().catch(() => [] as AffiliateOption[]),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  const selectedAff = afiliadoId
    ? affiliates.find((a) => String(a.id) === afiliadoId) ?? null
    : null;

  let buckets: Bucket[] = [];
  let maxTotal = 1;
  let totalPosts = 0;
  let escopo = "todos os canais";
  let semCanalVinculado = false;

  if (timelines) {
    if (selectedAff) {
      escopo = selectedAff.nome;
      if (selectedAff.channelIds.length === 0) {
        semCanalVinculado = true;
        buckets = sumChannels(timelines, []);
      } else {
        buckets = sumChannels(timelines, selectedAff.channelIds);
      }
    } else if (canal) {
      const ch = timelines.channels.find((c) => c.channelId === canal);
      buckets = ch?.buckets ?? sumChannels(timelines, []);
      escopo = ch?.channelTitle ?? canal;
    } else {
      buckets = timelines.aggregate;
    }
    maxTotal = Math.max(1, ...buckets.map((b) => b.total));
    totalPosts = buckets.reduce((s, b) => s + b.total, 0);
  }

  const tiposPresentes = [
    ...new Set(buckets.flatMap((b) => Object.keys(b.byTipo))),
  ];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conteúdo</h1>
          <p className="mt-1 text-sm text-muted">
            Volume de posts por {bucket === "day" ? "dia" : "semana"} e categoria
            {" · "}
            {escopo}
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-semibold leading-none tabular-nums">
            {totalPosts}
          </div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
            posts no período
          </div>
        </div>
      </header>

      <ChartFilter channels={channels} affiliates={affiliates} />

      {error ? (
        <div className="rounded-xl border border-crit/40 bg-crit/10 p-4 text-sm text-crit">
          Erro ao carregar: {error}
        </div>
      ) : semCanalVinculado ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-3xl">🔗</div>
          <div className="mt-4 font-medium">
            {escopo} não tem canal vinculado
          </div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Vincule o canal do Telegram desse afiliado em <b>Afiliados</b> pra ver o conteúdo dele
            aqui.
          </p>
        </div>
      ) : totalPosts === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-3xl">📊</div>
          <div className="mt-4 font-medium">Sem dados no período</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Quando os canais postarem (e os posts forem categorizados), o volume aparece aqui.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-panel p-5">
          <StackedBars buckets={buckets} maxTotal={maxTotal} height={200} />
          <div className="mt-4 border-t border-linesoft pt-4">
            <CategoryLegend tipos={tiposPresentes} />
          </div>
        </div>
      )}
    </main>
  );
}
