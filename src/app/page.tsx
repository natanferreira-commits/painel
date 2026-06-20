import { getConversations, getFilterOptions } from "@/lib/conversations";
import { ConversationList } from "@/components/ConversationList";
import { FilterBar } from "@/components/FilterBar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { slaLevel, slaDot, type SlaLevel } from "@/lib/sla";

export const dynamic = "force-dynamic";

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

function asSla(v: string | undefined): SlaLevel | undefined {
  return v === "red" || v === "amber" || v === "green" ? v : undefined;
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
      <span className="tabular-nums text-neutral-300">{n}</span>
      <span className="text-neutral-500">{label}</span>
    </div>
  );
}

export default async function FilaPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const filters = {
    onlyWaiting: true,
    botId: str(sp.bot),
    tag: str(sp.tag),
    sla: asSla(str(sp.sla)),
    q: str(sp.q),
  };

  let conversations: Awaited<ReturnType<typeof getConversations>> = [];
  let options = { bots: [], tags: [] } as Awaited<
    ReturnType<typeof getFilterOptions>
  >;
  let error: string | null = null;

  try {
    [conversations, options] = await Promise.all([
      getConversations(filters),
      getFilterOptions(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  // eslint-disable-next-line react-hooks/purity -- hora atual por requisicao (server component)
  const now = Date.now();
  const counts = { green: 0, amber: 0, red: 0 };
  for (const c of conversations) {
    if (c.waitingSince) {
      counts[slaLevel(now - new Date(c.waitingSince).getTime())]++;
    }
  }

  return (
    <main className="relative">
      <AutoRefresh seconds={10} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-violet-600/10 to-transparent" />

      <div className="relative mx-auto max-w-3xl px-5 py-10 md:px-8">
        <header className="mb-6">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-semibold tracking-tight">
                  Fila de reembolso
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

        <FilterBar options={options} />

        {error ? (
          <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300">
            Erro ao carregar a fila: {error}
          </div>
        ) : (
          <ConversationList
            items={conversations}
            emptyLabel="Nenhuma conversa esperando resposta agora."
          />
        )}

        <footer className="mt-8 flex items-center justify-center gap-2 text-xs text-neutral-600">
          <LiveDot />
          Atualiza automaticamente a cada 10 segundos
        </footer>
      </div>
    </main>
  );
}
