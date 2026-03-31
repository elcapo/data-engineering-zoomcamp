import Link from "next/link";
import { Disposition } from "@/types/domain";
import { Card } from "@/components/ui/Card";

interface DispositionCardProps {
  disposition: Disposition;
}

export function DispositionCard({ disposition }: DispositionCardProps) {
  const detailUrl = `/disposicion/${disposition.year}/${disposition.issue}/${disposition.number}`;
  const code = `BOC ${disposition.year}/${String(disposition.issue).padStart(3, "0")}/${disposition.number}`;

  return (
    <Card as="article" className="!p-0 flex flex-col">
      {/* Upper block: clickable link to disposition detail */}
      <Link href={detailUrl} className="group flex flex-1 flex-col gap-2 rounded-t-xl p-6 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-700/50">
        <span className="self-end font-mono text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
          {code}
        </span>

        <h3 className="font-semibold text-zinc-900 group-hover:text-accent dark:text-zinc-100 dark:group-hover:text-accent-light">
          {disposition.title || "Sin título"}
        </h3>

        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {disposition.organization}
        </span>
      </Link>

      {/* Footer: external links */}
      {(disposition.htmlUrl || disposition.pdfUrl) && (
        <div className="flex gap-4 border-t border-zinc-200 px-6 py-3 dark:border-zinc-700">
          {disposition.htmlUrl && (
            <a
              href={disposition.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:underline underline-offset-4 dark:text-zinc-400"
            >
              BOC oficial
            </a>
          )}
          {disposition.pdfUrl && (
            <a
              href={disposition.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 hover:underline underline-offset-4 dark:text-zinc-400"
            >
              PDF oficial
            </a>
          )}
        </div>
      )}
    </Card>
  );
}
