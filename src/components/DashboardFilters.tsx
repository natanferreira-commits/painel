"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AffiliateOpt = { id: number; nome: string };

const controlCls =
  "cursor-pointer rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-ink outline-none transition-colors hover:border-[#33413a] hover:bg-panel2 focus:border-lime/60";

function isoDaysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

export function DashboardFilters({
  affiliates,
  de,
  ate,
}: {
  affiliates: AffiliateOpt[];
  de: string;
  ate: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function push(updates: Record<string, string>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  const hoje = isoDaysAgo(0);

  // Atalhos: mantêm o calendário como fonte da verdade, só preenchem as datas.
  const atalhos: { label: string; dias: number }[] = [
    { label: "7d", dias: 7 },
    { label: "30d", dias: 30 },
    { label: "90d", dias: 90 },
  ];
  const diasAtual =
    Math.round(
      (new Date(`${ate}T00:00:00Z`).getTime() - new Date(`${de}T00:00:00Z`).getTime()) /
        86_400_000,
    ) + 1;

  return (
    <div className="ml-auto flex flex-wrap items-center gap-2">
      <select
        aria-label="Afiliado"
        value={params.get("af") ?? ""}
        onChange={(e) => push({ af: e.target.value })}
        className={controlCls}
      >
        <option value="">Todos os afiliados</option>
        {affiliates.map((a) => (
          <option key={a.id} value={String(a.id)}>
            {a.nome}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5 rounded-lg border border-line bg-panel px-2.5 py-1.5">
        <input
          type="date"
          aria-label="Data inicial"
          value={de}
          max={ate}
          onChange={(e) => push({ de: e.target.value })}
          className="bg-transparent text-[13px] text-ink outline-none [color-scheme:dark]"
        />
        <span className="text-[12px] text-faint">até</span>
        <input
          type="date"
          aria-label="Data final"
          value={ate}
          min={de}
          max={hoje}
          onChange={(e) => push({ ate: e.target.value })}
          className="bg-transparent text-[13px] text-ink outline-none [color-scheme:dark]"
        />
      </div>

      <div className="inline-flex overflow-hidden rounded-lg border border-line">
        {atalhos.map((a) => {
          const ativo = ate === hoje && diasAtual === a.dias;
          return (
            <button
              key={a.label}
              onClick={() => push({ de: isoDaysAgo(a.dias - 1), ate: hoje })}
              className={`px-2.5 py-2 text-[12.5px] transition-colors ${
                ativo ? "bg-lime/10 text-lime" : "text-muted hover:text-ink"
              }`}
            >
              {a.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
