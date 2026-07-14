import Link from "next/link";
import { getAffiliateOptions, type AffiliateOption } from "@/lib/affiliates";
import { getContentSummary, type ContentSummary } from "@/lib/analytics";
import { TIPO_LABEL } from "@/lib/taxonomy";
import { DashboardFilters } from "@/components/DashboardFilters";

export const dynamic = "force-dynamic";

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

const DIST_COLORS = ["bg-c1", "bg-c2", "bg-c4", "bg-c3", "bg-c5", "bg-c6"];

/* ---------- ícones ---------- */
function I({ d, cls = "" }: { d: string; cls?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/* ---------- KPI ---------- */
function Kpi({
  label,
  value,
  sub,
  warn,
  empty,
}: {
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  empty?: boolean;
}) {
  return (
    <div className={`flex min-h-[104px] flex-col justify-between rounded-xl border p-4 ${empty ? "border-dashed border-[#2a362e] bg-panel/40" : "border-line bg-panel"}`}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">{label}</div>
      <div className={`mt-2 text-[27px] font-bold leading-none tracking-tight tabular-nums ${empty ? "text-faint" : warn ? "text-warn" : "text-ink"}`}>{value}</div>
      <div className="mt-2.5 flex items-center gap-1.5 text-xs">
        {empty ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-faint">
            <span className="h-[5px] w-[5px] rounded-full bg-faint" /> aguardando fonte
          </span>
        ) : (
          sub && <span className="text-faint">{sub}</span>
        )}
      </div>
    </div>
  );
}

/* ---------- cabeçalho de card ---------- */
function CardHead({ d, title, cap, href }: { d: string; title: string; cap: string; href?: string }) {
  const more = (
    <span className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-muted transition-colors hover:bg-raise hover:text-lime">
      Ver a fundo <Arrow />
    </span>
  );
  return (
    <div className="flex items-center gap-2.5 border-b border-linesoft px-[18px] py-[15px]">
      <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-raise text-ok">
        <I d={d} cls="h-4 w-4" />
      </span>
      <div>
        <h2 className="text-[14.5px] font-semibold leading-tight">{title}</h2>
        <div className="mt-0.5 text-[11.5px] text-faint">{cap}</div>
      </div>
      {href ? <Link href={href}>{more}</Link> : <span className="ml-auto text-[12.5px] text-faint">em breve</span>}
    </div>
  );
}

function DistRow({ color, label, pct, n }: { color: string; label: string; pct: number; n: number }) {
  return (
    <div className="grid grid-cols-[120px_1fr_78px] items-center gap-3">
      <span className="flex items-center gap-2 text-[12.5px] text-ink">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${color}`} />
        {label}
      </span>
      <span className="h-2.5 overflow-hidden rounded-[5px] bg-raise">
        <span className={`block h-full rounded-[5px] ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </span>
      <span className="text-right text-[12.5px] text-muted">
        <b className="font-semibold text-ink">{pct}%</b> · {n}
      </span>
    </div>
  );
}

function AffRow({ av, avBg, nm, ni, dot, st }: { av: string; avBg: string; nm: string; ni: string; dot: string; st: string }) {
  return (
    <div className="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-raise">
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-[#06120c] ${avBg}`}>{av}</span>
      <span>
        <span className="text-[13px] font-medium">{nm}</span>
        <span className="ml-1 text-[11px] text-faint">{ni}</span>
      </span>
      <span className="ml-auto flex items-center gap-1.5 text-xs text-muted">
        <span className={`h-[7px] w-[7px] rounded-full ${dot}`} /> {st}
      </span>
    </div>
  );
}

/* build da distribuição real (top 5 + outros) */
function distRows(summary: ContentSummary) {
  const top = summary.byTipo.slice(0, 5);
  const restTotal = summary.byTipo.slice(5).reduce((s, t) => s + t.count, 0);
  const rows = top.map((t, i) => ({
    color: DIST_COLORS[i % DIST_COLORS.length],
    label: TIPO_LABEL[t.tipo] ?? t.tipo,
    pct: t.pct,
    n: t.count,
  }));
  if (restTotal > 0) {
    rows.push({
      color: DIST_COLORS[5],
      label: "outros",
      pct: summary.total ? Math.round((restTotal / summary.total) * 100) : 0,
      n: restTotal,
    });
  }
  return rows;
}

export default async function VisaoGeral({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const afId = typeof sp.af === "string" ? sp.af : "";
  const sinceDays = sp.periodo === "7" ? 7 : sp.periodo === "90" ? 90 : 30;

  let affiliates: AffiliateOption[] = [];
  let summary: ContentSummary = { total: 0, perDay: 0, peakHour: null, byTipo: [] };
  let selected: AffiliateOption | null = null;
  let semCanal = false;

  try {
    affiliates = await getAffiliateOptions();
    selected = afId ? affiliates.find((a) => String(a.id) === afId) ?? null : null;
    const channelIds = selected ? selected.channelIds : undefined;
    if (selected && selected.channelIds.length === 0) semCanal = true;
    summary = await getContentSummary({ channelIds, sinceDays });
  } catch {
    // banco indisponível / migração pendente: segue com valores vazios
  }

  const rows = distRows(summary);
  const escopoLabel = selected ? selected.nome : "todos os afiliados";

  return (
    <main className="flex min-w-0 flex-col">
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-line bg-ground/85 px-6 py-4 backdrop-blur">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Visão geral</h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Operação Arena · {escopoLabel} · últimos {sinceDays} dias
          </p>
        </div>
        <DashboardFilters affiliates={affiliates.map((a) => ({ id: a.id, nome: a.nome }))} />
      </header>

      <div className="flex flex-col gap-4 px-6 pb-10 pt-[22px]">
        {/* KPI strip */}
        <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <Kpi label="Leads no grupo" value="—" empty />
          <Kpi label="Gasto de tráfego" value="—" empty />
          <Kpi
            label="Posts categorizados"
            value={summary.total.toLocaleString("pt-BR")}
            sub={`${escopoLabel} · ${sinceDays}d`}
          />
          <Kpi label="Pendências no suporte" value="7" warn sub="2 acima do SLA" />
        </section>

        {/* ROW A */}
        <div className="grid gap-4 lg:grid-cols-3">
          <section className="flex flex-col rounded-xl border border-line bg-panel lg:col-span-2">
            <CardHead d="M13 2L3 14h8l-1 8 10-12h-8z" title="Últimas ações & resultados" cap="Funil de cada ação — entraram, CTR, leads, conversão" />
            <div className="p-[18px]">
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg px-6 py-6 text-center">
                <div className="mb-3.5 grid h-[42px] w-[42px] place-items-center rounded-xl border border-line bg-panel2 text-muted">
                  <I d="M22 12h-4l-3 9L9 3l-3 9H2" cls="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold">Ainda não medimos as ações</h3>
                <p className="max-w-[330px] text-[12.5px] leading-relaxed text-muted">
                  Aqui vai entrar cada ação da semana com seu funil — entraram, CTR e conversão. Falta ligar o registro de ações e o resultado dos fluxos.
                </p>
                <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-faint">
                  Conecta: <b className="font-semibold text-warn">API de campanhas do SendPulse</b> + registro de ações
                </span>
              </div>
            </div>
          </section>

          <section className="flex flex-col rounded-xl border border-line bg-panel">
            <CardHead d="M3 3v18h18M18 8l-5 5-3-3-4 4" title="Tráfego × funil" cap="Gasto vs. resultado do funil de boas-vindas" />
            <div className="p-[18px]">
              <div className="flex min-h-[200px] flex-col items-center justify-center rounded-lg px-6 py-6 text-center">
                <div className="mb-3.5 grid h-[42px] w-[42px] place-items-center rounded-xl border border-line bg-panel2 text-muted">
                  <I d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" cls="h-5 w-5" />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold">Sem custo de tráfego ainda</h3>
                <p className="max-w-[300px] text-[12.5px] leading-relaxed text-muted">
                  Vai comparar o gasto em mídia com os leads que o funil de boas-vindas gerou. Falta a fonte de gasto.
                </p>
                <span className="mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-faint">
                  Conecta: <b className="font-semibold text-warn">Meta Ads</b> + funil do SendPulse
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* ROW B */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Conteúdo — dado real */}
          <section className="flex flex-col rounded-xl border border-line bg-panel">
            <CardHead d="M3 3v18h18M7 14l3-4 3 3 4-6" title="Conteúdo no Telegram" cap={`Distribuição por tipo · ${escopoLabel}`} href="/conteudo" />
            <div className="p-[18px]">
              {semCanal ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center">
                  <div className="text-2xl">🔗</div>
                  <p className="mt-3 text-[13px] font-medium">{escopoLabel} não tem canal vinculado</p>
                  <p className="mt-1 max-w-[280px] text-[12px] text-muted">Vincule o canal do Telegram desse afiliado em Afiliados pra ver o conteúdo dele.</p>
                </div>
              ) : summary.total === 0 ? (
                <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center">
                  <div className="text-2xl">📊</div>
                  <p className="mt-3 text-[13px] font-medium">Sem posts no período</p>
                  <p className="mt-1 max-w-[280px] text-[12px] text-muted">Quando os canais postarem (e forem categorizados), a distribuição aparece aqui.</p>
                </div>
              ) : (
                <>
                  <div className="mb-[18px] flex gap-6">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[19px] font-bold tracking-tight tabular-nums">{summary.total.toLocaleString("pt-BR")}</span>
                      <span className="text-[11px] text-muted">posts no período</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[19px] font-bold tracking-tight tabular-nums">
                        ~{summary.perDay}<span className="text-[13px] font-normal text-muted">/dia</span>
                      </span>
                      <span className="text-[11px] text-muted">frequência média</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[19px] font-bold tracking-tight tabular-nums">
                        {summary.peakHour !== null ? `${String(summary.peakHour).padStart(2, "0")}h` : "—"}
                      </span>
                      <span className="text-[11px] text-muted">horário de pico</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    {rows.map((r) => (
                      <DistRow key={r.label} color={r.color} label={r.label} pct={r.pct} n={r.n} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Suporte — ainda ilustrativo (depende do mapeamento de bot do SendPulse) */}
          <section className="flex flex-col rounded-xl border border-line bg-panel">
            <CardHead d="M22 12h-4l-3 8-4-16-3 8H2" title="Saúde do bot de suporte" cap="Pendências, volume e SLA · agregado" href="/suporte" />
            <div className="p-[18px]">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[34px] font-bold leading-none tracking-tight text-warn tabular-nums">7</span>
                  <span className="text-xs text-muted">mensagens em aberto · 2 acima do SLA</span>
                </div>
                <div className="ml-auto flex gap-2">
                  <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ok"><span className="h-[7px] w-[7px] rounded-full bg-ok" />5 ok</span>
                  <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-warn"><span className="h-[7px] w-[7px] rounded-full bg-warn" />2 atenção</span>
                  <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-crit"><span className="h-[7px] w-[7px] rounded-full bg-crit" />1 crítico</span>
                </div>
              </div>
              <div className="flex flex-col gap-0.5">
                <AffRow av="R" avBg="bg-crit" nm="Gol do Rayo" ni="ao vivo" dot="bg-crit" st="4 pendências" />
                <AffRow av="B" avBg="bg-warn" nm="El Barba" ni="NBA" dot="bg-warn" st="2 pendências" />
                <AffRow av="Z" avBg="bg-warn" nm="Vitor ZZ" ni="FIFA" dot="bg-warn" st="1 pendência" />
                <AffRow av="M" avBg="bg-c1" nm="Mateus Caumo" ni="futebol" dot="bg-ok" st="em dia" />
                <AffRow av="R" avBg="bg-c3" nm="Rennan Bragança" ni="corrida" dot="bg-ok" st="em dia" />
              </div>
              <p className="mt-3 border-t border-linesoft pt-3 text-[11px] text-faint">
                Números ilustrativos — o filtro por afiliado aqui depende de mapear o bot do SendPulse de cada um.
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-wrap justify-center gap-3.5 pt-1.5 text-[11.5px] text-faint">
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-ok" /> Conteúdo: dado real, reage aos filtros</span>
          <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] border border-dashed border-[#3a463e] bg-[#2a362e]" /> Ações, Tráfego, Suporte-por-afiliado: fonte a conectar</span>
        </div>
      </div>
    </main>
  );
}
