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

  async function call(
    path: string,
    method: "POST" | "PATCH" | "DELETE",
    body: Record<string, unknown>,
  ) {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(path, {
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

  const titleOf = (id: string) => channels.find((c) => c.id === id)?.title ?? id;

  async function addAffiliate(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) return;
    const ok = await call("/api/affiliates", "POST", {
      nome,
      nicho,
      channel_id: canal || null,
      channel_title: canal ? titleOf(canal) : null,
    });
    if (ok) {
      setNome("");
      setNicho("");
      setCanal("");
      setShowAdd(false);
    }
  }

  function linkChannel(affiliateId: number, channelId: string) {
    if (!channelId) return;
    call("/api/affiliates/channels", "POST", {
      affiliate_id: affiliateId,
      channel_id: channelId,
      channel_title: titleOf(channelId),
    });
  }

  function unlinkChannel(affiliateId: number, channelId: string) {
    call("/api/affiliates/channels", "DELETE", {
      affiliate_id: affiliateId,
      channel_id: channelId,
    });
  }

  const inputCls =
    "rounded-lg border border-line bg-panel2 px-3 py-2 text-[13px] text-ink outline-none focus:border-lime/60";

  return (
    <div className="flex flex-col gap-4">
      {err && (
        <div className="rounded-lg border border-crit/40 bg-crit/10 px-3.5 py-2.5 text-[13px] text-crit">
          {err}
        </div>
      )}

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
            <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Canal (opcional)</span>
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

      {affiliates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-panel/40 p-12 text-center">
          <div className="text-2xl">🧰</div>
          <p className="mt-3 font-medium">Nenhum afiliado cadastrado</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted">
            Adicione o primeiro afiliado — depois vincule os canais do Telegram dele.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {affiliates.map((a) => {
            const linkedIds = new Set(a.channels.map((c) => c.id));
            const available = channels.filter((c) => !linkedIds.has(c.id));
            return (
              <div
                key={a.id}
                className={`rounded-xl border border-line bg-panel p-4 ${a.ativo ? "" : "opacity-55"}`}
              >
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar nome={a.nome} />
                  <div className="min-w-[140px]">
                    <div className="text-[14px] font-semibold">{a.nome}</div>
                    <div className="text-[12px] text-faint">{a.nicho || "sem nicho"}</div>
                  </div>
                  <button
                    onClick={() => call("/api/affiliates", "PATCH", { id: a.id, ativo: !a.ativo })}
                    disabled={busy}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-line px-2.5 py-1 text-[11.5px] font-semibold transition-colors"
                  >
                    <span className={`h-[7px] w-[7px] rounded-full ${a.ativo ? "bg-ok" : "bg-faint"}`} />
                    <span className={a.ativo ? "text-ok" : "text-faint"}>
                      {a.ativo ? "ativo" : "inativo"}
                    </span>
                  </button>
                </div>

                {/* canais vinculados */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-linesoft pt-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-faint">Canais</span>
                  {a.channels.length === 0 && (
                    <span className="text-[12px] text-faint">nenhum canal vinculado</span>
                  )}
                  {a.channels.map((c) => (
                    <span
                      key={c.id}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-panel2 py-1 pl-2.5 pr-1.5 text-[12px] text-ink"
                    >
                      {c.title}
                      <button
                        onClick={() => unlinkChannel(a.id, c.id)}
                        disabled={busy}
                        aria-label={`Desvincular ${c.title}`}
                        className="grid h-4 w-4 place-items-center rounded-full text-faint transition-colors hover:bg-raise hover:text-crit"
                      >
                        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {available.length > 0 && (
                    <select
                      value=""
                      disabled={busy}
                      onChange={(e) => linkChannel(a.id, e.target.value)}
                      className="rounded-full border border-dashed border-line bg-transparent px-2.5 py-1 text-[12px] text-muted outline-none focus:border-lime/60"
                    >
                      <option value="">+ vincular canal</option>
                      {available.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[12px] text-faint">
        Um afiliado pode ter vários canais (o grátis dele + um grupo compartilhado), e o mesmo
        canal pode estar em mais de um afiliado (ex: um grupo da Copa em conjunto). Os canais vêm
        da lista dos que já mandaram post.
      </p>
    </div>
  );
}
