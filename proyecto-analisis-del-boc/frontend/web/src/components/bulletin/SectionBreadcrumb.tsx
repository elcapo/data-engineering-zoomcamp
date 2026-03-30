interface SectionBreadcrumbProps {
  section: string;
  subsection?: string;
  organization?: string;
  linkable?: boolean;
}

export function SectionBreadcrumb({ section, subsection, organization, linkable = false }: SectionBreadcrumbProps) {
  const parts: { text: string; href?: string }[] = [];

  if (section) {
    parts.push(linkable
      ? { text: section, href: `/buscar?include_section=${encodeURIComponent(section)}` }
      : { text: section }
    );
  }
  if (subsection) {
    parts.push({ text: subsection });
  }
  if (organization) {
    parts.push(linkable
      ? { text: organization, href: `/buscar?include_org=${encodeURIComponent(organization)}` }
      : { text: organization }
    );
  }

  return (
    <nav aria-label="Sección" className="text-sm text-zinc-500 dark:text-zinc-400">
      {parts.map((part, i) => (
        <span key={i}>
          {i > 0 && <span className="mx-1.5" aria-hidden="true">&rsaquo;</span>}
          {part.href ? (
            <a
              href={part.href}
              className="hover:text-accent hover:underline underline-offset-2 dark:hover:text-accent-light"
            >
              {part.text}
            </a>
          ) : (
            <span>{part.text}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
