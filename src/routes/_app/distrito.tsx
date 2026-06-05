import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchDistrito, type Governador, type Projeto, type Evento } from "@/lib/distrito-api";
import { Calendar, MapPin } from "lucide-react";

export const Route = createFileRoute("/_app/distrito")({ component: DistritoPage });

function LoadingGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-48 w-full" />
      ))}
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <p className="py-12 text-center text-sm text-muted-foreground">{msg}</p>;
}

function GovernadoresTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["distrito", "governadores"],
    queryFn: () => fetchDistrito<Governador[]>("/api/public/governadores"),
  });
  if (isLoading) return <LoadingGrid />;
  if (!data?.length) return <Empty msg="Nenhum governador encontrado." />;
  return (
    <div className="space-y-3">
      {data.map((g) => (
        <div
          key={g.id}
          className="flex items-start gap-4 rounded-xl border bg-card p-4 shadow-sm transition-colors hover:bg-muted/40"
        >
          {g.photo_url ? (
            <img
              src={g.photo_url}
              alt={g.name}
              className="h-24 w-20 shrink-0 rounded-lg object-cover ring-1 ring-border"
            />
          ) : (
            <div className="flex h-24 w-20 shrink-0 items-center justify-center rounded-lg bg-muted text-lg font-semibold text-muted-foreground ring-1 ring-border">
              {g.name?.[0] ?? "G"}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-base font-semibold leading-tight">{g.name}</h3>
              <span className="text-xs font-medium text-muted-foreground">{g.year_label}</span>
            </div>
            {g.role && <p className="text-xs uppercase tracking-wide text-muted-foreground">{g.role}</p>}
            {g.motto && (
              <p className="rounded-md bg-accent/30 px-2 py-1 text-sm italic text-primary">
                "{g.motto}"
              </p>
            )}
            {g.bio && <p className="text-sm text-muted-foreground">{g.bio}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function LcifTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["distrito", "lcif"],
    queryFn: () => fetchDistrito<Record<string, unknown>>("/api/public/lcif"),
  });
  if (isLoading) return <LoadingGrid />;
  if (!data) return <Empty msg="Conteúdo da LCIF indisponível." />;
  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => (
        <Card key={key}>
          <CardHeader>
            <CardTitle className="capitalize">{key.replace(/_/g, " ")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {renderValue(value)}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function renderValue(value: unknown): ReactNode {
  if (value == null) return <span className="italic">—</span>;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return <p className="whitespace-pre-wrap">{String(value)}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-5">
        {value.map((v, i) => <li key={i}>{renderValue(v)}</li>)}
      </ul>
    );
  }
  if (typeof value === "object") {
    return (
      <div className="space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k}>
            <div className="text-xs font-semibold uppercase tracking-wide text-foreground">
              {k.replace(/_/g, " ")}
            </div>
            <div>{renderValue(v)}</div>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

function ProjetosTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["distrito", "projetos"],
    queryFn: () => fetchDistrito<Projeto[]>("/api/public/projetos"),
  });
  if (isLoading) return <LoadingGrid />;
  if (!data?.length) return <Empty msg="Nenhum projeto disponível." />;
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => (
        <Card key={p.id} className="overflow-hidden">
          {p.cover_url && (
            <img src={p.cover_url} alt={p.title} className="h-40 w-full object-cover" />
          )}
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{p.title}</CardTitle>
              {p.tag && <Badge variant="secondary">{p.tag}</Badge>}
            </div>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{p.description}</CardContent>
        </Card>
      ))}
    </div>
  );
}

function EventosTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["distrito", "eventos"],
    queryFn: () => fetchDistrito<Evento[]>("/api/public/eventos"),
  });
  if (isLoading) return <LoadingGrid />;
  if (!data?.length) return <Empty msg="Nenhum evento agendado." />;
  return (
    <div className="space-y-4">
      {data.map((e) => (
        <Card key={e.id} className="overflow-hidden">
          <div className="md:flex">
            {e.cover_url && (
              <img src={e.cover_url} alt={e.title} className="h-40 w-full object-cover md:h-auto md:w-48" />
            )}
            <div className="flex-1">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{e.title}</CardTitle>
                  {e.tag && <Badge variant="secondary">{e.tag}</Badge>}
                </div>
                <CardDescription className="flex flex-wrap gap-3 pt-1">
                  {e.starts_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(e.starts_at).toLocaleDateString("pt-BR", {
                        day: "2-digit", month: "long", year: "numeric",
                      })}
                    </span>
                  )}
                  {e.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {e.location}
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{e.description}</CardContent>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function DistritoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Distrito LC-11</h1>
        <p className="text-sm text-muted-foreground">Conteúdo oficial do site institucional do Distrito.</p>
      </div>
      <Tabs defaultValue="governadores">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-4">
          <TabsTrigger value="governadores">Governadores</TabsTrigger>
          <TabsTrigger value="lcif">LCIF</TabsTrigger>
          <TabsTrigger value="projetos">Projetos</TabsTrigger>
          <TabsTrigger value="eventos">Eventos</TabsTrigger>
        </TabsList>
        <TabsContent value="governadores" className="mt-6"><GovernadoresTab /></TabsContent>
        <TabsContent value="lcif" className="mt-6"><LcifTab /></TabsContent>
        <TabsContent value="projetos" className="mt-6"><ProjetosTab /></TabsContent>
        <TabsContent value="eventos" className="mt-6"><EventosTab /></TabsContent>
      </Tabs>
    </div>
  );
}
