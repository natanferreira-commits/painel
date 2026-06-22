import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { categorizePost } from "@/lib/categorize";
import { mediaTypeOf, hasLinkOf, postFromUpdate } from "@/lib/format";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let update: Record<string, unknown>;
  try {
    update = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  // So nos interessam posts de canal (e edicoes deles).
  const post = postFromUpdate(update);
  if (!post) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const chat = (post.chat as Record<string, unknown>) ?? {};
  const dateSec = Number(post.date);
  const posted_at = Number.isFinite(dateSec)
    ? new Date(dateSec * 1000).toISOString()
    : new Date().toISOString();

  // Formato e link: detectados aqui, sem IA (100% confiavel).
  const row = {
    channel_id: String(chat.id ?? ""),
    channel_title: (chat.title as string) ?? null,
    telegram_msg_id: (post.message_id as number) ?? null,
    text: (post.text as string) ?? (post.caption as string) ?? null,
    media_type: mediaTypeOf(post),
    has_link: hasLinkOf(post),
    posted_at,
    raw_payload: update,
  };

  const supabase = getSupabaseAdmin();
  try {
    await supabase
      .from("posts")
      .upsert(row, { onConflict: "channel_id,telegram_msg_id" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  // Categoriza na hora (best-effort). Se a IA falhar ou faltar a chave,
  // o post fica gravado sem categoria e o backfill (/api/categorize) pega depois.
  try {
    const cat = await categorizePost(row.text, row.media_type);
    await supabase
      .from("posts")
      .update({
        cat_tipo: cat.tipo,
        cat_casa: cat.casa || null,
        cat_modalidade: cat.modalidade || null,
        cat_gatilho: cat.gatilho,
        categorized_at: new Date().toISOString(),
      })
      .eq("channel_id", row.channel_id)
      .eq("telegram_msg_id", row.telegram_msg_id);
  } catch {
    // ignora; backfill resolve depois
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Webhook do Telegram (posts dos canais de dica).",
  });
}
