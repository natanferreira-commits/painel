// Gráfico de linhas: tempo (data da campanha) x pessoas que entraram.
// Uma linha por afiliado. SVG puro, sem lib. A cor segue o AFILIADO (entidade),
// então não muda quando você filtra.

export type Ponto = { date: string; entered: number; campanhas: string[] };
export type Serie = { nome: string; cor: string; pontos: Ponto[] };

const W = 720;
const H = 250;
const PAD = { top: 14, right: 14, bottom: 26, left: 46 };

const fmt = (n: number) => n.toLocaleString("pt-BR");
const ddmm = (iso: string) => iso.slice(5).split("-").reverse().join("/");
const dias = (a: string, b: string) =>
  Math.round(
    (new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime()) /
      86_400_000,
  );

// escala "bonita" pro eixo Y (1/2/5 x 10^n)
function tetoBonito(v: number): number {
  if (v <= 5) return 5;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  for (const m of [1, 2, 2.5, 5, 10]) {
    if (v <= m * base) return m * base;
  }
  return 10 * base;
}

export function CampaignLineChart({ series }: { series: Serie[] }) {
  const todos = series.flatMap((s) => s.pontos);
  if (todos.length === 0) return null;

  const datas = todos.map((p) => p.date).sort();
  const minD = datas[0];
  const maxD = datas[datas.length - 1];
  const span = Math.max(1, dias(minD, maxD));
  const maxY = tetoBonito(Math.max(...todos.map((p) => p.entered), 1));

  const x = (d: string) =>
    PAD.left + (dias(minD, d) / span) * (W - PAD.left - PAD.right);
  const y = (v: number) =>
    H - PAD.bottom - (v / maxY) * (H - PAD.top - PAD.bottom);

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

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label="Pessoas que entraram em cada campanha ao longo do tempo, por afiliado"
        className="min-w-[560px]"
      >
        {/* grade + eixo Y */}
        {ticksY.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#232d27"
              strokeWidth="1"
            />
            <text x={PAD.left - 8} y={y(t) + 3.5} textAnchor="end" fontSize="10" fill="#59635b">
              {fmt(t)}
            </text>
          </g>
        ))}

        {/* eixo X */}
        {ticksX.map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize="10" fill="#59635b">
            {ddmm(d)}
          </text>
        ))}

        {/* linhas */}
        {series.map((s) => {
          const pts = [...s.pontos].sort((a, b) => a.date.localeCompare(b.date));
          if (pts.length === 0) return null;
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.date)},${y(p.entered)}`).join(" ");
          return (
            <g key={s.nome}>
              {pts.length > 1 && (
                <path d={d} fill="none" stroke={s.cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              )}
              {pts.map((p) => (
                <circle
                  key={p.date}
                  cx={x(p.date)}
                  cy={y(p.entered)}
                  r="3.5"
                  fill={s.cor}
                  stroke="#121815"
                  strokeWidth="1.5"
                >
                  <title>
                    {`${s.nome} · ${ddmm(p.date)}\n${fmt(p.entered)} entraram\n${p.campanhas.join("\n")}`}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
