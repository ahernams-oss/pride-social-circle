import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/lions-history")({
  component: LionsHistoryPage,
  head: () => ({ meta: [
    { title: "Lions history | Lions Connecta" },
    { name: "description", content: "História e memórias do Lions no Lions Connecta." },
    { property: "og:title", content: "Lions history | Lions Connecta" },
    { property: "og:description", content: "História e memórias do Lions e do Distrito LC-11." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function LionsHistoryPage() {
  const { pathname } = useLocation();
  const active = pathname.endsWith("/certificados") ? "certificados" : pathname.endsWith("/titulos") ? "titulos" : "cursos";
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Lions history</h1>
      </div>
      <Tabs value={active}>
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="cursos" asChild className="whitespace-normal text-center"><Link to="/lions-history">Cursos</Link></TabsTrigger>
          <TabsTrigger value="certificados" asChild className="whitespace-normal text-center"><Link to="/lions-history/certificados">Certificados</Link></TabsTrigger>
          <TabsTrigger value="titulos" asChild className="whitespace-normal text-center"><Link to="/lions-history/titulos">Títulos do Lions</Link></TabsTrigger>
        </TabsList>
      </Tabs>
      <Outlet />
    </div>
  );
}