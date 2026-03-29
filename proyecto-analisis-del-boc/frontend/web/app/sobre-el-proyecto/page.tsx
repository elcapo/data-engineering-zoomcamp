import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readMarkdownPage } from "@/lib/content/markdown";
import { MarkdownPage } from "@/components/MarkdownPage";

const SLUG = "sobre-el-proyecto";

export async function generateMetadata(): Promise<Metadata> {
  const page = await readMarkdownPage(SLUG);
  if (!page) return {};

  return {
    title: `${page.title} — BOC Canarias Web`,
    description: page.description,
  };
}

export default async function SobreElProyectoPage() {
  const page = await readMarkdownPage(SLUG);
  if (!page) notFound();

  return <MarkdownPage title={page.title} html={page.html} />;
}
