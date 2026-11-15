import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useAccess, useAccessMatrix } from "@/lib/access-control";
import { canGrantAward, canEditAward } from "@/lib/laurear-permissions";
import { AssociadoCombobox } from "@/components/AssociadoCombobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Award, Plus, Pencil, Save } from "lucide-react";

const labels = { curso: "Curso", certificado: "Certificado", titulo: "Título do Lions" };
export function AdminLaurear() {
  const { user, isAdmin } = useAuth();
  const { can, levelKey } = useAccess();
  const { perms } = useAccessMatrix();
  const mayGrant = canGrantAward(isAdmin, can("laurear", "view"), perms.some((p) => p.level_key === levelKey && p.menu_key === "laurear" && p.can_create));
  const mayEdit = canEditAward(isAdmin, can("laurear", "view"), perms.some((p) => p.level_key === levelKey && p.menu_key === "laurear" && p.can_edit));
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ user_id: "", category: "curso", title: "", institution: "", awarded_on: "", description: "", document_url: "" });
  const { data } = useSuspenseQuery({ queryKey: ["admin-lions-awards", user?.id], queryFn: async () => {
    const [members, awards] = await Promise.all([
      supabase.from("profiles").select("id,full_name,club_name,avatar_url").eq("status", "approved").eq("is_active", true).order("full_name"),
      supabase.from("member_lions_awards").select("*").order("created_at", { ascending: false }),
    ]);
    if (members.error || awards.error) throw members.error ?? awards.error;
    return { members: members.data ?? [], awards: awards.data ?? [] };
  } });
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || (editingId ? !mayEdit : !mayGrant)) return;
    if (!form.user_id) return toast.error("Selecione o companheiro.");
    setSaving(true);
    const payload = { ...form, title: form.title.trim(), document_url: form.document_url.trim() || null };
    const { error } = editingId
      ? await supabase.from("member_lions_awards").update(payload).eq("id", editingId).select("id").single()
      : await supabase.from("member_lions_awards").insert({ ...payload, granted_by: user.id });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(editingId ? "Concessão atualizada." : "Companheiro laureado! Registro disponível no Lions history.");
    setEditingId(null);
    setForm({ user_id: "", category: "curso", title: "", institution: "", awarded_on: "", description: "", document_url: "" });
    await queryClient.invalidateQueries({ queryKey: ["admin-lions-awards"] });
    await queryClient.invalidateQueries({ queryKey: ["my-lions-awards"] });
  };
  return <div className="space-y-6">
    <h1 className="flex items-center gap-2 text-xl font-bold"><Award className="h-6 w-6 text-primary" />Laurear companheiros</h1>
    {(editingId ? mayEdit : mayGrant) && <form onSubmit={submit} className="space-y-4 border-b pb-6">
      {editingId && <h2 className="text-lg font-semibold">Editar concessão</h2>}
      <div><Label>Companheiro</Label><AssociadoCombobox items={data.members} value={form.user_id} onChange={(id) => setForm({ ...form, user_id: id })} placeholder="Selecionar companheiro..." /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div><Label>Categoria</Label><Select value={form.category} onValueChange={(category) => setForm({ ...form, category })}><SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(labels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select></div>
        <div><Label htmlFor="award-date">Data da concessão</Label><Input id="award-date" type="date" required value={form.awarded_on} onChange={(e) => setForm({ ...form, awarded_on: e.target.value })} /></div>
      </div>
      <div><Label htmlFor="award-title">Nome do curso, certificado ou título</Label><Input id="award-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
      <div><Label htmlFor="award-institution">Instituição ou entidade concedente</Label><Input id="award-institution" value={form.institution} onChange={(e) => setForm({ ...form, institution: e.target.value })} /></div>
      <div><Label htmlFor="award-description">Descrição</Label><Textarea id="award-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      <div><Label htmlFor="award-url">Link do documento (opcional)</Label><Input id="award-url" type="url" pattern="https?://.*" value={form.document_url} onChange={(e) => setForm({ ...form, document_url: e.target.value })} /></div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>{editingId ? <Save className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}{saving ? "Salvando..." : editingId ? "Salvar alterações" : "Laurear companheiro"}</Button>
        {editingId && <Button type="button" variant="outline" disabled={saving} onClick={() => { setEditingId(null); setForm({ user_id: "", category: "curso", title: "", institution: "", awarded_on: "", description: "", document_url: "" }); }}>Cancelar</Button>}
      </div>
    </form>}
    <h2 className="text-lg font-semibold">Concessões registradas</h2>
    {!data.awards.length && <p className="text-muted-foreground">Nenhuma concessão registrada.</p>}
    {data.awards.map((award) => <article key={award.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4"><div className="min-w-0"><h3 className="break-words font-semibold">{award.title}</h3><p className="text-sm">{data.members.find((m) => m.id === award.user_id)?.full_name ?? "Companheiro"}</p><p className="text-sm text-muted-foreground">{labels[award.category as keyof typeof labels]} · {new Date(`${award.awarded_on}T12:00:00`).toLocaleDateString("pt-BR")}</p></div>{mayEdit && <Button variant="ghost" size="icon" disabled={saving} aria-label={`Editar ${award.title}`} title="Editar concessão" onClick={() => {
      setEditingId(award.id);
      setForm({ user_id: award.user_id, category: award.category, title: award.title, institution: award.institution, awarded_on: award.awarded_on, description: award.description, document_url: award.document_url ?? "" });
      window.scrollTo({ top: 0, behavior: "instant" });
    }}><Pencil className="h-4 w-4" /></Button>}</article>)}
  </div>;
}