import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, MessageSquare, CheckCircle2, BellOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_app/notifications")({ component: NotifPage });

type Notif = {
  id: string; type: string; read: boolean; created_at: string;
  actor_id: string | null; post_id: string | null; conversation_id: string | null;
  actor: { full_name: string; avatar_url: string | null } | null;
};

function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

const iconFor = (t: string) =>
  t === "like" ? Heart : t === "comment" ? MessageCircle : t === "message" ? MessageSquare : CheckCircle2;
const textFor = (t: string) =>
  t === "like" ? "curtiu sua publicação" :
  t === "comment" ? "comentou em sua publicação" :
  t === "message" ? "enviou uma mensagem" :
  t === "approved" ? "Seu cadastro foi aprovado! Bem-vindo." : "Nova notificação";

function NotifPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications")
      .select("id, type, read, created_at, actor_id, post_id, conversation_id")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    const ids = Array.from(new Set((data ?? []).map((n: any) => n.actor_id).filter(Boolean)));
    const { data: profs } = ids.length
      ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids)
      : { data: [] as any[] };
    const map = new Map((profs ?? []).map((p: any) => [p.id, p]));
    setItems(((data ?? []) as any[]).map((n) => ({ ...n, actor: n.actor_id ? map.get(n.actor_id) ?? null : null })));
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false);
    load();
  };

  useEffect(() => {
    // auto-mark as read on view
    if (!user) return;
    const t = setTimeout(markAll, 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Notificações</h1>
        <Button variant="ghost" size="sm" onClick={markAll}>Marcar todas como lidas</Button>
      </div>
      {items.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <BellOff className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">Você está em dia.</p>
        </div>
      ) : (
        items.map((n) => {
          const Icon = iconFor(n.type);
          const isMsg = !!n.conversation_id;
          return (
            <Link key={n.id} {...(isMsg ? { to: "/messages", search: { c: n.conversation_id! } } : { to: "/feed" })} className={`flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm transition hover:bg-muted ${!n.read ? "border-l-4 border-l-accent" : ""}`}>
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={n.actor?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(n.actor?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
                  <Icon className="h-3 w-3" />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm">
                  <span className="font-semibold">{n.actor?.full_name ?? "Lions Connect"}</span>{" "}
                  {textFor(n.type)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                </div>
              </div>
            </Link>
          );
        })
      )}
    </div>
  );
}
