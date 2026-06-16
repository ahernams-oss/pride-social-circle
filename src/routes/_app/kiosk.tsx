import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getKioskClient } from "@/lib/supabase-kiosk";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Monitor, LogIn, LogOut, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { ElectionDetail } from "@/components/ElectionDetail";

export const Route = createFileRoute("/_app/kiosk")({ component: KioskPage });

type ElectionLite = { id: string; title: string };

function KioskPage() {
  const { isAdmin, user, loading } = useAuth();
  const nav = useNavigate();
  const [elections, setElections] = useState<ElectionLite[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [voterId, setVoterId] = useState<string | null>(null);
  const [voterName, setVoterName] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    if (!loading && !isAdmin) nav({ to: "/elections", replace: true });
  }, [loading, isAdmin, nav]);

  const loadElections = useCallback(async () => {
    const { data } = await supabase
      .from("elections")
      .select("id,title,allow_kiosk,status")
      .eq("status", "open")
      .eq("allow_kiosk", true);
    setElections((data ?? []) as any);
  }, []);

  useEffect(() => { if (isAdmin) loadElections(); }, [isAdmin, loadElections]);

  const openSession = async () => {
    if (!selectedId || !user) return;
    const { data, error } = await supabase
      .from("kiosk_sessions")
      .insert({ election_id: selectedId, opened_by: user.id, active: true } as any)
      .select("id")
      .single();
    if (error || !data) return toast.error(error?.message ?? "Erro");
    setSessionId((data as any).id);
    toast.success("Sessão Kiosk aberta");
  };

  const closeSession = async () => {
    if (!sessionId) return;
    await supabase.from("kiosk_sessions").update({ active: false, closed_at: new Date().toISOString() }).eq("id", sessionId);
    setSessionId(null);
    setSelectedId("");
    await getKioskClient().auth.signOut();
    setVoterId(null); setVoterName("");
    toast.success("Kiosk encerrado");
  };

  const signInVoter = async () => {
    setSigning(true);
    const kiosk = getKioskClient();
    const { data, error } = await kiosk.auth.signInWithPassword({ email: email.trim(), password });
    setSigning(false);
    if (error || !data.user) return toast.error(error?.message ?? "Credenciais inválidas");
    // verify approved
    const { data: profile } = await kiosk.from("profiles").select("status,full_name").eq("id", data.user.id).maybeSingle();
    if (!profile || (profile as any).status !== "approved") {
      await kiosk.auth.signOut();
      return toast.error("Usuário não aprovado");
    }
    setVoterId(data.user.id);
    setVoterName((profile as any).full_name ?? data.user.email ?? "Eleitor");
    setEmail(""); setPassword("");
  };

  const logoutVoter = useCallback(async () => {
    await getKioskClient().auth.signOut();
    setVoterId(null); setVoterName("");
  }, []);

  if (!isAdmin) {
    return (
      <Card><CardContent className="flex items-center gap-3 py-6">
        <ShieldAlert className="h-5 w-5 text-destructive" />
        <p className="text-sm">Acesso restrito a administradores.</p>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Monitor className="h-6 w-6" /> Modo Kiosk</h1>
          <p className="text-sm text-muted-foreground">Cada sócio se autentica com seu próprio login, vota e desloga.</p>
        </div>
        {sessionId && <Button variant="outline" onClick={closeSession}>Encerrar Kiosk</Button>}
      </div>

      {!sessionId && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <Label>Eleição (apenas eleições abertas com Kiosk habilitado)</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {elections.length === 0 && <div className="p-2 text-sm text-muted-foreground">Nenhuma elegível.</div>}
                {elections.map((e) => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={openSession} disabled={!selectedId}>Abrir sessão Kiosk</Button>
          </CardContent>
        </Card>
      )}

      {sessionId && !voterId && (
        <Card>
          <CardContent className="space-y-3 py-5">
            <div className="flex items-center gap-2"><Badge>Sessão ativa</Badge><span className="text-sm text-muted-foreground">Aguardando próximo eleitor</span></div>
            <div className="space-y-2">
              <Label><LogIn className="mr-1 inline h-4 w-4" /> Login do sócio</Label>
              <Input placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
              <Input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              <Button onClick={signInVoter} disabled={signing || !email || !password} className="w-full">
                {signing ? "Entrando..." : "Entrar e votar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {sessionId && voterId && (
        <div className="space-y-3">
          <Card><CardContent className="flex items-center justify-between py-3">
            <div><div className="text-xs text-muted-foreground">Votando como</div><div className="font-semibold">{voterName}</div></div>
            <Button variant="outline" size="sm" onClick={logoutVoter}><LogOut className="mr-2 h-4 w-4" /> Sair sem votar</Button>
          </CardContent></Card>
          <ElectionDetail
            electionId={selectedId}
            isAdmin={false}
            voterId={voterId}
            client={getKioskClient()}
            onVoted={() => { setTimeout(() => { logoutVoter(); toast.success("Obrigado! Próximo eleitor."); }, 1500); }}
          />
        </div>
      )}
    </div>
  );
}
