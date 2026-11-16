import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { BarChart3, Trash2 } from "lucide-react";
import { pollStatus } from "@/lib/polls";

export type Poll = { id: string; title: string; description: string; starts_at: string; ends_at: string };
type Question = { id: string; text: string; allow_multiple: boolean; order_index: number; options: { id: string; text: string; order_index: number }[] };

const fmt = (d: string) => new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

export function PollCard({ poll, canDelete, onDeleted }: { poll: Poll; canDelete?: boolean; onDeleted?: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [counts, setCounts] = useState<Map<string, { votes: number; voters: number }>>(new Map());
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const status = pollStatus(poll.starts_at, poll.ends_at);

  const load = useCallback(async () => {
    const { data: qs } = await supabase.from("poll_questions")
      .select("id, text, allow_multiple, order_index, poll_options(id, text, order_index)")
      .eq("poll_id", poll.id).order("order_index");
    const list = (qs ?? []).map((q) => ({ ...q, options: [...(q.poll_options ?? [])].sort((a, b) => a.order_index - b.order_index) })) as Question[];
    setQuestions(list);
    const qids = list.map((q) => q.id);
    if (qids.length) {
      const { data: v } = await supabase.from("poll_votes").select("option_id").in("question_id", qids);
      setMine(new Set((v ?? []).map((x) => x.option_id)));
    }
    const { data: r } = await supabase.rpc("poll_results", { _poll_id: poll.id });
    setCounts(new Map((r ?? []).map((x) => [x.option_id, { votes: Number(x.votes), voters: Number(x.voters) }])));
  }, [poll.id]);
  useEffect(() => { load(); }, [load]);

  const answered = (q: Question) => q.options.some((o) => mine.has(o.id));
  const pending = questions.filter((q) => !answered(q));
  const showResults = status !== "aberta" || pending.length === 0;

  const toggle = (q: Question, optId: string) => {
    setSel((s) => {
      const cur = s[q.id] ?? [];
      if (!q.allow_multiple) return { ...s, [q.id]: [optId] };
      return { ...s, [q.id]: cur.includes(optId) ? cur.filter((x) => x !== optId) : [...cur, optId] };
    });
  };

  const submit = async () => {
    const rows = pending.flatMap((q) => (sel[q.id] ?? []).map((option_id) => ({ question_id: q.id, option_id })));
    if (pending.some((q) => !(sel[q.id] ?? []).length)) return toast.error("Responda todas as perguntas.");
    setSaving(true);
    const { error } = await supabase.from("poll_votes").insert(rows);
    setSaving(false);
    if (error) return toast.error("Não foi possível registrar seu voto.");
    toast.success("Voto registrado!");
    setSel({});
    load();
  };

  const remove = async () => {
    if (!confirm("Excluir esta enquete?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", poll.id);
    if (error) return toast.error(error.message);
    toast.success("Enquete excluída");
    onDeleted?.();
  };

  return (
    <div className="rounded-xl border-2 border-primary/30 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start gap-2">
        <BarChart3 className="mt-0.5 h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{poll.title}</h3>
            <Badge variant={status === "aberta" ? "default" : "outline"}>
              {status === "aberta" ? "Aberta" : status === "agendada" ? "Agendada" : "Encerrada"}
            </Badge>
          </div>
          {poll.description && <p className="mt-1 text-sm text-muted-foreground">{poll.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">De {fmt(poll.starts_at)} até {fmt(poll.ends_at)}</p>
        </div>
        {canDelete && <Button size="icon" variant="ghost" onClick={remove} aria-label="Excluir enquete"><Trash2 className="h-4 w-4" /></Button>}
      </div>

      <div className="mt-4 space-y-4">
        {questions.map((q, i) => {
          const done = answered(q) || status !== "aberta";
          const voters = q.options.reduce((m, o) => Math.max(m, counts.get(o.id)?.voters ?? 0), 0);
          return (
            <div key={q.id}>
              <p className="text-sm font-medium">{i + 1}. {q.text} {q.allow_multiple && <span className="text-xs text-muted-foreground">(várias respostas)</span>}</p>
              <div className="mt-2 space-y-1.5">
                {q.options.map((o) => {
                  if (done && showResults) {
                    const c = counts.get(o.id)?.votes ?? 0;
                    const pct = voters ? Math.round((c / voters) * 100) : 0;
                    return (
                      <div key={o.id} className="relative overflow-hidden rounded-md border px-3 py-1.5 text-sm">
                        <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${pct}%` }} />
                        <div className="relative flex justify-between gap-2">
                          <span className={mine.has(o.id) ? "font-semibold" : ""}>{o.text}{mine.has(o.id) && " ✓"}</span>
                          <span className="text-muted-foreground">{pct}% · {c}</span>
                        </div>
                      </div>
                    );
                  }
                  if (done) return <div key={o.id} className="rounded-md border px-3 py-1.5 text-sm">{o.text}{mine.has(o.id) && " ✓"}</div>;
                  const checked = (sel[q.id] ?? []).includes(o.id);
                  return (
                    <label key={o.id} className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                      {q.allow_multiple
                        ? <Checkbox checked={checked} onCheckedChange={() => toggle(q, o.id)} />
                        : <input type="radio" name={q.id} checked={checked} onChange={() => toggle(q, o.id)} className="accent-primary" />}
                      {o.text}
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {status === "aberta" && pending.length > 0 && (
        <Button className="mt-4 w-full sm:w-auto" onClick={submit} disabled={saving}>{saving ? "Enviando..." : "Votar"}</Button>
      )}
    </div>
  );
}

/** Enquetes abertas exibidas no topo do Feed. */
export function FeedPolls() {
  const [polls, setPolls] = useState<Poll[]>([]);
  useEffect(() => {
    const now = new Date().toISOString();
    supabase.from("polls").select("id, title, description, starts_at, ends_at")
      .lte("starts_at", now).gte("ends_at", now).order("ends_at")
      .then(({ data }) => setPolls(data ?? []));
  }, []);
  if (!polls.length) return null;
  return <div className="space-y-4">{polls.map((p) => <PollCard key={p.id} poll={p} />)}</div>;
}
