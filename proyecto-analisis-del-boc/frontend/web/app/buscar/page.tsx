import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchPage } from "@/components/search/SearchPage";
import { Spinner } from "@/components/ui/Spinner";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Buscar — Bocana",
  description: "Búsqueda avanzada en el Boletín Oficial de Canarias con texto completo, filtros combinados y operadores booleanos.",
};

export default function BuscarPage() {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inicio", href: "/" }]}
        title="Buscar"
      />
      <div className="px-6 py-8">
        <Suspense fallback={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}>
          <SearchPage />
        </Suspense>
      </div>
    </>
  );
}
