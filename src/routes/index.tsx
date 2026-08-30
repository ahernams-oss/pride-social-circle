import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, FileText, ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import distritoLogo from "@/assets/distrito-lc11-logo.png.asset.json";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Lions Connecta — Rede dos associados do Distrito LC-11" },
      {
        name: "description",
        content:
          "Plataforma exclusiva dos associados do Lions Clube no Distrito LC-11: feed de ações, mensagens, eventos e acesso aprovado.",
      },
      { property: "og:title", content: "Lions Connecta — Distrito LC-11" },
      {
        property: "og:description",
        content:
          "Fortalecendo o servir através da conexão: a plataforma digital dos associados do Lions Clube no Distrito LC-11.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Lions Connecta — Distrito LC-11" },
      {
        name: "twitter:description",
        content: "A plataforma digital dos associados do Lions Clube no Distrito LC-11.",
      },
    ],
  }),
});

const PILLARS = [
  {
    icon: Users,
    tone: "navy" as const,
    title: "Associados conectados",
    desc: "Encontre e interaja com companheiros leões de todos os clubes do distrito.",
  },
  {
    icon: FileText,
    tone: "gold" as const,
    title: "Feed de ações",
    desc: "Acompanhe em tempo real os projetos e campanhas de serviço em andamento.",
  },
  {
    icon: MessageCircle,
    tone: "navy" as const,
    title: "Mensagens diretas",
    desc: "Comunicação ágil e segura entre as lideranças e membros dos clubes.",
  },
  {
    icon: ShieldCheck,
    tone: "gold" as const,
    title: "Acesso aprovado",
    desc: "Rede segura e moderada, restrita a associados ativos do Distrito LC-11.",
  },
];

function Landing() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (loading || !user || !profile) return;
    nav({ to: profile.status === "approved" ? "/feed" : "/pending", replace: true });
  }, [loading, nav, profile, user]);

  return (
    <div className="min-h-screen bg-secondary/60 text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <img
            src={distritoLogo.url}
            alt="Lions Clubs International - Distrito LC-11"
            className="h-12 w-auto object-contain"
          />
          <span className="font-display text-2xl font-bold tracking-tight text-primary">
            Lions Connecta
          </span>
        </div>
        <div className="flex items-center gap-4 sm:gap-8">
          <Link
            to="/login"
            className="text-sm font-semibold text-primary transition-colors hover:text-gold"
          >
            Entrar
          </Link>
          <Button asChild className="rounded-full px-5 shadow-sm transition-all hover:shadow-lg">
            <Link to="/signup">Criar conta</Link>
          </Button>
        </div>
      </nav>

      <section className="mx-auto flex max-w-7xl flex-col items-center px-6 py-20 text-center lg:py-28">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-gold" />
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Distrito LC-11
          </span>
        </div>

        <h1 className="mb-8 max-w-4xl text-5xl font-bold leading-[1.05] text-primary md:text-7xl">
          Fortalecendo o servir através da <span className="text-gold">conexão</span>.
        </h1>

        <p className="mb-12 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          A plataforma digital exclusiva para associados do Lions Clube. Unindo propósitos,
          compartilhando ações e estreitando laços no Distrito LC-11.
        </p>

        <div className="flex w-full flex-col gap-4 sm:w-auto sm:flex-row">
          <Button
            asChild
            size="lg"
            className="rounded-xl px-10 py-6 text-base font-bold shadow-xl transition-transform hover:-translate-y-0.5"
          >
            <Link to="/signup">Solicitar acesso</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-xl border-2 border-primary bg-card px-10 py-6 text-base font-bold text-primary transition-colors hover:bg-secondary"
          >
            <Link to="/login">Já tenho conta</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ icon: Icon, tone, title, desc }) => (
            <article
              key={title}
              className="group rounded-[2rem] border bg-card p-8 shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                className={`mb-6 flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                  tone === "gold"
                    ? "bg-gold/15 text-gold group-hover:bg-gold group-hover:text-gold-foreground"
                    : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mb-3 font-display text-xl font-bold text-primary">{title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-7xl border-t px-6 py-12">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 font-display font-bold text-primary">
              LC
            </div>
            <div className="text-center md:text-left">
              <p className="font-bold text-primary">Lions Connecta • Distrito LC-11</p>
              <p className="text-xs font-medium text-muted-foreground">We Serve • Nós Servimos</p>
            </div>
          </div>
          <div className="flex gap-8">
            <Link
              to="/distrito"
              className="text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              Distrito
            </Link>
            <Link
              to="/login"
              className="text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              Entrar
            </Link>
            <Link
              to="/signup"
              className="text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              Solicitar acesso
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
