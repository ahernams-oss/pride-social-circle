import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";

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
    <div className="border-t py-12 text-center text-muted-foreground">
      <ScrollText className="mx-auto mb-3 h-8 w-8" />
      <p>Nenhum certificado registrado.</p>
    </div>
  </section>;
}