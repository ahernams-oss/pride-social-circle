import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Award, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/district-roles")({ component: DistrictRolesPage });

type DistrictRole = {
  id: string;
  name: string;
  description: string;
};

function DistrictRolesPage() {
  const { user, isAdmin } = useAuth();
  const [roles, setRoles] = useState<DistrictRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<DistrictRole | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("district_roles").select("*").order("name");
    if (error) toast.error(error.message);
    setRoles((data as DistrictRole[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cargos no Distrito</h1>
          <p className="text-sm text-muted-foreground">Cadastro de cargos do distrito LC-11</p>
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
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Governador, Vice-Governador..." />
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
          {roles.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
