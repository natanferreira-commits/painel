"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { type FilterOptions } from "@/lib/conversations";

const selectClass =
  "rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600";

export function FilterBar({
  options,
  showSla = true,
}: {
  options: FilterOptions;
  showSla?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  // Busca por texto com debounce pra nao recarregar a cada tecla.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const id = setTimeout(() => setParam("q", q), 400);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasFilters =
    !!params.get("q") ||
    !!params.get("bot") ||
    !!params.get("tag") ||
    !!params.get("sla");

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <svg
          viewBox="0 0 24 24"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou mensagem"
          className="w-full rounded-lg border border-neutral-800 bg-neutral-900 py-2 pl-9 pr-3 text-sm text-neutral-200 outline-none placeholder:text-neutral-600 focus:border-neutral-600"
        />
      </div>

      <select
        value={params.get("bot") ?? ""}
        onChange={(e) => setParam("bot", e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os canais</option>
        {options.bots.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>

      <select
        value={params.get("tag") ?? ""}
        onChange={(e) => setParam("tag", e.target.value)}
        className={selectClass}
      >
        <option value="">Todas as tags</option>
        {options.tags.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      {showSla && (
        <select
          value={params.get("sla") ?? ""}
          onChange={(e) => setParam("sla", e.target.value)}
          className={selectClass}
        >
          <option value="">Qualquer SLA</option>
          <option value="red">Estourados</option>
          <option value="amber">Atenção</option>
          <option value="green">No prazo</option>
        </select>
      )}

      {hasFilters && (
        <button
          onClick={() => {
            setQ("");
            router.push(pathname, { scroll: false });
          }}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-400 transition-colors hover:text-neutral-200"
        >
          Limpar
        </button>
      )}
    </div>
  );
}
