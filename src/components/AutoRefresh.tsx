"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Recarrega os dados do servidor de tempos em tempos, sem recarregar a pagina.
// Versao simples enquanto nao ligamos o Realtime do Supabase.
export function AutoRefresh({ seconds = 10 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(id);
  }, [router, seconds]);
  return null;
}
