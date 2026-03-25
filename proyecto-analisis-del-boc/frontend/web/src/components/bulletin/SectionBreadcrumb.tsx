interface SectionBreadcrumbProps {
  section: string;
  subsection?: string;
  organization?: string;
}

export function SectionBreadcrumb({ section, subsection, organization }: SectionBreadcrumbProps) {
  const parts = [section, subsection, organization].filter(Boolean);

  return (
    <nav aria-label="Sección" className="text-sm text-zinc-500 dark:text-zinc-400">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5" aria-hidden="true">&rsaquo;</span>}
          <span>{part}</span>
        </span>
      ))}
    </nav>
  );
}
