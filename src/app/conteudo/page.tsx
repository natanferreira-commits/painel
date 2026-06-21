import { getPosts, getPostChannels, type PostItem } from "@/lib/posts";
import { PostsFilter } from "@/components/PostsFilter";
import { affiliateColors, affiliateLabel } from "@/lib/affiliate";
import { formatDayPt, formatTimePt } from "@/lib/time";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Inteligência de conteúdo · Painel Arena",
};

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v ? v : undefined;
}

const MEDIA_LABEL: Record<string, string> = {
  photo: "foto",
  video: "vídeo",
  video_note: "vídeo bolinha",
  animation: "gif",
  voice: "áudio",
  audio: "áudio",
  document: "arquivo",
  poll: "enquete",
};

const TIPO_LABEL: Record<string, string> = {
  dica: "dica",
  analise: "análise",
  promo: "promo",
  prova_social: "prova social",
  motivacional: "motivacional",
  cta_cadastro: "cadastro (CTA)",
  educacional: "educacional",
  interacao: "interação",
  outro: "outro",
};

const GATILHO_LABEL: Record<string, string> = {
  urgencia: "urgência",
  autoridade: "autoridade",
  escassez: "escassez",
  proximidade: "proximidade",
};

export default async function ConteudoPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const filters = { channelId: str(sp.canal), q: str(sp.q) };

  let posts: PostItem[] = [];
  let channels: Awaited<ReturnType<typeof getPostChannels>> = [];
  let error: string | null = null;

  try {
    [posts, channels] = await Promise.all([
      getPosts(filters),
      getPostChannels(),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  // Agrupa por dia, mantendo a ordem (mais recente primeiro).
  const groups: { day: string; items: PostItem[] }[] = [];
  for (const p of posts) {
    const day = formatDayPt(p.postedAt);
    let g = groups[groups.length - 1];
    if (!g || g.day !== day) {
      g = { day, items: [] };
      groups.push(g);
    }
    g.items.push(p);
  }

  return (
    <main className="relative mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Inteligência de conteúdo
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Tudo que é postado nos canais de dica
          </p>
        </div>
        <div className="text-right">
          <div className="text-5xl font-semibold leading-none tabular-nums">
            {posts.length}
          </div>
          <div className="mt-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-500">
            posts
          </div>
        </div>
      </header>

      <PostsFilter channels={channels} />

      {error && (
        <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-4 text-sm text-red-300">
          Erro ao carregar: {error}
        </div>
      )}

      {!error && posts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-12 text-center">
          <div className="text-3xl">📡</div>
          <div className="mt-4 font-medium">Aguardando o primeiro post</div>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Assim que o bot estiver num canal e algo for postado, o conteúdo
            aparece aqui automaticamente.
          </p>
        </div>
      )}

      {!error &&
        groups.map((g) => (
          <section key={g.day} className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
              {g.day}
            </h2>
            <ul className="space-y-2.5">
              {g.items.map((p) => {
                const aff = affiliateLabel(p.channelTitle, p.channelId);
                const affColor = affiliateColors(p.channelId);
                const media = p.mediaType
                  ? MEDIA_LABEL[p.mediaType]
                  : undefined;
                return (
                  <li
                    key={p.id}
                    className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-medium ${affColor.chip}`}
                        >
                          {aff}
                        </span>
                        {media && (
                          <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 text-xs font-medium text-neutral-300">
                            {media}
                          </span>
                        )}
                      </div>
                      <span className="shrink-0 text-xs text-neutral-500">
                        {formatTimePt(p.postedAt)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-neutral-200">
                      {p.text ?? (
                        <span className="text-neutral-500">
                          {media ? `[${media} sem legenda]` : "[sem texto]"}
                        </span>
                      )}
                    </p>

                    {p.tipo && (
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                        <span className="rounded-md bg-neutral-800 px-1.5 py-0.5 font-medium text-neutral-200">
                          {TIPO_LABEL[p.tipo] ?? p.tipo}
                        </span>
                        {p.casa && (
                          <span className="rounded-md border border-neutral-700 px-1.5 py-0.5 text-neutral-400">
                            {p.casa}
                          </span>
                        )}
                        {p.gatilho && GATILHO_LABEL[p.gatilho] && (
                          <span className="text-neutral-500">
                            {GATILHO_LABEL[p.gatilho]}
                          </span>
                        )}
                        {p.temLink && (
                          <span className="text-neutral-500">· com link</span>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
    </main>
  );
}
