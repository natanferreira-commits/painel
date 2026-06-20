"use client";

import { useEffect, useState } from "react";
import { formatDuration, slaLevel, slaText } from "@/lib/sla";

export function WaitTimer({ since }: { since: string }) {
  // Comeca pelo tempo do servidor pra evitar mismatch de hidratacao,
  // depois passa a contar pelo relogio do browser a cada segundo.
  const [now, setNow] = useState(() => new Date(since).getTime());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = Math.max(0, now - new Date(since).getTime());
  const level = slaLevel(elapsed);

  return (
    <span className={`font-mono text-xl font-medium tabular-nums ${slaText[level]}`}>
      {formatDuration(elapsed)}
    </span>
  );
}
