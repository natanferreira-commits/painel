"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = {
  href: string;
  label: string;
  icon: React.ReactNode;
  soon?: boolean;
};

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={d} />
    </svg>
  );
}

const MODULO_B: Item[] = [
  {
    href: "/",
    label: "Fila de reembolso",
    icon: <Icon d="M3 5h18M3 12h18M3 19h12" />,
  },
  {
    href: "/conversas",
    label: "Todas as conversas",
    icon: <Icon d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  },
];

const MODULO_A: Item[] = [
  {
    href: "/conteudo",
    label: "Inteligência de conteúdo",
    icon: <Icon d="M3 3v18h18M7 14l4-4 3 3 5-6" />,
  },
  {
    href: "/perfis",
    label: "Perfis dos afiliados",
    icon: <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  },
];

function NavLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-violet-500/15 text-violet-200"
          : "text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200"
      }`}
    >
      <span className={active ? "text-violet-300" : "text-neutral-500"}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
      {item.soon && (
        <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
          em breve
        </span>
      )}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-neutral-800/80 bg-neutral-950/80 px-3 py-5 md:flex">
      <div className="flex items-center gap-2 px-2 pb-6">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
          A
        </div>
        <span className="font-semibold tracking-tight">Painel Arena</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
          Reembolso e suporte
        </p>
        {MODULO_B.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}

        <p className="px-3 pb-1 pt-5 text-[10px] font-semibold uppercase tracking-wider text-neutral-600">
          Conteúdo
        </p>
        {MODULO_A.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item.href)} />
        ))}
      </nav>

      <div className="space-y-2 pt-4">
        <div className="flex items-center gap-2 px-3 text-xs text-neutral-600">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          Ao vivo
        </div>
        <a
          href="/api/logout"
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-800/60 hover:text-neutral-300"
        >
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          Sair
        </a>
      </div>
    </aside>
  );
}
