import { Disposition } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { SectionBreadcrumb } from "./SectionBreadcrumb";

interface DispositionCardProps {
  disposition: Disposition;
}

export function DispositionCard({ disposition }: DispositionCardProps) {
  const detailUrl = `/disposicion/${disposition.year}/${disposition.issue}/${disposition.number}`;

  return (
    <Card as="article" className="flex flex-col gap-2">
      <SectionBreadcrumb
        section={disposition.section}
        subsection={disposition.subsection}
        organization={disposition.organization}
      />

      <a href={detailUrl} className="group">
        <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
          {disposition.title || "Sin título"}
        </h3>
      </a>

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
        <a href={detailUrl} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          Ver disposición
        </a>
        {disposition.pdfUrl && (
          <a
            href={disposition.pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:underline dark:text-zinc-400"
          >
            PDF oficial
          </a>
        )}
      </div>
    </Card>
  );
}
