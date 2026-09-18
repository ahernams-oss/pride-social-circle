import { createFileRoute, useParams, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Plus, Play, Square, CheckCircle2, Copy, ShieldAlert, Trash2, Gavel, Printer, Send, Mail, MessageCircle, FileText, FileType2, Sheet as SheetIcon } from "lucide-react";
import { exportApuracaoPdf, exportApuracaoWord, exportApuracaoExcel, cargoSlices, type ApuracaoReport, type ApuracaoCargoReport } from "@/lib/vf-apuracao-report";
import { PieChart, Pie, Cell, Tooltip as RTooltip, Legend, ResponsiveContainer } from "recharts";

import { toast } from "sonner";
import { AssociadoCombobox, type Associado } from "@/components/AssociadoCombobox";
import { CandidatoFotoUpload } from "@/components/CandidatoFotoUpload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { assinaturaEletronica, codigoUrna, codigoUrnaCredencial } from "@/lib/vf-credencial";
import lciEmblem from "@/assets/lci-emblem.png.asset.json";

export const Route = createFileRoute("/_app/eleicoes-oficiais/$id")({ component: Page });

type Status = "configurando" | "credenciamento" | "votacao_aberta" | "votacao_encerrada" | "apurada";
type Eleicao = { id: string; titulo: string; descricao: string | null; distrito: string | null; data_eleicao: string; status: Status };
type Candidatura = { id: string; nome: string; cargo: string; numero: string | null; proposta: string | null; status: string; foto_url: string | null };
type Delegado = {
  id: string; nome: string; clube: string | null; tipo: "titular" | "suplente" | "nato";
  codigo_acesso: string; credenciado: boolean; presente: boolean; habilitado_votar: boolean; ja_votou: boolean;
  associado_id: string | null;
  birth_date?: string | null;
};
type Comissao = { id: string; nome: string; funcao: "presidente" | "vice_presidente" | "membro" | "vogal" };
type Apuracao = { cargo: string; candidatura_id: string | null; candidato: string; tipo: string; votos: number };


const STATUS_LABEL: Record<Status, string> = {
  configurando: "Configurando", credenciamento: "Credenciamento",
  votacao_aberta: "Votação aberta", votacao_encerrada: "Encerrada", apurada: "Apurada",
};

