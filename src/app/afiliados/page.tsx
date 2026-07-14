import { getAffiliates, type Affiliate } from "@/lib/affiliates";
import { getPostChannels, type PostChannel } from "@/lib/posts";
import { AffiliatesManager } from "@/components/AffiliatesManager";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Afiliados · ToolBox Arena",
};

export default async function AfiliadosPage() {
  let affiliates: Affiliate[] = [];
  let channels: PostChannel[] = [];
  let error: string | null = null;

  try {
    [affiliates, channels] = await Promise.all([
      getAffiliates(),
      getPostChannels().catch(() => [] as PostChannel[]),
    ]);
  } catch (e) {
    error = e instanceof Error ? e.message : "erro desconhecido";
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Afiliados</h1>
        <p className="mt-1 text-sm text-muted">
          Cadastro dos afiliados e o mapeamento das fontes (Telegram, SendPulse). É a fonte
          única que amarra conteúdo, campanhas e suporte a cada pessoa.
        </p>
      </header>

      {error ? (
        <div className="rounded-xl border border-crit/40 bg-crit/10 p-4 text-sm text-crit">
          <p className="font-medium">Não consegui carregar os afiliados.</p>
          <p className="mt-1 text-crit/80">{error}</p>
          <p className="mt-2 text-[12.5px] text-muted">
            Se a mensagem fala de tabela/coluna inexistente, rode as migrações{" "}
            <code>supabase/migration_affiliates.sql</code> e{" "}
            <code>supabase/migration_affiliate_channels.sql</code> no Supabase.
          </p>
        </div>
      ) : (
        <AffiliatesManager affiliates={affiliates} channels={channels} />
      )}
    </main>
  );
}
