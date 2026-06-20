// Limiares de SLA (em ms). Ajustar quando souber o tempo aceitavel real.
export const SLA_AMBER_MS = 60 * 60 * 1000; // 1 h (alerta amarelo)
export const SLA_RED_MS = 3 * 60 * 60 * 1000; // 3 h (critico/estourado)

export type SlaLevel = "green" | "amber" | "red";

export function slaLevel(elapsedMs: number): SlaLevel {
  if (elapsedMs >= SLA_RED_MS) return "red";
  if (elapsedMs >= SLA_AMBER_MS) return "amber";
  return "green";
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// Classes Tailwind por nivel, num lugar so pra a tela e o timer baterem.
export const slaText: Record<SlaLevel, string> = {
  green: "text-emerald-400",
  amber: "text-amber-400",
  red: "text-red-400",
};

export const slaBar: Record<SlaLevel, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export const slaDot: Record<SlaLevel, string> = {
  green: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};
