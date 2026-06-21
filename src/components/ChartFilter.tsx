"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type PostChannel } from "@/lib/posts";

const selectClass =
  "rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none focus:border-neutral-600";

export function ChartFilter({ channels }: { channels: PostChannel[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const periodo = params.get("periodo") === "semana" ? "semana" : "dia";

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  }

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      <select
        value={params.get("canal") ?? ""}
        onChange={(e) => setParam("canal", e.target.value)}
        className={selectClass}
      >
        <option value="">Todos os canais</option>
        {channels.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ))}
      </select>

      <div className="inline-flex overflow-hidden rounded-lg border border-neutral-800">
        {(["dia", "semana"] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setParam("periodo", opt === "dia" ? "" : opt)}
            className={`px-3 py-2 text-sm transition-colors ${
              periodo === opt
                ? "bg-violet-500/15 text-violet-200"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {opt === "dia" ? "Por dia" : "Por semana"}
          </button>
        ))}
      </div>
    </div>
  );
}
