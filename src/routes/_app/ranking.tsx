import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal } from "lucide-react";

export const Route = createFileRoute("/_app/ranking")({ component: RankingPage });

type Row = { id: string; full_name: string; avatar_url: string | null; club_name: string; posts: number };

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function RankingPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: profiles }, { data: completions }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, club_name").eq("status", "approved"),
        supabase.from("mission_completions").select("user_id, missions(points)"),
      ]);
      const counts = new Map<string, number>();
      (completions ?? []).forEach((c: any) => {
        const pts = c.missions?.points ?? 1;
        counts.set(c.user_id, (counts.get(c.user_id) ?? 0) + pts);
      });
      const list: Row[] = ((profiles ?? []) as any[])
        .map((p) => ({ ...p, posts: counts.get(p.id) ?? 0 }))
        .sort((a, b) => b.posts - a.posts);
      setRows(list);
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Ranking</h1>
      </div>
      <p className="text-sm text-muted-foreground">Associados mais ativos pela quantidade de publicações.</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <Link
            key={r.id}
            to="/profile/$id"
            params={{ id: r.id }}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-muted"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {i < 3 ? <Medal className="h-4 w-4 text-gold" /> : i + 1}
            </div>
            <Avatar className="h-10 w-10">
              <AvatarImage src={r.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(r.full_name)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{r.full_name}</div>
              <div className="truncate text-xs text-muted-foreground">{r.club_name || "Lions Clube"}</div>
            </div>
            <div className="text-sm font-semibold text-primary">{r.posts} pts</div>
          </Link>
        ))}
        {rows.length === 0 && (
          <p className="rounded-xl border bg-card p-8 text-center text-muted-foreground">Sem dados ainda.</p>
        )}
      </div>
    </div>
  );
}
