import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, Heart, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const { user, profile, loading } = useAuth();
  if (!loading && user && profile?.status === "approved") return <Navigate to="/feed" />;
  if (!loading && user && profile && profile.status !== "approved") return <Navigate to="/pending" />;

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-lions-gradient text-primary-foreground">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-gold-foreground font-bold">L</div>
            <span className="text-lg font-semibold tracking-tight">Lions Connect</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Link to="/login">Entrar</Link>
            </Button>
            <Button asChild className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Link to="/signup">Criar conta</Link>
            </Button>
          </div>
        </nav>

        <div className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold sm:text-5xl md:text-6xl">
            A rede social dos associados <span className="text-gold">Lions Clube</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Compartilhe ações, conecte-se com associados de outros clubes, troque mensagens e fortaleça a comunidade Lions.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="bg-gold text-gold-foreground hover:bg-gold/90">
              <Link to="/signup">Solicitar acesso</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-primary-foreground hover:bg-white/10 hover:text-primary-foreground">
              <Link to="/login">Já tenho conta</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Users, t: "Associados conectados", d: "Encontre membros do seu distrito e de outros clubes." },
            { icon: Heart, t: "Feed de ações", d: "Compartilhe campanhas, eventos e conquistas do clube." },
            { icon: MessageCircle, t: "Mensagens diretas", d: "Converse em tempo real com qualquer associado." },
            { icon: Shield, t: "Acesso aprovado", d: "Comunidade exclusiva: cada novo cadastro passa por aprovação." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-xl border bg-card p-6 shadow-sm">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-card-foreground">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t bg-muted/30">
        <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-muted-foreground">
          Lions Connect — rede social independente para associados Lions Clube.
        </div>
      </footer>
    </div>
  );
}
