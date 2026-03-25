import { Card } from "@/components/ui/Card";

interface EditorialCardProps {
  title: string;
  excerpt: string;
  link: string;
}

export function EditorialCard({ title, excerpt, link }: EditorialCardProps) {
  return (
    <Card as="article" className="flex flex-col gap-2">
      <a href={link} className="group">
        <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 dark:text-zinc-100 dark:group-hover:text-blue-400">
          {title}
        </h3>
      </a>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">{excerpt}</p>
      <a href={link} className="mt-auto text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">
        Leer más
      </a>
    </Card>
  );
}
