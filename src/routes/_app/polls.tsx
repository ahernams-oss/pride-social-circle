import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAccess } from "@/lib/access-control";
import { useAuth } from "@/lib/auth-context";
import { PollCard, type Poll } from "@/components/PollCard";
import { validPollPeriod } from "@/lib/polls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { PollImagePicker } from "@/components/PollImagePicker";
import { uploadPollImage } from "@/lib/poll-images";

export const Route = createFileRoute("/_app/polls")({
  component: PollsPage,
  head: () => ({ meta: [
    { title: "Enquetes | Lions Connecta" },
    { name: "description", content: "Enquetes dos associados do Distrito LC-11." },
    { property: "og:title", content: "Enquetes | Lions Connecta" },
    { property: "og:description", content: "Participe das enquetes dos associados do Distrito LC-11." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

type QDraft = { text: string; allow_multiple: boolean; options: string[]; image: File | null; optionImages: (File | null)[]; imagePath: string | null; optionPaths: (string | null)[] };
const emptyQ = (): QDraft => ({ text: "", allow_multiple: false, options: ["", ""], image: null, optionImages: [null, null], imagePath: null, optionPaths: [null, null] });
const toLocal = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };

function PollsPage() {
  const { can } = useAccess();
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [titleImage, setTitleImage] = useState<File | null>(null);
  const [qs, setQs] = useState<QDraft[]>([emptyQ()]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [titlePath, setTitlePath] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from("polls").select("id, title, description, starts_at, ends_at, image_url, published_at").order("starts_at", { ascending: false });
    setPolls(data ?? []);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const updQ = (i: number, patch: Partial<QDraft>) => setQs((a) => a.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const reset = () => { setTitle(""); setDescription(""); setStartsAt(""); setEndsAt(""); setQs([emptyQ()]); setTitleImage(null); setTitlePath(null); setEditingId(null); };

  const startEdit = async (p: Poll) => {
    const { data } = await supabase.from("poll_questions").select("text, allow_multiple, order_index, image_url, poll_options(text, order_index, image_url)").eq("poll_id", p.id).order("order_index");
    setEditingId(p.id); setTitle(p.title); setDescription(p.description); setStartsAt(toLocal(p.starts_at)); setEndsAt(toLocal(p.ends_at));
    setTitleImage(null); setTitlePath(p.image_url ?? null);
    setQs((data ?? []).map((q) => { const o = [...(q.poll_options ?? [])].sort((a, b) => a.order_index - b.order_index); return { text: q.text, allow_multiple: q.allow_multiple, image: null, imagePath: q.image_url, options: o.map((x) => x.text), optionImages: o.map(() => null), optionPaths: o.map((x) => x.image_url) }; }));
    setOpen(true);
  };

  const save = async (publish: boolean) => {
    if (!title.trim()) return toast.error("Informe o título.");
    if (!validPollPeriod(startsAt, endsAt)) return toast.error("Informe início e fim; o fim deve ser depois do início.");
    const clean = qs.map((q) => {
      const opts = q.options.map((o, k) => ({ text: o.trim(), image: q.optionImages[k] ?? null, path: q.optionPaths[k] ?? null })).filter((o) => o.text);
      return { ...q, text: q.text.trim(), options: opts };
    });
    if (clean.some((q) => !q.text || q.options.length < 2)) return toast.error("Cada pergunta precisa de texto e ao menos 2 opções.");
    setSaving(true);
    try {
      const fields = {
        title: title.trim(), description: description.trim(),
        image_url: titleImage ? await uploadPollImage(titleImage) : titlePath,
        starts_at: new Date(startsAt).toISOString(), ends_at: new Date(endsAt).toISOString(),
      };
      let pollId = editingId;
      if (pollId) {
        const { error } = await supabase.from("polls").update(fields).eq("id", pollId);
        if (error) throw error;
        const { error: de } = await supabase.from("poll_questions").delete().eq("poll_id", pollId);
        if (de) throw de;
      } else {
        const { data, error } = await supabase.from("polls").insert({ ...fields, created_by: user!.id }).select("id").single();
        if (error) throw error;
        pollId = data.id;
      }
      const poll = { id: pollId };
      for (const [i, q] of clean.entries()) {
        const { data: qrow, error: qe } = await supabase.from("poll_questions")
          .insert({ poll_id: poll.id, text: q.text, allow_multiple: q.allow_multiple, order_index: i, image_url: q.image ? await uploadPollImage(q.image) : q.imagePath }).select("id").single();
        if (qe) throw qe;
        const optRows = [];
        for (const [k, o] of q.options.entries()) {
          optRows.push({ question_id: qrow.id, text: o.text, order_index: k, image_url: o.image ? await uploadPollImage(o.image) : o.path });
        }
        const { error: oe } = await supabase.from("poll_options").insert(optRows);
        if (oe) throw oe;
      }
      if (publish) {
        const { error: pe } = await supabase.from("polls").update({ published_at: new Date().toISOString() }).eq("id", poll.id);
        if (pe) throw pe;
      }
      toast.success(publish ? "Enquete publicada!" : "Rascunho salvo!");
      setOpen(false); reset(); load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar enquete");
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <BarChart3 className="h-5 w-5 text-primary" />
        <h1 className="text-xl font-bold">Enquetes</h1>
        {can("polls", "create") && (
          <Button className="ml-auto" onClick={() => { reset(); setOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Nova enquete</Button>
        )}
      </div>
      {loading ? <p className="text-muted-foreground">Carregando...</p>
        : polls.length === 0 ? <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Nenhuma enquete cadastrada.</div>
        : polls.map((p) => <PollCard key={p.id} poll={p} canDelete={can("polls", "delete")} canManage={can("polls", "create") || can("polls", "edit")} onDeleted={load} onEdit={startEdit} />)}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? "Editar rascunho" : "Nova enquete"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /><div className="mt-2"><PollImagePicker file={titleImage} onChange={setTitleImage} label="Imagem do título" path={titlePath} onClearPath={() => setTitlePath(null)} /></div></div>
            <div><Label>Descrição</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div><Label>Data e hora de início</Label><Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} /></div>
              <div><Label>Data e hora de fim</Label><Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} /></div>
            </div>
            {qs.map((q, i) => (
              <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Label className="flex-1">Pergunta {i + 1}</Label>
                  {qs.length > 1 && <Button size="icon" variant="ghost" onClick={() => setQs((a) => a.filter((_, j) => j !== i))} aria-label="Remover pergunta"><Trash2 className="h-4 w-4" /></Button>}
                </div>
                <Input value={q.text} onChange={(e) => updQ(i, { text: e.target.value })} placeholder="Texto da pergunta" />
                <PollImagePicker file={q.image} onChange={(f) => updQ(i, { image: f })} label="Imagem da pergunta" path={q.imagePath} onClearPath={() => updQ(i, { imagePath: null })} />
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox checked={q.allow_multiple} onCheckedChange={(v) => updQ(i, { allow_multiple: !!v })} /> Permitir várias respostas
                </label>
                {q.options.map((o, k) => (
                  <div key={k} className="flex flex-wrap items-center gap-2">
                    <Input value={o} placeholder={`Opção ${k + 1}`} onChange={(e) => updQ(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })} className="min-w-0 flex-1" />
                    <PollImagePicker file={q.optionImages[k] ?? null} onChange={(f) => updQ(i, { optionImages: q.options.map((_, m) => (m === k ? f : q.optionImages[m] ?? null)) })} label="" path={q.optionPaths[k] ?? null} onClearPath={() => updQ(i, { optionPaths: q.options.map((_, m) => (m === k ? null : q.optionPaths[m] ?? null)) })} />
                    {q.options.length > 2 && <Button size="icon" variant="ghost" onClick={() => updQ(i, { options: q.options.filter((_, m) => m !== k), optionImages: q.optionImages.filter((_, m) => m !== k), optionPaths: q.optionPaths.filter((_, m) => m !== k) })} aria-label="Remover opção"><X className="h-4 w-4" /></Button>}
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => updQ(i, { options: [...q.options, ""], optionImages: [...q.optionImages, null], optionPaths: [...q.optionPaths, null] })}><Plus className="mr-1 h-4 w-4" /> Opção</Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => setQs((a) => [...a, emptyQ()])}><Plus className="mr-1 h-4 w-4" /> Adicionar pergunta</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="secondary" onClick={() => save(false)} disabled={saving}>{saving ? "Salvando..." : "Salvar rascunho"}</Button>
            <Button onClick={() => save(true)} disabled={saving}>Publicar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
