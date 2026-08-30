import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, LogIn, LogOut, ShieldAlert, CheckCircle2, Vote } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_app/kiosk")({ component: KioskPage });

type ElectionLite = { id: string; titulo: string };
type Delegado = { id: string; nome: string; eleicao_id: string; habilitado_votar: boolean; ja_votou: boolean };
type Cand = { id: string; nome: string; cargo: string; numero: string | null; proposta: string | null; foto_url: string | null };

function KioskPage() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [elections, setElections] = useState<ElectionLite[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [sessionOpen, setSessionOpen] = useState(false);

  const [codigo, setCodigo] = useState("");
  const [delegado, setDelegado] = useState<Delegado | null>(null);
  const [cands, setCands] = useState<Cand[]>([]);
  const [votos, setVotos] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) nav({ to: "/elections", replace: true });
  }, [loading, isAdmin, nav]);

  const loadElections = useCallback(async () => {
    const { data, error } = await supabase
      .from("vf_eleicoes")
      .select("id,titulo,status")
      .eq("status", "votacao_aberta");
    if (error) toast.error(error.message);
    setElections((data ?? []) as any);
  }, []);

  useEffect(() => { if (isAdmin) loadElections(); }, [isAdmin, loadElections]);

  const openSession = () => {
    if (!selectedId) return;
    setSessionOpen(true);
    toast.success("Sessão Kiosk aberta");
  };

  const closeSession = () => {
    setSessionOpen(false); setSelectedId("");
    setCodigo(""); setDelegado(null); setCands([]); setVotos({}); setDone(false);
    toast.success("Kiosk encerrado");
  };

  const resetVoter = () => {
    setCodigo(""); setDelegado(null); setCands([]); setVotos({}); setDone(false);
  };

  const entrar = async () => {
    setBusy(true);
    const { data: d } = await supabase
      .from("vf_delegados")
      .select("id,nome,eleicao_id,habilitado_votar,ja_votou")
      .eq("codigo_acesso", codigo.trim().toUpperCase())
      .maybeSingle();
    setBusy(false);
    if (!d) return toast.error("Código inválido");
    if (d.eleicao_id !== selectedId) return toast.error("Código não pertence a esta eleição");
    if (!d.habilitado_votar) return toast.error("Delegado não habilitado");
    if (d.ja_votou) return toast.error("Este delegado já votou");
    const { data: c } = await supabase.from("vf_candidaturas").select("*").eq("eleicao_id", selectedId).eq("status", "ativa").order("cargo");
    setDelegado(d as Delegado); setCands((c ?? []) as Cand[]);
  };

  const submit = async () => {
    if (!delegado) return;
    const cargos = Array.from(new Set(cands.map((c) => c.cargo)));
    for (const cargo of cargos) if (!votos[cargo]) return toast.error(`Selecione opção para ${cargo}`);
    setBusy(true);
    const rows = cargos.map((cargo) => {
      const v = votos[cargo];
      if (v === "branco") return { eleicao_id: selectedId, delegado_id: delegado.id, cargo, tipo: "nao" as const, candidatura_id: null };
      if (v === "nulo") return { eleicao_id: selectedId, delegado_id: delegado.id, cargo, tipo: "nulo" as const, candidatura_id: null };
      return { eleicao_id: selectedId, delegado_id: delegado.id, cargo, tipo: "candidato" as const, candidatura_id: v };
    });
    const { error } = await supabase.from("vf_votos").insert(rows as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Voto registrado");
    setTimeout(resetVoter, 3000);
  };

  if (!isAdmin) {
    return (
      <Card><CardContent className="flex items-center gap-3 py-6">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <p className="text-sm">Acesso restrito a administradores.</p>
      </CardContent></Card>
    );
  }

  const cargos = Array.from(new Set(cands.map((c) => c.cargo)));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Monitor className="h-6 w-6" /> Modo Kiosk</h1>
          <p className="text-sm text-muted-foreground">Cada delegado informa seu código de acesso, vota e libera o terminal.</p>
        </div>
        {sessionOpen && <Button variant="outline" onClick={closeSession}>Encerrar Kiosk</Button>}
      </div>

      {!sessionOpen && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <Label>Eleição aberta</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {elections.length === 0 && <div className="p-2 text-sm text-muted-foreground">Nenhuma eleição com votação aberta.</div>}
                {elections.map((e) => <SelectItem key={e.id} value={e.id}>{e.titulo}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openSession} disabled={!selectedId}>Abrir sessão Kiosk</Button>
          </CardContent>
        </Card>
      )}

      {sessionOpen && !delegado && !done && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center gap-2"><Badge>Sessão ativa</Badge><span className="text-sm text-muted-foreground">Aguardando próximo delegado</span></div>
            <Label><LogIn className="mr-1 inline h-4 w-4" /> Código de acesso do delegado</Label>
            <Input value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="0000" autoComplete="off" />
            <Button onClick={entrar} disabled={busy || !codigo} className="w-full">{busy ? "Validando..." : "Entrar e votar"}</Button>
          </CardContent>
        </Card>
      )}

      {sessionOpen && delegado && !done && (
        <div className="space-y-3">
          <Card><CardContent className="flex items-center justify-between py-3">
            <div><div className="text-xs text-muted-foreground">Votando como</div><div className="font-semibold">{delegado.nome}</div></div>
            <Button variant="outline" size="sm" onClick={resetVoter}><LogOut className="mr-2 h-4 w-4" /> Sair sem votar</Button>
          </CardContent></Card>
          {cargos.map((cargo) => (
            <Card key={cargo}>
              <CardContent className="space-y-3 py-5">
                <h3 className="font-semibold">{cargo}</h3>
                <RadioGroup value={votos[cargo] ?? ""} onValueChange={(v) => setVotos((p) => ({ ...p, [cargo]: v }))}>
                  {cands.filter((c) => c.cargo === cargo).map((c) => (
                    <label key={c.id} className="flex cursor-pointer items-center gap-3 rounded border p-3 hover:bg-accent">
                      <RadioGroupItem value={c.id} />
                      <Avatar className="h-16 w-16 rounded-md">
                        {c.foto_url ? <AvatarImage src={c.foto_url} alt={c.nome} className="object-cover" /> : null}
                        <AvatarFallback className="rounded-md text-sm">{c.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1"><div className="font-medium">{c.nome}</div>{c.proposta && <div className="text-xs text-muted-foreground">{c.proposta}</div>}</div>
                      {c.numero && <Badge variant="outline">{c.numero}</Badge>}
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center gap-3 rounded border p-3 hover:bg-accent">
                    <RadioGroupItem value="branco" /> <span>Voto em branco</span>
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded border p-3 hover:bg-accent">
                    <RadioGroupItem value="nulo" /> <span>Voto nulo</span>
                  </label>
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
          <Button onClick={submit} disabled={busy} className="w-full" size="lg"><Vote className="mr-2 h-4 w-4" /> Confirmar voto</Button>
        </div>
      )}

      {sessionOpen && done && (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-primary" />
          <h2 className="text-xl font-bold">Voto registrado</h2>
          <p className="text-sm text-muted-foreground">Obrigado! Liberando terminal...</p>
        </CardContent></Card>
      )}
    </div>
  );
}
