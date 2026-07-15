import {
  getCampaignFlows,
  getLastCampaignSync,
  CATEGORY_LABEL,
  type CampaignFlow,
  type CampaignCategory,
} from "@/lib/campaigns";
import { getAffiliateOptions, type AffiliateOption } from "@/lib/affiliates";
import { SyncButton } from "@/components/SyncButton";
import { CampaignFilters } from "@/components/CampaignFilters";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campanhas · ToolBox Arena",
};

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

const CAT_ORDER = ["aposta_segura", "boas_vindas"] as const;

// Paleta categórica validada (colorblind-safe no fundo escuro).
const CAT_COLOR: Record<string, string> = {
  aposta_segura: "#3f86c9",
  boas_vindas: "#cf7636",
};

function conversaoColor(v: number | null) {
  if (v === null) return "text-faint";
  if (v >= 10) return "text-ok";
  if (v >= 5) return "text-warn";
  return "text-crit";
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

/* ---------- barra: comprimento = entrou · preenchido = chegou ---------- */
function BarraFunil({
  entered,
  reached,
  maxEntered,
  cor,
}: {
  entered: number;
  reached: number;
  maxEntered: number;
  cor: string;
}) {
  const larguraPct = maxEntered > 0 ? (entered / maxEntered) * 100 : 0;
  const fillPct = entered > 0 ? Math.min(100, (reached / entered) * 100) : 0;
  return (
    <div className="h-3 w-full">
      <div
        className="h-3 overflow-hidden rounded-[3px] bg-raise"
        style={{ width: `${Math.max(1.5, larguraPct)}%` }}
        title={`${fmt(entered)} entraram · ${fmt(reached)} chegaram no fim`}
      >
        <div
          className="h-full rounded-[3px]"
          style={{ width: `${Math.max(fillPct > 0 ? 1.5 : 0, fillPct)}%`, background: cor }}
        />
      </div>
    </div>
  );
}

function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-faint">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-6 rounded-[3px] bg-raise" /> entraram
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2.5 w-3 rounded-[3px]" style={{ background: CAT_COLOR.aposta_segura }} />
        chegaram no fim (a parte colorida é a conversão)
      </span>
    </div>
  );
}

