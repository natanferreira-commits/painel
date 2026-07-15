import {
  getCampaignFlows,
  getLastCampaignSync,
  CATEGORY_LABEL,
  type CampaignFlow,
} from "@/lib/campaigns";
import { SyncButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campanhas · ToolBox Arena",
};

const CAT_ORDER = ["aposta_segura", "boas_vindas"] as const;

function ctrColor(ctr: number | null) {
  if (ctr === null) return "text-faint";
  if (ctr >= 10) return "text-ok";
  if (ctr >= 5) return "text-warn";
  return "text-crit";
}

function group(flows: CampaignFlow[]) {
  const byAff = new Map<string, CampaignFlow[]>();
  for (const f of flows) {
    const list = byAff.get(f.affiliateNome) ?? [];
    list.push(f);
    byAff.set(f.affiliateNome, list);
  }
  return [...byAff.entries()]
    .map(([affiliateNome, list]) => {
      const cats = CAT_ORDER.map((c) => ({
        key: c,
        label: CATEGORY_LABEL[c],
        flows: list.filter((f) => f.category === c),
      })).filter((c) => c.flows.length > 0);
      const totalEntered = list.reduce((s, f) => s + (f.entered ?? 0), 0);
      return { affiliateNome, total: list.length, totalEntered, cats };
    })
    .sort((a, b) => b.totalEntered - a.totalEntered);
}

export default async function CampanhasPage() {
  let flows: CampaignFlow[] = [];
  let lastSync: string | null = null;
  let error: string | null = null;

  try {
    [flows, lastSync] = await Promise.all([getCampaignFlows(), getLastCampaignSync()]);
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  const groups = group(flows);
  const faltaMigrar =
    error?.toLowerCase().includes("campaign_flows") ||
    error?.toLowerCase().includes("category") ||
    error?.toLowerCase().includes("reached");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="mt-1 text-sm text-muted">
            Aposta Segura e Boas vindas · quem entrou, quem chegou no fim e o CTR
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
      ) : flows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-3xl">🔄</div>
          <div className="mt-4 font-medium">Nenhuma campanha com gente dentro</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Conecte o SendPulse dos afiliados em <b>Afiliados</b> e clique em <b>Sincronizar</b>.
            Fluxos zerados e fora das categorias não aparecem aqui.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {groups.map((g) => (
            <section key={g.affiliateNome}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold">{g.affiliateNome}</h2>
                <span className="text-[12px] text-faint">
                  {g.total} campanhas · {g.totalEntered.toLocaleString("pt-BR")} pessoas
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {g.cats.map((cat) => (
                  <div key={cat.key} className="overflow-hidden rounded-2xl border border-line bg-panel">
                    <div className="flex items-center gap-2 border-b border-linesoft px-4 py-2.5">
                      <span className="text-[12.5px] font-semibold uppercase tracking-wider text-faint">
                        {cat.label}
                      </span>
                      <span className="ml-auto text-[12px] text-faint">{cat.flows.length}</span>
                    </div>

                    <div className="grid grid-cols-[1fr_64px_64px_58px] gap-2 border-b border-linesoft px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wider text-faint">
                      <span>Campanha</span>
                      <span className="text-right">Entrou</span>
                      <span className="text-right">Chegou</span>
                      <span className="text-right">CTR</span>
                    </div>

                    <ul className="divide-y divide-linesoft">
                      {cat.flows.map((f) => (
                        <li
                          key={f.flowId}
                          className="grid grid-cols-[1fr_64px_64px_58px] items-center gap-2 px-4 py-3"
                        >
                          <span className="min-w-0 truncate text-[13.5px]" title={f.name}>
                            {f.name}
                          </span>
                          <span className="text-right text-[13px] tabular-nums">
                            {(f.entered ?? 0).toLocaleString("pt-BR")}
                          </span>
                          <span
                            className="text-right text-[13px] tabular-nums text-muted"
                            title={f.endTag ? `fim: ${f.endTag}` : "sem tag de fim"}
                          >
                            {f.reached !== null ? f.reached.toLocaleString("pt-BR") : "—"}
                          </span>
                          <span className={`text-right text-[13px] font-semibold tabular-nums ${ctrColor(f.ctr)}`}>
                            {f.ctr !== null ? `${f.ctr}%` : "—"}
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
        CTR = chegou no fim ÷ entrou. O fim é a tag com &ldquo;atendimento&rdquo;; quando não
        existe, soma as tags &ldquo;apostou confirmado&rdquo;. &ldquo;—&rdquo; = fluxo sem tag de
        fim identificada.
      </p>
    </main>
  );
}
