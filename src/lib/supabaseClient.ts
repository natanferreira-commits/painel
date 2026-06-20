import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Cliente de browser (anon key), pra o painel ler dados e assinar Realtime.
// Usado na Fase 1 (Modulo B v1). Respeita RLS.
let cached: SupabaseClient | null = null;

export function getSupabaseBrowser(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase nao configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local",
    );
  }

  cached = createClient(url, anonKey);
  return cached;
}
