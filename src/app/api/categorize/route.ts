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

// Categoriza posts ainda sem categoria. Pode ser chamado manualmente ou por cron.
// Idempotente: so pega quem tem categorized_at null, entao rodar de novo nao recategoriza.
async function run() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select("id,text,media_type,has_link,raw_payload")
    .is("categorized_at", null)
    .order("id", { ascending: true })
    .limit(25);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const rows = (data as Row[] | null) ?? [];
  let ok = 0;
  let failed = 0;

  for (const post of rows) {
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
      ok++;
    } catch {
      failed++;
    }
  }

  return NextResponse.json({ ok: true, processed: rows.length, categorized: ok, failed });
}

export async function GET() {
  return run();
}

export async function POST() {
  return run();
}
