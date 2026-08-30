import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCpf, onlyDigits } from "@/lib/registry";

export const Route = createFileRoute("/signup")({ component: SignupPage });

function SignupPage() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    full_name: "",
    club_name: "",
    city: "",
    cpf: "",
    lion_number: "",
    birth_date: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  const upd = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) return toast.error("A senha deve ter ao menos 8 caracteres.");
    if (onlyDigits(form.cpf).length !== 11) return toast.error("Informe um CPF válido (11 dígitos).");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: form.full_name,
          club_name: form.club_name,
          city: form.city,
          cpf: onlyDigits(form.cpf),
          lion_number: onlyDigits(form.lion_number),
          birth_date: form.birth_date,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro enviado! Aguarde aprovação do administrador.");
    nav({ to: "/pending" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-lions-gradient p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gold text-gold-foreground text-xl font-bold">L</div>
          <h1 className="text-2xl font-bold text-card-foreground">Solicitar acesso</h1>
          <p className="mt-1 text-sm text-muted-foreground">Seu cadastro será revisado por um administrador</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" required value={form.full_name} onChange={upd("full_name")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cpf">CPF</Label>
              <Input
                id="cpf"
                required
                inputMode="numeric"
                value={formatCpf(form.cpf)}
                onChange={(e) => setForm((f) => ({ ...f, cpf: onlyDigits(e.target.value) }))}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="lion">Número Lion</Label>
              <Input
                id="lion"
                required
                inputMode="numeric"
                value={form.lion_number}
                onChange={(e) => setForm((f) => ({ ...f, lion_number: onlyDigits(e.target.value) }))}
                placeholder="Somente números"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="birth">Data de nascimento</Label>
            <Input id="birth" type="date" required value={form.birth_date} onChange={upd("birth_date")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="club">Clube</Label>
              <Input id="club" required value={form.club_name} onChange={upd("club_name")} placeholder="Lions Clube..." />
            </div>
            <div>
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" required value={form.city} onChange={upd("city")} />
            </div>
          </div>
          <div>
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" required value={form.email} onChange={upd("email")} />
          </div>
          <div>
            <Label htmlFor="pw">Senha (mín. 8 caracteres)</Label>
            <Input id="pw" type="password" required value={form.password} onChange={upd("password")} />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando..." : "Criar conta"}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
