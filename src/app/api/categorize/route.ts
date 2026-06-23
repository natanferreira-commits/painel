import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { categorizePost } from "@/lib/categorize";
import { hasLinkOf, postFromUpdate } from "@/lib/format";

export const runtime = "nodejs";
export const maxDuration = 60;

type Row = {
  id: number;
  text: string | null;
  media_type: string | null;
  has_link: boolean | null;
  raw_payload: Record<string, unknown> | null;
};

// Recalcula has_link (sem IA) a partir do payload cru. Util pro backfill de
// posts antigos, gravados antes do link virar determinístico.
function backfillLink(raw: Record<string, unknown> | null): boolean {
  const post = raw ? postFromUpdate(raw) : null;
  return post ? hasLinkOf(post) : false;
}

// Quantos posts por chamada (cada um e 1 chamada de IA).
const BATCH = 25;
// Quantas IAs em paralelo. Em sequencia, 25 estouravam o limite de 60s da
// Vercel (timeout 504). Em paralelo, o lote inteiro fecha em poucos segundos.
const CONCURRENCY = 10;

async function categorizeOne(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  post: Row,
): Promise<boolean> {
  try {
    const cat = await categorizePost(post.text, post.media_type);
    await supabase
      .from("posts")
      .update({
        cat_tipo: cat.tipo,
        cat_casa: cat.casa || null,
        cat_modalidade: cat.modalidade || null,
        cat_gatilho: cat.gatilho,
        // Preenche o link determinístico se ainda estiver vazio (posts antigos).
        has_link: post.has_link ?? backfillLink(post.raw_payload),
        categorized_at: new Date().toISOString(),
      })
      .eq("id", post.id);
    return true;
  } catch {
    return false;
  }
}

// Categoriza posts ainda sem categoria. Pode ser chamado manualmente ou por cron.
// Idempotente: so pega quem tem categorized_at null, entao rodar de novo nao recategoriza.
async function run() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select("id,text,media_type,has_link,raw_payload")
    .is("categorized_at", null)
    .order("id", { ascending: true })
    .limit(BATCH);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data as Row[] | null) ?? [];
  let ok = 0;

  // Processa em paralelo, com um teto de CONCURRENCY chamadas simultaneas.
  let cursor = 0;
  async function worker() {
    while (cursor < rows.length) {
      const post = rows[cursor++];
      if (await categorizeOne(supabase, post)) ok++;
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, rows.length) }, worker),
  );

  const remaining = rows.length === BATCH ? "talvez ainda haja mais (rode de novo)" : "fim";
  return NextResponse.json({
    ok: true,
    processed: rows.length,
    categorized: ok,
    failed: rows.length - ok,
    hint: remaining,
  });
}

export async function GET() {
  return run();
}

export async function POST() {
  return run();
}
