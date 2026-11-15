import { createFileRoute } from "@tanstack/react-router";
import { Medal } from "lucide-react";
import { Suspense } from "react";
import { LionsAwards } from "@/components/LionsAwards";

export const Route = createFileRoute("/_app/lions-history/titulos")({
  component: TitlesPage,
  head: () => ({ meta: [
    { title: "Títulos do Lions — Lions history | Lions Connecta" },
    { name: "description", content: "Títulos do Lions recebidos pelo companheiro." },
    { property: "og:title", content: "Títulos do Lions — Lions history | Lions Connecta" },
    { property: "og:description", content: "Histórico de títulos do companheiro no Lions." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function TitlesPage() {
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Títulos do Lions</h2>
    <Suspense fallback={<p>Carregando títulos...</p>}><LionsAwards category="titulo" /></Suspense>
  </section>;
}