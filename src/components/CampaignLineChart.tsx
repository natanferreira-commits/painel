"use client";

import { useState } from "react";

// Gráfico de linhas: tempo (data da campanha) x pessoas que entraram.
// Uma linha por afiliado. A cor segue o AFILIADO (entidade), então não muda
// quando você filtra. Hover no ponto abre os dados da(s) campanha(s) do dia.

export type CampanhaInfo = {
  nome: string;
  entered: number;
  reached: number | null;
  conversao: number | null;
};
export type Ponto = {
  date: string;
  entered: number;
  reached: number;
  conversao: number | null;
  campanhas: CampanhaInfo[];
};
export type Serie = { nome: string; cor: string; pontos: Ponto[] };

const W = 720;
const H = 250;
const PAD = { top: 14, right: 14, bottom: 26, left: 46 };

const fmt = (n: number) => n.toLocaleString("pt-BR");
const ddmm = (iso: string) => iso.slice(5).split("-").reverse().join("/");
const dataBR = (iso: string) => iso.split("-").reverse().join("/");
const dias = (a: string, b: string) =>
  Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) /
      86_400_000,
  );

function tetoBonito(v: number): number {
  if (v <= 5) return 5;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * base) return m * base;
  return 10 * base;
}

function corConversao(v: number | null) {
  if (v === null) return "text-faint";
  if (v >= 10) return "text-ok";
  if (v >= 5) return "text-warn";
  return "text-crit";
}

type Hover = { serie: Serie; ponto: Ponto; x: number; y: number };

export function CampaignLineChart({ series }: { series: Serie[] }) {
  const [hover, setHover] = useState<Hover | null>(null);

  const todos = series.flatMap((s) => s.pontos);
  if (todos.length === 0) return null;

  const datas = todos.map((p) => p.date).sort();
  const minD = datas[0];
  const maxD = datas[datas.length - 1];
  const span = Math.max(1, dias(minD, maxD));
  const maxY = tetoBonito(Math.max(...todos.map((p) => p.entered), 1));

  const x = (d: string) => PAD.left + (dias(minD, d) / span) * (W - PAD.left - PAD.right);
  const y = (v: number) => H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);

  const ticksY = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));
  const passoX = Math.max(1, Math.ceil(span / 6));
  const ticksX: string[] = [];
  for (let i = 0; i <= span; i += passoX) {
    ticksX.push(
      new Date(new Date(`${minD}T00:00:00Z`).getTime() + i * 86_400_000)
        .toISOString()
        .slice(0, 10),
    );
  }

  // vira o cartão pro outro lado quando o ponto está perto da borda direita
  const flip = hover ? hover.x > W * 0.58 : false;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label="Pessoas que entraram em cada campanha ao longo do tempo, por afiliado"
      >
        {ticksY.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#232d27" strokeWidth="1" />
            <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#59635b">
              {fmt(t)}
            </text>
          </g>
        ))}

        {ticksX.map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize="10" fill="#59635b">
            {ddmm(d)}
          </text>
        ))}

        {series.map((s) => {
          const pts = [...s.pontos].sort((a, b) => a.date.localeCompare(b.date));
          if (pts.length === 0) return null;
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date)},${y(p.entered)}`).join(" ");
          const apagado = hover && hover.serie.nome !== s.nome;
          return (
            <g key={s.nome} opacity={apagado ? 0.25 : 1}>
              {pts.length > 1 && (
                <path
                  d={d}
                  fill="none"
                  stroke={s.cor}
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}
              {pts.map((p) => {
                const ativo = hover?.serie.nome === s.nome && hover?.ponto.date === p.date;
                return (
                  <circle
                    key={p.date}
                    cx={x(p.date)}
                    cy={y(p.entered)}
                    r={ativo ? 6 : 3.5}
                    fill={s.cor}
                    stroke="#121815"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-[r]"
                    onMouseEnter={() =>
                      setHover({ serie: s, ponto: p, x: x(p.date), y: y(p.entered) })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 w-[228px] rounded-lg border border-line bg-[#0f1613] p-3 shadow-xl"
          style={{
            left: `${(hover.x / W) * 100}%`,
            top: `${(hover.y / H) * 100}%`,
            transform: `translate(${flip ? "calc(-100% - 10px)" : "10px"}, -50%)`,
          }}
        >
          <div className="mb-2 flex items-center gap-1.5 border-b border-linesoft pb-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: hover.serie.cor }} />
            <span className="truncate text-[12.5px] font-semibold">{hover.serie.nome}</span>
            <span className="ml-auto shrink-0 text-[11.5px] tabular-nums text-faint">
              {dataBR(hover.ponto.date)}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {hover.ponto.campanhas.map((c) => (
              <div key={c.nome}>
                <div className="mb-1 truncate text-[12px] text-ink" title={c.nome}>
                  {c.nome}
                </div>
                <div className="flex items-baseline justify-between text-[11.5px]">
                  <span className="text-muted">entradas</span>
                  <span className="font-semibold tabular-nums">{fmt(c.entered)}</span>
                </div>
                <div className="flex items-baseline justify-between text-[11.5px]">
                  <span className="text-muted">chegaram no fim</span>
                  <span className="tabular-nums text-muted">
                    {c.reached !== null ? fmt(c.reached) : "—"}
                  </span>
                </div>
                <div className="flex items-baseline justify-between text-[11.5px]">
                  <span className="text-muted">engajamento</span>
                  <span className={`font-semibold tabular-nums ${corConversao(c.conversao)}`}>
                    {c.conversao !== null ? `${c.conversao}%` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {hover.ponto.campanhas.length > 1 && (
            <div className="mt-2 flex items-baseline justify-between border-t border-linesoft pt-2 text-[11.5px]">
              <span className="text-faint">total do dia</span>
              <span className="font-semibold tabular-nums">{fmt(hover.ponto.entered)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
