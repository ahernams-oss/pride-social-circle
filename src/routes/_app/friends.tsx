import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Users, Search } from "lucide-react";

export const Route = createFileRoute("/_app/friends")({ component: FriendsPage });

type Row = { id: string; full_name: string; avatar_url: string | null; club_name: string; city: string };

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function FriendsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, club_name, city")
      .eq("status", "approved")
      .order("full_name");
    setRows((data ?? []) as Row[]);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = rows.filter((r) =>
    [r.full_name, r.club_name, r.city].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Amigos</h1>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar associados..." className="pl-9" />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {filtered.map((r) => (
          <Link
            key={r.id}
            to="/profile/$id"
            params={{ id: r.id }}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={r.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">{initials(r.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate font-medium">{r.full_name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {[r.club_name, r.city].filter(Boolean).join(" · ") || "Lions Clube"}
              </div>
            </div>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-full rounded-xl border bg-card p-8 text-center text-muted-foreground">
            Nenhum associado encontrado.
          </p>
        )}
      </div>
    </div>
  );
}
