import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPage } from "@/components/search/SearchPage";
import { Spinner } from "@/components/ui/Spinner";

export const metadata: Metadata = {
  title: "Buscar — BOC Canarias Web",
  description: "Búsqueda avanzada en el Boletín Oficial de Canarias con texto completo, filtros combinados y operadores booleanos.",
};

export default function BuscarPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
      <SearchPage />
    </Suspense>
  );
}
