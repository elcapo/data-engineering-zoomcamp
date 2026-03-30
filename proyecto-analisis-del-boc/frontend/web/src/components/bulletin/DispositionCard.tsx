import { Disposition } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { SectionBreadcrumb } from "./SectionBreadcrumb";

interface DispositionCardProps {
  disposition: Disposition;
}

export function DispositionCard({ disposition }: DispositionCardProps) {
  const officialUrl = disposition.htmlUrl;

  return (
    <Card as="article" className="flex flex-col gap-2 transition-colors duration-200 hover:border-accent/30">
      <SectionBreadcrumb
        section={disposition.section}
        subsection={disposition.subsection}
        organization={disposition.organization}
        linkable
      />

      {officialUrl ? (
        <a href={officialUrl} target="_blank" rel="noopener noreferrer" className="group">
          <h3 className="font-semibold text-zinc-900 group-hover:text-accent dark:text-zinc-100 dark:group-hover:text-accent-light">
            {disposition.title || "Sin título"}
          </h3>
        </a>
      ) : (
        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
          {disposition.title || "Sin título"}
        </h3>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
        {disposition.date && <span>{disposition.date}</span>}
        <span>BOC N&ordm; {disposition.issue}/{disposition.year}</span>
        {disposition.identifier && <span>{disposition.identifier}</span>}
      </div>

      {disposition.excerpt && (
        <p
          className="line-clamp-3 text-sm text-zinc-600 dark:text-zinc-300 [&_mark]:bg-yellow-200 [&_mark]:dark:bg-yellow-800"
          dangerouslySetInnerHTML={{ __html: disposition.excerpt }}
        />
      )}

      <div className="mt-auto flex gap-3 pt-1 text-sm">
        {officialUrl && (
          <a
            href={officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline underline-offset-4 dark:text-accent-light"
          >
            Ver disposición
          </a>
        )}
        {disposition.pdfUrl && (
          <a
            href={disposition.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:underline underline-offset-4 dark:text-zinc-400"
          >
            PDF oficial
          </a>
        )}
      </div>
    </Card>
  );
}
