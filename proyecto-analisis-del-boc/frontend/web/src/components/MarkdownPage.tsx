interface MarkdownPageProps {
  title?: string;
  html: string;
}

export function MarkdownPage({ title, html }: MarkdownPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-6 py-8">
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-800 sm:p-8">
        {title && (
          <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
        )}
        <div
          className="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </article>
  );
}
