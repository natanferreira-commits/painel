import { getWaitingConversations, type WaitingConversation } from "@/lib/queue";
import { WaitTimer } from "@/components/WaitTimer";
import { AutoRefresh } from "@/components/AutoRefresh";
import { slaLevel, slaBar, slaDot, type SlaLevel } from "@/lib/sla";

export const dynamic = "force-dynamic";

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

function LiveDot() {
  return (
    <span className="relative flex h-2 w-2">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
    </span>
  );
}

function SlaPill({
  level,
  label,
  n,
}: {
  level: SlaLevel;
  label: string;
  n: number;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/60 px-3 py-1">
      <span className={`h-2 w-2 rounded-full ${slaDot[level]}`} />
      <span className="text-neutral-300 tabular-nums">{n}</span>
      <span className="text-neutral-500">{label}</span>
    </div>
  );
}

export default async function Home() {
  let conversations: WaitingConversation[] = [];
  let error: string | null = null;

  try {
    conversations = await getWaitingConversations();
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  const now = Date.now();
  const counts = { green: 0, amber: 0, red: 0 };
  for (const c of conversations) {
    counts[slaLevel(now - new Date(c.waitingSince).getTime())]++;
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100">
      <AutoRefresh seconds={10} />
      {/* brilho sutil no topo */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-gradient-to-b from-violet-600/10 to-transparent" />

      <div className="relative mx-auto max-w-3xl px-5 py-10">
        <header className="mb-7">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Central de Reembolso
                </h1>
                <LiveDot />
              </div>
              <p className="mt-1 text-sm text-neutral-500">
                Conversas esperando resposta &middot; 8 canais
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-semibold leading-none tabular-nums">
                {conversations.length}
              </div>
              <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
                na fila
              </div>
            </div>
          </div>

          {conversations.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
              <SlaPill level="red" label="estourados" n={counts.red} />
              <SlaPill level="amber" label="atenção" n={counts.amber} />
              <SlaPill level="green" label="no prazo" n={counts.green} />
            </div>
          )}
        </header>

        {error && (
          <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300">
            Erro ao carregar a fila: {error}
          </div>
        )}

        {!error && conversations.length === 0 && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-14 text-center">
            <div className="text-4xl">🎉</div>
            <div className="mt-4 text-lg font-medium">Fila zerada</div>
            <div className="mt-1 text-sm text-neutral-500">
              Nenhuma conversa esperando resposta agora.
            </div>
          </div>
        )}

        {!error && conversations.length > 0 && (
          <ul className="space-y-2.5">
            {conversations.map((c) => {
              const level = slaLevel(
                now - new Date(c.waitingSince).getTime(),
              );
              return (
                <li
                  key={c.contactId}
                  className="group relative overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-900/50 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
                >
                  <span
                    aria-hidden
                    className={`absolute inset-y-0 left-0 w-1 ${slaBar[level]}`}
                  />
                  <div className="flex items-center gap-4 py-4 pl-6 pr-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-sm font-medium text-neutral-300">
                      {initials(c.contactName)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium">
                          {c.contactName ?? "Sem nome"}
                        </span>
                        {c.flowTag && (
                          <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
                            {c.flowTag}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-neutral-400">
                        {c.lastText ?? "(sem texto)"}
                      </p>
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-neutral-500">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {c.botName ?? c.botId ?? "canal desconhecido"}
                      </div>
                    </div>

                    <div className="shrink-0 pl-2 text-right">
                      <WaitTimer since={c.waitingSince} />
                      <div className="mt-0.5 text-xs text-neutral-500">
                        esperando
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-600">
          <LiveDot />
          Atualiza automaticamente a cada 10 segundos
        </footer>
      </div>
    </main>
  );
}
