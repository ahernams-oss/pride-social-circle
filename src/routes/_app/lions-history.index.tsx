import { createFileRoute } from "@tanstack/react-router";
import { GraduationCap } from "lucide-react";
import { Suspense } from "react";
import { LionsAwards } from "@/components/LionsAwards";

export const Route = createFileRoute("/_app/lions-history/")({
  component: CoursesPage,
  head: () => ({ meta: [
    { title: "Cursos — Lions history | Lions Connecta" },
    { name: "description", content: "Cursos realizados pelo companheiro no Lions history." },
    { property: "og:title", content: "Cursos — Lions history | Lions Connecta" },
    { property: "og:description", content: "Histórico de cursos realizados pelo companheiro Lions." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function CoursesPage() {
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Cursos realizados</h2>
    <Suspense fallback={<p>Carregando cursos...</p>}><LionsAwards category="curso" /></Suspense>
  </section>;
}