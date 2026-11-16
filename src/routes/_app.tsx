import { createFileRoute, Link, Outlet, useNavigate, useLocation, useHydrated } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Menu as MenuIcon, Home, MessageCircle, Bell, Shield, LogOut, User as UserIcon, Users, Users2, Building2, Trophy, BookOpen, Calendar, Target, Landmark, Award, BadgeCheck, Globe, FileText, Vote, Monitor, Gavel } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import distritoLogo from "@/assets/distrito-lc11-logo.png.asset.json";
import { GovernadoresSidebar } from "@/components/GovernadoresSidebar";
import { RequireMenu } from "@/components/RequireMenu";
import { useAccess } from "@/lib/access-control";
import { needsOnboarding } from "@/lib/profile-completeness";
import { ProfileCompleteness } from "@/components/ProfileCompleteness";

export const Route = createFileRoute("/_app")({ component: AppLayout });

const MENU_ICONS: Record<string, typeof Home> = {
  Home, MessageCircle, Bell, Shield, UserIcon, Users, Users2, Building2, Trophy, BookOpen,
  Calendar, Target, Landmark, Award, BadgeCheck, Globe, FileText, Vote, Monitor, Gavel,
};

function initials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "L";
}

function AppLayout() {
  const hydrated = useHydrated();
  const { user, profile, isAdmin, isModerator, loading, signOut } = useAuth();
  const { can, visibleMenus } = useAccess();
  const nav = useNavigate();
  const loc = useLocation();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { setMenuOpen(false); }, [loc.pathname]);

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!user) {
      nav({ to: "/login", replace: true });
      return;
    }
    if (profile && needsOnboarding(profile)) {
      nav({ to: "/onboarding", replace: true });
      return;
    }
    if (profile?.status !== "approved") {
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
  if (!user || profile?.status !== "approved") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  const sidebarMenus = visibleMenus.filter((m) => m.sidebar);

  const navItems = [
    { to: "/feed", label: "Feed", icon: Home },
    { to: "/messages", label: "Mensagens", icon: MessageCircle },
    { to: "/notifications", label: "Notificações", icon: Bell, badge: unread },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-1">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label="Abrir menu"><MenuIcon className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-xs overflow-y-auto p-3">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <div className="mt-2 space-y-1">
                {sidebarMenus.map((m) => {
                  const Icon = MENU_ICONS[m.icon] ?? Home;
                  const active = loc.pathname.startsWith(m.path);
                  return (
                    <Link key={m.key} to={m.path as never} onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium ${active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"}`}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><Icon className="h-5 w-5" /></span>
                      {m.label}
                    </Link>
                  );
                })}
                {(isAdmin || isModerator || can("admin", "view")) && (
                  <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium hover:bg-muted">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><Shield className="h-5 w-5" /></span>Admin
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
          <Link to="/feed" className="flex min-w-0 items-center gap-2">
            <img src={distritoLogo.url} alt="Lions Clubs International - Distrito LC-11" className="h-8 w-auto shrink-0 object-contain sm:h-9" />
            <span className="truncate text-base font-bold tracking-tight sm:text-lg">Lions Connecta</span>
          </Link>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {navItems.map(({ to, label, icon: Icon, badge }) => {
              const active = loc.pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
            {(isAdmin || isModerator || can("admin", "view")) && (
              <Link to="/admin" className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${
                loc.pathname.startsWith("/admin") ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}>
                <Shield className="h-4 w-4" /> Admin
              </Link>
            )}
            {can("laurear", "view") && <Button asChild variant="ghost" size="sm" className="hidden xl:inline-flex"><Link to="/admin/laurear"><Award className="mr-2 h-4 w-4" />Laurear companheiros</Link></Button>}
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
                <span className="hidden max-w-[10rem] truncate text-sm font-medium xl:inline">{profile?.full_name}</span>
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
              {(isAdmin || isModerator) && (
                <DropdownMenuItem onClick={() => nav({ to: "/admin" })}>
                  <Shield className="mr-2 h-4 w-4" /> Painel admin
                </DropdownMenuItem>
              )}
              {can("laurear", "view") && <DropdownMenuItem onClick={() => nav({ to: "/admin/laurear" })}><Award className="mr-2 h-4 w-4" />Laurear companheiros</DropdownMenuItem>}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={async () => { await signOut(); nav({ to: "/" }); }}>
                <LogOut className="mr-2 h-4 w-4" /> Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile nav */}
        <nav className="flex items-center justify-around border-t lg:hidden">
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

      <div className={`mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:gap-6 sm:px-4 sm:py-6 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[260px_minmax(0,1fr)] ${loc.pathname.startsWith("/feed") ? "xl:grid-cols-[260px_minmax(0,1fr)_280px]" : ""}`}>
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
            <ProfileCompleteness profile={profile} userId={user.id} compact />
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
            {sidebarMenus.map((m) => {
              const Icon = MENU_ICONS[m.icon] ?? Home;
              const active = loc.pathname.startsWith(m.path);
              return (
                <Link
                  key={m.key}
                  to={m.path as never}
                  className={`flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium transition-colors ${
                    active ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted"
                  }`}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-5 w-5" />
                  </span>
                  {m.label}
                </Link>
              );
            })}
          </div>
        </aside>
        <main className="min-w-0">
          <RequireMenu pathname={loc.pathname}>
            <Outlet />
          </RequireMenu>
        </main>
        {loc.pathname.startsWith("/feed") && <div className="md:col-span-2 xl:col-span-1"><GovernadoresSidebar /></div>}
      </div>
    </div>
  );
}
