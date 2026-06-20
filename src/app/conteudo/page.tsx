export const metadata = {
  title: "Inteligência de conteúdo · Painel Arena",
};

export default function ConteudoPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Inteligência de conteúdo
        </h1>
        <p className="mt-1 text-sm text-neutral-500">Módulo A &middot; em breve</p>
      </header>

      <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 p-10 text-center">
        <div className="text-3xl">🧠</div>
        <div className="mt-4 text-lg font-medium">Em construção</div>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
          Aqui vai entrar o mapa exaustivo de tudo que é postado nos canais de
          dica, categorizado, pra o time relacionar conteúdo com resultado e
          perfilar cada afiliado. Primeiro a gente fecha o Módulo B.
        </p>
      </div>
    </main>
  );
}
