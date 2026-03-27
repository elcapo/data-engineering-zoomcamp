import { Bulletin } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface BulletinCardProps {
  bulletin: Bulletin;
}

export function BulletinCard({ bulletin }: BulletinCardProps) {
  return (
    <Card as="article" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
            BOC N&ordm; {bulletin.issue}
          </h3>
          {bulletin.date && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{bulletin.date}</p>
          )}
        </div>
        <Badge variant="accent">{bulletin.dispositionCount} disp.</Badge>
      </div>

      {bulletin.sectionCounts.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {bulletin.sectionCounts.map((sc) => (
            <li key={sc.section}>
              <Badge>{sc.section} ({sc.count})</Badge>
            </li>
          ))}
        </ul>
      )}

      {bulletin.url && (
        <a
          href={bulletin.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto text-sm font-medium text-accent hover:underline underline-offset-4 dark:text-accent-light"
        >
          Ver en BOC oficial
        </a>
      )}
    </Card>
  );
}
