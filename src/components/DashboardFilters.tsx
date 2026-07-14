"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AffiliateOpt = { id: number; nome: string };

const selectCls =
  "cursor-pointer rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-ink outline-none transition-colors hover:border-[#33413a] hover:bg-panel2 focus:border-lime/60";

export function DashboardFilters({
  affiliates,
}: {
  affiliates: AffiliateOpt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const af = params.get("af") ?? "";
  const periodo = params.get("periodo") ?? "30";

  function setParam(key: string, value: string, clearDefault: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== clearDefault) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="ml-auto flex flex-wrap gap-2">
      <select
        aria-label="Afiliado"
        value={af}
        onChange={(e) => setParam("af", e.target.value, "")}
        className={selectCls}
      >
        <option value="">Todos os afiliados</option>
        {affiliates.map((a) => (
          <option key={a.id} value={String(a.id)}>
            {a.nome}
          </option>
        ))}
      </select>

      <select
        aria-label="Período"
        value={periodo}
        onChange={(e) => setParam("periodo", e.target.value, "30")}
        className={selectCls}
      >
        <option value="7">Últimos 7 dias</option>
        <option value="30">Últimos 30 dias</option>
        <option value="90">Últimos 90 dias</option>
      </select>
    </div>
  );
}
