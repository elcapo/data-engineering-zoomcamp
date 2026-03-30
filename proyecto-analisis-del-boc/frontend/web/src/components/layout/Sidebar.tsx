"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { buildSearchHref } from "@/lib/search/url-params";

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onNavigate?: () => void;
}

const mainNav = [
  {
    href: "/",
    label: "Inicio",
    icon: (
      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12L11.204 3.045c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    href: "/buscar",
    label: "Buscar",
    icon: (
      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    href: "/metricas",
    label: "Cobertura",
    icon: (
      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
] as const;

const infoNav = [
  {
    href: "/metodologia",
    label: "Metodología",
    icon: (
      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    href: "/sobre-el-proyecto",
    label: "Sobre el proyecto",
    icon: (
      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
  {
    href: "/aviso-legal",
    label: "Aviso legal",
    icon: (
      <svg className="size-5 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
] as const;

function isActive(href: string, pathname: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

export function Sidebar({ collapsed, onToggleCollapse, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const searchHref = useMemo(buildSearchHref, []);

  return (
    <aside
      className={`flex h-full flex-col border-r border-zinc-200 bg-white transition-[width] duration-200 dark:border-zinc-800 dark:bg-zinc-950 ${
        collapsed ? "w-[60px]" : "w-[280px]"
      }`}
    >
      {/* Logo */}
      <div className="flex shrink-0 items-center border-b border-zinc-200 px-3 dark:border-zinc-800" style={{ height: 71 }}>
        <Link href="/" onClick={onNavigate} className="flex items-center overflow-hidden">
          {collapsed ? (
            <Image src="/bocana-logo.svg" alt="bocana" width={36} height={36} className="shrink-0" />
          ) : (
            <Image src="/bocana-logo-wording.svg" alt="bocana" width={193} height={55} className="shrink-0" priority />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav aria-label="Principal" className="flex-1 overflow-y-auto px-2 py-3">
        <ul className="flex flex-col gap-0.5">
          {mainNav.map(({ href, label, icon }) => (
            <SidebarLink
              key={href}
              href={href === "/buscar" ? searchHref : href}
              label={label}
              icon={icon}
              active={isActive(href, pathname)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </ul>

        <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />

        <ul className="flex flex-col gap-0.5">
          {infoNav.map(({ href, label, icon }) => (
            <SidebarLink
              key={href}
              href={label === infoNav[0].label ? href : href}
              label={label}
              icon={icon}
              active={isActive(href, pathname)}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>

      {/* Bottom bar */}
      <div className="shrink-0 border-t border-zinc-200 px-2 py-2 dark:border-zinc-800">
        <div className={`flex items-center ${collapsed ? "flex-col gap-1" : "justify-between"}`}>
          <ThemeToggle />
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            className="rounded-lg p-2 text-zinc-400 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            {collapsed ? (
              <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" />
              </svg>
            ) : (
              <svg className="size-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  active,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        title={collapsed ? label : undefined}
        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
          collapsed ? "justify-center" : ""
        } ${
          active
            ? "bg-accent-muted text-accent dark:text-accent-light"
            : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        }`}
      >
        {icon}
        {!collapsed && <span className="truncate">{label}</span>}
      </Link>
    </li>
  );
}
