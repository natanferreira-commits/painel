import { getPostChannels } from "@/lib/posts";
import { getAffiliateOptions, type AffiliateOption } from "@/lib/affiliates";
import { getTimelines, type Bucket, type Timelines } from "@/lib/analytics";
import {
  OBJETIVO_OF,
  OBJETIVO_ORDER,
  OBJETIVO_LABEL,
  OBJETIVO_COLOR,
  TIPO_LABEL,
} from "@/lib/taxonomy";
import { ChartFilter } from "@/components/ChartFilter";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Conteúdo · ToolBox Arena",
};

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

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

// tipo -> objetivo por bucket
function byObjetivo(b: Bucket): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [t, n] of Object.entries(b.byTipo)) {
    const o = OBJETIVO_OF[t] ?? "outro";
    out[o] = (out[o] ?? 0) + n;
  }
  return out;
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
  let escopo = "todos os canais";
  let semCanalVinculado = false;

  if (timelines) {
    if (selectedAff) {
      escopo = selectedAff.nome;
      semCanalVinculado = selectedAff.channelIds.length === 0;
      buckets = sumChannels(timelines, selectedAff.channelIds);
    } else if (canal) {
      const ch = timelines.channels.find((c) => c.channelId === canal);
      buckets = ch?.buckets ?? sumChannels(timelines, []);
      escopo = ch?.channelTitle ?? canal;
    } else {
      buckets = timelines.aggregate;
    }
  }

  const totalPosts = buckets.reduce((s, b) => s + b.total, 0);

  // Composição por objetivo (agregado do período) + tipos dentro de cada.
  const tipoTotals: Record<string, number> = {};
  for (const b of buckets)
    for (const [t, n] of Object.entries(b.byTipo))
      tipoTotals[t] = (tipoTotals[t] ?? 0) + n;

  const composition = OBJETIVO_ORDER.map((o) => {
    const tipos = Object.entries(tipoTotals)
      .filter(([t]) => (OBJETIVO_OF[t] ?? "outro") === o)
      .map(([tipo, n]) => ({ tipo, n }))
      .sort((a, b) => b.n - a.n);
    const n = tipos.reduce((s, t) => s + t.n, 0);
    return {
      key: o,
      label: OBJETIVO_LABEL[o],
      color: OBJETIVO_COLOR[o],
      n,
      pct: totalPosts ? Math.round((n / totalPosts) * 100) : 0,
      tipos,
    };
  }).filter((c) => c.n > 0);

  // Timeline empilhada por objetivo (5 séries legíveis).
  const timeline = buckets.map((b) => ({ label: b.label, total: b.total, byObj: byObjetivo(b) }));
  const maxCol = Math.max(1, ...timeline.map((t) => t.total));
  const H = 190;

  const objetivosPresentes = OBJETIVO_ORDER.filter((o) =>
    composition.some((c) => c.key === o),
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conteúdo</h1>
          <p className="mt-1 text-sm text-muted">
            O que {escopo === "todos os canais" ? "os canais postam" : `${escopo} posta`} — por objetivo
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-semibold leading-none tabular-nums">{totalPosts}</div>
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
          <div className="mt-4 font-medium">{escopo} não tem canal vinculado</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Vincule o canal do Telegram desse afiliado em <b>Afiliados</b> pra ver o conteúdo dele.
          </p>
        </div>
      ) : totalPosts === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-3xl">📊</div>
          <div className="mt-4 font-medium">Sem dados no período</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Quando os canais postarem (e os posts forem categorizados), o conteúdo aparece aqui.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* CARD 1 — Composição por objetivo (o "de quê") */}
          <section className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
              Composição por objetivo
            </div>
            <p className="mb-4 text-[12.5px] text-muted">
              O equilíbrio do canal: quanto é aposta, resultado, captação e relacionamento.
            </p>
            <div className="flex flex-col gap-4">
              {composition.map((c) => (
                <div key={c.key}>
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} />
                    <span className="text-[13.5px] font-medium">{c.label}</span>
                    <span className="ml-auto text-[13.5px] tabular-nums">
                      <b className="font-semibold">{c.pct}%</b>
                      <span className="ml-1.5 text-muted">{c.n}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-[5px] bg-raise">
                    <div className="h-full rounded-[5px]" style={{ width: `${Math.max(2, c.pct)}%`, background: c.color }} />
                  </div>
                  {c.tipos.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 pl-[18px] text-[11.5px] text-faint">
                      {c.tipos.map((t) => (
                        <span key={t.tipo}>
                          {TIPO_LABEL[t.tipo] ?? t.tipo}
                          <span className="ml-1 tabular-nums text-muted">{t.n}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* CARD 2 — Volume no tempo, empilhado por objetivo (o "quanto") */}
          <section className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-1 flex items-baseline justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                Volume no tempo · por {bucket === "day" ? "dia" : "semana"}
              </div>
            </div>
            <p className="mb-4 text-[12.5px] text-muted">
              Quanto foi postado e de que objetivo, ao longo do período.
            </p>

            {/* legenda */}
            <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]">
              {objetivosPresentes.map((o) => (
                <span key={o} className="inline-flex items-center gap-1.5 text-muted">
                  <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: OBJETIVO_COLOR[o] }} />
                  {OBJETIVO_LABEL[o]}
                </span>
              ))}
            </div>

            {/* colunas */}
            <div className="flex items-end gap-1.5" style={{ height: H + 22 }}>
              {timeline.map((col, i) => (
                <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div className="flex w-full flex-col-reverse gap-[2px]" style={{ height: H }}>
                    {OBJETIVO_ORDER.filter((o) => (col.byObj[o] ?? 0) > 0).map((o) => (
                      <div
                        key={o}
                        className="w-full rounded-[2px]"
                        style={{
                          height: `${((col.byObj[o] ?? 0) / maxCol) * H}px`,
                          background: OBJETIVO_COLOR[o],
                        }}
                        title={`${OBJETIVO_LABEL[o]}: ${col.byObj[o]}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-faint">{col.label}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
