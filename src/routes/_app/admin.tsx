import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, X } from "lucide-react";

export const Route = createFileRoute("/_app/admin")({ component: AdminPage });

type Row = {
  id: string; full_name: string; club_name: string; city: string;
  status: "pending" | "approved" | "rejected"; avatar_url: string | null; created_at: string;
};

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [tab, setTab] = useState<"pending" | "approved" | "rejected">("pending");

  const load = useCallback(async () => {
    const { data } = await supabase.from("profiles")
      .select("id, full_name, club_name, city, status, avatar_url, created_at")
      .eq("status", tab).order("created_at", { ascending: false });
    setRows((data ?? []) as Row[]);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!loading && !isAdmin) nav({ to: "/feed", replace: true });
  }, [isAdmin, loading, nav]);

  if (loading) return null;
  if (!isAdmin) return null;

  const setStatus = async (id: string, status: Row["status"]) => {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Atualizado");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold">Painel administrativo</h1>
      </div>
      <div className="flex gap-2 border-b">
        {(["pending", "approved", "rejected"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {t === "pending" ? "Pendentes" : t === "approved" ? "Aprovados" : "Rejeitados"}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border bg-card p-12 text-center text-muted-foreground">Nada por aqui.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
            <Avatar className="h-12 w-12">
              <AvatarImage src={r.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground">{initials(r.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-semibold">{r.full_name}</div>
              <div className="text-sm text-muted-foreground">{r.club_name || "—"} · {r.city || "—"}</div>
            </div>
            <Badge variant={r.status === "approved" ? "default" : "secondary"}>{r.status}</Badge>
            <div className="flex gap-2">
              {r.status !== "approved" && (
                <Button size="sm" onClick={() => setStatus(r.id, "approved")}>
                  <ShieldCheck className="mr-1 h-4 w-4" /> Aprovar
                </Button>
              )}
              {r.status !== "rejected" && (
                <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "rejected")}>
                  <X className="mr-1 h-4 w-4" /> Rejeitar
                </Button>
              )}
            </div>
          </div>
        ))
      )}
      <p className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
        Dica: para tornar alguém administrador, insira um registro em <code>user_roles</code> com role <code>admin</code> via painel do banco.
      </p>
    </div>
  );
}
