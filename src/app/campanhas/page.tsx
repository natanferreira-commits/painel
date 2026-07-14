import { getCampaignFlows, getLastCampaignSync, type CampaignFlow } from "@/lib/campaigns";
import { SyncButton } from "@/components/SyncButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campanhas · ToolBox Arena",
};

function group(flows: CampaignFlow[]) {
  const byAff = new Map<string, CampaignFlow[]>();
  for (const f of flows) {
    const list = byAff.get(f.affiliateNome) ?? [];
    list.push(f);
    byAff.set(f.affiliateNome, list);
  }
  return [...byAff.entries()]
    .map(([affiliateNome, list]) => {
      const byFolder = new Map<string, CampaignFlow[]>();
      for (const f of list) {
        const key = f.folderId ?? "__none__";
        const arr = byFolder.get(key) ?? [];
        arr.push(f);
        byFolder.set(key, arr);
      }
      const folders = [...byFolder.entries()]
        .map(([key, arr], i) => ({
          key,
          label: key === "__none__" ? "Sem pasta" : `Pasta ${i + 1}`,
          flows: arr.sort((a, b) => (b.entered ?? -1) - (a.entered ?? -1)),
        }))
        .sort((a, b) => b.flows.length - a.flows.length);
      const totalEntered = list.reduce((s, f) => s + (f.entered ?? 0), 0);
      return { affiliateNome, total: list.length, totalEntered, folders };
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
  const missingTable = error?.toLowerCase().includes("campaign_flows");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="mt-1 text-sm text-muted">
            Fluxos de chatbot do SendPulse por afiliado — pessoas que iniciaram cada um
            {lastSync && (
              <>
                {" · "}sincronizado{" "}
                {new Date(lastSync).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
              </>
            )}
          </p>
        </div>
        <SyncButton />
      </header>

      {missingTable ? (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
          <p className="font-medium text-warn">Tabela de campanhas não existe ainda.</p>
          <p className="mt-1 text-muted">
            Rode a migração <code>supabase/migration_campaigns.sql</code> no Supabase.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-crit/40 bg-crit/10 p-4 text-sm text-crit">
          Erro: {error}
        </div>
      ) : flows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-3xl">🔄</div>
          <div className="mt-4 font-medium">Nada sincronizado ainda</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Cadastre a credencial do SendPulse de cada afiliado em <b>Afiliados</b> e clique em{" "}
            <b>Sincronizar</b> aqui em cima.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.affiliateNome}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold">{g.affiliateNome}</h2>
                <span className="text-[12px] text-faint">
                  {g.total} fluxos · {g.totalEntered.toLocaleString("pt-BR")} pessoas
                </span>
              </div>
              <div className="flex flex-col gap-4">
                {g.folders.map((folder) => (
                  <div key={folder.key} className="overflow-hidden rounded-2xl border border-line bg-panel">
                    <div className="flex items-center gap-2 border-b border-linesoft px-4 py-2.5">
                      <span className="text-[12.5px] font-semibold uppercase tracking-wider text-faint">
                        {folder.label}
                      </span>
                      <span className="ml-auto text-[12px] text-faint">{folder.flows.length}</span>
                    </div>
                    <ul className="divide-y divide-linesoft">
                      {folder.flows.map((f) => (
                        <li key={f.flowId} className="flex items-center gap-3 px-4 py-3">
                          <span
                            className={`h-[7px] w-[7px] shrink-0 rounded-full ${f.status === 1 ? "bg-ok" : "bg-faint"}`}
                            title={f.status === 1 ? "ativo" : "inativo"}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13.5px]">{f.name}</span>
                          <span
                            className="flex shrink-0 items-center gap-1 text-[13px] tabular-nums"
                            title={f.entryTag ? `tag de entrada: ${f.entryTag}` : "sem tag de entrada"}
                          >
                            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-faint" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8" />
                            </svg>
                            {f.entered !== null ? (
                              <b className="font-semibold text-ink">{f.entered.toLocaleString("pt-BR")}</b>
                            ) : (
                              <span className="text-faint">—</span>
                            )}
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
    </main>
  );
}
