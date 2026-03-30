import Link from "next/link";
import { Nav } from "./Nav";
import { SearchBar } from "@/components/search/SearchBar";
import { ThemeToggle } from "./ThemeToggle";
import { MobileMenu } from "./MobileMenu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
      <div className="relative mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <MobileMenu />

        <Link href="/" className="shrink-0 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          BOC Canarias
        </Link>

        <Nav className="hidden md:block" />

        <div className="ml-auto flex items-center gap-2">
          <SearchBar compact className="hidden w-64 lg:flex" />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
