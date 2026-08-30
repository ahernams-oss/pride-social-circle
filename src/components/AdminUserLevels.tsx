import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAccessMatrix } from "@/lib/access-control";
import { History, Power, PowerOff, Search, UserCog } from "lucide-react";
import { LEVEL_LABEL, type AccessLevel } from "@/lib/permissions";

type ManagedLevel = string;

type UserRow = {
  id: string;
  full_name: string;
  club_name: string;
  city: string;
  avatar_url: string | null;
  status: "pending" | "approved" | "rejected";
  is_active: boolean;
  level: ManagedLevel;
};

type AuditRow = {
  id: string;
  kind: "level" | "activation";
  target_user_id: string;
  changed_by: string | null;
  from: string | null;
  to: string;
  reason: string | null;
  created_at: string;
};



function initials(n?: string | null) {
  return (n ?? "L").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
}

function levelVariant(l: string) {
  return l === "admin" ? "default" : l === "moderator" ? "default" : l === "approved" ? "secondary" : "outline";
}

function labelFor(v: string) {
  return LEVEL_LABEL[v as AccessLevel] ?? v;
}

export function AdminUserLevels() {
  const { levels: levelDefs } = useAccessMatrix();
  const labelOf = (k: string) => levelDefs.find((l) => l.key === k)?.label ?? LEVEL_LABEL[k as AccessLevel] ?? k;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState<UserRow | null>(null);
  const [newLevel, setNewLevel] = useState<ManagedLevel>("approved");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<UserRow | null>(null);
  const [toggleReason, setToggleReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: profiles }, { data: roles }, { data: logs }, { data: actLogs }] = await Promise.all([
      supabase.from("profiles")
        .select("id, full_name, club_name, city, avatar_url, status, is_active, access_level")
        .order("full_name"),
      supabase.from("user_roles").select("user_id, role"),
      supabase.from("access_level_audit")
        .select("id, target_user_id, changed_by, old_level, new_level, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase.from("user_activation_audit")
        .select("id, target_user_id, changed_by, active, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    const admins = new Set((roles ?? []).filter((r) => r.role === "admin").map((r) => r.user_id));
    const mods = new Set((roles ?? []).filter((r) => r.role === "moderator").map((r) => r.user_id));
    setUsers(
      (profiles ?? []).map((p) => ({
        ...p,
        level: (p as { access_level?: string | null }).access_level
          ? (p as { access_level: string }).access_level
          : admins.has(p.id)
          ? "admin"
          : mods.has(p.id)
            ? "moderator"
            : p.status === "approved"
              ? "approved"
              : "user",
      })) as UserRow[],
    );

    const merged: AuditRow[] = [
      ...(logs ?? []).map((a) => ({
        id: a.id, kind: "level" as const, target_user_id: a.target_user_id, changed_by: a.changed_by,
        from: a.old_level, to: a.new_level, reason: a.reason, created_at: a.created_at,
      })),
      ...(actLogs ?? []).map((a) => ({
        id: a.id, kind: "activation" as const, target_user_id: a.target_user_id, changed_by: a.changed_by,
        from: null, to: a.active ? "Ativado" : "Desativado", reason: a.reason, created_at: a.created_at,
      })),
    ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 60);

    setAudit(merged);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    users.forEach((u) => m.set(u.id, u.full_name));
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.full_name, u.club_name, u.city].some((v) => (v ?? "").toLowerCase().includes(q)),
    );
  }, [users, query]);

  const openDialog = (u: UserRow) => {
    setTarget(u);
    setNewLevel(u.level);
    setReason("");
  };

  const save = async () => {
    if (!target) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_set_access_level", {
      _user_id: target.id,
      _level: newLevel,
      _reason: reason || undefined,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Nível alterado para ${LEVEL_LABEL[newLevel]}`);
    setTarget(null);
    load();
  };

  const confirmToggle = async () => {
    if (!toggling) return;
    setSaving(true);
    const { error } = await supabase.rpc("admin_set_user_active", {
      _user_id: toggling.id,
      _active: !toggling.is_active,
      _reason: toggleReason || undefined,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(toggling.is_active ? "Usuário desativado" : "Usuário ativado");
    setToggling(null);
    setToggleReason("");
    load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <UserCog className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Usuários, níveis e status</h2>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, clube ou cidade"
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        ) : (
          <ul className="divide-y">
            {filtered.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground">{initials(u.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className={`truncate font-medium ${u.is_active ? "" : "text-muted-foreground line-through"}`}>
                    {u.full_name}
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {u.club_name || "—"} · {u.city || "—"}
                  </div>
                </div>
                <Badge variant={levelVariant(u.level)}>{labelOf(u.level)}</Badge>
                <Badge variant={u.is_active ? "outline" : "destructive"}>
                  {u.is_active ? "Ativo" : "Desativado"}
                </Badge>
                <Button size="sm" variant="outline" onClick={() => openDialog(u)}>
                  Alterar nível
                </Button>
                <Button
                  size="sm"
                  variant={u.is_active ? "destructive" : "default"}
                  onClick={() => { setToggling(u); setToggleReason(""); }}
                >
                  {u.is_active ? <PowerOff className="mr-1 h-4 w-4" /> : <Power className="mr-1 h-4 w-4" />}
                  {u.is_active ? "Desativar" : "Ativar"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border bg-card shadow-sm">
        <div className="flex items-center gap-2 border-b p-4">
          <History className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Auditoria de mudanças</h2>
        </div>
        {audit.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Nenhuma alteração registrada.</p>
        ) : (
          <ul className="divide-y text-sm">
            {audit.map((a) => (
              <li key={`${a.kind}-${a.id}`} className="space-y-1 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{nameById.get(a.target_user_id) ?? a.target_user_id}</span>
                  {a.from && (
                    <>
                      <Badge variant="outline">{labelFor(a.from)}</Badge>
                      <span className="text-muted-foreground">→</span>
                    </>
                  )}
                  <Badge
                    variant={
                      a.kind === "activation"
                        ? a.to === "Ativado" ? "secondary" : "destructive"
                        : levelVariant(a.to)
                    }
                  >
                    {a.kind === "activation" ? a.to : labelFor(a.to)}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Date(a.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  por {a.changed_by ? (nameById.get(a.changed_by) ?? a.changed_by) : "sistema"}
                  {a.reason ? ` · ${a.reason}` : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar nível de acesso</DialogTitle>
            <DialogDescription>{target?.full_name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newLevel} onValueChange={(v) => setNewLevel(v as ManagedLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {levelDefs.map((l) => (
                  <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo da alteração (opcional)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!toggling} onOpenChange={(o) => !o && setToggling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{toggling?.is_active ? "Desativar usuário" : "Ativar usuário"}</DialogTitle>
            <DialogDescription>
              {toggling?.is_active
                ? `${toggling?.full_name} não conseguirá mais entrar no sistema até ser reativado.`
                : `${toggling?.full_name} poderá acessar o sistema novamente.`}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={toggleReason}
            onChange={(e) => setToggleReason(e.target.value)}
            placeholder="Motivo (opcional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setToggling(null)}>Cancelar</Button>
            <Button
              variant={toggling?.is_active ? "destructive" : "default"}
              onClick={confirmToggle}
              disabled={saving}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
