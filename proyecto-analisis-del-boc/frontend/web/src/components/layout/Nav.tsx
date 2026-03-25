import Link from "next/link";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Buscar" },
  { href: "/metricas", label: "Métricas" },
  { href: "/metodologia", label: "Metodología" },
] as const;

interface NavProps {
  className?: string;
}

export function Nav({ className = "" }: NavProps) {
  return (
    <nav aria-label="Principal" className={className}>
      <ul className="flex items-center gap-1">
        {links.map(({ href, label }) => (
          <li key={href}>
            <Link
              href={href}
              className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
