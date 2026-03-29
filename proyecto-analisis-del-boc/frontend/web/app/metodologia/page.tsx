import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readMarkdownPage } from "@/lib/content/markdown";
import { MarkdownPage } from "@/components/MarkdownPage";
import { PageHeader } from "@/components/layout/PageHeader";

const SLUG = "metodologia";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readMarkdownPage(SLUG);
  if (!page) return {};

  return {
    title: `${page.title} — BOC Canarias Web`,
    description: page.description,
  };
}

export default async function MetodologiaPage() {
  const page = await readMarkdownPage(SLUG);
  if (!page) notFound();

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inicio", href: "/" }]}
        title={page.title}
      />
      <MarkdownPage html={page.html} />
    </>
  );
}
