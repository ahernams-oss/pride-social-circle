import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, Trash2, BarChart3, CheckCircle2, FileText, FileType2, Sheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { exportPdf, exportWord, exportExcel, type ReportSection } from "@/lib/election-report";

type ElectionType = "single" | "yes_no" | "multiple_choice" | "multi_position";
type Election = {
  id: string; title: string; description: string | null; type: ElectionType;
  status: "draft" | "open" | "closed"; max_choices: number; allow_kiosk: boolean;
};
type Position = { id: string; name: string; order_index: number };
type Candidate = { id: string; name: string; description: string | null; position_id: string | null; order_index: number };
type ResultRow = { position_id: string | null; position_name: string | null; candidate_id: string | null; candidate_name: string | null; value: string | null; votes: number };

export function ElectionDetail({
  electionId, isAdmin, voterId, client, onVoted,
}: {
  electionId: string;
  isAdmin: boolean;
  voterId: string | null;
  client: SupabaseClient;
  onVoted?: () => void;
}) {
  const [election, setElection] = useState<Election | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [totalBallots, setTotalBallots] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // ballot state
  const [singleChoice, setSingleChoice] = useState<string>("");
  const [yesNo, setYesNo] = useState<string>("");
  const [multiChoice, setMultiChoice] = useState<Set<string>>(new Set());
  const [chapaChoice, setChapaChoice] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data: e } = await client.from("elections").select("*").eq("id", electionId).maybeSingle();
    setElection((e as Election) ?? null);
    const [{ data: pos }, { data: cands }] = await Promise.all([
      client.from("election_positions").select("*").eq("election_id", electionId).order("order_index"),
      client.from("election_candidates").select("*").eq("election_id", electionId).order("order_index"),
    ]);
    setPositions((pos ?? []) as Position[]);
    setCandidates((cands ?? []) as Candidate[]);
    if (voterId) {
      const { data: b } = await client.from("election_ballots").select("id").eq("election_id", electionId).eq("voter_id", voterId).maybeSingle();
      setHasVoted(!!b);
    }
    const { data: res } = await client.rpc("election_results", { _election_id: electionId });
    setResults((res ?? []) as ResultRow[]);
    const { count } = await client
      .from("election_ballots")
      .select("id", { count: "exact", head: true })
      .eq("election_id", electionId);
    setTotalBallots(count ?? 0);
    setLoading(false);
  }, [client, electionId, voterId]);

  useEffect(() => { load(); }, [load]);

  const canVote = election?.status === "open" && !hasVoted && voterId;

  const submitVote = async () => {
    if (!election || !voterId) return;
    // Build choices
    type Choice = { position_id?: string | null; candidate_id?: string | null; value?: string | null };
    let choices: Choice[] = [];
    if (election.type === "single") {
      if (!singleChoice) return toast.error("Selecione um candidato");
      choices = [{ candidate_id: singleChoice }];
    } else if (election.type === "yes_no") {
      if (!yesNo) return toast.error("Selecione Sim ou Não");
      choices = [{ value: yesNo }];
    } else if (election.type === "multiple_choice") {
      if (multiChoice.size === 0) return toast.error("Selecione ao menos uma opção");
      if (multiChoice.size > election.max_choices) return toast.error(`Máximo ${election.max_choices} opções`);
      choices = [...multiChoice].map((cid) => ({ candidate_id: cid }));
    } else if (election.type === "multi_position") {
      for (const p of positions) {
        if (!chapaChoice[p.id]) return toast.error(`Selecione candidato para ${p.name}`);
        choices.push({ position_id: p.id, candidate_id: chapaChoice[p.id] });
      }
    }
    setSubmitting(true);
    const { data: ballot, error: be } = await client
      .from("election_ballots")
      .insert({ election_id: election.id, voter_id: voterId } as any)
      .select("id")
      .single();
    if (be || !ballot) { setSubmitting(false); return toast.error(be?.message ?? "Erro ao registrar voto"); }
    const rows = choices.map((c) => ({ ballot_id: (ballot as any).id, ...c }));
    const { error: ce } = await client.from("ballot_choices").insert(rows as any);
    setSubmitting(false);
    if (ce) return toast.error(ce.message);
    toast.success("Voto registrado!");
    setHasVoted(true);
    onVoted?.();
    load();
  };

  const candidatesByPosition = useMemo(() => {
    const m = new Map<string | null, Candidate[]>();
    for (const c of candidates) {
      const k = c.position_id;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(c);
    }
    return m;
  }, [candidates]);

  const reportSections = useMemo<ReportSection[]>(
    () => buildSections(results, positions, election?.type ?? "single").map((s) => {
      const total = s.rows.reduce((acc, r) => acc + Number(r.votes), 0);
      return {
        name: s.name,
        rows: s.rows
          .slice()
          .sort((a, b) => Number(b.votes) - Number(a.votes))
          .map((r) => ({
            label: r.candidate_name ?? (r.value === "sim" ? "Sim" : r.value === "nao" ? "Não" : "—"),
            votes: Number(r.votes),
            pct: total > 0 ? (Number(r.votes) / total) * 100 : 0,
          })),
      };
    }),
    [results, positions, election?.type],
  );

  const downloadReport = (fmt: "pdf" | "word" | "excel") => {
    if (!election) return;
    const data = {
      title: election.title,
      description: election.description,
      typeLabel: TYPE_LABEL[election.type],
      statusLabel: election.status === "closed" ? "Encerrada" : election.status === "open" ? "Aberta" : "Rascunho",
      totalBallots,
      generatedAt: new Date().toLocaleString("pt-BR"),
      sections: reportSections,
    };
    if (fmt === "pdf") exportPdf(data).catch(() => toast.error("Erro ao gerar PDF"));
    else if (fmt === "word") exportWord(data);
    else exportExcel(data);
  };


  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!election) return <p className="text-sm text-muted-foreground">Eleição não encontrada.</p>;

  return (
    <div className="space-y-6">
      {!onVoted && (
        <Button asChild variant="ghost" size="sm">
          <Link to="/elections"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Link>
        </Button>
      )}
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{election.title}</h1>
          <Badge variant={election.status === "open" ? "default" : "secondary"}>
            {election.status === "open" ? "Aberta" : election.status === "closed" ? "Encerrada" : "Rascunho"}
          </Badge>
          {hasVoted && <Badge className="bg-emerald-600 text-white"><CheckCircle2 className="mr-1 h-3 w-3" /> Você votou</Badge>}
        </div>
        {election.description && <p className="mt-1 text-sm text-muted-foreground">{election.description}</p>}
      </div>

      {isAdmin && election.status === "draft" && (
        <AdminEditor election={election} positions={positions} candidates={candidates} onChanged={load} />
      )}

      {canVote ? (
        <Card>
          <CardContent className="space-y-4 py-5">
            <h3 className="font-semibold">Sua cédula</h3>
            {election.type === "single" && (
              <RadioGroup value={singleChoice} onValueChange={setSingleChoice}>
                {(candidatesByPosition.get(null) ?? []).map((c) => (
                  <label key={c.id} className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted">
                    <RadioGroupItem value={c.id} className="mt-1" />
                    <div><div className="font-medium">{c.name}</div>{c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}</div>
                  </label>
                ))}
              </RadioGroup>
            )}
            {election.type === "yes_no" && (
              <RadioGroup value={yesNo} onValueChange={setYesNo} className="flex gap-3">
                {["sim", "nao"].map((v) => (
                  <label key={v} className="flex flex-1 items-center gap-3 rounded-md border p-4 hover:bg-muted">
                    <RadioGroupItem value={v} />
                    <span className="font-medium capitalize">{v === "nao" ? "Não" : v}</span>
                  </label>
                ))}
              </RadioGroup>
            )}
            {election.type === "multiple_choice" && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selecione até {election.max_choices} opção(ões).</p>
                {(candidatesByPosition.get(null) ?? []).map((c) => {
                  const checked = multiChoice.has(c.id);
                  return (
                    <label key={c.id} className="flex items-start gap-3 rounded-md border p-3 hover:bg-muted">
                      <Checkbox checked={checked} onCheckedChange={(v) => {
                        const next = new Set(multiChoice);
                        if (v) next.add(c.id); else next.delete(c.id);
                        setMultiChoice(next);
                      }} className="mt-1" />
                      <div><div className="font-medium">{c.name}</div>{c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}</div>
                    </label>
                  );
                })}
              </div>
            )}
            {election.type === "multi_position" && (
              <div className="space-y-4">
                {positions.map((p) => (
                  <div key={p.id} className="rounded-md border p-3">
                    <div className="mb-2 font-semibold">{p.name}</div>
                    <RadioGroup value={chapaChoice[p.id] ?? ""} onValueChange={(v) => setChapaChoice({ ...chapaChoice, [p.id]: v })}>
                      {(candidatesByPosition.get(p.id) ?? []).map((c) => (
                        <label key={c.id} className="flex items-start gap-3 rounded-md border p-2 hover:bg-muted">
                          <RadioGroupItem value={c.id} className="mt-1" />
                          <div><div className="font-medium">{c.name}</div>{c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}</div>
                        </label>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>
            )}
            <Button onClick={submitVote} disabled={submitting} className="w-full">
              {submitting ? "Enviando..." : "Confirmar voto"}
            </Button>
          </CardContent>
        </Card>
      ) : (
        election.status === "open" && hasVoted && (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
            Você já votou nesta eleição. Os resultados serão divulgados após o encerramento.
          </CardContent></Card>
        )
      )}

      {(election.status === "closed" || isAdmin) && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <h3 className="flex items-center gap-2 font-semibold"><BarChart3 className="h-4 w-4" /> Resultados {election.status !== "closed" && <Badge variant="outline">prévia (admin)</Badge>}</h3>
            <Results rows={results} positions={positions} type={election.type} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Results({ rows, positions, type }: { rows: ResultRow[]; positions: Position[]; type: ElectionType }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Sem votos ainda.</p>;
  const grouped = new Map<string | null, ResultRow[]>();
  for (const r of rows) {
    const k = r.position_id;
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(r);
  }
  const sections = type === "multi_position" ? positions.map((p) => ({ key: p.id, name: p.name, rows: grouped.get(p.id) ?? [] })) : [{ key: null, name: "", rows: grouped.get(null) ?? [] }];
  const total = (rs: ResultRow[]) => rs.reduce((s, r) => s + Number(r.votes), 0);
  return (
    <div className="space-y-4">
      {sections.map((s, i) => {
        const t = total(s.rows);
        return (
          <div key={s.key ?? `s-${i}`}>
            {s.name && <><div className="mb-1 text-sm font-semibold">{s.name}</div><Separator className="mb-2" /></>}
            <div className="space-y-2">
              {s.rows.sort((a, b) => Number(b.votes) - Number(a.votes)).map((r, idx) => {
                const label = r.candidate_name ?? (r.value === "sim" ? "Sim" : r.value === "nao" ? "Não" : "—");
                const pct = t > 0 ? (Number(r.votes) / t) * 100 : 0;
                return (
                  <div key={`${r.candidate_id}-${r.value}-${idx}`}>
                    <div className="flex justify-between text-sm"><span>{label}</span><span className="font-medium">{r.votes} ({pct.toFixed(1)}%)</span></div>
                    <div className="mt-1 h-2 rounded bg-muted"><div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AdminEditor({ election, positions, candidates, onChanged }: {
  election: Election; positions: Position[]; candidates: Candidate[]; onChanged: () => void;
}) {
  const [newPos, setNewPos] = useState("");
  const [newCandName, setNewCandName] = useState("");
  const [newCandDesc, setNewCandDesc] = useState("");
  const [newCandPos, setNewCandPos] = useState<string>("none");

  const addPosition = async () => {
    if (!newPos.trim()) return;
    const { error } = await supabase.from("election_positions").insert({ election_id: election.id, name: newPos.trim(), order_index: positions.length } as any);
    if (error) return toast.error(error.message);
    setNewPos(""); onChanged();
  };
  const removePosition = async (id: string) => {
    if (!confirm("Remover este cargo?")) return;
    await supabase.from("election_positions").delete().eq("id", id);
    onChanged();
  };
  const addCandidate = async () => {
    if (!newCandName.trim()) return;
    const positionId = election.type === "multi_position" ? (newCandPos === "none" ? null : newCandPos) : null;
    if (election.type === "multi_position" && !positionId) return toast.error("Selecione um cargo");
    const { error } = await supabase.from("election_candidates").insert({
      election_id: election.id,
      name: newCandName.trim(),
      description: newCandDesc.trim() || null,
      position_id: positionId,
      order_index: candidates.length,
    } as any);
    if (error) return toast.error(error.message);
    setNewCandName(""); setNewCandDesc(""); onChanged();
  };
  const removeCandidate = async (id: string) => {
    await supabase.from("election_candidates").delete().eq("id", id);
    onChanged();
  };

  const showCandidates = election.type !== "yes_no";

  return (
    <Card>
      <CardContent className="space-y-5 py-5">
        <h3 className="font-semibold">Configuração (rascunho)</h3>

        {election.type === "multi_position" && (
          <div className="space-y-2">
            <Label>Cargos</Label>
            <div className="flex gap-2">
              <Input placeholder="Ex: Presidente" value={newPos} onChange={(e) => setNewPos(e.target.value)} />
              <Button onClick={addPosition}><Plus className="h-4 w-4" /></Button>
            </div>
            <ul className="space-y-1">
              {positions.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                  {p.name}
                  <Button size="icon" variant="ghost" onClick={() => removePosition(p.id)}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {showCandidates && (
          <div className="space-y-2">
            <Label>{election.type === "multiple_choice" ? "Opções" : "Candidatos"}</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input placeholder="Nome" value={newCandName} onChange={(e) => setNewCandName(e.target.value)} />
              <Textarea placeholder="Descrição (opcional)" rows={1} value={newCandDesc} onChange={(e) => setNewCandDesc(e.target.value)} />
            </div>
            {election.type === "multi_position" && (
              <select className="w-full rounded-md border bg-background p-2 text-sm" value={newCandPos} onChange={(e) => setNewCandPos(e.target.value)}>
                <option value="none">Selecione o cargo</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            <Button onClick={addCandidate}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
            <ul className="mt-2 space-y-1">
              {candidates.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded border px-3 py-1.5 text-sm">
                  <span>{c.name} {c.position_id && <span className="text-muted-foreground">— {positions.find(p => p.id === c.position_id)?.name}</span>}</span>
                  <Button size="icon" variant="ghost" onClick={() => removeCandidate(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Após configurar, volte e clique em <strong>Abrir</strong> para iniciar a votação.</p>
      </CardContent>
    </Card>
  );
}
