import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Detecta o tipo de midia do post. "video_note" e o video bolinha do Telegram.
function mediaType(msg: Record<string, unknown>): string {
  if (msg.video_note) return "video_note";
  if (msg.photo) return "photo";
  if (msg.video) return "video";
  if (msg.animation) return "animation";
  if (msg.voice) return "voice";
  if (msg.audio) return "audio";
  if (msg.document) return "document";
  if (msg.poll) return "poll";
  if (msg.text) return "text";
  return "outro";
}

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
  const post = (update.channel_post ?? update.edited_channel_post) as
    | Record<string, unknown>
    | undefined;
  if (!post) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const chat = (post.chat as Record<string, unknown>) ?? {};
  const dateSec = Number(post.date);
  const posted_at = Number.isFinite(dateSec)
    ? new Date(dateSec * 1000).toISOString()
    : new Date().toISOString();

  const row = {
    channel_id: String(chat.id ?? ""),
    channel_title: (chat.title as string) ?? null,
    telegram_msg_id: (post.message_id as number) ?? null,
    text: (post.text as string) ?? (post.caption as string) ?? null,
    media_type: mediaType(post),
    posted_at,
    raw_payload: update,
  };

  try {
    await getSupabaseAdmin()
      .from("posts")
      .upsert(row, { onConflict: "channel_id,telegram_msg_id" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Webhook do Telegram (posts dos canais de dica).",
  });
}
