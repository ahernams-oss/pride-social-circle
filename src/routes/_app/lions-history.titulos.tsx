import { createFileRoute } from "@tanstack/react-router";
import { Medal } from "lucide-react";

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
    <div className="border-t py-12 text-center text-muted-foreground">
      <Medal className="mx-auto mb-3 h-8 w-8" />
      <p>Nenhum título registrado.</p>
    </div>
  </section>;
}