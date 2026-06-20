import { getConversations, getFilterOptions } from "@/lib/conversations";
import { ConversationList } from "@/components/ConversationList";
import { FilterBar } from "@/components/FilterBar";
import { AutoRefresh } from "@/components/AutoRefresh";
import { type SlaLevel } from "@/lib/sla";

export const dynamic = "force-dynamic";

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

function asSla(v: string | undefined): SlaLevel | undefined {
  return v === "red" || v === "amber" || v === "green" ? v : undefined;
}

export default async function ConversasPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const filters = {
    onlyWaiting: false,
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

  const waiting = conversations.filter((c) => c.waiting).length;

  return (
    <main className="relative">
      <AutoRefresh seconds={15} />

      <div className="relative mx-auto max-w-3xl px-5 py-10 md:px-8">
        <header className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Todas as conversas
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              Histórico completo dos 8 canais
            </p>
          </div>
          <div className="text-right">
            <div className="text-5xl font-semibold leading-none tabular-nums">
              {conversations.length}
            </div>
            <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
              {waiting} esperando
            </div>
          </div>
        </header>

        <FilterBar options={options} />

        {error ? (
          <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300">
            Erro ao carregar: {error}
          </div>
        ) : (
          <ConversationList
            items={conversations}
            emptyLabel="Nenhuma conversa encontrada com esses filtros."
          />
        )}
      </div>
    </main>
  );
}
