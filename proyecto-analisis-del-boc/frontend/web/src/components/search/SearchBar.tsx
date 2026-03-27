"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchBarProps {
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function SearchBar({ defaultValue = "", placeholder = "Buscar en el BOC...", className = "", compact = false }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      router.push(`/buscar?q=${encodeURIComponent(q)}`);
    }
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} role="search" className={`relative flex ${className}`}>
        <svg className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          aria-label="Buscar disposiciones"
          className="w-full rounded-lg border-transparent bg-zinc-100 py-2 pl-10 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/30 focus:outline-none dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:bg-zinc-900"
        />
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={`relative flex ${className}`}>
      <svg className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label="Buscar disposiciones"
        className="flex-1 rounded-l-lg border border-zinc-300 bg-white py-2 pl-11 pr-4 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent/30 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
      <button
        type="submit"
        className="rounded-r-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-accent-light active:scale-[0.98]"
      >
        Buscar
      </button>
    </form>
  );
}
