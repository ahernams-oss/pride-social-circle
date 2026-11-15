import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { Suspense } from "react";
import { LionsAwards } from "@/components/LionsAwards";

export const Route = createFileRoute("/_app/lions-history/certificados")({
  component: CertificatesPage,
  head: () => ({ meta: [
    { title: "Certificados — Lions history | Lions Connecta" },
    { name: "description", content: "Certificados recebidos pelo companheiro no Lions history." },
    { property: "og:title", content: "Certificados — Lions history | Lions Connecta" },
    { property: "og:description", content: "Histórico de certificados recebidos pelo companheiro Lions." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function CertificatesPage() {
  return <section className="space-y-4">
    <h2 className="text-lg font-semibold">Certificados recebidos</h2>
    <Suspense fallback={<p>Carregando certificados...</p>}><LionsAwards category="certificado" /></Suspense>
  </section>;
}