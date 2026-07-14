import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Vincula um canal a um afiliado (N:N). Idempotente.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const affiliateId = Number(body.affiliate_id);
  const channelId = strOrNull(body.channel_id);
  if (!Number.isFinite(affiliateId) || !channelId) {
    return NextResponse.json(
      { ok: false, error: "affiliate_id e channel_id são obrigatórios" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("affiliate_channels").upsert(
    {
      affiliate_id: affiliateId,
      channel_id: channelId,
      channel_title: strOrNull(body.channel_title),
    },
    { onConflict: "affiliate_id,channel_id" },
  );

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// Desvincula um canal de um afiliado.
export async function DELETE(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const affiliateId = Number(body.affiliate_id);
  const channelId = strOrNull(body.channel_id);
  if (!Number.isFinite(affiliateId) || !channelId) {
    return NextResponse.json(
      { ok: false, error: "affiliate_id e channel_id são obrigatórios" },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("affiliate_channels")
    .delete()
    .eq("affiliate_id", affiliateId)
    .eq("channel_id", channelId);

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
