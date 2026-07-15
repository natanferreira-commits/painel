"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AffiliateOpt = { id: number; nome: string };

const selectCls =
  "cursor-pointer rounded-lg border border-line bg-panel px-3 py-2 text-[13px] text-ink outline-none transition-colors hover:border-[#33413a] hover:bg-panel2 focus:border-lime/60";

export function CampaignFilters({
  affiliates,
}: {
  affiliates: AffiliateOpt[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setParam(key: string, value: string, defaultValue: string) {
    const next = new URLSearchParams(params.toString());
    if (value && value !== defaultValue) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      <select
        aria-label="Afiliado"
        value={params.get("af") ?? ""}
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
        aria-label="Categoria"
        value={params.get("cat") ?? ""}
        onChange={(e) => setParam("cat", e.target.value, "")}
        className={selectCls}
      >
        <option value="">Todas as categorias</option>
        <option value="aposta_segura">Aposta Segura</option>
        <option value="boas_vindas">Boas vindas</option>
      </select>

      <select
        aria-label="Período"
        value={params.get("periodo") ?? "30"}
        onChange={(e) => setParam("periodo", e.target.value, "30")}
        className={selectCls}
      >
        <option value="7">Campanhas dos últimos 7 dias</option>
        <option value="30">Campanhas dos últimos 30 dias</option>
        <option value="90">Campanhas dos últimos 90 dias</option>
        <option value="tudo">Todas as datas</option>
      </select>
    </div>
  );
}
