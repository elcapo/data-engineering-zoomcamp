import { Button } from "@/components/ui/Button";

interface SemanticPaginatorProps {
  total: number;
  nextCursor: string | null;
  prevCursor: string | null;
  onNavigate: (cursor: string | null) => void;
}

export function SemanticPaginator({ total, nextCursor, prevCursor, onNavigate }: SemanticPaginatorProps) {
  if (total === 0) return null;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-between gap-4">
      <Button
        variant="secondary"
        size="sm"
        disabled={!prevCursor}
        onClick={() => onNavigate(null)}
      >
        &larr; Anterior
      </Button>

      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        {total.toLocaleString("es-ES")} resultado{total !== 1 && "s"}
      </span>

      <Button
        variant="secondary"
        size="sm"
        disabled={!nextCursor}
        onClick={() => onNavigate(nextCursor)}
      >
        Siguiente &rarr;
      </Button>
    </nav>
  );
}
