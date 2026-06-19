import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const ROLES = [
  { key: "governador", label: "Governador", match: (r: string) => /governador/i.test(r) && !/vice/i.test(r) },
  { key: "vice1", label: "1º Vice Governador", match: (r: string) => /1º?\s*vice|primeiro\s*vice/i.test(r) },
  { key: "vice2", label: "2º Vice Governador", match: (r: string) => /2º?\s*vice|segundo\s*vice/i.test(r) },
];

type RoleRow = {
  id: string;
  name: string;
  assigned_user_id: string | null;
};

type ProfileLite = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  club_name: string | null;
};

export function GovernadoresSidebar() {
  const { data, isLoading } = useQuery({
    queryKey: ["sidebar", "district-governadores"],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("district_roles")
        .select("id,name,assigned_user_id");
      if (error) throw error;
      const ids = (rows ?? [])
        .map((r) => r.assigned_user_id)
        .filter((v): v is string => !!v);
      let profiles: ProfileLite[] = [];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,full_name,avatar_url,club_name")
          .in("id", ids);
        profiles = (profs ?? []) as ProfileLite[];
      }
      return { roles: (rows ?? []) as RoleRow[], profiles };
    },
  });

  const findProfile = (roleMatch: (r: string) => boolean) => {
    const row = data?.roles.find((r) => roleMatch(r.name));
    if (!row?.assigned_user_id) return null;
    return data?.profiles.find((p) => p.id === row.assigned_user_id) ?? null;
  };

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        {ROLES.map(({ key, label, match }) => {
          const p = findProfile(match);
          return (
            <div key={key} className="space-y-2">
              <h3 className="text-sm font-semibold">{label}</h3>
              {isLoading ? (
                <Skeleton className="h-14 w-full rounded-lg" />
              ) : p ? (
                <Link
                  to="/profile/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-3 rounded-lg border bg-background p-2 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name ?? ""} />
                    <AvatarFallback>{p.full_name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium leading-tight">{p.full_name}</p>
                    {p.club_name && (
                      <p className="truncate text-xs text-muted-foreground">{p.club_name}</p>
                    )}
                  </div>
                </Link>
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
