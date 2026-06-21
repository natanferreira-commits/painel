import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type PostItem = {
  id: number;
  channelId: string;
  channelTitle: string | null;
  mediaType: string | null;
  text: string | null;
  postedAt: string;
};

export type PostFilters = { channelId?: string; q?: string };
export type PostChannel = { id: string; title: string };

type Row = {
  id: number;
  channel_id: string;
  channel_title: string | null;
  media_type: string | null;
  text: string | null;
  posted_at: string;
};

export async function getPosts(filters: PostFilters = {}): Promise<PostItem[]> {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("posts")
    .select("id,channel_id,channel_title,media_type,text,posted_at")
    .order("posted_at", { ascending: false })
    .limit(300);
  if (filters.channelId) query = query.eq("channel_id", filters.channelId);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  let items: PostItem[] = (data as Row[] | null ?? []).map((p) => ({
    id: p.id,
    channelId: p.channel_id,
    channelTitle: p.channel_title,
    mediaType: p.media_type,
    text: p.text,
    postedAt: p.posted_at,
  }));

  const q = filters.q?.trim().toLowerCase();
  if (q) items = items.filter((p) => (p.text ?? "").toLowerCase().includes(q));

  return items;
}

export async function getPostChannels(): Promise<PostChannel[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("posts")
    .select("channel_id,channel_title")
    .limit(2000);
  if (error) throw new Error(error.message);

  const map = new Map<string, string>();
  for (const r of (data as Row[] | null ?? [])) {
    if (r.channel_id) map.set(r.channel_id, r.channel_title ?? r.channel_id);
  }
  return [...map.entries()]
    .map(([id, title]) => ({ id, title }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
