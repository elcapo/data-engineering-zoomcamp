import Link from "next/link";
import { Bulletin } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface BulletinCardProps {
  bulletin: Bulletin;
}

export function BulletinCard({ bulletin }: BulletinCardProps) {
  const detailUrl = `/boletin/${bulletin.year}/${bulletin.issue}`;
  const paddedIssue = String(bulletin.issue).padStart(3, "0");

  return (
    <Card as="article" className="!p-0 flex flex-col">
      {/* Upper block: clickable link to bulletin detail */}
      <Link href={detailUrl} className="group flex flex-1 flex-col gap-3 rounded-t-xl p-6 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-zinc-900 group-hover:text-accent dark:text-zinc-100 dark:group-hover:text-accent-light">
              Boletín {bulletin.year}/{paddedIssue}
            </h3>
            {bulletin.date && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{bulletin.date}</p>
            )}
          </div>
          <Badge variant="accent">{bulletin.dispositionCount} disposiciones</Badge>
        </div>

      </Link>

      {/* Footer: external links only */}
      {bulletin.url && (
        <div className="border-t border-zinc-200 px-6 py-3 dark:border-zinc-700">
          <a
            href={bulletin.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:underline underline-offset-4 dark:text-zinc-400"
          >
            BOC oficial
          </a>
        </div>
      )}
    </Card>
  );
}
