import { createFileRoute } from "@tanstack/react-router";
import { BookOpen } from "lucide-react";

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
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Lions history</h1>
      </div>
      <div className="border-t py-12 text-center text-muted-foreground">
        <BookOpen className="mx-auto mb-3 h-8 w-8" />
        <p>Nenhuma história publicada ainda.</p>
      </div>
    </div>
  );
}