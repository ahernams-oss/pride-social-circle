import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Vote, CheckCircle2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/votar-eleicao")({ component: Page });

type Delegado = {
  id: string; nome: string; eleicao_id: string;
  habilitado_votar: boolean; ja_votou: boolean;
};
type Eleicao = { id: string; titulo: string; status: string };
type Cand = { id: string; nome: string; cargo: string; numero: string | null; proposta: string | null; foto_url: string | null };

function Page() {
  const [codigo, setCodigo] = useState("");
  const [delegado, setDelegado] = useState<Delegado | null>(null);
  const [eleicao, setEleicao] = useState<Eleicao | null>(null);
  const [cands, setCands] = useState<Cand[]>([]);
  const [votos, setVotos] = useState<Record<string, string>>({}); // cargo -> candidatura_id | "branco" | "nulo"
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const entrar = async () => {
    setBusy(true);
    const { data: d } = await supabase
      .from("vf_delegados")
      .select("id,nome,eleicao_id,habilitado_votar,ja_votou")
      .eq("codigo_acesso", codigo.trim().toUpperCase())
      .maybeSingle();
    if (!d) { setBusy(false); return toast.error("Código inválido"); }
    if (!d.habilitado_votar) { setBusy(false); return toast.error("Delegado não habilitado a votar"); }
    if (d.ja_votou) { setBusy(false); return toast.error("Você já votou nesta eleição"); }
    const { data: e } = await supabase.from("vf_eleicoes").select("id,titulo,status").eq("id", d.eleicao_id).maybeSingle();
    if (!e || e.status !== "votacao_aberta") { setBusy(false); return toast.error("Votação não está aberta"); }
    const { data: c } = await supabase.from("vf_candidaturas").select("*").eq("eleicao_id", d.eleicao_id).eq("status", "ativa").order("cargo");
    setDelegado(d as Delegado); setEleicao(e as Eleicao); setCands((c ?? []) as Cand[]);
    setBusy(false);
  };

  const submit = async () => {
    if (!delegado || !eleicao) return;
    const cargos = Array.from(new Set(cands.map((c) => c.cargo)));
    for (const cargo of cargos) {
      if (!votos[cargo]) return toast.error(`Selecione opção para ${cargo}`);
    }
    setBusy(true);
    const rows = cargos.map((cargo) => {
      const v = votos[cargo];
      if (v === "branco") return { eleicao_id: eleicao.id, delegado_id: delegado.id, cargo, tipo: "nao" as const, candidatura_id: null };
      if (v === "nulo") return { eleicao_id: eleicao.id, delegado_id: delegado.id, cargo, tipo: "nulo" as const, candidatura_id: null };
      return { eleicao_id: eleicao.id, delegado_id: delegado.id, cargo, tipo: "candidato" as const, candidatura_id: v };
    });
    const { error } = await supabase.from("vf_votos").insert(rows as any);
    setBusy(false);
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Voto registrado");
  };

  if (done) {
    return (
      <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-primary" />
        <h2 className="text-xl font-bold">Voto registrado</h2>
        <p className="text-sm text-muted-foreground">Obrigado por participar.</p>
        <Button onClick={() => { setDone(false); setDelegado(null); setEleicao(null); setCands([]); setVotos({}); setCodigo(""); }}>
          Novo voto
        </Button>
      </CardContent></Card>
    );
  }

  if (!delegado) {
    return (
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold"><Vote className="h-6 w-6 text-primary" /> Votação Remota</h1>
        <Card><CardContent className="space-y-3 py-6">
          <Label>Código de acesso do delegado</Label>
          <Input value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000" inputMode="numeric" maxLength={4} />
          <Button disabled={busy || !codigo} onClick={entrar} className="w-full">Entrar</Button>
        </CardContent></Card>
      </div>
    );
  }

  const cargos = Array.from(new Set(cands.map((c) => c.cargo)));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{eleicao?.titulo}</h1>
        <p className="text-sm text-muted-foreground">Eleitor: <strong>{delegado.nome}</strong></p>
      </div>
      {cargos.map((cargo) => (
        <Card key={cargo}><CardContent className="space-y-2 py-4">
          <h3 className="font-semibold">{cargo}</h3>
          <div className="space-y-2">
            {cands.filter((c) => c.cargo === cargo).map((c) => (
              <button key={c.id} type="button"
                onClick={() => setVotos({ ...votos, [cargo]: c.id })}
                className={`w-full rounded-lg border p-3 text-left transition ${votos[cargo] === c.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}>
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 rounded-md">
                    {c.foto_url ? <AvatarImage src={c.foto_url} alt={c.nome} className="object-cover" /> : null}
                    <AvatarFallback className="rounded-md text-xs">{c.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="font-medium">{c.numero ? `${c.numero} — ` : ""}{c.nome}</div>
                    {c.proposta && <p className="line-clamp-2 text-xs text-muted-foreground">{c.proposta}</p>}
                  </div>
                </div>
              </button>
            ))}
            <div className="flex gap-2">
              <Button size="sm" variant={votos[cargo] === "branco" ? "default" : "outline"} onClick={() => setVotos({ ...votos, [cargo]: "branco" })}>Branco</Button>
              <Button size="sm" variant={votos[cargo] === "nulo" ? "default" : "outline"} onClick={() => setVotos({ ...votos, [cargo]: "nulo" })}>Nulo</Button>
            </div>
          </div>
        </CardContent></Card>
      ))}
      <Button onClick={submit} disabled={busy} className="w-full" size="lg">Confirmar voto</Button>
      <Badge variant="outline" className="block w-full py-2 text-center text-xs">Cada delegado pode votar apenas uma vez.</Badge>
    </div>
  );
}
