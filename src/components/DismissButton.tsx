"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DismissButton({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function dismiss() {
    if (busy) return;
    setBusy(true);
    try {
      await fetch("/api/conversations/dismiss", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contactIds: [contactId] }),
      });
      router.push("/");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={dismiss}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:border-red-900/70 hover:text-red-300 disabled:opacity-60"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
      {busy ? "Removendo..." : "Remover da fila"}
    </button>
  );
}
