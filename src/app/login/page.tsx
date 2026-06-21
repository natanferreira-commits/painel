export const metadata = {
  title: "Entrar · Painel Arena",
};

type SP = Promise<{ [k: string]: string | string[] | undefined }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SP;
}) {
  const sp = await searchParams;
  const hasError = sp.error === "1";
  const next = typeof sp.next === "string" ? sp.next : "/";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950 px-4">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-violet-600/15 to-transparent" />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-base font-bold text-white">
            A
          </div>
          <span className="text-lg font-semibold tracking-tight text-neutral-100">
            Painel Arena
          </span>
        </div>

        <form
          action="/api/login"
          method="post"
          className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6"
        >
          <input type="hidden" name="next" value={next} />
          <label className="mb-2 block text-sm text-neutral-400">Senha</label>
          <input
            type="password"
            name="password"
            autoFocus
            placeholder="Senha de acesso"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2.5 text-sm text-neutral-100 outline-none placeholder:text-neutral-600 focus:border-violet-600"
          />

          {hasError && (
            <p className="mt-3 text-sm text-red-400">
              Senha incorreta. Tenta de novo.
            </p>
          )}

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-violet-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            Entrar
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-neutral-600">
          Acesso restrito ao time do Arena
        </p>
      </div>
    </div>
  );
}
