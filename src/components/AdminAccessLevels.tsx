import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { ACTIONS, ACTION_COLUMN, ACTION_LABEL, MENUS, type AccessAction } from "@/lib/menus";
import { useAccessMatrix, type PermRow } from "@/lib/access-control";

const BASE_OPTIONS = [
  { value: "user", label: "Cadastro pendente" },
  { value: "approved", label: "Sócio aprovado" },
  { value: "moderator", label: "Moderador" },
  { value: "admin", label: "Administrador" },
] as const;

function slugify(v: string) {
  return v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function AdminAccessLevels() {
  const { levels, perms, loading, reload } = useAccessMatrix();
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: "", description: "", base: "approved", copyFrom: "approved" });

  const levelKey = selected ?? levels[0]?.key ?? null;
  const level = levels.find((l) => l.key === levelKey) ?? null;

  const rows = useMemo(() => {
    const map = new Map<string, PermRow>();
    perms.filter((p) => p.level_key === levelKey).forEach((p) => map.set(p.menu_key, p));
    return map;
  }, [perms, levelKey]);

  const value = (menu: string, action: AccessAction) => {
    const d = draft[menu]?.[action];
    if (d !== undefined) return d;
    const row = rows.get(menu);
    return row ? !!row[ACTION_COLUMN[action]] : false;
  };

  const toggle = (menu: string, action: AccessAction) =>
    setDraft((prev) => ({ ...prev, [menu]: { ...prev[menu], [action]: !value(menu, action) } }));

  const changeLevel = (key: string) => {
    setSelected(key);
    setDraft({});
  };

  const save = async () => {
    if (!levelKey) return;
    setSaving(true);
    const payload = MENUS.map((m) => ({
      level_key: levelKey,
      menu_key: m.key,
      can_view: value(m.key, "view"),
      can_create: value(m.key, "create"),
      can_edit: value(m.key, "edit"),
      can_delete: value(m.key, "delete"),
      can_approve: value(m.key, "approve"),
    }));
    const { error } = await supabase
      .from("access_level_permissions")
      .upsert(payload, { onConflict: "level_key,menu_key" });
    setSaving(false);
    if (error) return toast.error(error.message);
    setDraft({});
    await reload();
    toast.success("Permissões atualizadas.");
  };

  const createLevel = async () => {
    const key = slugify(form.label);
    if (!key) return toast.error("Informe o nome do nível.");
    if (levels.some((l) => l.key === key)) return toast.error("Já existe um nível com esse nome.");
    const maxRank = Math.max(0, ...levels.map((l) => l.rank));
    const { error } = await supabase.from("access_levels").insert({
      key,
      label: form.label.trim(),
      description: form.description.trim(),
      base_level: form.base,
      rank: maxRank + 5,
      is_builtin: false,
    });
    if (error) return toast.error(error.message);

    const source = perms.filter((p) => p.level_key === form.copyFrom);
    if (source.length) {
      await supabase.from("access_level_permissions").insert(
        source.map((p) => ({
          level_key: key,
          menu_key: p.menu_key,
          can_view: p.can_view,
          can_create: p.can_create,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
          can_approve: p.can_approve,
        })),
      );
    }
    setOpen(false);
    setForm({ label: "", description: "", base: "approved", copyFrom: "approved" });
    await reload();
    setSelected(key);
    toast.success("Nível criado.");
  };

  const removeLevel = async (key: string) => {
    if (!confirm("Excluir este nível de acesso?")) return;
    const { error } = await supabase.from("access_levels").delete().eq("key", key);
    if (error) return toast.error(error.message);
    setSelected(null);
    await reload();
    toast.success("Nível excluído.");
  };

  if (loading) return <p className="p-8 text-center text-sm text-muted-foreground">Carregando níveis...</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Níveis de acesso e menus</h2>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Novo nível</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo nível de acesso</DialogTitle>
              <DialogDescription>
                O nível base define o que o banco de dados permite; a matriz define os menus e ações.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Nome do nível (ex.: Tesoureiro)" value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })} />
              <Textarea placeholder="Descrição" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Nível base</div>
                  <Select value={form.base} onValueChange={(v) => setForm({ ...form, base: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BASE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <div className="mb-1 text-xs text-muted-foreground">Copiar permissões de</div>
                  <Select value={form.copyFrom} onValueChange={(v) => setForm({ ...form, copyFrom: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {levels.map((l) => <SelectItem key={l.key} value={l.key}>{l.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={createLevel}>Criar nível</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        {levels.map((l) => (
          <button
            key={l.key}
            onClick={() => changeLevel(l.key)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              l.key === levelKey ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {level && (
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                {level.label}
                <Badge variant="outline">base: {level.base_level}</Badge>
                {level.is_builtin && <Badge variant="secondary">padrão</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">{level.description || "Sem descrição."}</p>
            </div>
            <div className="flex gap-2">
              {!level.is_builtin && (
                <Button size="sm" variant="outline" onClick={() => removeLevel(level.key)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Excluir nível
                </Button>
              )}
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="mr-1 h-4 w-4" /> {saving ? "Salvando…" : "Salvar permissões"}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4">Menu</th>
                  {ACTIONS.map((a) => <th key={a} className="px-2 py-2 text-center">{ACTION_LABEL[a]}</th>)}
                </tr>
              </thead>
              <tbody>
                {MENUS.map((m) => (
                  <tr key={m.key} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{m.label}</td>
                    {ACTIONS.map((a) => (
                      <td key={a} className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          className="h-4 w-4 cursor-pointer accent-primary"
                          checked={value(m.key, a)}
                          onChange={() => toggle(m.key, a)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Administradores sempre têm acesso total, independentemente da matriz.
          </p>
        </div>
      )}
    </div>
  );
}
