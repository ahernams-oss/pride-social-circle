import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Pencil, Plus, Printer, Trash2, CheckCircle2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export type QType = "single" | "multiple" | "text";
export type FormQuestion = { id: string; text: string; type: QType; options: string[]; required: boolean };
type EventForm = { id: string; event_id: string; title: string; description: string; questions: FormQuestion[] };
type Answers = Record<string, string | string[]>;
type ResponseRow = { id: string; user_id: string; answers: Answers; created_at: string;
  profile?: { full_name: string; club_name: string; city: string; email: string | null; phone: string | null; estado: string } };

const uid = () => crypto.randomUUID();
const newQ = (): FormQuestion => ({ id: uid(), text: "", type: "single", options: ["", ""], required: true });

export function validateForm(title: string, qs: FormQuestion[]): string | null {
  if (!title.trim()) return "Informe o título do formulário";
  if (!qs.length) return "Adicione ao menos uma pergunta";
  for (const [i, q] of qs.entries()) {
    if (!q.text.trim()) return `Escreva o texto da pergunta ${i + 1}`;
    if (q.type !== "text" && q.options.filter((o) => o.trim()).length < 2) return `A pergunta ${i + 1} precisa de ao menos 2 opções`;
  }
  return null;
}

export function answerText(q: FormQuestion, a: Answers): string {
  const v = a[q.id];
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  return v && String(v).trim() ? String(v) : "—";
}

