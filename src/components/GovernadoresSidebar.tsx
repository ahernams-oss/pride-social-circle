import { useQuery } from "@tanstack/react-query";
import { fetchDistrito, type Governador } from "@/lib/distrito-api";
import { Skeleton } from "@/components/ui/skeleton";

const ROLES = [
  { key: "governador", label: "Governador", match: (r: string) => /governador/i.test(r) && !/vice/i.test(r) },
  { key: "vice1", label: "1º Vice Governador", match: (r: string) => /1º?\s*vice|primeiro\s*vice/i.test(r) },
  { key: "vice2", label: "2º Vice Governador", match: (r: string) => /2º?\s*vice|segundo\s*vice/i.test(r) },
];

export function GovernadoresSidebar() {
  const { data, isLoading } = useQuery({
    queryKey: ["distrito", "governadores"],
    queryFn: () => fetchDistrito<Governador[]>("/api/public/governadores"),
  });

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        {ROLES.map(({ key, label, match }) => {
          const g = data?.find((x) => match(x.role ?? ""));
          return (
            <div key={key} className="space-y-2">
              <h3 className="text-sm font-semibold">{label}</h3>
              {isLoading ? (
                <Skeleton className="h-40 w-full rounded-lg" />
              ) : g ? (
                <div className="space-y-2">
                  {g.photo_url ? (
                    <img
                      src={g.photo_url}
                      alt={g.name}
                      className="aspect-[3/4] w-full rounded-lg object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-muted text-2xl font-semibold text-muted-foreground ring-1 ring-border">
                      {g.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium leading-tight">{g.name}</p>
                    {g.year_label && (
                      <p className="text-xs text-muted-foreground">{g.year_label}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Não informado</p>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
