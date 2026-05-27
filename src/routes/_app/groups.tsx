import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users2, Building2 } from "lucide-react";

export const Route = createFileRoute("/_app/groups")({ component: GroupsPage });

type Group = { club_name: string; count: number };

function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("club_name")
        .eq("status", "approved");
      const map = new Map<string, number>();
      (data ?? []).forEach((r: any) => {
        const name = (r.club_name || "").trim();
        if (!name) return;
        map.set(name, (map.get(name) ?? 0) + 1);
      });
      setGroups(Array.from(map, ([club_name, count]) => ({ club_name, count })).sort((a, b) => b.count - a.count));
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users2 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Grupos</h1>
      </div>
      <p className="text-sm text-muted-foreground">Clubes Lions com associados na rede.</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.club_name} className="flex items-center gap-3 rounded-xl border bg-card p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{g.club_name}</div>
              <div className="text-xs text-muted-foreground">{g.count} {g.count === 1 ? "associado" : "associados"}</div>
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="col-span-full rounded-xl border bg-card p-8 text-center text-muted-foreground">
            Nenhum grupo ainda.
          </p>
        )}
      </div>
    </div>
  );
}
