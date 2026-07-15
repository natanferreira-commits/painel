import { NextRequest, NextResponse } from "next/server";
import { tgGet, tgKey } from "@/lib/trackgram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORÁRIO: sondagem da API do TrackGram, pra conferir os dados ao vivo.
// Uso: /api/tg-probe?path=/v1/channels
// Restrito a caminhos /v1. Remover depois de validar.
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "/v1/channels";
  if (!path.startsWith("/v1/")) {
    return NextResponse.json(
      { ok: false, error: "path deve começar com /v1/" },
      { status: 400 },
    );
  }
  if (!tgKey()) {
    return NextResponse.json(
      { ok: false, error: "TRACKGRAM_API_KEY não configurada na Vercel" },
      { status: 400 },
    );
  }
  try {
    const r = await tgGet(path);
    return NextResponse.json({ ok: true, path, status: r.status, body: r.body });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