function genCodigo() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function Page() {
  const { id } = useParams({ from: "/_app/eleicoes-oficiais/$id" });
  const { isAdmin } = useAuth();
  const [eleicao, setEleicao] = useState<Eleicao | null>(null);
  const [cands, setCands] = useState<Candidatura[]>([]);
  const [dels, setDels] = useState<Delegado[]>([]);
  const [com, setCom] = useState<Comissao[]>([]);
  const [apur, setApur] = useState<Apuracao[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    // Recarga em segundo plano: não ativa o loading global, pois desmontaria
    // a página (e as guias) a cada toggle/entrada de voto, voltando à guia inicial.

    const [{ data: el }, { data: c }, { data: d }, { data: m }] = await Promise.all([
      supabase.from("vf_eleicoes").select("*").eq("id", id).maybeSingle(),
      supabase.from("vf_candidaturas").select("*").eq("eleicao_id", id).order("cargo"),
      supabase.from("vf_delegados").select("*").eq("eleicao_id", id).order("nome"),
      supabase.from("vf_comissao").select("*").eq("eleicao_id", id).order("funcao"),
    ]);
    setEleicao(el as Eleicao | null);
    setCands((c ?? []) as Candidatura[]);
    const delegados = (d ?? []) as Delegado[];
    const assocIds = delegados.map((x) => x.associado_id).filter(Boolean) as string[];
    if (assocIds.length > 0) {
      const { data: profs } = await supabase.from("profiles").select("id, birth_date").in("id", assocIds);
      const map = new Map((profs ?? []).map((p: any) => [p.id, p.birth_date as string | null]));
      for (const del of delegados) del.birth_date = del.associado_id ? map.get(del.associado_id) ?? null : null;
    }
    setDels(delegados);
    setCom((m ?? []) as Comissao[]);
    const { data: ap } = await supabase.rpc("vf_apuracao", { _eleicao_id: id });
    setApur((ap ?? []) as any);
    setLoading(false);
  }, [id]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  useEffect(() => {
    const ch = supabase.channel(`vf-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vf_votos", filter: `eleicao_id=eq.${id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, load]);

  const setStatus = async (s: Status) => {
    const { error } = await supabase.from("vf_eleicoes").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Status atualizado");
    load();
  };

  const presidente = com.find((c) => c.funcao === "presidente")?.nome ?? null;

  if (loading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (!eleicao) return <Card><CardContent className="py-10 text-center text-sm">Eleição não encontrada.</CardContent></Card>;

  return (
    <div className="space-y-4">
      <Link to="/eleicoes-oficiais" className="text-xs text-muted-foreground hover:underline">← Voltar</Link>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold"><Gavel className="h-6 w-6 text-primary" /> {eleicao.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            {eleicao.distrito ? `${eleicao.distrito} · ` : ""}{new Date(eleicao.data_eleicao).toLocaleDateString("pt-BR")}
          </p>
          {eleicao.descricao && <p className="mt-2 max-w-2xl text-sm">{eleicao.descricao}</p>}
        </div>
        <Badge className="text-sm">{STATUS_LABEL[eleicao.status]}</Badge>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2">
          {eleicao.status === "configurando" && (
            <Button size="sm" variant="outline" onClick={() => setStatus("credenciamento")}>Abrir credenciamento</Button>
          )}
          {eleicao.status === "credenciamento" && (
            <Button size="sm" onClick={() => setStatus("votacao_aberta")}><Play className="mr-2 h-4 w-4" /> Abrir votação</Button>
          )}
          {eleicao.status === "votacao_aberta" && (
            <Button size="sm" variant="secondary" onClick={() => setStatus("votacao_encerrada")}><Square className="mr-2 h-4 w-4" /> Encerrar votação</Button>
          )}
          {eleicao.status === "votacao_encerrada" && (
            <Button size="sm" onClick={() => setStatus("apurada")}><CheckCircle2 className="mr-2 h-4 w-4" /> Marcar como apurada</Button>
          )}
        </div>
      )}

      <Tabs defaultValue="candidaturas" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="candidaturas">Candidaturas</TabsTrigger>
          <TabsTrigger value="delegados">Delegados</TabsTrigger>
          <TabsTrigger value="comissao">Comissão</TabsTrigger>
          <TabsTrigger value="apuracao">Apuração</TabsTrigger>
        </TabsList>

        <TabsContent value="candidaturas" className="space-y-3 pt-4">
          {isAdmin && <NewCandidatura eleicaoId={id} onCreated={load} />}
          <CandidaturasList items={cands} isAdmin={isAdmin} onChanged={load} />
        </TabsContent>

        <TabsContent value="delegados" className="space-y-3 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && <NewDelegado eleicaoId={id} onCreated={load} />}
            {dels.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => printCredenciais(dels, eleicao, presidente)}>
                <Printer className="mr-2 h-4 w-4" /> Imprimir todas
              </Button>
            )}
          </div>
          <DelegadosList items={dels} isAdmin={isAdmin} onChanged={load} eleicao={eleicao} presidente={presidente} />
        </TabsContent>

        <TabsContent value="comissao" className="space-y-3 pt-4">
          {isAdmin && <NewComissao eleicaoId={id} onCreated={load} />}
          <ComissaoList items={com} isAdmin={isAdmin} onChanged={load} />
        </TabsContent>

        <TabsContent value="apuracao" className="pt-4">
          <ApuracaoView items={apur} status={eleicao.status} eleicao={eleicao} cands={cands} presidente={presidente} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function NewCandidatura({ eleicaoId, onCreated }: { eleicaoId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const associados = useAssociados();
  const [f, setF] = useState<{ associado_id: string; nome: string; cargo: string; numero: string; proposta: string; foto_url: string | null }>(
    { associado_id: "", nome: "", cargo: "", numero: "", proposta: "", foto_url: null },
  );
  const pick = (aid: string) => {
    const a = associados.find((x) => x.id === aid);
    setF({ ...f, associado_id: aid, nome: a?.full_name ?? f.nome, foto_url: a?.avatar_url ?? f.foto_url });
  };
  const save = async () => {
    if (!f.nome || !f.cargo) return toast.error("Nome e cargo são obrigatórios");
    const { error } = await supabase.from("vf_candidaturas").insert({
      eleicao_id: eleicaoId, associado_id: f.associado_id || null,
      nome: f.nome, cargo: f.cargo, numero: f.numero || null, proposta: f.proposta || null,
      foto_url: f.foto_url,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Candidatura cadastrada");
    setF({ associado_id: "", nome: "", cargo: "", numero: "", proposta: "", foto_url: null });
    setOpen(false);
    onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Nova candidatura</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova candidatura</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Associado (opcional)</Label>
            <AssociadoCombobox items={associados} value={f.associado_id} onChange={pick} />
          </div>
          <div><Label>Foto do candidato</Label>
            <div className="pt-1"><CandidatoFotoUpload value={f.foto_url} onChange={(url) => setF({ ...f, foto_url: url })} /></div>
          </div>
          <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div><Label>Cargo</Label>
            <Select value={f.cargo} onValueChange={(v) => setF({ ...f, cargo: v })}>
              <SelectTrigger><SelectValue placeholder="Selecione o cargo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Governador">Governador</SelectItem>
                <SelectItem value="1º Vice Governador">1º Vice Governador</SelectItem>
                <SelectItem value="2º Vice Governador">2º Vice Governador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Número (opcional)</Label><Input value={f.numero} onChange={(e) => setF({ ...f, numero: e.target.value })} /></div>
          <div><Label>Proposta</Label><Textarea value={f.proposta} onChange={(e) => setF({ ...f, proposta: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CandidaturasList({ items, isAdmin, onChanged }: { items: Candidatura[]; isAdmin: boolean; onChanged: () => void }) {
  const remove = async (id: string) => {
    if (!confirm("Excluir candidatura?")) return;
    const { error } = await supabase.from("vf_candidaturas").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  };
  const grouped = useMemo(() => {
    const m = new Map<string, Candidatura[]>();
    items.forEach((c) => { const arr = m.get(c.cargo) ?? []; arr.push(c); m.set(c.cargo, arr); });
    return Array.from(m.entries());
  }, [items]);
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nenhuma candidatura.</p>;
  return (
    <div className="space-y-4">
      {grouped.map(([cargo, list]) => (
        <div key={cargo} className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">{cargo}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((c) => (
              <Card key={c.id}><CardContent className="flex items-start justify-between gap-2 py-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 rounded-md">
                    {c.foto_url ? <AvatarImage src={c.foto_url} alt={c.nome} className="object-cover" /> : null}
                    <AvatarFallback className="rounded-md text-xs">{c.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                  <div className="font-medium">{c.numero ? `${c.numero} — ` : ""}{c.nome}</div>
                  {c.proposta && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.proposta}</p>}
                  </div>
                </div>
                {isAdmin && <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="h-4 w-4" /></Button>}
              </CardContent></Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function useAssociados() {
  const [list, setList] = useState<Associado[]>([]);
  useEffect(() => {
    supabase.from("profiles").select("id, full_name, club_name, avatar_url").eq("status", "approved").order("full_name")
      .then(({ data }) => setList((data ?? []) as Associado[]));
  }, []);
  return list;
}

function NewDelegado({ eleicaoId, onCreated }: { eleicaoId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const associados = useAssociados();
  const [f, setF] = useState({ associado_id: "", nome: "", clube: "", tipo: "titular" as "titular" | "suplente" | "nato" });
  const pick = (aid: string) => {
    const a = associados.find((x) => x.id === aid);
    setF({ ...f, associado_id: aid, nome: a?.full_name ?? "", clube: a?.club_name ?? "" });
  };
  const save = async () => {
    if (!f.nome) return toast.error("Selecione um associado ou informe o nome");
    const { error } = await supabase.from("vf_delegados").insert({
      eleicao_id: eleicaoId, associado_id: f.associado_id || null,
      nome: f.nome, clube: f.clube || null, tipo: f.tipo, codigo_acesso: genCodigo(),
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Delegado cadastrado");
    setF({ associado_id: "", nome: "", clube: "", tipo: "titular" });
    setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Novo delegado</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo delegado</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Associado do sistema (recomendado)</Label>
            <AssociadoCombobox items={associados} value={f.associado_id} onChange={pick} />
            <p className="mt-1 text-xs text-muted-foreground">Vincular ao login permite votação remota com a conta do associado.</p>
          </div>
          <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div><Label>Clube</Label><Input value={f.clube} onChange={(e) => setF({ ...f, clube: e.target.value })} /></div>
          <div><Label>Tipo</Label>
            <Select value={f.tipo} onValueChange={(v: any) => setF({ ...f, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="titular">Titular</SelectItem>
                <SelectItem value="suplente">Suplente</SelectItem>
                <SelectItem value="nato">Nato</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DelegadosList({ items, isAdmin, onChanged, eleicao, presidente }: { items: Delegado[]; isAdmin: boolean; onChanged: () => void; eleicao: Eleicao; presidente: string | null }) {
  const [sendFor, setSendFor] = useState<Delegado | null>(null);
  const toggle = async (id: string, field: "credenciado" | "presente" | "habilitado_votar", val: boolean) => {
    const { error } = await supabase.from("vf_delegados").update({ [field]: val } as any).eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  };
  const remove = async (id: string) => {
    if (!confirm("Remover delegado?")) return;
    const { error } = await supabase.from("vf_delegados").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  };
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nenhum delegado.</p>;
  return (
    <div className="space-y-2">
      {items.map((d) => (
        <Card key={d.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="min-w-0 flex-1">
            <div className="font-medium">{d.nome} <Badge variant="outline" className="ml-2 text-[10px]">{d.tipo}</Badge></div>
            <div className="text-xs text-muted-foreground">{d.clube ?? "—"}</div>
            <div className="mt-1 flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono">{codigoUrna(d.codigo_acesso, d.birth_date)}</code>
              <Button size="icon" variant="ghost" className="h-6 w-6"
                onClick={() => { navigator.clipboard.writeText(codigoUrna(d.codigo_acesso, d.birth_date)); toast.success("Código copiado"); }}>
                <Copy className="h-3 w-3" />
              </Button>
              {!d.birth_date && (
                <span className="text-[10px] text-destructive">Sem data de nascimento no perfil</span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {d.ja_votou && <Badge variant="secondary">Já votou</Badge>}
            {isAdmin && (
              <>
                <Button size="sm" variant={d.credenciado ? "default" : "outline"} onClick={() => toggle(d.id, "credenciado", !d.credenciado)}>Credenciado</Button>
                <Button size="sm" variant={d.presente ? "default" : "outline"} onClick={() => toggle(d.id, "presente", !d.presente)}>Presente</Button>
                <Button size="sm" variant={d.habilitado_votar ? "default" : "outline"} onClick={() => toggle(d.id, "habilitado_votar", !d.habilitado_votar)}>Habilitado</Button>
                <Button size="sm" variant="outline" onClick={() => setSendFor(d)} title="Enviar credenciais">
                  <Send className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => printCredenciais([d], eleicao, presidente)} title="Imprimir credencial">
                  <Printer className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button>
              </>
            )}
          </div>
        </CardContent></Card>
      ))}
      <SendCredencialDialog delegado={sendFor} eleicao={eleicao} onClose={() => setSendFor(null)} />
    </div>
  );
}

function buildCredencialMsg(d: Delegado, e: Eleicao) {
  const dateStr = new Date(e.data_eleicao).toLocaleDateString("pt-BR");
  return `Olá ${d.nome},\n\nVocê está credenciado(a) como delegado(a) (${d.tipo}) na eleição "${e.titulo}" — ${dateStr}.\n\nSeu código de acesso para a votação: ${codigoUrna(d.codigo_acesso, d.birth_date)}\n\nGuarde este código com segurança. Ele será solicitado na urna eletrônica.`;
}

function SendCredencialDialog({ delegado, eleicao, onClose }: { delegado: Delegado | null; eleicao: Eleicao; onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  useEffect(() => { setEmail(""); setPhone(""); }, [delegado?.id]);
  if (!delegado) return null;
  const msg = buildCredencialMsg(delegado, eleicao);
  const sendEmail = () => {
    if (!email) return toast.error("Informe o e-mail");
    const subject = encodeURIComponent(`Credencial — ${eleicao.titulo}`);
    const body = encodeURIComponent(msg);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
  };
  const sendWhats = () => {
    if (!phone) return toast.error("Informe o telefone");
    const num = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  return (
    <Dialog open={!!delegado} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enviar credencial — {delegado.nome}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap font-mono">{msg}</div>
          <div className="space-y-2">
            <Label>WhatsApp (com DDI, ex: 5521999998888)</Label>
            <div className="flex gap-2">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5521..." />
              <Button onClick={sendWhats}><MessageCircle className="mr-2 h-4 w-4" /> WhatsApp</Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <div className="flex gap-2">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="delegado@exemplo.com" />
              <Button onClick={sendEmail}><Mail className="mr-2 h-4 w-4" /> E-mail</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Os botões abrem o WhatsApp Web e o cliente de e-mail com a mensagem já preenchida — você confirma o envio.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function printCredenciais(list: Delegado[], e: Eleicao, presidente: string | null) {
  const dateStr = new Date(e.data_eleicao).toLocaleDateString("pt-BR");
  const emblem = window.location.origin + lciEmblem.url;
  const dist = e.distrito || "Distrito LC-11";
  const cards = list.map((d) => `
    <div class="cred"><div class="in">
      <div class="wm"><img src="${emblem}" alt=""></div>
      <div class="corner l"><div class="n"></div><div class="g"></div></div>
      <div class="corner r"><div class="n"></div><div class="g"></div></div>
      <div class="hd">
        <img class="emblem" src="${emblem}" alt="Lions International">
        <div class="vsep"></div>
        <div class="mid">
          <div class="org">LIONS INTERNATIONAL</div>
          <div class="dist">${escapeHtml(dist)}</div>
          <div class="gold-hr"></div>
          <div class="ct">CREDENCIAL DE DELEGADO</div>
          <div class="sub">${escapeHtml(e.titulo)}</div>
          <div class="sub">${dateStr}</div>
        </div>
        <div class="we">
          <div class="we1">NÓS<br>SERVIMOS</div>
          <div class="we-hr"></div>
          <div class="we2">SERVICE<br>MAKES A<br>DIFFERENCE</div>
        </div>
      </div>
      <div class="band"></div>
      <div class="bd">
        <div class="row"><span class="lbl">Nome</span><span class="val">${escapeHtml(d.nome)}</span></div>
        <div class="row"><span class="lbl">Clube</span><span class="val">${escapeHtml(d.clube ?? "—")}</span></div>
        <div class="row"><span class="lbl">Tipo</span><span class="val">${escapeHtml(d.tipo)}</span></div>
        <div class="codebox"><div class="code">${escapeHtml(codigoUrnaCredencial(d.codigo_acesso, d.birth_date))}</div></div>
        <div class="hint">Código de acesso para votação na urna eletrônica — complete os XX com o dia do seu nascimento</div>
        <div class="sig">
          <div class="script">${escapeHtml(presidente ?? "Comissão Eleitoral")}</div>
          <div class="sline"></div>
          <div class="swho">${escapeHtml(presidente ?? "Comissão Eleitoral")} — Presidente da Comissão Eleitoral</div>
          <div class="esig">Assinado eletronicamente · cód. ${assinaturaEletronica(`${e.id}:${d.id}:${presidente ?? ""}`)}</div>
        </div>
        <div class="foot"><span class="fd"></span>LIDERANÇA&nbsp;•&nbsp;COMPANHEIRISMO&nbsp;•&nbsp;SERVIÇO<span class="fd"></span></div>
      </div>
    </div></div>
  `).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>Credenciais — ${escapeHtml(e.titulo)}</title>
    <style>
      *{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      body{margin:0;padding:16px;background:#eef1f5;font-family:"Segoe UI",Roboto,Arial,sans-serif}
      .toolbar{display:flex;gap:8px;margin-bottom:16px}
      .toolbar button{padding:8px 14px;border:1px solid #14346e;background:#14346e;color:#fff;border-radius:6px;cursor:pointer}
      .toolbar button.sec{background:#fff;color:#14346e}
      .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(440px,1fr));gap:16px}
      .cred{width:460px;max-width:100%;margin:0 auto;border:2px solid #d3a625;border-radius:16px;padding:4px;background:#fff;page-break-inside:avoid}
      .in{position:relative;overflow:hidden;border:2px solid #14346e;border-radius:12px;background:#fff}
      .wm{position:absolute;right:-40px;bottom:60px;width:320px;opacity:.06;pointer-events:none}
      .wm img{width:100%}
      .hd{position:relative;display:flex;align-items:stretch;gap:10px;padding:14px 12px 10px}
      .emblem{width:86px;height:86px;object-fit:contain;flex:none}
      .vsep{width:3px;background:#d3a625;flex:none;border-radius:2px}
      .mid{flex:1;text-align:center;min-width:0}
      .org{font-family:Georgia,"Times New Roman",serif;font-weight:700;font-size:17px;color:#14346e;letter-spacing:.5px;white-space:nowrap}
      .dist{font-family:Georgia,"Times New Roman",serif;font-size:14px;color:#14346e}
      .gold-hr{height:2px;background:#d3a625;margin:6px 14px}
      .ct{font-size:14px;font-weight:800;color:#1a4a8f;letter-spacing:.4px;white-space:nowrap}
      .sub{font-size:11.5px;color:#1a4a8f;white-space:nowrap}
      .we{flex:none;width:88px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;text-align:center}
      .we1{font-weight:800;font-size:13px;color:#14346e;line-height:1.15}
      .we-hr{width:60%;height:2px;background:#d3a625}
      .we2{font-size:8.5px;letter-spacing:1.5px;color:#14346e;line-height:1.5}
      .band{height:10px;background:#14346e}
      .bd{position:relative;padding:8px 20px 30px}
      .row{display:flex;justify-content:space-between;align-items:baseline;gap:10px;padding:8px 0 5px;border-bottom:1.5px dashed #c9d2e3}
      .lbl{font-size:12px;letter-spacing:1px;color:#5a6b85;text-transform:uppercase}
      .val{font-size:15px;font-weight:700;color:#14346e;text-align:right}
      .codebox{margin:14px 8px 4px;border:2px solid #d3a625;border-radius:12px;background:linear-gradient(180deg,#eef4ff,#d9e6fb);padding:10px 8px 8px;text-align:center}
      .code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:46px;font-weight:800;letter-spacing:14px;text-indent:14px;color:#14346e;line-height:1.1}
      .hint{margin-top:8px;text-align:center;font-size:13.5px;color:#2f6fd6}
      .sig{margin-top:16px;text-align:center}
      .script{font-family:"Segoe Script","Brush Script MT","Comic Sans MS",cursive;font-size:26px;color:#14346e}
      .sline{width:72%;margin:0 auto 5px;border-top:1.5px solid #14346e}
      .swho{font-size:12.5px;color:#14346e}
      .esig{font-size:10.5px;color:#7a8aa3;margin-top:3px}
      .foot{margin-top:14px;text-align:center;font-size:10px;font-weight:700;letter-spacing:2px;color:#14346e;white-space:nowrap}
      .fd{display:inline-block;width:34px;height:2px;background:#d3a625;vertical-align:middle;margin:0 8px}
      .corner{position:absolute;bottom:0;width:74px;height:74px;pointer-events:none}
      .corner.l{left:0}.corner.r{right:0}
      .corner .n{position:absolute;inset:0;background:#14346e}
      .corner .g{position:absolute;inset:0;background:#d3a625}
      .corner.l .n{clip-path:polygon(0 100%,0 0,100% 100%)}
      .corner.r .n{clip-path:polygon(100% 100%,100% 0,0 100%)}
      .corner.l .g{clip-path:polygon(0 100%,0 32%,68% 100%)}
      .corner.r .g{clip-path:polygon(100% 100%,100% 32%,32% 100%)}
      @media print{.toolbar{display:none}body{background:#fff;padding:0}.grid{gap:10px}}
    </style></head>
    <body>
      <div class="toolbar">
        <button onclick="window.print()">Imprimir</button>
        <button class="sec" onclick="window.close()">Fechar</button>
      </div>
      <div class="grid">${cards}</div>
    </body></html>`;
  const w = window.open("", "_blank", "width=1000,height=760");
  if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
  w.document.write(html);
  w.document.close();
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function NewComissao({ eleicaoId, onCreated }: { eleicaoId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ nome: "", funcao: "membro" as Comissao["funcao"] });
  const save = async () => {
    if (!f.nome) return toast.error("Nome é obrigatório");
    const { error } = await supabase.from("vf_comissao").insert({
      eleicao_id: eleicaoId, nome: f.nome, funcao: f.funcao,
    } as any);
    if (error) return toast.error(error.message);
    toast.success("Membro adicionado");
    setF({ nome: "", funcao: "membro" });
    setOpen(false); onCreated();
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="mr-2 h-4 w-4" /> Membro</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Membro da comissão</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></div>
          <div><Label>Função</Label>
            <Select value={f.funcao} onValueChange={(v: any) => setF({ ...f, funcao: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="presidente">Presidente</SelectItem>
                <SelectItem value="vice_presidente">Vice-presidente</SelectItem>
                <SelectItem value="membro">Membro</SelectItem>
                <SelectItem value="vogal">Vogal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter><Button onClick={save}>Salvar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ComissaoList({ items, isAdmin, onChanged }: { items: Comissao[]; isAdmin: boolean; onChanged: () => void }) {
  const remove = async (id: string) => {
    if (!confirm("Remover?")) return;
    const { error } = await supabase.from("vf_comissao").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  };
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nenhum membro.</p>;
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((m) => (
        <Card key={m.id}><CardContent className="flex items-center justify-between py-3">
          <div><div className="font-medium">{m.nome}</div><div className="text-xs text-muted-foreground capitalize">{m.funcao.replace("_", " ")}</div></div>
          {isAdmin && <Button size="icon" variant="ghost" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4" /></Button>}
        </CardContent></Card>
      ))}
    </div>
  );
}

function buildApuracaoReport(
  items: Apuracao[],
  eleicao: Eleicao,
  cands: Candidatura[],
  presidente: string | null,
): ApuracaoReport {
  const byId = new Map(cands.map((c) => [c.id, c]));
  const grouped = new Map<string, Apuracao[]>();
  items.forEach((i) => { const a = grouped.get(i.cargo) ?? []; a.push(i); grouped.set(i.cargo, a); });
  const cargos = Array.from(grouped.entries()).map(([cargo, list]) => {
    const total = list.reduce((s, x) => s + Number(x.votos), 0);
    const p = (n: number) => (total ? (n / total) * 100 : 0);
    const sum = (tipo: string) => list.filter((x) => x.tipo === tipo).reduce((s, x) => s + Number(x.votos), 0);
    const nulos = sum("nulo");
    const contrarios = sum("nao");
    const favoraveis = sum("sim");
    return {
      cargo,
      totalVotos: total,
      candidatos: list
        .filter((x) => x.tipo === "candidato" || x.candidatura_id)
        .sort((a, b) => Number(b.votos) - Number(a.votos))
        .map((x) => {
          const c = x.candidatura_id ? byId.get(x.candidatura_id) : undefined;
          return {
            nome: x.candidato || c?.nome || "—",
            numero: c?.numero ?? null,
            fotoUrl: c?.foto_url ?? null,
            votos: Number(x.votos),
            pct: p(Number(x.votos)),
          };
        }),
      favoraveis, favoraveisPct: p(favoraveis),
      contrarios, contrariosPct: p(contrarios),
      nulos, nulosPct: p(nulos),
    };
  });
  return {
    titulo: eleicao.titulo,
    descricao: eleicao.descricao,
    distrito: eleicao.distrito,
    dataEleicao: new Date(eleicao.data_eleicao).toLocaleDateString("pt-BR"),
    statusLabel: STATUS_LABEL[eleicao.status],
    presidente,
    geradoEm: new Date().toLocaleString("pt-BR"),
    totalGeral: cargos.reduce((s, c) => s + c.totalVotos, 0),
    cargos,
  };
}

function CargoPie({ cargo }: { cargo: ApuracaoCargoReport }) {
  const data = cargoSlices(cargo);
  if (data.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" outerRadius="75%" label={(e: any) => `${((e.percent ?? 0) * 100).toFixed(1)}%`}>
            {data.map((s, i) => <Cell key={i} fill={s.color} />)}
          </Pie>
          <RTooltip formatter={(v: any, n: any) => [`${v} voto(s)`, n]} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}


function ApuracaoView({ items, status, eleicao, cands, presidente }: {
  items: Apuracao[]; status: Status; eleicao: Eleicao; cands: Candidatura[]; presidente: string | null;
}) {
  const [filterCargo, setFilterCargo] = useState("all");
  const [filterCandidato, setFilterCandidato] = useState("all");
  if (status !== "votacao_encerrada" && status !== "apurada") {
    return (
      <Card><CardContent className="flex items-center gap-3 py-6">
        <ShieldAlert className="h-5 w-5 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Apuração disponível apenas para administradores enquanto a eleição não estiver encerrada.</p>
      </CardContent></Card>
    );
  }
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Nenhum voto registrado.</p>;
  const fullReport = buildApuracaoReport(items, eleicao, cands, presidente);
  const cargoOptions = fullReport.cargos.map((c) => c.cargo);
  const candidatoOptions = Array.from(new Set(
    fullReport.cargos
      .filter((c) => filterCargo === "all" || c.cargo === filterCargo)
      .flatMap((c) => c.candidatos.map((k) => k.nome)),
  ));
  const report: ApuracaoReport = {
    ...fullReport,
    cargos: fullReport.cargos
      .filter((c) => filterCargo === "all" || c.cargo === filterCargo)
      .map((c) => filterCandidato === "all" ? c : { ...c, candidatos: c.candidatos.filter((k) => k.nome === filterCandidato) }),
    totalGeral: fullReport.cargos
      .filter((c) => filterCargo === "all" || c.cargo === filterCargo)
      .reduce((s, c) => s + c.totalVotos, 0),
  };
  return (
    <div className="space-y-4">
      <Card><CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div>
          <p className="text-sm font-semibold">Relatório de apuração</p>
          <p className="text-xs text-muted-foreground">{report.totalGeral} voto(s) apurado(s) no total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => exportApuracaoPdf(report).catch(() => toast.error("Erro ao gerar PDF"))}>
            <FileText className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportApuracaoWord(report).catch(() => toast.error("Erro ao gerar Word"))}>
            <FileType2 className="mr-2 h-4 w-4" /> Word
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportApuracaoExcel(report)}>
            <SheetIcon className="mr-2 h-4 w-4" /> Excel
          </Button>
        </div>
      </CardContent></Card>

      <Card><CardContent className="flex flex-wrap items-end gap-3 py-4">
        <div className="grid gap-1.5">
          <Label className="text-xs">Filtrar por cargo</Label>
          <Select value={filterCargo} onValueChange={(v) => { setFilterCargo(v); setFilterCandidato("all"); }}>
            <SelectTrigger className="w-[220px]"><SelectValue placeholder="Todos os cargos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os cargos</SelectItem>
              {cargoOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label className="text-xs">Filtrar por candidato</Label>
          <Select value={filterCandidato} onValueChange={setFilterCandidato}>
            <SelectTrigger className="w-[240px]"><SelectValue placeholder="Todos os candidatos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os candidatos</SelectItem>
              {candidatoOptions.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {(filterCargo !== "all" || filterCandidato !== "all") && (
          <Button size="sm" variant="ghost" onClick={() => { setFilterCargo("all"); setFilterCandidato("all"); }}>Limpar filtros</Button>
        )}
      </CardContent></Card>

      {report.cargos.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum resultado para os filtros selecionados.</p>
      )}

      {report.cargos.map((c) => (
        <Card key={c.cargo}><CardContent className="space-y-3 py-4">
          <h3 className="font-semibold">{c.cargo} <span className="text-xs font-normal text-muted-foreground">({c.totalVotos} votos)</span></h3>
          <CargoPie cargo={c} />

          {c.candidatos.map((k, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {k.fotoUrl ? <AvatarImage src={k.fotoUrl} alt={k.nome} className="object-cover" /> : null}
                  <AvatarFallback>{k.nome.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate">{k.nome}{k.numero ? ` (nº ${k.numero})` : ""}</span>
                    <span className="shrink-0 text-muted-foreground">{k.votos} · {k.pct.toFixed(1)}%</span>
                  </div>
                  <Progress value={k.pct} className="mt-1" />
                </div>
              </div>
            </div>
          ))}
          <div className="grid gap-2 pt-2 text-sm sm:grid-cols-3">
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Favoráveis (Sim)</div>
              <div className="font-semibold">{c.favoraveis} · {c.favoraveisPct.toFixed(1)}%</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Contrários (Não)</div>
              <div className="font-semibold">{c.contrarios} · {c.contrariosPct.toFixed(1)}%</div>
            </div>
            <div className="rounded-md border p-2">
              <div className="text-xs text-muted-foreground">Nulos</div>
              <div className="font-semibold">{c.nulos} · {c.nulosPct.toFixed(1)}%</div>
            </div>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}
