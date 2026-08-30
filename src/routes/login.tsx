import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
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
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Ainda não tem conta?{" "}
          <Link to="/signup" className="font-medium text-primary hover:underline">Solicite acesso</Link>
        </p>
      </div>
    </div>
  );
}
