import { createFileRoute, Link, Outlet, useNavigate, useLocation, useHydrated } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, MessageCircle, Bell, Shield, LogOut, User as UserIcon, Users, Users2, Building2, Trophy, Calendar, Target, Landmark, Award, BadgeCheck, Globe, FileText } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import lionsLogo from "@/assets/lions-logo.jpg";
import { GovernadoresSidebar } from "@/components/GovernadoresSidebar";

export const Route = createFileRoute("/_app")({ component: AppLayout });

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "L";
}

function AppLayout() {
  const hydrated = useHydrated();
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!user) {
      nav({ to: "/login", replace: true });
      return;
    }
    if (profile && profile.status !== "approved") {
      nav({ to: "/pending", replace: true });
    }
  }, [hydrated, loading, nav, profile, user]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    };
    load();
    const channel = supabase
      .channel("notif-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  if (!hydrated || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  if (!user || (profile && profile.status !== "approved")) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  const navItems = [
    { to: "/feed", label: "Feed", icon: Home },
    { to: "/messages", label: "Mensagens", icon: MessageCircle },
    { to: "/notifications", label: "Notificações", icon: Bell, badge: unread },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/feed" className="flex items-center gap-2">
            <img src={lionsLogo} alt="Lions International" className="h-9 w-9 object-contain" />
            <span className="text-lg font-bold tracking-tight">Lions Connect</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon, badge }) => {
              const active = loc.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                  {badge ? (
                    <Badge className="ml-1 h-5 min-w-5 bg-accent px-1.5 text-accent-foreground">{badge}</Badge>
                  ) : null}
                </Link>
              );
            })}
            {isAdmin && (
              <Link to="/admin" className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                loc.pathname.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
                <Shield className="h-4 w-4" /> Admin
              </Link>
            )}
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 px-2">
                <Avatar className="h-8 w-8 ring-2 ring-gold/40">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {initials(profile?.full_name ?? "L")}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden text-sm font-medium md:inline">{profile?.full_name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="font-semibold">{profile?.full_name}</div>
                <div className="text-xs font-normal text-muted-foreground">{profile?.club_name || "Lions Clube"}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => nav({ to: "/profile/$id", params: { id: user.id } })}>
                <UserIcon className="mr-2 h-4 w-4" /> Meu perfil
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => nav({ to: "/admin" })}>
                  <Shield className="mr-2 h-4 w-4" /> Painel admin
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); nav({ to: "/" }); }}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center justify-around border-t md:hidden">
          {navItems.map(({ to, icon: Icon, badge }) => {
            const active = loc.pathname.startsWith(to);
            return (
              <Link key={to} to={to} className={`relative flex flex-1 items-center justify-center py-3 ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" />
                {badge ? <Badge className="absolute right-6 top-1 h-4 min-w-4 bg-accent px-1 text-[10px] text-accent-foreground">{badge}</Badge> : null}
              </Link>
            );
          })}
        </nav>
      </header>

      <div className={`mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[260px_minmax(0,1fr)] ${loc.pathname.startsWith("/feed") ? "lg:grid-cols-[260px_minmax(0,1fr)_280px]" : ""}`}>
        <aside className="hidden md:block">
          <div className="sticky top-24 space-y-1 rounded-xl border bg-card p-3 shadow-sm">
            <Link
              to="/profile/$id"
              params={{ id: user.id }}
              className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted"
            >
              <Avatar className="h-10 w-10 ring-2 ring-gold/40">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials(profile?.full_name ?? "L")}
                </AvatarFallback>
              </Avatar>
              <span className="truncate text-sm font-semibold">{profile?.full_name}</span>
            </Link>
            <div className="my-1 border-t" />
            {profile?.club_name && (
              <div className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium text-foreground">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/30 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Meu Clube</div>
                  <div className="truncate">{profile.club_name}</div>
                </div>
              </div>
            )}
            <Link
              to="/ranking"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/ranking") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Trophy className="h-5 w-5" />
              </span>
              Ranking
            </Link>
            <Link
              to="/friends"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/friends") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Users className="h-5 w-5" />
              </span>
              Amigos
            </Link>
            <Link
              to="/groups"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/groups") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Users2 className="h-5 w-5" />
              </span>
              Grupos
            </Link>
            <Link
              to="/events"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/events") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Calendar className="h-5 w-5" />
              </span>
              Eventos
            </Link>
            <Link
              to="/missions"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/missions") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Target className="h-5 w-5" />
              </span>
              Missões
            </Link>
            <Link
              to="/clubs"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/clubs") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Landmark className="h-5 w-5" />
              </span>
              Clubes
            </Link>
            <Link
              to="/district-roles"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/district-roles") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Award className="h-5 w-5" />
              </span>
              Cargos no Distrito
            </Link>
            <Link
              to="/club-roles"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/club-roles") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <BadgeCheck className="h-5 w-5" />
              </span>
              Cargos no Clube
            </Link>
            <Link
              to="/distrito"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/distrito") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Globe className="h-5 w-5" />
              </span>
              Distrito LC-11
            </Link>
            <Link
              to="/documents"
              className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                loc.pathname.startsWith("/documents") ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <FileText className="h-5 w-5" />
              </span>
              Documentos
            </Link>
          </div>
        </aside>
        <main className="min-w-0">
          <Outlet />
        </main>
        {loc.pathname.startsWith("/feed") && <GovernadoresSidebar />}
      </div>
    </div>
  );
}
