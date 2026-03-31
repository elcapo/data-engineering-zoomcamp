import Link from "next/link";
import { Bulletin } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface BulletinCardProps {
  bulletin: Bulletin;
}

export function BulletinCard({ bulletin }: BulletinCardProps) {
  const detailUrl = `/boletin/${bulletin.year}/${bulletin.issue}`;

  return (
    <Card as="article" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={detailUrl} className="group">
            <h3 className="font-semibold text-zinc-900 group-hover:text-accent dark:text-zinc-100 dark:group-hover:text-accent-light">
              BOC N&ordm; {bulletin.issue}
            </h3>
          </Link>
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

      <div className="mt-auto flex gap-3 pt-1 text-sm">
        <Link
          href={detailUrl}
          className="font-medium text-accent hover:underline underline-offset-4 dark:text-accent-light"
        >
          Ver disposiciones
        </Link>
        {bulletin.url && (
          <a
            href={bulletin.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-500 hover:underline underline-offset-4 dark:text-zinc-400"
          >
            BOC oficial
          </a>
        )}
      </div>
    </Card>
  );
}
