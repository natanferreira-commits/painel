import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

// Cria um afiliado.
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

  const row = {
    nome,
    nicho: strOrNull(body.nicho),
    telegram_channel_id: strOrNull(body.telegram_channel_id),
    id_bot_sendpulse: strOrNull(body.id_bot_sendpulse),
  };

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("affiliates")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, id: (data as { id: number } | null)?.id });
}

// Edita um afiliado (mapeamento de canal/bot, nicho, ativo).
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
  if ("telegram_channel_id" in body) patch.telegram_channel_id = strOrNull(body.telegram_channel_id);
  if ("id_bot_sendpulse" in body) patch.id_bot_sendpulse = strOrNull(body.id_bot_sendpulse);
  if ("ativo" in body) patch.ativo = Boolean(body.ativo);

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
