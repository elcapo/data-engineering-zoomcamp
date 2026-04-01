import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DispositionRepository } from "@/lib/db/repositories/dispositions";
import { renderMarkdown } from "@/lib/content/markdown";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionBreadcrumb } from "@/components/bulletin/SectionBreadcrumb";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ year: string; issue: string; number: string }>;
}

async function getDisposition(params: PageProps["params"]) {
  const { year, issue, number } = await params;
  const y = parseInt(year, 10);
  const i = parseInt(issue, 10);
  if (isNaN(y) || isNaN(i)) return null;
  return DispositionRepository.findByIdentifier(y, i, number);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const disposition = await getDisposition(params);
  if (!disposition) return {};

  const title = disposition.title || "Disposición";
  const description = disposition.body
    ? disposition.body.slice(0, 160).replace(/\s+/g, " ").trim() + "..."
    : `Disposición ${disposition.number} del BOC N\u00ba ${disposition.issue}/${disposition.year}`;

  return {
    title: `${title} — Bocana`,
    description,
  };
}

export default async function DisposicionPage({ params }: PageProps) {
  const disposition = await getDisposition(params);
  if (!disposition) notFound();

  const paddedIssue = String(disposition.issue).padStart(3, "0");
  const bocId = `BOC-${disposition.year}/${paddedIssue}/${disposition.number}`;

  const bodyHtml = disposition.body
    ? await renderMarkdown(disposition.body)
    : null;

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: String(disposition.year), href: `/ano/${disposition.year}` },
          { label: paddedIssue, href: `/boletin/${disposition.year}/${disposition.issue}` },
        ]}
        title={`Disposición ${disposition.year}/${paddedIssue}/${disposition.number}`}
      />

      <article className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-800 sm:p-8">
          {/* Metadata header */}
          <header className="mb-8">
            <SectionBreadcrumb
              section={disposition.section}
              subsection={disposition.subsection}
              organization={disposition.organization}
              linkable
            />

            <h2 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              {disposition.title || "Sin título"}
            </h2>

            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              {disposition.date && <>{disposition.date} &middot; </>}
              {bocId}
            </p>

            {/* External links */}
            <div className="mt-4 flex flex-wrap gap-3">
              {disposition.htmlUrl && (
                <a
                  href={disposition.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 dark:bg-accent-light dark:text-zinc-900 dark:hover:bg-accent-light/90"
                >
                  Ver en sede oficial
                  <ExternalLinkIcon />
                </a>
              )}
              {disposition.pdfUrl && (
                <a
                  href={disposition.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  Descargar PDF
                  <ExternalLinkIcon />
                </a>
              )}
            </div>
          </header>

          {/* Full text body */}
          {bodyHtml ? (
            <section
              className="prose prose-zinc max-w-none dark:prose-invert prose-a:text-blue-600 dark:prose-a:text-blue-400"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          ) : (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
              <p>El texto completo de esta disposición no está disponible en la base de datos.</p>
              {disposition.htmlUrl && (
                <p className="mt-2">
                  Puedes consultarla en la{" "}
                  <a
                    href={disposition.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-accent underline-offset-4 hover:underline dark:text-accent-light"
                  >
                    sede oficial del BOC
                  </a>
                  .
                </p>
              )}
            </div>
          )}
        </div>

        {/* Back link */}
        <nav className="mt-6">
          <Link
            href={`/boletin/${disposition.year}/${disposition.issue}`}
            className="text-sm font-medium text-accent hover:underline underline-offset-4 dark:text-accent-light"
          >
            &larr; Boletín {disposition.year}/{paddedIssue}
          </Link>
        </nav>
      </article>
    </>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}
