import Link from "next/link";
import { notFound } from "next/navigation";
import { getConversationDetail } from "@/lib/conversations";
import { WaitTimer } from "@/components/WaitTimer";
import { formatTimePt, initials } from "@/lib/time";
import { affiliateColors, affiliateLabel } from "@/lib/affiliate";
import { DismissButton } from "@/components/DismissButton";

export const dynamic = "force-dynamic";

export default async function ConversaPage({
  params,
}: {
  params: Promise<{ contactId: string }>;
}) {
  const { contactId } = await params;
  const convo = await getConversationDetail(contactId);
  if (!convo) notFound();

  const aff = affiliateLabel(convo.botName, convo.botId);
  const affColor = affiliateColors(convo.botId ?? convo.botName ?? aff);

  return (
    <main className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-5 py-8 md:px-8">
      <div className="mb-5 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
          Voltar para a fila
        </Link>
        <DismissButton contactId={convo.contactId} />
      </div>

      <header className="mb-6 flex items-center gap-4 border-b border-neutral-800 pb-5">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-medium ${affColor.avatar}`}
        >
          {initials(convo.contactName)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-lg font-semibold">
              {convo.contactName ?? "Sem nome"}
            </h1>
            {convo.flowTag && (
              <span className="shrink-0 rounded-full bg-violet-500/15 px-2 py-0.5 text-xs font-medium text-violet-300">
                {convo.flowTag}
              </span>
            )}
          </div>
          <div className="mt-1">
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${affColor.chip}`}
            >
              {aff}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          {convo.waiting && convo.waitingSince ? (
            <>
              <WaitTimer since={convo.waitingSince} />
              <div className="mt-0.5 text-xs text-neutral-500">esperando</div>
            </>
          ) : (
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              respondido
            </span>
          )}
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-3">
        {convo.messages.map((m) => {
          const out = m.direction === "out";
          return (
            <div
              key={m.id}
              className={`flex flex-col ${out ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                  out
                    ? "bg-violet-600 text-white"
                    : "bg-neutral-800 text-neutral-100"
                }`}
              >
                {m.text ?? <span className="opacity-60">(sem texto)</span>}
              </div>
              <div className="mt-1 px-1 text-[11px] text-neutral-600">
                {out && m.operatorName ? `${m.operatorName} · ` : ""}
                {formatTimePt(m.occurredAt)}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
