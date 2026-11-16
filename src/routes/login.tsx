import lciEmblem from "@/assets/lci-emblem.png.asset.json";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { checkPasswordReset, completePasswordReset } from "@/lib/password-reset.functions";
import { listSignupClubs } from "@/lib/signup-clubs.functions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [birth, setBirth] = useState("");
  const [club, setClub] = useState("");
  const [clubs, setClubs] = useState<{ id: string; name: string; city: string }[]>([]);
  const [newPwd, setNewPwd] = useState("");
  const [newPwd2, setNewPwd2] = useState("");
  const checkFn = useServerFn(checkPasswordReset);
  const completeFn = useServerFn(completePasswordReset);
  const clubsFn = useServerFn(listSignupClubs);

  const finishLogin = async (pwd: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pwd });
    if (error) return toast.error(error.message);
    const uid = data.user?.id;
    if (uid) {
      const { data: prof } = await supabase.from("profiles").select("is_active").eq("id", uid).maybeSingle();
      if (prof && prof.is_active === false) {
        await supabase.auth.signOut();
        return toast.error("Sua conta está desativada. Fale com um administrador.");
      }
    }
    toast.success("Bem-vindo de volta!");
    nav({ to: "/feed" });
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd.length < 6) return toast.error("A nova senha deve ter ao menos 6 caracteres.");
    if (newPwd !== newPwd2) return toast.error("As senhas não conferem.");
    setLoading(true);
    try {
      await completeFn({ data: { email, birth_date: birth, club_name: club, new_password: newPwd } });
      toast.success("Senha cadastrada com sucesso!");
      setResetMode(false);
      await finishLogin(newPwd);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      try {
        const r = await checkFn({ data: { email } });
        if (r.required) {
          setResetMode(true);
          setLoading(false);
          clubsFn().then(setClubs).catch(() => {});
          return toast.info("Sua senha foi zerada por um administrador. Confirme seus dados para cadastrar uma nova.");
        }
      } catch { /* segue com o erro padrão */ }
      setLoading(false);
      return toast.error(error.message);
    }

    // Bloqueia contas desativadas pelo administrador
    const uid = data.user?.id;
    if (uid) {
      const { data: prof } = await supabase
        .from("profiles").select("is_active").eq("id", uid).maybeSingle();
      if (prof && prof.is_active === false) {
        await supabase.auth.signOut();
        setLoading(false);
        return toast.error("Sua conta está desativada. Fale com um administrador.");
      }
    }

    setLoading(false);
    toast.success("Bem-vindo de volta!");
    nav({ to: "/feed" });
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-lions-gradient p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img src={lciEmblem.url} alt="Lions Clubs International" className="mx-auto mb-3 h-16 w-16 object-contain" />
          <h1 className="text-2xl font-bold text-card-foreground">Lions Connecta</h1>
          <p className="mt-1 text-sm text-muted-foreground">Entre na rede dos associados</p>
        </div>
        {resetMode ? (
        <form onSubmit={onReset} className="space-y-4">
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            Sua senha foi zerada. Confirme seus dados para cadastrar uma nova senha para <b>{email}</b>.
          </p>
          <div>
            <Label htmlFor="birth">Data de nascimento completa</Label>
            <Input id="birth" type="date" required value={birth} onChange={(e) => setBirth(e.target.value)} />
          </div>
          <div>
            <Label>Clube a que pertence</Label>
            {clubs.length > 0 ? (
              <Select value={club} onValueChange={setClub}>
                <SelectTrigger><SelectValue placeholder="Selecione seu clube" /></SelectTrigger>
                <SelectContent>
                  {clubs.map((c) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}{c.city ? ` · ${c.city}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input required value={club} onChange={(e) => setClub(e.target.value)} placeholder="Nome do clube" />
            )}
          </div>
          <div>
            <Label htmlFor="np">Nova senha</Label>
            <Input id="np" type="password" required minLength={6} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="np2">Confirmar nova senha</Label>
            <Input id="np2" type="password" required minLength={6} value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !club}>
            {loading ? "Salvando..." : "Cadastrar nova senha"}
          </Button>
          <Button type="button" variant="ghost" className="w-full" onClick={() => setResetMode(false)}>Voltar</Button>
        </form>
        ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
        )}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">Solicite acesso</Link>
        </p>
      </div>
    </div>
  );
}
