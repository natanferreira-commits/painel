import Link from "next/link";
import { type ConversationSummary } from "@/lib/conversations";
import { slaLevel, slaBar } from "@/lib/sla";
import { WaitTimer } from "@/components/WaitTimer";
import { formatRelativePt, initials } from "@/lib/time";

export function ConversationList({
  items,
  emptyLabel = "Nenhuma conversa por aqui.",
}: {
  items: ConversationSummary[];
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-14 text-center">
        <div className="text-4xl">🎉</div>
        <div className="mt-4 text-lg font-medium">Tudo limpo</div>
        <div className="mt-1 text-sm text-neutral-500">{emptyLabel}</div>
      </div>
    );
  }

  // eslint-disable-next-line react-hooks/purity -- hora atual por requisicao (server component)
  const now = Date.now();

  return (
    <ul className="space-y-2.5">
      {items.map((c) => {
        const level =
          c.waiting && c.waitingSince
            ? slaLevel(now - new Date(c.waitingSince).getTime())
            : null;
        const accent = level ? slaBar[level] : "bg-neutral-700";
        const preview =
          (c.lastDirection === "out" ? "Você: " : "") + (c.lastText ?? "");

        return (
          <li key={c.contactId}>
            <Link
              href={`/conversa/${encodeURIComponent(c.contactId)}`}
              className="group relative block overflow-hidden rounded-xl border border-neutral-800/80 bg-neutral-900/50 transition-colors hover:border-neutral-700 hover:bg-neutral-900"
            >
              <span
                aria-hidden
                className={`absolute inset-y-0 left-0 w-1 ${accent}`}
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
                    <span className="shrink-0 text-xs text-neutral-600">
                      {c.messageCount} msg
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-sm text-neutral-400">
                    {preview || "(sem texto)"}
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
                  {c.waiting && c.waitingSince ? (
                    <>
                      <WaitTimer since={c.waitingSince} />
                      <div className="mt-0.5 text-xs text-neutral-500">
                        esperando
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-sm text-neutral-400">
                        {formatRelativePt(c.lastAt, now)}
                      </div>
                      <div className="mt-0.5 text-xs text-emerald-500/80">
                        respondido
                      </div>
                    </>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
