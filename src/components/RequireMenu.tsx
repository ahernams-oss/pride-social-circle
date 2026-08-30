import { useEffect, type ReactNode } from "react";
import { useNavigate, useHydrated } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useAccess } from "@/lib/access-control";
import { menuKeyFor, MENU_BY_KEY } from "@/lib/menus";
import { ShieldAlert } from "lucide-react";

/**
 * Guard baseado na matriz de permissões (nível × menu). Bloqueia o acesso
 * mesmo quando a URL é digitada manualmente.
 */
export function RequireMenu({ pathname, children }: { pathname: string; children: ReactNode }) {
  const hydrated = useHydrated();
  const { level, loading } = useAuth();
  const { can, loading: loadingAccess } = useAccess();
  const nav = useNavigate();

  const menuKey = menuKeyFor(pathname);
  const busy = !hydrated || loading || loadingAccess;
  const allowed = !menuKey || can(menuKey, "view");

  useEffect(() => {
    if (busy || allowed) return;
    if (level === "guest") {
      nav({ to: "/login", replace: true });
      return;
    }
    if (level === "user") {
      nav({ to: "/pending", replace: true });
      return;
    }
    if (menuKey !== "feed") nav({ to: "/feed", replace: true });
  }, [busy, allowed, level, menuKey, nav]);

  if (busy) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Verificando permissões...</p>;
  }

  if (!allowed) {
    const label = menuKey ? MENU_BY_KEY.get(menuKey)?.label ?? menuKey : "";
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-12 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Seu nível de acesso não permite abrir <strong>{label}</strong>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
