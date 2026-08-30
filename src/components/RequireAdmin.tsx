import { useEffect, type ReactNode } from "react";
import { useNavigate, useHydrated } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { ShieldAlert } from "lucide-react";

/**
 * Bloqueia o acesso a páginas administrativas mesmo quando a URL é digitada
 * manualmente: exige sessão, perfil aprovado e papel de administrador.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const { user, profile, isAdmin, loading } = useAuth();
  const nav = useNavigate();

  const approved = profile?.status === "approved";

  useEffect(() => {
    if (!hydrated || loading) return;
    if (!user) {
      nav({ to: "/login", replace: true });
      return;
    }
    if (!approved) {
      nav({ to: "/pending", replace: true });
      return;
    }
    if (!isAdmin) {
      nav({ to: "/feed", replace: true });
    }
  }, [hydrated, loading, user, approved, isAdmin, nav]);

  if (!hydrated || loading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Verificando permissões...</p>;
  }

  if (!user || !approved || !isAdmin) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-12 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Acesso restrito a administradores.</p>
      </div>
    );
  }

  return <>{children}</>;
}
