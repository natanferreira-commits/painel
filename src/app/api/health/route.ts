import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Saúde da ingestão/categorização — só leitura, sem efeito colateral.
// Fica fora do login (rota /api) pra dar pra checar rápido "está entrando post?".
export async function GET() {
  const supabase = getSupabaseAdmin();

  try {
    const [postsTotal, uncat, lastPostRes, lastCatRes, affRes, linkRes, chSample] =
      await Promise.all([
        supabase.from("posts").select("*", { count: "exact", head: true }),
        supabase
          .from("posts")
          .select("*", { count: "exact", head: true })
          .is("categorized_at", null),
        supabase
          .from("posts")
          .select("posted_at")
          .order("posted_at", { ascending: false })
          .limit(1),
        supabase
          .from("posts")
          .select("categorized_at")
          .not("categorized_at", "is", null)
          .order("categorized_at", { ascending: false })
          .limit(1),
        supabase.from("affiliates").select("*", { count: "exact", head: true }),
        supabase
          .from("affiliate_channels")
          .select("*", { count: "exact", head: true }),
        supabase.from("posts").select("channel_id,channel_title").limit(5000),
      ]);

    // Contagem por canal (agregada em memória a partir da amostra).
    const chMap = new Map<string, { title: string; count: number }>();
    for (const r of (chSample.data as
      | { channel_id: string; channel_title: string | null }[]
      | null) ?? []) {
      const cur = chMap.get(r.channel_id) ?? {
        title: r.channel_title ?? r.channel_id,
        count: 0,
      };
      cur.count++;
      chMap.set(r.channel_id, cur);
    }
    const channels = [...chMap.entries()]
      .map(([id, v]) => ({ id, title: v.title, posts: v.count }))
      .sort((a, b) => b.posts - a.posts);

    const err =
      postsTotal.error ||
      uncat.error ||
      affRes.error ||
      linkRes.error ||
      chSample.error;
    if (err) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      posts: {
        total: postsTotal.count ?? 0,
        sem_categoria: uncat.count ?? 0,
        ultimo_recebido:
          (lastPostRes.data as { posted_at: string }[] | null)?.[0]
            ?.posted_at ?? null,
        ultimo_categorizado:
          (lastCatRes.data as { categorized_at: string }[] | null)?.[0]
            ?.categorized_at ?? null,
      },
      afiliados: {
        cadastrados: affRes.count ?? 0,
        canais_vinculados: linkRes.count ?? 0,
      },
      canais_detectados: channels.length,
      canais: channels,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
