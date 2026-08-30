import { createFileRoute, useNavigate, useHydrated } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { completeness, missingFields } from "@/lib/profile-completeness";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({
    meta: [
      { title: "Primeiro acesso | Lions Connecta" },
      { name: "description", content: "Complete seu cadastro para acessar a comunidade Lions Connecta." },
      { property: "og:title", content: "Primeiro acesso | Lions Connecta" },
      { property: "og:description", content: "Complete seu cadastro para acessar a comunidade Lions Connecta." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

type Form = {
  full_name: string; cpf: string; lion_number: string; birth_date: string;
  phone: string; club_name: string; city: string;
  cep: string; logradouro: string; numero: string; bairro: string; estado: string;
};

const empty: Form = {
  full_name: "", cpf: "", lion_number: "", birth_date: "", phone: "",
  club_name: "", city: "", cep: "", logradouro: "", numero: "", bairro: "", estado: "",
};

function Onboarding() {
  const hydrated = useHydrated();
  const nav = useNavigate();
  const { user, profile, loading, refresh } = useAuth();
  const [form, setForm] = useState<Form>(empty);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!user) { nav({ to: "/login", replace: true }); return; }
    if (profile && !ready) {
      setForm({
        full_name: profile.full_name ?? "",
        cpf: profile.cpf ?? "",
        lion_number: profile.lion_number ?? "",
        birth_date: profile.birth_date ?? "",
        phone: profile.phone ?? "",
        club_name: profile.club_name ?? "",
        city: profile.city ?? "",
        cep: profile.cep ?? "",
        logradouro: profile.logradouro ?? "",
        numero: profile.numero ?? "",
        bairro: profile.bairro ?? "",
        estado: profile.estado ?? "",
      });
      setReady(true);
    }
  }, [hydrated, loading, user, profile, nav, ready]);

  const preview = useMemo(() => completeness({ ...profile, ...form }), [profile, form]);

  const lookupCep = async (cep: string) => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (data.erro) return;
      setForm((f) => ({
        ...f,
        logradouro: data.logradouro || f.logradouro,
        bairro: data.bairro || f.bairro,
        city: data.localidade || f.city,
        estado: data.uf || f.estado,
      }));
    } catch { /* silencioso */ }
  };

  const submit = async () => {
    if (!user) return;
    const missing = missingFields({ ...profile, ...form }, true);
    if (missing.length) {
      toast.error(`Preencha: ${missing.map((m) => m.label).join(", ")}`);
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        cpf: form.cpf.replace(/\D/g, ""),
        lion_number: form.lion_number.replace(/\D/g, ""),
        birth_date: form.birth_date || null,
        phone: form.phone,
        club_name: form.club_name,
        city: form.city,
        cep: form.cep,
        logradouro: form.logradouro,
        numero: form.numero,
        bairro: form.bairro,
        estado: form.estado,
        onboarding_done: true,
      })
      .eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refresh();
    toast.success("Cadastro completo!");
    nav({ to: profile?.status === "approved" ? "/feed" : "/pending", replace: true });
  };

  if (!hydrated || loading || !user) return null;

  const field = (k: keyof Form, label: string, type = "text", onBlur?: () => void) => (
    <div className="space-y-1">
      <Label htmlFor={k}>{label}</Label>
      <Input
        id={k}
        type={type}
        value={form[k]}
        onBlur={onBlur}
        onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-lions-gradient px-4 py-10">
      <div className="mx-auto w-full max-w-2xl rounded-2xl bg-card p-8 shadow-2xl">
        <h1 className="text-2xl font-bold">Complete seu cadastro</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Precisamos destas informações para liberar seu acesso e validar você na base de associados.
        </p>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs font-medium">
            <span>{preview.percent}% completo</span>
            <span className="text-muted-foreground">{preview.done}/{preview.total}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${preview.percent}%` }} />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {field("full_name", "Nome completo *")}
          {field("cpf", "CPF *")}
          {field("lion_number", "Número Lion *")}
          {field("birth_date", "Data de nascimento *", "date")}
          {field("phone", "Telefone celular *")}
          {field("club_name", "Clube *")}
          {field("cep", "CEP", "text", () => lookupCep(form.cep))}
          {field("logradouro", "Logradouro")}
          {field("numero", "Número")}
          {field("bairro", "Bairro")}
          {field("city", "Cidade *")}
          {field("estado", "Estado")}
        </div>

        <Button className="mt-6 w-full" onClick={submit} disabled={saving}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {saving ? "Salvando..." : "Concluir cadastro"}
        </Button>
      </div>
    </div>
  );
}
