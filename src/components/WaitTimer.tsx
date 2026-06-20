"use client";

import { useEffect, useState } from "react";
import { formatDuration, slaLevel, slaText } from "@/lib/sla";

export function WaitTimer({ since }: { since: string }) {
  // Comeca pelo tempo do servidor pra evitar mismatch de hidratacao,
  // depois passa a contar pelo relogio do browser a cada segundo.
  const [now, setNow] = useState(() => new Date(since).getTime());

  useEffect(() => {
    // setState so de forma assincrona (timeout/intervalo), pra nao disparar
    // render em cascata. O timeout(0) corrige o valor logo apos montar.
    const t = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(t);
      clearInterval(id);
    };
  }, []);

  const elapsed = Math.max(0, now - new Date(since).getTime());
  const level = slaLevel(elapsed);

  return (
    <span className={`font-mono text-xl font-medium tabular-nums ${slaText[level]}`}>
      {formatDuration(elapsed)}
    </span>
  );
}
