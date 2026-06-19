import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Award, Plus, Trash2, Pencil, X, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/district-roles")({ component: DistrictRolesPage });

type DistrictRole = {
  id: string;
  name: string;
  description: string;
  assigned_user_id: string | null;
};

type ProfileLite = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  club_name: string | null;
};

function DistrictRolesPage() {
  const { user, isAdmin } = useAuth();
  const [roles, setRoles] = useState<DistrictRole[]>([]);
  const [profiles, setProfiles] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DistrictRole | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignSelect, setAssignSelect] = useState<string>("");

  const load = async () => {
    setLoading(true);
    const [{ data: r, error: er }, { data: p }] = await Promise.all([
      supabase.from("district_roles").select("*").order("name"),
      supabase.from("profiles").select("id,full_name,avatar_url,club_name").order("full_name"),
    ]);
    if (er) toast.error(er.message);
    setRoles((r as DistrictRole[]) ?? []);
    setProfiles((p as ProfileLite[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const profileOf = (id: string | null) =>
    id ? profiles.find((p) => p.id === id) ?? null : null;

  const resetForm = () => {
    setForm({ name: "", description: "" });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (r: DistrictRole) => {
    setEditing(r);
    setForm({ name: r.name, description: r.description });
    setShowForm(true);
  };

  const save = async () => {
    if (!user || !isAdmin) return;
    if (!form.name.trim()) { toast.error("Informe o nome do cargo"); return; }
    const payload = { name: form.name.trim(), description: form.description.trim() };
    if (editing) {
      const { error } = await supabase.from("district_roles").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Cargo atualizado");
    } else {
      const { error } = await supabase.from("district_roles").insert({ ...payload, created_by: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Cargo cadastrado");
    }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este cargo?")) return;
    const { error } = await supabase.from("district_roles").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Cargo excluído");
    load();
  };

  const startAssign = (r: DistrictRole) => {
    setAssigningId(r.id);
    setAssignSelect(r.assigned_user_id ?? "");
  };

  const confirmAssign = async (roleId: string) => {
    const { error } = await supabase
      .from("district_roles")
      .update({ assigned_user_id: assignSelect || null })
      .eq("id", roleId);
    if (error) { toast.error(error.message); return; }
    toast.success("Responsável atualizado");
    setAssigningId(null);
    load();
  };

  const clearAssign = async (roleId: string) => {
    const { error } = await supabase
      .from("district_roles")
      .update({ assigned_user_id: null })
      .eq("id", roleId);
    if (error) { toast.error(error.message); return; }
    toast.success("Responsável removido");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cargos no Distrito</h1>
          <p className="text-sm text-muted-foreground">Cadastro de cargos do distrito LC-11 e seus responsáveis</p>
        </div>
        {isAdmin && (
          <Button onClick={() => (showForm ? resetForm() : setShowForm(true))}>
            {showForm ? <><X className="h-4 w-4" /> Cancelar</> : <><Plus className="h-4 w-4" /> Novo cargo</>}
          </Button>
        )}
      </div>

      {showForm && isAdmin && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Editar cargo" : "Novo cargo"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Governador, 1º Vice Governador..." />
            </div>
            <div className="space-y-1">
              <Label>Descrição</Label>
              <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button onClick={save}>{editing ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : roles.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum cargo cadastrado ainda.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {roles.map((r) => {
            const p = profileOf(r.assigned_user_id);
            const isAssigning = assigningId === r.id;
            return (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/30 text-primary">
                        <Award className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{r.name}</div>
                        {r.description && <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>}
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    )}
                  </div>

                  <div className="border-t pt-3">
                    {p ? (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={p.avatar_url ?? undefined} alt={p.full_name ?? ""} />
                            <AvatarFallback>{p.full_name?.[0] ?? "?"}</AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{p.full_name}</div>
                            {p.club_name && <div className="text-xs text-muted-foreground truncate">{p.club_name}</div>}
                          </div>
                        </div>
                        {isAdmin && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => startAssign(r)}>
                              <Pencil className="h-3.5 w-3.5" /> Alterar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => clearAssign(r.id)}>
                              <UserX className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : isAdmin ? (
                      <Button size="sm" variant="outline" onClick={() => startAssign(r)}>
                        <UserPlus className="h-4 w-4" /> Atribuir responsável
                      </Button>
                    ) : (
                      <p className="text-xs text-muted-foreground">Nenhum responsável cadastrado.</p>
                    )}

                    {isAssigning && isAdmin && (
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <Select value={assignSelect} onValueChange={setAssignSelect}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o membro" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((pp) => (
                              <SelectItem key={pp.id} value={pp.id}>
                                {pp.full_name ?? "(sem nome)"}{pp.club_name ? ` — ${pp.club_name}` : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => confirmAssign(r.id)}>Salvar</Button>
                          <Button size="sm" variant="outline" onClick={() => setAssigningId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
