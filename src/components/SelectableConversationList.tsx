"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ConversationSummary } from "@/lib/conversations";
import { slaLevel, slaBar } from "@/lib/sla";
import { WaitTimer } from "@/components/WaitTimer";
import { formatRelativePt, initials } from "@/lib/time";
import { affiliateColors, affiliateLabel } from "@/lib/affiliate";

export function SelectableConversationList({
  items,
  now,
  emptyLabel = "Nenhuma conversa por aqui.",
}: {
  items: ConversationSummary[];
  now: number;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function dismiss() {
    if (selected.size === 0 || busy) return;
    setBusy(true);
    try {
      await fetch("/api/conversations/dismiss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactIds: [...selected] }),
      });
      setSelected(new Set());
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-14 text-center">
        <div className="text-4xl">🎉</div>
        <div className="mt-4 text-lg font-medium">Tudo limpo</div>
        <div className="mt-1 text-sm text-neutral-500">{emptyLabel}</div>
      </div>
    );
  }

  return (
    <>
      {selected.size > 0 && (
        <div className="sticky top-2 z-10 mb-3 flex items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 px-4 py-2.5 shadow-lg">
          <span className="text-sm text-neutral-300">
            <span className="font-semibold tabular-nums">{selected.size}</span>{" "}
            selecionada(s)
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelected(new Set())}
              className="rounded-lg px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
            >
              Limpar
            </button>
            <button
              onClick={dismiss}
              disabled={busy}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-60"
            >
              {busy ? "Removendo..." : "Remover da fila"}
            </button>
          </div>
        </div>
      )}

      <ul className="space-y-2.5">
        {items.map((c) => {
          const level =
            c.waiting && c.waitingSince
              ? slaLevel(now - new Date(c.waitingSince).getTime())
              : null;
          const accent = level ? slaBar[level] : "bg-neutral-700";
          const isCritical = level === "red";
          const aff = affiliateLabel(c.botName, c.botId);
          const affColor = affiliateColors(c.botId ?? c.botName ?? aff);
          const preview =
            (c.lastDirection === "out" ? "Você: " : "") + (c.lastText ?? "");
          const checked = selected.has(c.contactId);

          return (
            <li key={c.contactId} className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(c.contactId)}
                aria-label={`Selecionar conversa de ${c.contactName ?? "sem nome"}`}
                className="h-4 w-4 shrink-0 accent-violet-500"
              />
              <Link
                href={`/conversa/${encodeURIComponent(c.contactId)}`}
                className={`group relative block flex-1 overflow-hidden rounded-xl border transition-colors ${
                  checked
                    ? "border-violet-700/70 bg-violet-950/20"
                    : isCritical
                      ? "border-red-900/60 bg-red-950/20 hover:bg-red-950/30"
                      : "border-neutral-800/80 bg-neutral-900/50 hover:border-neutral-700 hover:bg-neutral-900"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-1 ${accent}`}
                />
                <div className="flex items-center gap-4 py-4 pl-6 pr-4">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium ${affColor.avatar}`}
                  >
                    {initials(c.contactName)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">
                        {c.contactName ?? "Sem nome"}
                      </span>
                      {isCritical && (
                        <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-300">
                          crítico
                        </span>
                      )}
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
                    <div className="mt-1.5">
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium ${affColor.chip}`}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3 w-3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                        {aff}
                      </span>
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
    </>
  );
}
