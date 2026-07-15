import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Cria um afiliado (com um canal inicial opcional).
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const nome = typeof body.nome === "string" ? body.nome.trim() : "";
  if (!nome) {
    return NextResponse.json({ ok: false, error: "nome é obrigatório" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("affiliates")
    .insert({ nome, nicho: strOrNull(body.nicho) })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  const id = (data as { id: number } | null)?.id;
  const channelId = strOrNull(body.channel_id);
  if (id && channelId) {
    await supabase
      .from("affiliate_channels")
      .upsert(
        { affiliate_id: id, channel_id: channelId, channel_title: strOrNull(body.channel_title) },
        { onConflict: "affiliate_id,channel_id" },
      );
  }

  return NextResponse.json({ ok: true, id });
}

// Edita nome / nicho / ativo de um afiliado.
export async function PATCH(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ ok: false, error: "id inválido" }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};
  if (typeof body.nome === "string" && body.nome.trim()) patch.nome = body.nome.trim();
  if ("nicho" in body) patch.nicho = strOrNull(body.nicho);
  if ("ativo" in body) patch.ativo = Boolean(body.ativo);
  if ("sendpulse_client_id" in body) patch.sendpulse_client_id = strOrNull(body.sendpulse_client_id);
  if ("sendpulse_client_secret" in body) patch.sendpulse_client_secret = strOrNull(body.sendpulse_client_secret);
  if ("traffic_sheet_url" in body) patch.traffic_sheet_url = strOrNull(body.traffic_sheet_url);

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: "nada pra atualizar" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("affiliates").update(patch).eq("id", id);
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
