"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Affiliate } from "@/lib/affiliates";

type Channel = { id: string; title: string };

function Avatar({ nome }: { nome: string }) {
  const letter = nome.trim().charAt(0).toUpperCase() || "?";
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-raise text-sm font-bold text-ink">
      {letter}
    </span>
  );
}

export function AffiliatesManager({
  affiliates,
  channels,
}: {
  affiliates: Affiliate[];
  channels: Channel[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [nome, setNome] = useState("");
  const [nicho, setNicho] = useState("");
  const [canal, setCanal] = useState("");

  async function call(method: "POST" | "PATCH", body: Record<string, unknown>) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/affiliates", {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "falha na operação");
      router.refresh();
      return true;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "erro desconhecido");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function addAffiliate(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const ok = await call("POST", {
      nome,
      nicho,
      telegram_channel_id: canal || null,
    });
    if (ok) {
      setNome("");
      setNicho("");
      setCanal("");
      setShowAdd(false);
    }
  }

  const linkedElsewhere = (channelId: string, self: number) =>
    affiliates.some((a) => a.id !== self && a.telegramChannelId === channelId);

  const inputCls =
    "rounded-lg border border-line bg-panel2 px-3 py-2 text-[13px] text-ink outline-none focus:border-lime/60";

  return (
    <div className="flex flex-col gap-4">
      {err && (
        <div className="rounded-lg border border-crit/40 bg-crit/10 px-3.5 py-2.5 text-[13px] text-crit">
          {err}
        </div>
      )}

      {/* barra: contagem + adicionar */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-muted">
          <span className="tabular-nums text-ink">{affiliates.length}</span>{" "}
          {affiliates.length === 1 ? "afiliado" : "afiliados"}
        </p>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-lime px-3.5 py-2 text-[13px] font-semibold text-[#06120c] transition-opacity hover:opacity-90"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Adicionar afiliado
        </button>
      </div>

      {/* form de adicionar */}
      {showAdd && (
        <form
          onSubmit={addAffiliate}
          className="grid gap-3 rounded-xl border border-line bg-panel p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Nome *</span>
            <input className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Mateus Caumo" autoFocus />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Nicho</span>
            <input className={inputCls} value={nicho} onChange={(e) => setNicho(e.target.value)} placeholder="futebol, NBA…" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Canal do Telegram</span>
            <select className={inputCls} value={canal} onChange={(e) => setCanal(e.target.value)}>
              <option value="">— vincular depois —</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={busy || !nome.trim()}
            className="rounded-lg bg-lime px-4 py-2 text-[13px] font-semibold text-[#06120c] transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            Salvar
          </button>
        </form>
      )}

      {/* lista */}
      {affiliates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-2xl">🧰</div>
          <p className="mt-3 font-medium">Nenhum afiliado cadastrado</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">
            Adicione o primeiro afiliado — depois é só vincular o canal do Telegram dele.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-linesoft overflow-hidden rounded-xl border border-line bg-panel">
          {affiliates.map((a) => (
            <div
              key={a.id}
              className={`flex flex-wrap items-center gap-4 px-4 py-3.5 ${a.ativo ? "" : "opacity-55"}`}
            >
              <Avatar nome={a.nome} />
              <div className="min-w-[140px]">
                <div className="text-[14px] font-semibold">{a.nome}</div>
                <div className="text-[12px] text-faint">{a.nicho || "sem nicho"}</div>
              </div>

              {/* vincular canal */}
              <label className="ml-auto flex items-center gap-2 text-[12px] text-muted">
                <span className="text-faint">Canal:</span>
                <select
                  className="max-w-[190px] rounded-lg border border-line bg-panel2 px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-lime/60"
                  value={a.telegramChannelId ?? ""}
                  disabled={busy}
                  onChange={(e) =>
                    call("PATCH", { id: a.id, telegram_channel_id: e.target.value || null })
                  }
                >
                  <option value="">— não vinculado —</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                      {linkedElsewhere(c.id, a.id) ? " (já usado)" : ""}
                    </option>
                  ))}
                </select>
              </label>

              {/* ativo */}
              <button
                onClick={() => call("PATCH", { id: a.id, ativo: !a.ativo })}
                disabled={busy}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
                  a.ativo
                    ? "border-line text-ok"
                    : "border-line text-faint"
                }`}
              >
                <span className={`h-[7px] w-[7px] rounded-full ${a.ativo ? "bg-ok" : "bg-faint"}`} />
                {a.ativo ? "ativo" : "inativo"}
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="text-[12px] text-faint">
        O canal do Telegram vem da lista de canais que já mandaram post. Afiliado novo que ainda
        não postou: cadastre o nome e vincule quando o primeiro post cair.
      </p>
    </div>
  );
}
