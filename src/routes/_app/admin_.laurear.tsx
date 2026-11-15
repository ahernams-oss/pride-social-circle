import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { AdminLaurear } from "@/components/AdminLaurear";

export const Route = createFileRoute("/_app/admin_/laurear")({
  component: () => <Suspense fallback={<p>Carregando concessões...</p>}><AdminLaurear /></Suspense>,
  head: () => ({ meta: [
    { title: "Laurear companheiros | Lions Connecta" },
    { name: "description", content: "Concessão autorizada de cursos, certificados e títulos do Lions." },
    { property: "og:title", content: "Laurear companheiros | Lions Connecta" },
    { property: "og:description", content: "Administração das conquistas dos companheiros Lions." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});