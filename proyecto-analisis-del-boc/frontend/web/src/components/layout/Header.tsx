import Link from "next/link";
import { Nav } from "./Nav";
import { SearchBar } from "@/components/search/SearchBar";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="shrink-0 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          BOC Canarias
        </Link>

        <Nav className="hidden md:block" />

        <SearchBar className="ml-auto hidden w-64 lg:flex" />
      </div>
    </header>
  );
}
