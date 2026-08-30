import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  Users,
  MessageSquare,
  Megaphone,
  HeartHandshake,
  BarChart3,
  UserPlus,
  ClipboardCheck,
  ThumbsUp,
  Globe,
} from "lucide-react";
import { useEffect } from "react";
import distritoLogo from "@/assets/distrito-lc11-logo.png.asset.json";
import heroVoluntarios from "@/assets/hero-voluntarios.jpg";
import heroAbraco from "@/assets/hero-abraco.jpg";
import heroMaos from "@/assets/hero-maos.jpg";
import heroCrianca from "@/assets/hero-crianca.jpg";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Lions Connecta — Rede dos associados do Distrito LC-11" },
      {
        name: "description",
        content:
          "Lions Connecta é a rede social exclusiva para os membros do Lions Clube Distrito LC-11. Conecte-se, compartilhe, divulgue, colabore e transforme.",
      },
      { property: "og:title", content: "Lions Connecta — Distrito LC-11" },
      {
        property: "og:description",
        content:
          "Conectando pessoas, conectando solidariedade. A plataforma digital dos associados do Lions Clube no Distrito LC-11.",
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

const NAV = [
  { href: "#inicio", label: "Início" },
  { href: "#sobre", label: "Sobre" },
  { href: "#recursos", label: "Recursos" },
  { href: "#beneficios", label: "Benefícios" },
  { href: "#como-participar", label: "Como participar" },
  { href: "#contato", label: "Contato" },
];

const FEATURES = [
  {
    icon: Users,
    title: "Conecte-se",
    desc: "Encontre e conecte-se com membros do Distrito LC-11 e fortaleça sua rede.",
  },
  {
    icon: MessageSquare,
    title: "Compartilhe",
    desc: "Compartilhe experiências, ideias, projetos e boas práticas que inspiram.",
  },
  {
    icon: Megaphone,
    title: "Divulgue",
    desc: "Divulgue seus eventos, ações e campanhas para todo o Distrito.",
  },
  {
    icon: HeartHandshake,
    title: "Colabore",
    desc: "Participe de grupos, faça parcerias e desenvolva projetos juntos.",
  },
  {
    icon: BarChart3,
    title: "Transforme",
    desc: "A união de boas conexões gera impacto e transforma realidades.",
  },
];

const STATS = [
  { icon: Users, value: "+2.500", label: "Membros conectados" },
  { icon: Globe, value: "+90", label: "Clubes no Distrito LC-11" },
  { icon: HeartHandshake, value: "+1.000", label: "Projetos realizados" },
  { icon: ThumbsUp, value: "1", suffix: "Só propósito", label: "Servir e transformar vidas" },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "1. Cadastre-se",
    desc: "Crie sua conta informando seus dados de associado do Lions Clube.",
  },
  {
    icon: ClipboardCheck,
    title: "2. Aguarde a aprovação",
    desc: "A administração valida seu cadastro junto ao seu clube.",
  },
  {
    icon: Users,
    title: "3. Participe",
    desc: "Acesse o feed, os grupos, eventos e conecte-se com todo o Distrito.",
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
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={distritoLogo.url}
              alt="Lions Clubs International - Distrito LC-11"
              className="h-12 w-auto object-contain"
            />
            <span className="leading-tight">
              <span className="block font-display text-xl font-bold tracking-tight">
                <span className="text-primary">Lions</span> <span className="text-gold">Connecta</span>
              </span>
              <span className="block text-xs font-medium text-muted-foreground">Distrito LC-11</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((item, i) => (
              <a
                key={item.href}
                href={item.href}
                className={`text-sm font-semibold transition-colors ${
                  i === 0
                    ? "text-primary underline decoration-gold decoration-2 underline-offset-8"
                    : "text-primary/80 hover:text-gold"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              className="rounded-lg border-2 border-primary px-6 font-bold text-primary hover:bg-primary hover:text-primary-foreground"
            >
              <Link to="/login">Entrar</Link>
            </Button>
            <Button
              asChild
              className="rounded-lg bg-gold px-6 font-bold text-gold-foreground hover:bg-gold/90"
            >
              <Link to="/signup">Cadastre-se</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="inicio" className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            <span className="block text-primary">CONECTANDO</span>
            <span className="block text-primary">PESSOAS,</span>
            <span className="block text-gold">CONECTANDO</span>
            <span className="block text-gold">SOLIDARIEDADE.</span>
          </h1>
          <span className="mt-6 block h-1 w-14 rounded-full bg-gold" />
          <p className="mt-6 text-base leading-relaxed text-foreground/90 md:text-lg">
            Lions Connecta é a rede social exclusiva para os membros do Lions Clube Distrito LC-11.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
            Um espaço para compartilhar ideias, projetos, experiências e fortalecer os laços que
            transformam vidas todos os dias.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Button
              asChild
              size="lg"
              className="gap-2 rounded-xl bg-primary px-8 font-bold shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <Link to="/signup">
                <UserPlus className="h-5 w-5" /> Cadastre-se agora
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="gap-2 rounded-xl border-2 border-primary px-8 font-bold text-primary hover:bg-secondary"
            >
              <a href="#como-participar">Veja como funciona</a>
            </Button>
          </div>
        </div>

        {/* Colagem de fotos */}
        <div className="relative">
          <div className="absolute -right-4 -top-4 h-full w-full rounded-[2.5rem] bg-primary" aria-hidden />
          <div className="relative grid grid-cols-2 gap-4">
            <img
              src={heroVoluntarios}
              alt="Voluntários do Lions Clube conversando em evento comunitário"
              width={768}
              height={512}
              className="col-span-2 h-48 w-full rounded-3xl border-4 border-background object-cover shadow-xl md:h-56"
            />
            <img
              src={heroAbraco}
              alt="Duas voluntárias se abraçando em ação de serviço"
              width={768}
              height={640}
              loading="lazy"
              className="h-44 w-full rounded-3xl border-4 border-background object-cover shadow-xl md:h-52"
            />
            <div className="grid grid-rows-2 gap-4">
              <img
                src={heroMaos}
                alt="Mãos unidas em trabalho de equipe"
                width={640}
                height={448}
                loading="lazy"
                className="h-full w-full rounded-3xl border-4 border-background object-cover shadow-xl"
              />
              <img
                src={heroCrianca}
                alt="Voluntário idoso com criança em evento beneficente"
                width={640}
                height={448}
                loading="lazy"
                className="h-full w-full rounded-3xl border-4 border-background object-cover shadow-xl"
              />
            </div>
          </div>
          <div className="absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl border bg-card px-5 py-3 shadow-xl">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Globe className="h-5 w-5" />
            </span>
            <div className="text-sm font-bold leading-tight text-primary">
              Juntos somos mais fortes.
              <span className="block">Juntos, vamos mais longe.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Recursos / Benefícios */}
      <section id="recursos" className="mx-auto max-w-7xl scroll-mt-24 px-6 py-20">
        <div id="beneficios" className="scroll-mt-24 text-center">
          <h2 className="font-display text-3xl font-bold text-primary md:text-4xl">
            Um espaço feito para você, <span className="underline decoration-gold decoration-4 underline-offset-8">Leão</span>
          </h2>
          <p className="mt-3 text-muted-foreground">Conecte-se, colabore e faça a diferença.</p>
        </div>
        <div className="mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-6">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary shadow-sm transition-colors hover:bg-gold/20 hover:text-gold">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="font-display text-lg font-bold text-primary">{title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground md:text-sm">{desc}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Sobre / Estatísticas */}
      <section id="sobre" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-20">
        <div className="relative overflow-hidden rounded-[2rem] bg-primary px-8 py-12 shadow-xl">
          <div
            className="pointer-events-none absolute inset-0 opacity-10"
            style={{
              backgroundImage: "radial-gradient(circle at 85% 20%, var(--gold) 0, transparent 40%)",
            }}
            aria-hidden
          />
          <div className="relative grid grid-cols-2 gap-10 lg:grid-cols-4">
            {STATS.map(({ icon: Icon, value, suffix, label }) => (
              <div key={label} className="flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/10 text-gold">
                  <Icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-display text-3xl font-bold text-gold">
                    {value}
                    {suffix ? (
                      <span className="ml-1 text-base font-semibold text-primary-foreground">{suffix}</span>
                    ) : null}
                  </p>
                  <p className="text-xs font-medium text-primary-foreground/80">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Como participar */}
      <section id="como-participar" className="mx-auto max-w-7xl scroll-mt-24 px-6 pb-24">
        <div className="text-center">
          <h2 className="font-display text-3xl font-bold text-primary md:text-4xl">Como participar</h2>
          <p className="mt-3 text-muted-foreground">Três passos simples para fazer parte da rede.</p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, desc }) => (
            <article
              key={title}
              className="rounded-3xl border bg-card p-8 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/15 text-gold">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="font-display text-lg font-bold text-primary">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Button
            asChild
            size="lg"
            className="rounded-xl bg-primary px-10 font-bold shadow-lg transition-transform hover:-translate-y-0.5"
          >
            <Link to="/signup">Cadastre-se agora</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" className="border-t bg-secondary/50">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-12 md:flex-row">
          <div className="flex items-center gap-4">
            <img
              src={distritoLogo.url}
              alt="Lions Clubs International - Distrito LC-11"
              className="h-10 w-auto object-contain"
            />
            <div className="text-center md:text-left">
              <p className="font-bold text-primary">Lions Connecta • Distrito LC-11</p>
              <p className="text-xs font-medium text-muted-foreground">We Serve • Nós Servimos</p>
            </div>
          </div>
          <div className="flex gap-8">
            <Link to="/login" className="text-xs font-bold text-muted-foreground transition-colors hover:text-primary">
              Entrar
            </Link>
            <Link to="/signup" className="text-xs font-bold text-muted-foreground transition-colors hover:text-primary">
              Cadastre-se
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
