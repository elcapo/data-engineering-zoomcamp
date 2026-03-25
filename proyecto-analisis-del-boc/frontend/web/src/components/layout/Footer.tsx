import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400 sm:flex-row sm:justify-between">
        <p>
          Iniciativa independiente. Contenidos publicados por el{" "}
          <a href="https://www.gobiernodecanarias.org/boc" target="_blank" rel="noopener noreferrer" className="underline hover:text-zinc-700 dark:hover:text-zinc-300">
            Gobierno de Canarias
          </a>.
        </p>
        <nav aria-label="Pie de página" className="flex gap-4">
          <Link href="/aviso-legal" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            Aviso legal
          </Link>
          <Link href="/sobre-el-proyecto" className="hover:text-zinc-700 dark:hover:text-zinc-300">
            Sobre el proyecto
          </Link>
        </nav>
      </div>
    </footer>
  );
}
