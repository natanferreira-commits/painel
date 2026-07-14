import { NextRequest, NextResponse } from "next/server";
import { spGet } from "@/lib/sendpulse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// TEMPORÁRIO: sondagem da API do SendPulse pra descobrir os endpoints de fluxo.
// Uso: /api/sp-probe?path=/chatbots/bots
// Restrito a caminhos do chatbot (/chatbots, /telegram). Remover depois.
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get("path") ?? "/chatbots/bots";
  if (!path.startsWith("/chatbots") && !path.startsWith("/telegram")) {
    return NextResponse.json(
      { ok: false, error: "path deve começar com /chatbots ou /telegram" },
      { status: 400 },
    );
  }
  try {
    const r = await spGet(path);
    return NextResponse.json({ ok: true, path, status: r.status, body: r.body });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
