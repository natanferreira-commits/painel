import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { AUTH_COOKIE, sha256Hex } from "@/lib/auth";

export const runtime = "nodejs";

// Esta rota fica sob /api (fora da trava do proxy/login), entao validamos o
// cookie de sessao aqui na mao. Se PANEL_PASSWORD nao estiver setado, libera (dev).
async function isAuthed(req: NextRequest): Promise<boolean> {
  const password = process.env.PANEL_PASSWORD;
  if (!password) return true;
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  return cookie === (await sha256Hex(password));
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed(req))) {
    return NextResponse.json({ ok: false, error: "nao autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  const raw = (body as { contactIds?: unknown })?.contactIds;
  const ids = Array.isArray(raw)
    ? raw.filter((x): x is string => typeof x === "string" && x.length > 0)
    : [];
  if (ids.length === 0) {
    return NextResponse.json({ ok: true, dismissed: 0 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("dismissed_conversations")
      .upsert(
        ids.map((contact_id) => ({ contact_id })),
        { onConflict: "contact_id" },
      );
    if (error) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, dismissed: ids.length });
}
