import Link from "next/link";

export const dynamic = "force-dynamic";

/* ---------- ícones ---------- */
function I({ d, cls = "" }: { d: string; cls?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cls}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9l6 6 6-6" />
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

/* ---------- filtro (estático por enquanto) ---------- */
function FilterPill({
  k,
  v,
  avatar,
}: {
  k: string;
  v: string;
  avatar?: boolean;
}) {
  return (
    <button className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-ink transition-colors hover:border-[#33413a] hover:bg-panel2">
      {avatar && (
        <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-c1 text-[9px] font-bold text-[#06120c]">
          T
        </span>
      )}
      <span>
        <span className="text-[11px] text-faint">{k}</span> &nbsp;{v}
      </span>
      <Chevron />
    </button>
  );
}

/* ---------- KPI ---------- */
function Kpi({
  label,
  value,
  delta,
  deltaUp,
  sub,
  warn,
  empty,
}: {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  sub?: string;
  warn?: boolean;
  empty?: boolean;
}) {
  return (
    <div
      className={`flex min-h-[104px] flex-col justify-between rounded-xl border p-4 ${
        empty
          ? "border-dashed border-[#2a362e] bg-panel/40"
          : "border-line bg-panel"
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted">
        {label}
      </div>
      <div
        className={`mt-2 text-[27px] font-bold leading-none tracking-tight tabular-nums ${
          empty ? "text-faint" : warn ? "text-warn" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-2.5 flex items-center gap-1.5 text-xs">
        {empty ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[11px] text-faint">
            <span className="h-[5px] w-[5px] rounded-full bg-faint" /> aguardando fonte
          </span>
        ) : (
          <>
            {delta && (
              <span
                className={`inline-flex items-center gap-1 font-semibold ${
                  deltaUp ? "text-ok" : "text-warn"
                }`}
              >
                {deltaUp && <span aria-hidden>▲</span>}
                {delta}
              </span>
            )}
            {sub && <span className="text-faint">{sub}</span>}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- cabeçalho de card ---------- */
function CardHead({
  d,
  title,
  cap,
  href,
}: {
  d: string;
  title: string;
  cap: string;
  href?: string;
}) {
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

/* ---------- distribuição de conteúdo ---------- */
function DistRow({
  color,
  label,
  pct,
  n,
}: {
  color: string;
  label: string;
  pct: number;
  n: number;
}) {
  return (
    <div className="grid grid-cols-[120px_1fr_78px] items-center gap-3">
      <span className="flex items-center gap-2 text-[12.5px] text-ink">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-[3px] ${color}`} />
        {label}
      </span>
      <span className="h-2.5 overflow-hidden rounded-[5px] bg-raise">
        <span className={`block h-full rounded-[5px] ${color}`} style={{ width: `${pct}%` }} />
      </span>
      <span className="text-right text-[12.5px] text-muted">
        <b className="font-semibold text-ink">{pct}%</b> · {n}
      </span>
    </div>
  );
}

/* ---------- afiliado (saúde) ---------- */
function AffRow({
  av,
  avBg,
  nm,
  ni,
  dot,
  st,
}: {
  av: string;
  avBg: string;
  nm: string;
  ni: string;
  dot: string;
  st: string;
}) {
  return (
    <div className="flex cursor-pointer items-center gap-3 rounded-lg px-1.5 py-2 transition-colors hover:bg-raise">
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-[#06120c] ${avBg}`}>
        {av}
      </span>
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

export default function VisaoGeral() {
  return (
    <main className="flex min-w-0 flex-col">
      {/* topbar */}
      <header className="sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-line bg-ground/85 px-6 py-4 backdrop-blur">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Visão geral</h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            Operação Arena · 8 afiliados · últimos 30 dias
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <FilterPill k="Afiliado" v="Todos" avatar />
          <FilterPill k="Período" v="30 dias" />
        </div>
      </header>

      <div className="flex flex-col gap-4 px-6 pb-10 pt-[22px]">
        {/* KPI strip */}
        <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          <Kpi label="Leads no grupo" value="3.412" delta="9%" deltaUp sub="vs. período anterior" />
          <Kpi label="Gasto de tráfego" value="—" empty />
          <Kpi label="Posts categorizados" value="1.284" delta="12%" deltaUp sub="vs. período anterior" />
          <Kpi label="Pendências no suporte" value="7" warn delta="2 acima do SLA" />
        </section>

        {/* ROW A */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Ações & resultados — empty */}
          <section className="flex flex-col rounded-xl border border-line bg-panel lg:col-span-2">
            <CardHead
              d="M13 2L3 14h8l-1 8 10-12h-8z"
              title="Últimas ações & resultados"
              cap="Funil de cada ação — entraram, CTR, leads, conversão"
            />
            <div className="p-[18px]">
              <div className="relative flex min-h-[210px] flex-col items-center justify-center overflow-hidden rounded-lg px-6 py-6 text-center">
                {/* ghost table */}
                <div className="pointer-events-none absolute inset-0 opacity-30">
                  <div className="grid grid-cols-5 gap-3 border-b border-linesoft px-3.5 pb-3 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                    <span>Ação</span>
                    <span className="text-right">Entraram</span>
                    <span className="text-right">CTR</span>
                    <span className="text-right">Leads</span>
                    <span className="text-right">Conversão</span>
                  </div>
                  {[150, 120, 170].map((w, i) => (
                    <div key={i} className="grid grid-cols-5 items-center gap-3 border-b border-linesoft px-3.5 py-3.5">
                      <span className="h-2.5 rounded bg-raise" style={{ width: w }} />
                      {[0, 1, 2, 3].map((j) => (
                        <span key={j} className="ml-auto h-2.5 w-11 rounded bg-raise" />
                      ))}
                    </div>
                  ))}
                </div>
                {/* message */}
                <div className="relative mb-3.5 grid h-[42px] w-[42px] place-items-center rounded-xl border border-line bg-panel2 text-muted">
                  <I d="M22 12h-4l-3 9L9 3l-3 9H2" cls="h-5 w-5" />
                </div>
                <h3 className="relative mb-1.5 text-sm font-semibold">Ainda não medimos as ações</h3>
                <p className="relative max-w-[330px] text-[12.5px] leading-relaxed text-muted">
                  Aqui vai entrar cada ação da semana com seu funil — quantos entraram, CTR e conversão. Falta ligar o registro de ações e o resultado dos fluxos.
                </p>
                <span className="relative mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-faint">
                  Conecta: <b className="font-semibold text-warn">API de campanhas do SendPulse</b> + registro de ações
                </span>
              </div>
            </div>
          </section>

          {/* Tráfego × funil — empty */}
          <section className="flex flex-col rounded-xl border border-line bg-panel">
            <CardHead
              d="M3 3v18h18M18 8l-5 5-3-3-4 4"
              title="Tráfego × funil"
              cap="Gasto vs. resultado do funil de boas-vindas"
            />
            <div className="p-[18px]">
              <div className="relative flex min-h-[210px] flex-col items-center justify-center overflow-hidden rounded-lg px-6 py-6 text-center">
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4 px-4 opacity-30">
                  {["64%", "82%", "38%"].map((w, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="h-2.5 w-[70px] shrink-0 rounded bg-raise" />
                      <span className="h-[22px] rounded-md bg-raise" style={{ width: w }} />
                    </div>
                  ))}
                </div>
                <div className="relative mb-3.5 grid h-[42px] w-[42px] place-items-center rounded-xl border border-line bg-panel2 text-muted">
                  <I d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" cls="h-5 w-5" />
                </div>
                <h3 className="relative mb-1.5 text-sm font-semibold">Sem custo de tráfego ainda</h3>
                <p className="relative max-w-[300px] text-[12.5px] leading-relaxed text-muted">
                  Vai comparar o quanto foi gasto em mídia com os leads que o funil de boas-vindas gerou. Falta a fonte de gasto.
                </p>
                <span className="relative mt-3.5 inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11px] text-faint">
                  Conecta: <b className="font-semibold text-warn">Meta Ads</b> + funil do SendPulse
                </span>
              </div>
            </div>
          </section>
        </div>

        {/* ROW B */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Conteúdo — live */}
          <section className="flex flex-col rounded-xl border border-line bg-panel">
            <CardHead
              d="M3 3v18h18M7 14l3-4 3 3 4-6"
              title="Conteúdo no Telegram"
              cap="Distribuição por tipo de post · agregado"
              href="/conteudo"
            />
            <div className="p-[18px]">
              <div className="mb-[18px] flex gap-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[19px] font-bold tracking-tight tabular-nums">1.284</span>
                  <span className="text-[11px] text-muted">posts no período</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[19px] font-bold tracking-tight tabular-nums">
                    ~46<span className="text-[13px] font-normal text-muted">/dia</span>
                  </span>
                  <span className="text-[11px] text-muted">frequência média</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[19px] font-bold tracking-tight tabular-nums">19h–21h</span>
                  <span className="text-[11px] text-muted">janela de pico</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                <DistRow color="bg-c1" label="Análise / stats" pct={34} n={437} />
                <DistRow color="bg-c2" label="Dica / palpite" pct={28} n={359} />
                <DistRow color="bg-c4" label="Bônus / promo" pct={14} n={180} />
                <DistRow color="bg-c3" label="Prova social" pct={12} n={154} />
                <DistRow color="bg-c5" label="CTA cadastro" pct={8} n={103} />
                <DistRow color="bg-c6" label="Interação / outros" pct={4} n={51} />
              </div>
            </div>
          </section>

          {/* Suporte — live */}
          <section className="flex flex-col rounded-xl border border-line bg-panel">
            <CardHead
              d="M22 12h-4l-3 8-4-16-3 8H2"
              title="Saúde do bot de suporte"
              cap="Pendências, volume e SLA · agregado"
              href="/suporte"
            />
            <div className="p-[18px]">
              <div className="mb-4 flex items-start gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[34px] font-bold leading-none tracking-tight text-warn tabular-nums">7</span>
                  <span className="text-xs text-muted">mensagens em aberto · 2 acima do SLA</span>
                </div>
                <div className="ml-auto flex gap-2">
                  <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-ok">
                    <span className="h-[7px] w-[7px] rounded-full bg-ok" />5 ok
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-warn">
                    <span className="h-[7px] w-[7px] rounded-full bg-warn" />2 atenção
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold text-crit">
                    <span className="h-[7px] w-[7px] rounded-full bg-crit" />1 crítico
                  </span>
                </div>
              </div>

              <div className="mb-3.5 rounded-lg border border-linesoft bg-panel2 px-3.5 py-3.5">
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Volume de mensagens · 24h
                  </span>
                  <span className="text-[11.5px] font-semibold text-warn">pico 21h · 142 msg</span>
                </div>
                <svg viewBox="0 0 320 66" width="100%" height="66" preserveAspectRatio="none" role="img" aria-label="Volume de mensagens nas últimas 24 horas, pico às 21h">
                  <defs>
                    <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#46B27C" stopOpacity="0.38" />
                      <stop offset="1" stopColor="#46B27C" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,54 L18,52 L36,50 L54,46 L72,48 L90,42 L108,44 L126,38 L144,40 L162,33 L180,36 L198,28 L216,30 L234,20 L252,8 L270,22 L288,30 L306,34 L320,32 L320,66 L0,66 Z" fill="url(#sg)" />
                  <path d="M0,54 L18,52 L36,50 L54,46 L72,48 L90,42 L108,44 L126,38 L144,40 L162,33 L180,36 L198,28 L216,30 L234,20 L252,8 L270,22 L288,30 L306,34 L320,32" fill="none" stroke="#46B27C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="252" cy="8" r="3.4" fill="#E8A33D" stroke="#121815" strokeWidth="1.5" />
                </svg>
              </div>

              <div className="flex flex-col gap-0.5">
                <AffRow av="R" avBg="bg-crit" nm="Rayo" ni="ao vivo" dot="bg-crit" st="4 pendências" />
                <AffRow av="B" avBg="bg-warn" nm="Barba" ni="NBA" dot="bg-warn" st="2 pendências" />
                <AffRow av="Z" avBg="bg-warn" nm="ZZ" ni="FIFA" dot="bg-warn" st="1 pendência" />
                <AffRow av="M" avBg="bg-c1" nm="Mateus" ni="futebol" dot="bg-ok" st="em dia" />
                <AffRow av="R" avBg="bg-c3" nm="Rennan" ni="corrida" dot="bg-ok" st="em dia" />
              </div>
            </div>
          </section>
        </div>

        {/* legenda */}
        <div className="flex flex-wrap justify-center gap-3.5 pt-1.5 text-[11.5px] text-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px] bg-ok" /> Dado ao vivo — Conteúdo e Suporte já têm pipeline
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-[2px] border border-dashed border-[#3a463e] bg-[#2a362e]" /> Empty state — fonte a conectar (Campanhas, Tráfego)
          </span>
        </div>
      </div>
    </main>
  );
}