export function EventFormsButton({ eventId, eventTitle, userId, canManage }: { eventId: string; eventTitle: string; userId: string; canManage: boolean }) {
  const [open, setOpen] = useState(false);
  const [forms, setForms] = useState<EventForm[]>([]);
  const [mine, setMine] = useState<Record<string, boolean>>({});
  const [view, setView] = useState<{ mode: "list" } | { mode: "edit"; form?: EventForm } | { mode: "fill"; form: EventForm } | { mode: "responses"; form: EventForm }>({ mode: "list" });

  const load = useCallback(async () => {
    const { data } = await supabase.from("event_forms").select("*").eq("event_id", eventId).order("created_at");
    const fs = (data ?? []) as unknown as EventForm[];
    setForms(fs);
    if (fs.length) {
      const { data: r } = await supabase.from("event_form_responses").select("form_id").eq("user_id", userId).in("form_id", fs.map((f) => f.id));
      setMine(Object.fromEntries((r ?? []).map((x) => [x.form_id, true])));
    }
  }, [eventId, userId]);
  useEffect(() => { if (open) load(); }, [open, load]);

  const remove = async (f: EventForm) => {
    if (!confirm(`Excluir o formulário "${f.title}" e todas as respostas?`)) return;
    const { error } = await supabase.from("event_forms").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Formulário excluído"); load();
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => { setView({ mode: "list" }); setOpen(true); }}>
        <ClipboardList className="mr-1 h-4 w-4" />Formulários
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto" onInteractOutside={(e) => view.mode !== "list" && e.preventDefault()}>
          <DialogHeader><DialogTitle>Formulários · {eventTitle}</DialogTitle></DialogHeader>
          {view.mode !== "list" && (
            <Button size="sm" variant="ghost" className="w-fit" onClick={() => setView({ mode: "list" })}><ArrowLeft className="mr-1 h-4 w-4" />Voltar</Button>
          )}
          {view.mode === "list" && (
            <div className="space-y-2">
              {canManage && <Button size="sm" onClick={() => setView({ mode: "edit" })}><Plus className="mr-1 h-4 w-4" />Novo formulário</Button>}
              {forms.map((f) => (
                <div key={f.id} className="rounded-lg border p-3">
                  <div className="font-semibold">{f.title}</div>
                  {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
                  <p className="text-xs text-muted-foreground">{f.questions.length} pergunta(s)</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {mine[f.id]
                      ? <span className="flex items-center gap-1 text-sm font-medium text-primary"><CheckCircle2 className="h-4 w-4" />Respondido</span>
                      : <Button size="sm" onClick={() => setView({ mode: "fill", form: f })}>Preencher</Button>}
                    {canManage && <>
                      <Button size="sm" variant="outline" onClick={() => setView({ mode: "responses", form: f })}><Printer className="mr-1 h-4 w-4" />Respostas</Button>
                      <Button size="sm" variant="ghost" onClick={() => setView({ mode: "edit", form: f })}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => remove(f)}><Trash2 className="h-4 w-4" /></Button>
                    </>}
                  </div>
                </div>
              ))}
              {!forms.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhum formulário neste evento.</p>}
            </div>
          )}
          {view.mode === "edit" && <FormEditor eventId={eventId} userId={userId} form={view.form} onDone={() => { setView({ mode: "list" }); load(); }} />}
          {view.mode === "fill" && <FormFill form={view.form} userId={userId} onDone={() => { setView({ mode: "list" }); load(); }} />}
          {view.mode === "responses" && <FormResponses form={view.form} eventTitle={eventTitle} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormEditor({ eventId, userId, form, onDone }: { eventId: string; userId: string; form?: EventForm; onDone: () => void }) {
  const [title, setTitle] = useState(form?.title ?? "");
  const [description, setDescription] = useState(form?.description ?? "");
  const [qs, setQs] = useState<FormQuestion[]>(form?.questions?.length ? form.questions : [newQ()]);
  const [busy, setBusy] = useState(false);
  const upd = (i: number, p: Partial<FormQuestion>) => setQs(qs.map((q, j) => (j === i ? { ...q, ...p } : q)));

  const save = async () => {
    const err = validateForm(title, qs);
    if (err) return toast.error(err);
    const questions = qs.map((q) => ({ ...q, text: q.text.trim(), options: q.type === "text" ? [] : q.options.map((o) => o.trim()).filter(Boolean) }));
    setBusy(true);
    const payload = { title: title.trim(), description: description.trim(), questions };
    const { error } = form
      ? await supabase.from("event_forms").update(payload).eq("id", form.id)
      : await supabase.from("event_forms").insert({ ...payload, event_id: eventId, created_by: userId });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(form ? "Formulário atualizado" : "Formulário criado"); onDone();
  };

  return (
    <div className="space-y-3">
      <div><Label>Título</Label><Input value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} /></div>
      <div><Label>Descrição</Label><Textarea rows={2} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} /></div>
      {qs.map((q, i) => (
        <div key={q.id} className="space-y-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Pergunta {i + 1}</span>
            {qs.length > 1 && <Button size="icon" variant="ghost" onClick={() => setQs(qs.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>}
          </div>
          <Input placeholder="Texto da pergunta" value={q.text} maxLength={500} onChange={(e) => upd(i, { text: e.target.value })} />
          <div className="flex flex-wrap items-center gap-3">
            <select className="h-9 rounded-md border bg-background px-2 text-sm" value={q.type} onChange={(e) => upd(i, { type: e.target.value as QType })}>
              <option value="single">Uma opção</option>
              <option value="multiple">Várias opções</option>
              <option value="text">Resposta escrita</option>
            </select>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={q.required} onCheckedChange={(v) => upd(i, { required: !!v })} />Obrigatória</label>
          </div>
          {q.type !== "text" && (
            <div className="space-y-2">
              {q.options.map((o, k) => (
                <div key={k} className="flex gap-2">
                  <Input placeholder={`Opção ${k + 1}`} value={o} maxLength={200} onChange={(e) => upd(i, { options: q.options.map((x, m) => (m === k ? e.target.value : x)) })} />
                  {q.options.length > 2 && <Button size="icon" variant="ghost" onClick={() => upd(i, { options: q.options.filter((_, m) => m !== k) })}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              ))}
              <Button size="sm" variant="ghost" onClick={() => upd(i, { options: [...q.options, ""] })}><Plus className="mr-1 h-4 w-4" />Opção</Button>
            </div>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => setQs([...qs, newQ()])}><Plus className="mr-1 h-4 w-4" />Adicionar pergunta</Button>
      <Button className="w-full" disabled={busy} onClick={save}>{form ? "Salvar alterações" : "Criar formulário"}</Button>
    </div>
  );
}

function FormFill({ form, userId, onDone }: { form: EventForm; userId: string; onDone: () => void }) {
  const [a, setA] = useState<Answers>({});
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    for (const q of form.questions) {
      const v = a[q.id];
      const empty = Array.isArray(v) ? !v.length : !v || !String(v).trim();
      if (q.required && empty) return toast.error(`Responda: ${q.text}`);
      if (typeof v === "string" && v.length > 2000) return toast.error("Resposta muito longa");
    }
    setBusy(true);
    const { error } = await supabase.from("event_form_responses").insert({ form_id: form.id, user_id: userId, answers: a });
    setBusy(false);
    if (error) return toast.error(error.code === "23505" ? "Você já respondeu este formulário" : error.message);
    toast.success("Respostas enviadas!"); onDone();
  };
  return (
    <div className="space-y-4">
      <div><h3 className="font-semibold">{form.title}</h3>{form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}</div>
      {form.questions.map((q, i) => (
        <div key={q.id} className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">{i + 1}. {q.text}{q.required && <span className="text-destructive"> *</span>}</p>
          {q.type === "text" && <Textarea rows={2} maxLength={2000} value={(a[q.id] as string) ?? ""} onChange={(e) => setA({ ...a, [q.id]: e.target.value })} />}
          {q.type === "single" && q.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm"><input type="radio" name={q.id} checked={a[q.id] === o} onChange={() => setA({ ...a, [q.id]: o })} />{o}</label>
          ))}
          {q.type === "multiple" && q.options.map((o) => {
            const cur = (a[q.id] as string[]) ?? [];
            return <label key={o} className="flex items-center gap-2 text-sm"><Checkbox checked={cur.includes(o)} onCheckedChange={(v) => setA({ ...a, [q.id]: v ? [...cur, o] : cur.filter((x) => x !== o) })} />{o}</label>;
          })}
        </div>
      ))}
      <Button className="w-full" disabled={busy} onClick={submit}>Enviar respostas</Button>
    </div>
  );
}

function FormResponses({ form, eventTitle }: { form: EventForm; eventTitle: string }) {
  const [rows, setRows] = useState<ResponseRow[]>([]);
  useEffect(() => { (async () => {
    const { data } = await supabase.from("event_form_responses").select("*").eq("form_id", form.id).order("created_at");
    const rs = (data ?? []) as unknown as ResponseRow[];
    if (rs.length) {
      const { data: ps } = await supabase.from("profiles").select("id, full_name, club_name, city, email, phone, estado").in("id", rs.map((r) => r.user_id));
      const map = new Map((ps ?? []).map((p) => [p.id, p]));
      rs.forEach((r) => { r.profile = map.get(r.user_id) as ResponseRow["profile"]; });
    }
    setRows(rs);
  })(); }, [form.id]);

  const print = async (list: ResponseRow[]) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    list.forEach((r, idx) => {
      if (idx) doc.addPage();
      doc.setFillColor(15, 47, 107); doc.rect(0, 0, 210, 24, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(14); doc.text(form.title, 14, 11);
      doc.setFontSize(9); doc.text(`Evento: ${eventTitle}`, 14, 18);
      doc.setTextColor(0, 0, 0);
      const p = r.profile;
      autoTable(doc, { startY: 30, theme: "plain", styles: { fontSize: 9 }, columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } }, body: [
        ["Nome", p?.full_name ?? "—"], ["Clube", p?.club_name || "—"], ["Cidade/UF", [p?.city, p?.estado].filter(Boolean).join(" / ") || "—"],
        ["E-mail", p?.email || "—"], ["Celular", p?.phone || "—"],
        ["Preenchido em", new Date(r.created_at).toLocaleString("pt-BR")],
      ] });
      autoTable(doc, { startY: ((doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY) + 6,
        headStyles: { fillColor: [15, 47, 107] }, styles: { fontSize: 9 }, columnStyles: { 0: { cellWidth: 80 } },
        head: [["Pergunta", "Resposta"]], body: form.questions.map((q, i) => [`${i + 1}. ${q.text}`, answerText(q, r.answers)]) });
    });
    const name = list.length === 1 ? (list[0].profile?.full_name ?? "resposta") : "todas-respostas";
    doc.save(`${form.title}-${name}.pdf`.replace(/[^\w.\-À-ú ]/g, "_"));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">{form.title} · {rows.length} resposta(s)</h3>
        {rows.length > 0 && <Button size="sm" variant="outline" onClick={() => print(rows)}><Printer className="mr-1 h-4 w-4" />Imprimir todas</Button>}
      </div>
      {rows.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
          <div className="min-w-0">
            <div className="font-medium">{r.profile?.full_name ?? "Associado"}</div>
            <div className="text-xs text-muted-foreground">{r.profile?.club_name} · {new Date(r.created_at).toLocaleString("pt-BR")}</div>
          </div>
          <Button size="sm" onClick={() => print([r])}><Printer className="mr-1 h-4 w-4" />Imprimir PDF</Button>
        </div>
      ))}
      {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">Ninguém respondeu ainda.</p>}
    </div>
  );
}
