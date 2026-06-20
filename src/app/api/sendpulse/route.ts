import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

// Segredo opcional. Se SENDPULSE_WEBHOOK_SECRET estiver setado,
// a gente exige ?secret=... na URL configurada no SendPulse.
function checkSecret(req: NextRequest): boolean {
  const expected = process.env.SENDPULSE_WEBHOOK_SECRET;
  if (!expected) return true;
  return req.nextUrl.searchParams.get("secret") === expected;
}

type SendPulseEvent = Record<string, unknown>;

function asString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  return String(v);
}

function normalize(ev: SendPulseEvent) {
  const title = (ev.title as string) ?? "";
  const lower = title.toLowerCase();

  // Direcao: incoming = usuario (in). outgoing/outbound = operador ou bot (out).
  let direction: "in" | "out" | null = null;
  if (lower.includes("incoming")) direction = "in";
  else if (lower.includes("outgoing") || lower.includes("outbound"))
    direction = "out";

  const contact = (ev.contact as Record<string, unknown>) ?? {};
  const bot = (ev.bot as Record<string, unknown>) ?? {};
  const operator = (ev.operator as Record<string, unknown>) ?? {};
  const info = (ev.info as Record<string, unknown>) ?? {};

  const dateMs = Number(ev.date);
  const occurred_at = Number.isFinite(dateMs)
    ? new Date(dateMs).toISOString()
    : new Date().toISOString();

  const infoMessage = (info.message as Record<string, unknown>) ?? {};
  const text =
    (infoMessage.text as string) ??
    (info.text as string) ??
    (contact.last_message as string) ??
    null;

  const tags = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];

  return {
    sendpulse_bot_id: asString(bot.id ?? bot.bot_id),
    sendpulse_contact_id: asString(contact.id),
    contact_name: asString(contact.name),
    operator_id: asString(operator.id),
    operator_name: asString(operator.name),
    direction,
    text,
    tags,
    flow_tag: null as string | null,
    event_title: title || null,
    service: asString(ev.service),
    occurred_at,
    raw_payload: ev,
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "invalid json" },
      { status: 400 },
    );
  }

  // Caixa-preta: guarda o payload cru de TUDO que chega (antes do segredo e do
  // filtro), pra auditoria e debug. Best-effort: nunca derruba o webhook.
  try {
    await getSupabaseAdmin().from("webhook_events").insert({ body });
  } catch {
    // ignora falha de log
  }

  if (!checkSecret(req)) {
    return NextResponse.json(
      { ok: false, error: "invalid secret" },
      { status: 401 },
    );
  }

  const events: SendPulseEvent[] = Array.isArray(body)
    ? (body as SendPulseEvent[])
    : [body as SendPulseEvent];

  // So guardamos mensagens (entrada/saida). Eventos tipo subscribe sao ignorados.
  const rows = events.map(normalize).filter((r) => r.direction !== null);

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, stored: 0 });
  }

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.from("messages_support").insert(rows);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "erro desconhecido";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stored: rows.length });
}

// Util pra abrir no navegador e confirmar que a rota existe.
export async function GET() {
  return NextResponse.json({
    ok: true,
    hint: "Endpoint vivo. O SendPulse deve fazer POST aqui.",
  });
}
