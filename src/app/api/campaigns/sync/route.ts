import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getAffiliatesWithSendpulse } from "@/lib/affiliates";
import { getSendpulseFlows } from "@/lib/sendpulse";

export const runtime = "nodejs";
export const maxDuration = 60;

// Puxa os fluxos de cada afiliado com credencial e grava o snapshot.
// Idempotente: apaga e regrava por afiliado.
async function run() {
  const supabase = getSupabaseAdmin();

  let affs;
  try {
    affs = await getAffiliatesWithSendpulse();
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }

  const results: { afiliado: string; fluxos?: number; erro?: string }[] = [];
  for (const a of affs) {
    try {
      const flows = await getSendpulseFlows({
        clientId: a.clientId,
        clientSecret: a.clientSecret,
      });
      await supabase.from("campaign_flows").delete().eq("affiliate_id", a.id);
      if (flows.length) {
        const now = new Date().toISOString();
        const rows = flows.map((f) => ({
          affiliate_id: a.id,
          flow_id: f.id,
          bot_name: f.botName,
          name: f.name,
          folder_id: f.folderId,
          entry_tag: f.entryTag,
          entered: f.entered,
          status: f.status,
          captured_at: now,
        }));
        const { error } = await supabase.from("campaign_flows").insert(rows);
        if (error) throw new Error(error.message);
      }
      results.push({ afiliado: a.nome, fluxos: flows.length });
    } catch (e) {
      results.push({ afiliado: a.nome, erro: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({ ok: true, contas: affs.length, results });
}

export async function POST() {
  return run();
}
export async function GET() {
  return run();
}
