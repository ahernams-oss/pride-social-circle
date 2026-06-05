import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/clubs")({ component: ClubsPage });

type Club = {
  id: string;
  name: string;
  city: string;
  district: string;
  founded_year: number | null;
  description: string;
};

function ClubsPage() {
  const { user, isAdmin } = useAuth();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Club | null>(null);
  const [form, setForm] = useState({ name: "", city: "", district: "LC-11", founded_year: "", description: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("clubs").select("*").order("name");
    if (error) toast.error(error.message);
    setClubs((data as Club[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setForm({ name: "", city: "", district: "LC-11", founded_year: "", description: "" });
    setEditing(null);
    setShowForm(false);
  };

  const startEdit = (c: Club) => {
    setEditing(c);
    setForm({
      name: c.name,
      city: c.city,
      district: c.district,
      founded_year: c.founded_year?.toString() ?? "",
      description: c.description,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!user || !isAdmin) return;
    if (!form.name.trim()) { toast.error("Informe o nome do clube"); return; }
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      district: form.district.trim(),
      founded_year: form.founded_year ? Number(form.founded_year) : null,
      description: form.description.trim(),
    };
    if (editing) {
      const { error } = await supabase.from("clubs").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Clube atualizado");
    } else {
      const { error } = await supabase.from("clubs").insert({ ...payload, created_by: user.id });
      if (error) { toast.error(error.message); return; }
      toast.success("Clube cadastrado");
    }
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este clube?")) return;
    const { error } = await supabase.from("clubs").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Clube excluído");
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clubes</h1>
          <p className="text-sm text-muted-foreground">Cadastro de Lions Clubes</p>
        </div>
        {isAdmin && (
          <Button onClick={() => (showForm ? resetForm() : setShowForm(true))}>
            {showForm ? <><X className="h-4 w-4" /> Cancelar</> : <><Plus className="h-4 w-4" /> Novo clube</>}
          </Button>
        )}
      </div>

      {showForm && isAdmin && (
        <Card>
          <CardHeader><CardTitle>{editing ? "Editar clube" : "Novo clube"}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Distrito</Label>
                <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Ano de fundação</Label>
                <Input type="number" value={form.founded_year} onChange={(e) => setForm({ ...form, founded_year: e.target.value })} />
              </div>
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
      ) : clubs.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">Nenhum clube cadastrado ainda.</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {clubs.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/30 text-primary">
                      <Building2 className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[c.city, c.district].filter(Boolean).join(" • ")}
                        {c.founded_year ? ` • desde ${c.founded_year}` : ""}
                      </div>
                      {c.description && <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => startEdit(c)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
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
