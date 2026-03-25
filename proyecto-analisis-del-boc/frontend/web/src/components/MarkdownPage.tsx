interface MarkdownPageProps {
  title: string;
  html: string;
}

export function MarkdownPage({ title, html }: MarkdownPageProps) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h1>
      <div
        className="prose prose-zinc max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-blue-600 dark:prose-a:text-blue-400"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
