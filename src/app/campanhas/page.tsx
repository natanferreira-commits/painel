import { getSendpulseFlows, type SpFlow } from "@/lib/sendpulse";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Campanhas · ToolBox Arena",
};

// Agrupa por bot e, dentro do bot, por pasta (folder_id). A API do SendPulse
// não expõe o NOME da pasta, então rotulamos por enquanto.
function groupFlows(flows: SpFlow[]) {
  const byBot = new Map<string, SpFlow[]>();
  for (const f of flows) {
    const list = byBot.get(f.botName) ?? [];
    list.push(f);
    byBot.set(f.botName, list);
  }

  return [...byBot.entries()].map(([botName, list]) => {
    const byFolder = new Map<string, SpFlow[]>();
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
        flows: arr.sort(
          (a, b) => b.createdAt.localeCompare(a.createdAt),
        ),
      }))
      .sort((a, b) => b.flows.length - a.flows.length);
    return { botName, total: list.length, folders };
  });
}

export default async function CampanhasPage() {
  let flows: SpFlow[] = [];
  let error: string | null = null;
  try {
    flows = await getSendpulseFlows();
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  const groups = groupFlows(flows);
  const semCredencial = error?.includes("SENDPULSE_CLIENT");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="mt-1 text-sm text-muted">
            Fluxos de chatbot do SendPulse · conta conectada (Vitor ZZ)
          </p>
        </div>
        {!error && (
          <div className="text-right">
            <div className="text-5xl font-semibold leading-none tabular-nums">{flows.length}</div>
            <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
              fluxos
            </div>
          </div>
        )}
      </header>

      {semCredencial ? (
        <div className="rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
          <p className="font-medium text-warn">Credenciais do SendPulse não configuradas.</p>
          <p className="mt-1 text-muted">
            Adicione <code>SENDPULSE_CLIENT_ID</code> e <code>SENDPULSE_CLIENT_SECRET</code> nas
            Environment Variables da Vercel e faça um redeploy.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-xl border border-crit/40 bg-crit/10 p-4 text-sm text-crit">
          Erro ao puxar do SendPulse: {error}
        </div>
      ) : flows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-3xl">📭</div>
          <div className="mt-4 font-medium">Nenhum fluxo encontrado</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            A conta conectada não retornou fluxos de chatbot.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.botName}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-[15px] font-semibold">{g.botName}</h2>
                <span className="text-[12px] text-faint">{g.total} fluxos</span>
              </div>
              <div className="flex flex-col gap-4">
                {g.folders.map((folder) => (
                  <div key={folder.key} className="overflow-hidden rounded-2xl border border-line bg-panel">
                    <div className="flex items-center gap-2 border-b border-linesoft px-4 py-2.5">
                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-faint" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      </svg>
                      <span className="text-[12.5px] font-semibold uppercase tracking-wider text-faint">
                        {folder.label}
                      </span>
                      <span className="ml-auto text-[12px] text-faint">{folder.flows.length}</span>
                    </div>
                    <ul className="divide-y divide-linesoft">
                      {folder.flows.map((f) => (
                        <li key={f.id} className="flex items-center gap-3 px-4 py-3">
                          <span
                            className={`h-[7px] w-[7px] shrink-0 rounded-full ${f.status === 1 ? "bg-ok" : "bg-faint"}`}
                            title={f.status === 1 ? "ativo" : "inativo"}
                          />
                          <span className="min-w-0 flex-1 truncate text-[13.5px]">{f.name}</span>
                          <span className="shrink-0 text-[11.5px] tabular-nums text-faint">
                            {f.createdAt.slice(0, 10).split("-").reverse().join("/")}
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
        Por enquanto puxa só a conta do Vitor ZZ (a chave configurada). O número de pessoas por
        fluxo e os nomes das pastas entram no próximo passo.
      </p>
    </main>
  );
}
