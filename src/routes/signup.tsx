import lciEmblem from "@/assets/lci-emblem.png.asset.json";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatCpf, onlyDigits } from "@/lib/registry";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { listSignupClubs } from "@/lib/signup-clubs.functions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ArrowLeft, Check, ChevronsUpDown } from "lucide-react";

const clubsQuery = queryOptions({ queryKey: ["signup-club-directory"], queryFn: () => listSignupClubs(), staleTime: 60_000 });

export const Route = createFileRoute("/signup")({
  loader: ({ context }) => context.queryClient.ensureQueryData(clubsQuery),
  component: SignupPage,
  errorComponent: ({ reset }) => <div className="p-8 text-center"><p>Não foi possível carregar os clubes.</p><Button onClick={() => { window.location.reload(); reset(); }}>Tentar novamente</Button></div>,
  notFoundComponent: () => <p>Solicitação de acesso não encontrada.</p>,
  head: () => ({ meta: [
    { title: "Solicitar acesso | Lions Connecta" },
    { name: "description", content: "Solicite acesso ao Lions Connecta e selecione seu clube cadastrado no Distrito LC-11." },
    { property: "og:title", content: "Solicitar acesso | Lions Connecta" },
    { property: "og:description", content: "Cadastre-se no Lions Connecta com seu clube e cidade." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
});

function SignupPage() {
  const nav = useNavigate();
  const { data: clubs } = useSuspenseQuery(clubsQuery);
  const [clubOpen, setClubOpen] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState("");
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
    if (!selectedClubId) return toast.error("Selecione seu clube.");
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
      <div className="relative w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl">
        <Button asChild variant="ghost" size="icon" className="absolute left-3 top-3">
          <Link to="/" aria-label="Voltar à página principal" title="Voltar à página principal">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="mb-6 text-center">
          <img src={lciEmblem.url} alt="Lions Clubs International" className="mx-auto mb-3 h-16 w-16 object-contain" />
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
          <div className="space-y-3">
            <div>
              <Label htmlFor="club">Clube</Label>
              <Popover open={clubOpen} onOpenChange={setClubOpen}>
                <PopoverTrigger asChild>
                  <Button id="club" type="button" variant="outline" role="combobox" aria-expanded={clubOpen} className="h-auto min-h-10 w-full justify-between text-left font-normal">
                    <span className="min-w-0 whitespace-normal">{form.club_name || "Selecione seu clube"}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar clube ou cidade..." />
                    <CommandList>
                      <CommandEmpty>Nenhum clube encontrado.</CommandEmpty>
                      <CommandGroup>
                        {clubs.map((club) => <CommandItem key={club.id} value={`${club.name} ${club.city} ${club.id}`} onSelect={() => {
                          setSelectedClubId(club.id);
                          setForm((f) => ({ ...f, club_name: club.name, city: club.city }));
                          setClubOpen(false);
                        }}>
                          <div className="min-w-0 flex-1"><div className="whitespace-normal">{club.name}</div><div className="text-xs text-muted-foreground">{club.city || "Cidade não informada"}</div></div>
                          {selectedClubId === club.id && <Check className="h-4 w-4 shrink-0" />}
                        </CommandItem>)}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
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
