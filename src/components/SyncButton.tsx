"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function sync() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/campaigns/sync", { method: "POST" });
      const j = await res.json();
      if (!res.ok || !j.ok) throw new Error(j.error || "falha");
      const okCount = (j.results ?? []).filter(
        (r: { erro?: string }) => !r.erro,
      ).length;
      setMsg(`${okCount}/${j.contas} conta(s) sincronizada(s)`);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-[12px] text-muted">{msg}</span>}
      <button
        onClick={sync}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-3 py-2 text-[13px] font-medium text-ink transition-colors hover:border-[#33413a] hover:bg-panel2 disabled:opacity-50"
      >
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 ${busy ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
        </svg>
        {busy ? "Sincronizando…" : "Sincronizar"}
      </button>
    </div>
  );
}
