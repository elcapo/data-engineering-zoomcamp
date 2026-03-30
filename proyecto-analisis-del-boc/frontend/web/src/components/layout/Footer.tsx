import Link from "next/link";

const navLinks = [
  { href: "/", label: "Inicio" },
  { href: "/buscar", label: "Buscar" },
  { href: "/metricas", label: "Cobertura" },
  { href: "/metodologia", label: "Metodología" },
] as const;

const legalLinks = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/sobre-el-proyecto", label: "Sobre el proyecto" },
] as const;

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">BOC Canarias</p>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Iniciativa independiente. Contenidos publicados por el{" "}
              <a href="https://www.gobiernodecanarias.org/boc" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 decoration-zinc-400 hover:text-zinc-700 hover:decoration-accent dark:hover:text-zinc-300">
                Gobierno de Canarias
              </a>.
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Navegación</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {navLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-zinc-600 transition-colors duration-150 hover:text-accent dark:text-zinc-400 dark:hover:text-accent-light">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Legal</p>
              <ul className="mt-2 flex flex-col gap-1.5">
                {legalLinks.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-sm text-zinc-600 transition-colors duration-150 hover:text-accent dark:text-zinc-400 dark:hover:text-accent-light">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