export default async function CampanhasPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const afId = str(sp.af);
  const catParam = str(sp.cat);
  const periodo = str(sp.periodo) ?? "30";
  const sinceDays = periodo === "tudo" ? undefined : Number(periodo) || 30;
  const category =
    catParam === "aposta_segura" || catParam === "boas_vindas"
      ? (catParam as CampaignCategory)
      : undefined;

  // Busca TODOS os afiliados (o comparativo precisa de todos, mesmo filtrando um).
  let todos: CampaignFlow[] = [];
  let lastSync: string | null = null;
  let affiliates: AffiliateOption[] = [];
  let error: string | null = null;

  try {
    [todos, lastSync, affiliates] = await Promise.all([
      getCampaignFlows({ category, sinceDays }),
      getLastCampaignSync(),
      getAffiliateOptions().catch(() => [] as AffiliateOption[]),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  const escopo = afId ? todos.filter((f) => String(f.affiliateId) === afId) : todos;

  // ---- comparativo entre afiliados ----
  const porAfiliado = (() => {
    const m = new Map<string, { nome: string; id: number; entered: number; reached: number }>();
    for (const f of todos) {
      const cur = m.get(f.affiliateNome) ?? {
        nome: f.affiliateNome,
        id: f.affiliateId,
        entered: 0,
        reached: 0,
      };
      cur.entered += f.entered ?? 0;
      cur.reached += f.reached ?? 0;
      m.set(f.affiliateNome, cur);
    }
    return [...m.values()]
      .map((a) => ({
        ...a,
        conversao: a.entered > 0 ? Math.round((a.reached / a.entered) * 1000) / 10 : null,
      }))
      .filter((a) => a.entered > 0)
      .sort((a, b) => (b.conversao ?? -1) - (a.conversao ?? -1));
  })();
  const maxEnteredAf = Math.max(1, ...porAfiliado.map((a) => a.entered));

  // ---- gráfico das campanhas (escopo atual) ----
  const grafico = [...escopo]
    .filter((f) => (f.entered ?? 0) > 0)
    .sort((a, b) => (b.entered ?? 0) - (a.entered ?? 0))
    .slice(0, 12);
  const maxEnteredCamp = Math.max(1, ...grafico.map((f) => f.entered ?? 0));

  // ---- tabela (escopo atual), agrupada por afiliado > categoria ----
  const grupos = (() => {
    const byAff = new Map<string, CampaignFlow[]>();
    for (const f of escopo) {
      const list = byAff.get(f.affiliateNome) ?? [];
      list.push(f);
      byAff.set(f.affiliateNome, list);
    }
    return [...byAff.entries()]
      .map(([affiliateNome, list]) => ({
        affiliateNome,
        total: list.length,
        totalEntered: list.reduce((s, f) => s + (f.entered ?? 0), 0),
        cats: CAT_ORDER.map((c) => ({
          key: c,
          label: CATEGORY_LABEL[c],
          flows: list
            .filter((f) => f.category === c)
            .sort((a, b) => (b.entered ?? -1) - (a.entered ?? -1)),
        })).filter((c) => c.flows.length > 0),
      }))
      .sort((a, b) => b.totalEntered - a.totalEntered);
  })();

  const faltaMigrar =
    error?.toLowerCase().includes("campaign_flows") ||
    error?.toLowerCase().includes("category") ||
    error?.toLowerCase().includes("reached") ||
    error?.toLowerCase().includes("flow_created_at");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="mt-1 text-sm text-muted">
            Aposta Segura e Boas vindas · quem entrou, quem chegou no fim e a conversão
            {lastSync && (
              <>
                {" · "}sincronizado{" "}
                {new Date(lastSync).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </>
            )}
          </p>
        </div>
        <SyncButton />
      </header>

      <CampaignFilters affiliates={affiliates.map((a) => ({ id: a.id, nome: a.nome }))} />

      {faltaMigrar ? (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
          <p className="font-medium text-warn">Falta rodar a migração.</p>
          <p className="mt-1 text-muted">
            Rode <code>supabase/migration_campaign_ctr.sql</code> no Supabase e sincronize de novo.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-crit/40 bg-crit/10 p-4 text-sm text-crit">
          Erro: {error}
        </div>
      ) : todos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-3xl">🔄</div>
          <div className="mt-4 font-medium">Nenhuma campanha nesse filtro</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Tente <b>Todas as datas</b> no período. Se ainda assim não vier nada, conecte o
            SendPulse dos afiliados em <b>Afiliados</b> e clique em <b>Sincronizar</b>.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* ---- 1. COMPARATIVO ENTRE AFILIADOS ---- */}
          {porAfiliado.length > 1 && (
            <section className="rounded-2xl border border-line bg-panel p-5">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Comparativo entre afiliados
              </div>
              <p className="mb-4 text-[12.5px] text-muted">
                Quem converte melhor no mesmo tipo de campanha. Ordenado por conversão.
              </p>
              <div className="flex flex-col gap-3.5">
                {porAfiliado.map((a) => {
                  const destaque = afId ? String(a.id) === afId : false;
                  return (
                    <div key={a.nome} className={destaque ? "" : afId ? "opacity-45" : ""}>
                      <div className="mb-1 flex items-baseline gap-2">
                        <span className="text-[13px] font-medium">{a.nome}</span>
                        <span className="ml-auto text-[12px] tabular-nums text-muted">
                          {fmt(a.entered)} → {fmt(a.reached)}
                        </span>
                        <span
                          className={`w-12 text-right text-[13px] font-semibold tabular-nums ${conversaoColor(a.conversao)}`}
                        >
                          {a.conversao !== null ? `${a.conversao}%` : "—"}
                        </span>
                      </div>
                      <BarraFunil
                        entered={a.entered}
                        reached={a.reached}
                        maxEntered={maxEnteredAf}
                        cor={CAT_COLOR.aposta_segura}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 border-t border-linesoft pt-3">
                <Legenda />
              </div>
            </section>
          )}

          {/* ---- 2. GRÁFICO DAS CAMPANHAS ---- */}
          {grafico.length > 0 && (
            <section className="rounded-2xl border border-line bg-panel p-5">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-faint">
                Campanhas {afId ? "" : "· todos os afiliados"}
              </div>
              <p className="mb-4 text-[12.5px] text-muted">
                As {grafico.length} maiores por entrada. A cor separa a categoria.
              </p>
              <div className="flex flex-col gap-3.5">
                {grafico.map((f) => (
                  <div key={f.flowId}>
                    <div className="mb-1 flex items-baseline gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                        style={{ background: CAT_COLOR[f.category] ?? "#8a938e" }}
                      />
                      <span className="min-w-0 truncate text-[13px]" title={f.name}>
                        {f.name}
                      </span>
                      {!afId && (
                        <span className="shrink-0 text-[11px] text-faint">{f.affiliateNome}</span>
                      )}
                      <span className="ml-auto shrink-0 text-[12px] tabular-nums text-muted">
                        {fmt(f.entered ?? 0)} → {fmt(f.reached ?? 0)}
                      </span>
                      <span
                        className={`w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums ${conversaoColor(f.conversao)}`}
                      >
                        {f.conversao !== null ? `${f.conversao}%` : "—"}
                      </span>
                    </div>
                    <BarraFunil
                      entered={f.entered ?? 0}
                      reached={f.reached ?? 0}
                      maxEntered={maxEnteredCamp}
                      cor={CAT_COLOR[f.category] ?? "#8a938e"}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-linesoft pt-3 text-[11.5px] text-muted">
                {CAT_ORDER.map((c) => (
                  <span key={c} className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CAT_COLOR[c] }} />
                    {CATEGORY_LABEL[c]}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* ---- 3. TABELA (a que já existia) ---- */}
          {grupos.map((g) => (
            <section key={g.affiliateNome}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold">{g.affiliateNome}</h2>
                <span className="text-[12px] text-faint">
                  {g.total} campanhas · {fmt(g.totalEntered)} pessoas
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {g.cats.map((cat) => (
                  <div key={cat.key} className="overflow-hidden rounded-2xl border border-line bg-panel">
                    <div className="flex items-center gap-2 border-b border-linesoft px-4 py-2.5">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CAT_COLOR[cat.key] }} />
                      <span className="text-[12.5px] font-semibold uppercase tracking-wider text-faint">
                        {cat.label}
                      </span>
                      <span className="ml-auto text-[12px] text-faint">{cat.flows.length}</span>
                    </div>

                    <div className="grid grid-cols-[1fr_52px_60px_60px_54px] gap-2 border-b border-linesoft px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                      <span>Campanha</span>
                      <span className="text-right">Criada</span>
                      <span className="text-right">Entrou</span>
                      <span className="text-right">Chegou</span>
                      <span className="text-right">Conv.</span>
                    </div>

                    <ul className="divide-y divide-linesoft">
                      {cat.flows.map((f) => (
                        <li
                          key={f.flowId}
                          className="grid grid-cols-[1fr_52px_60px_60px_54px] items-center gap-2 px-4 py-3"
                        >
                          <span className="min-w-0 truncate text-[13.5px]" title={f.name}>
                            {f.name}
                          </span>
                          <span className="text-right text-[11.5px] tabular-nums text-faint">
                            {f.flowCreatedAt
                              ? f.flowCreatedAt.slice(0, 10).split("-").reverse().slice(0, 2).join("/")
                              : "—"}
                          </span>
                          <span className="text-right text-[13px] tabular-nums">
                            {fmt(f.entered ?? 0)}
                          </span>
                          <span
                            className="text-right text-[13px] tabular-nums text-muted"
                            title={f.endTag ? `fim: ${f.endTag}` : "sem tag de fim"}
                          >
                            {f.reached !== null ? fmt(f.reached) : "—"}
                          </span>
                          <span
                            className={`text-right text-[13px] font-semibold tabular-nums ${conversaoColor(f.conversao)}`}
                            title="Taxa de conversão: chegou no fim ÷ entrou"
                          >
                            {f.conversao !== null ? `${f.conversao}%` : "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <p className="mt-6 text-[12px] text-faint">
        Taxa de conversão = chegou no fim ÷ entrou. O fim é a tag com &ldquo;atendimento&rdquo;;
        quando não existe, soma as tags &ldquo;apostou confirmado&rdquo;.
      </p>
    </main>
  );
}
