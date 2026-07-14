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
import { CompareSelector } from "@/components/CompareSelector";

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

type CompItem = { key: string; label: string; color: string; n: number; pct: number; tipos: { tipo: string; n: number }[] };

function compositionOf(buckets: Bucket[]): { total: number; composition: CompItem[] } {
  const tipoTotals: Record<string, number> = {};
  for (const b of buckets)
    for (const [t, n] of Object.entries(b.byTipo))
      tipoTotals[t] = (tipoTotals[t] ?? 0) + n;
  const total = Object.values(tipoTotals).reduce((s, n) => s + n, 0);

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
      pct: total ? Math.round((n / total) * 100) : 0,
      tipos,
    };
  }).filter((c) => c.n > 0);

  return { total, composition };
}

/* ---------- componentes de gráfico ---------- */
function Composicao({ composition, showTipos = true }: { composition: CompItem[]; showTipos?: boolean }) {
  return (
    <div className="flex flex-col gap-4">
      {composition.map((c) => (
        <div key={c.key}>
          <div className="mb-1.5 flex items-baseline gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: c.color }} />
            <span className="text-[13px] font-medium">{c.label}</span>
            <span className="ml-auto text-[13px] tabular-nums">
              <b className="font-semibold">{c.pct}%</b>
              <span className="ml-1.5 text-muted">{c.n}</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-[5px] bg-raise">
            <div className="h-full rounded-[5px]" style={{ width: `${Math.max(2, c.pct)}%`, background: c.color }} />
          </div>
          {showTipos && c.tipos.length > 0 && (
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
  );
}

function TimelineObjetivo({ buckets, bucket }: { buckets: Bucket[]; bucket: "day" | "week" }) {
  const H = 190;
  const timeline = buckets.map((b) => {
    const byObj: Record<string, number> = {};
    for (const [t, n] of Object.entries(b.byTipo)) {
      const o = OBJETIVO_OF[t] ?? "outro";
      byObj[o] = (byObj[o] ?? 0) + n;
    }
    return { label: b.label, byObj };
  });
  const maxCol = Math.max(1, ...timeline.map((t) => Object.values(t.byObj).reduce((s, n) => s + n, 0)));
  const presentes = OBJETIVO_ORDER.filter((o) => timeline.some((t) => (t.byObj[o] ?? 0) > 0));

  return (
    <section className="rounded-2xl border border-line bg-panel p-5">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
        Volume no tempo · por {bucket === "day" ? "dia" : "semana"}
      </div>
      <p className="mb-4 text-[12.5px] text-muted">Quanto foi postado e de que objetivo, ao longo do período.</p>
      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px]">
        {presentes.map((o) => (
          <span key={o} className="inline-flex items-center gap-1.5 text-muted">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: OBJETIVO_COLOR[o] }} />
            {OBJETIVO_LABEL[o]}
          </span>
        ))}
      </div>
      <div className="flex items-end gap-1.5" style={{ height: H + 22 }}>
        {timeline.map((col, i) => (
          <div key={i} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <div className="flex w-full flex-col-reverse gap-[2px]" style={{ height: H }}>
              {OBJETIVO_ORDER.filter((o) => (col.byObj[o] ?? 0) > 0).map((o) => (
                <div
                  key={o}
                  className="w-full rounded-[2px]"
                  style={{ height: `${((col.byObj[o] ?? 0) / maxCol) * H}px`, background: OBJETIVO_COLOR[o] }}
                  title={`${OBJETIVO_LABEL[o]}: ${col.byObj[o]}`}
                />
              ))}
            </div>
            <span className="text-[10px] text-faint">{col.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function ConteudoPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const bucket = sp.periodo === "semana" ? "week" : "day";
  const canal = str(sp.canal);
  const compIds = (str(sp.comp) ?? "").split(",").filter(Boolean);
  const windowDays = bucket === "day" ? 14 : 56;

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

  const selectedAffs = compIds
    .map((id) => affiliates.find((a) => String(a.id) === id))
    .filter((a): a is AffiliateOption => Boolean(a));
  const compareMode = selectedAffs.length >= 2;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Conteúdo</h1>
        <p className="mt-1 text-sm text-muted">
          {compareMode
            ? "Comparando a assinatura de conteúdo dos afiliados, frente a frente"
            : "O que cada afiliado posta — por objetivo"}
        </p>
      </header>

      <CompareSelector affiliates={affiliates.map((a) => ({ id: a.id, nome: a.nome }))} />
      {!compareMode && <ChartFilter channels={channels} />}

      {error ? (
        <div className="rounded-xl border border-crit/40 bg-crit/10 p-4 text-sm text-crit">Erro ao carregar: {error}</div>
      ) : !timelines ? null : compareMode ? (
        /* ---------- MODO COMPARAÇÃO ---------- */
        <div className="grid gap-4 sm:grid-cols-2">
          {selectedAffs.map((aff) => {
            const semCanal = aff.channelIds.length === 0;
            const buckets = sumChannels(timelines!, aff.channelIds);
            const { total, composition } = compositionOf(buckets);
            const perDay = Math.round(total / windowDays);
            return (
              <section key={aff.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="mb-4 flex items-baseline justify-between border-b border-linesoft pb-3">
                  <h2 className="text-[15px] font-semibold">{aff.nome}</h2>
                  <span className="text-[12px] text-muted">
                    <b className="tabular-nums text-ink">{total}</b> posts · ~{perDay}/dia
                  </span>
                </div>
                {semCanal ? (
                  <p className="py-8 text-center text-[12.5px] text-muted">Sem canal vinculado. Vincule em Afiliados.</p>
                ) : total === 0 ? (
                  <p className="py-8 text-center text-[12.5px] text-muted">Sem posts no período.</p>
                ) : (
                  <Composicao composition={composition} showTipos={false} />
                )}
              </section>
            );
          })}
        </div>
      ) : (
        /* ---------- MODO ÚNICO (1 afiliado / canal / todos) ---------- */
        (() => {
          const single = selectedAffs[0];
          let buckets: Bucket[];
          let escopo: string;
          let semCanal = false;
          if (single) {
            escopo = single.nome;
            semCanal = single.channelIds.length === 0;
            buckets = sumChannels(timelines!, single.channelIds);
          } else if (canal) {
            const ch = timelines!.channels.find((c) => c.channelId === canal);
            buckets = ch?.buckets ?? sumChannels(timelines!, []);
            escopo = ch?.channelTitle ?? canal;
          } else {
            buckets = timelines!.aggregate;
            escopo = "todos os canais";
          }
          const { total, composition } = compositionOf(buckets);

          if (semCanal) {
            return (
              <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
                <div className="text-3xl">🔗</div>
                <div className="mt-4 font-medium">{escopo} não tem canal vinculado</div>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                  Vincule o canal do Telegram desse afiliado em <b>Afiliados</b> pra ver o conteúdo dele.
                </p>
              </div>
            );
          }
          if (total === 0) {
            return (
              <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
                <div className="text-3xl">📊</div>
                <div className="mt-4 font-medium">Sem dados no período</div>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted">
                  Quando os canais postarem (e forem categorizados), o conteúdo aparece aqui.
                </p>
              </div>
            );
          }
          return (
            <div className="flex flex-col gap-4">
              <section className="rounded-2xl border border-line bg-panel p-5">
                <div className="mb-1 flex items-baseline justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-faint">
                    Composição por objetivo · {escopo}
                  </div>
                  <div className="text-[12px] text-muted">
                    <b className="tabular-nums text-ink">{total}</b> posts
                  </div>
                </div>
                <p className="mb-4 text-[12.5px] text-muted">
                  O equilíbrio do canal: quanto é aposta, resultado, captação e relacionamento.
                </p>
                <Composicao composition={composition} />
              </section>
              <TimelineObjetivo buckets={buckets} bucket={bucket} />
            </div>
          );
        })()
      )}
    </main>
  );
}
