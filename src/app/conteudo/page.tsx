import { getPostChannels } from "@/lib/posts";
import { getTimelines, type Bucket } from "@/lib/analytics";
import { ChartFilter } from "@/components/ChartFilter";
import { StackedBars, CategoryLegend } from "@/components/StackedBars";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inteligência de conteúdo · Painel Arena",
};

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

export default async function ConteudoPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const bucket = sp.periodo === "semana" ? "week" : "day";
  const canal = str(sp.canal);

  let timelines: Awaited<ReturnType<typeof getTimelines>> | null = null;
  let channels: Awaited<ReturnType<typeof getPostChannels>> = [];
  let error: string | null = null;

  try {
    [timelines, channels] = await Promise.all([
      getTimelines(bucket),
      getPostChannels(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  let buckets: Bucket[] = [];
  let maxTotal = 1;
  let totalPosts = 0;
  let canalNome: string | null = null;

  if (timelines) {
    if (canal) {
      const ch = timelines.channels.find((c) => c.channelId === canal);
      buckets =
        ch?.buckets ??
        timelines.keys.map((k) => ({
          key: k.key,
          label: k.label,
          total: 0,
          byTipo: {},
        }));
      maxTotal = Math.max(1, ...buckets.map((b) => b.total));
      totalPosts = ch?.total ?? 0;
      canalNome = ch?.channelTitle ?? canal;
    } else {
      buckets = timelines.aggregate;
      maxTotal = timelines.maxAggregateBucket;
      totalPosts = buckets.reduce((s, b) => s + b.total, 0);
    }
  }

  const tiposPresentes = [
    ...new Set(buckets.flatMap((b) => Object.keys(b.byTipo))),
  ];

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inteligência de conteúdo
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Volume de posts por {bucket === "day" ? "dia" : "semana"} e categoria
            {canalNome ? ` · ${canalNome}` : " · todos os canais"}
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-semibold leading-none tabular-nums">
            {totalPosts}
          </div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            posts no período
          </div>
        </div>
      </header>

      <ChartFilter channels={channels} />

      {error ? (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300">
          Erro ao carregar: {error}
        </div>
      ) : totalPosts === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
          <div className="text-3xl">📊</div>
          <div className="mt-4 font-medium">Sem dados no período</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Quando os canais postarem (e os posts forem categorizados), o volume
            aparece aqui.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-5">
          <StackedBars buckets={buckets} maxTotal={maxTotal} height={200} />
          <div className="mt-4 border-t border-neutral-800 pt-4">
            <CategoryLegend tipos={tiposPresentes} />
          </div>
        </div>
      )}
    </main>
  );
}
