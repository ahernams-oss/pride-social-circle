import { useEffect, type ReactNode } from "react";
import { useNavigate, useHydrated } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { hasLevel, LEVEL_LABEL, type AccessLevel } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";

/**
 * Guard genérico por nível de permissão. Bloqueia o acesso mesmo quando a URL
 * é digitada manualmente, redirecionando conforme o nível atual do usuário.
 */
export function RequireAccess({
  level,
  children,
  fallbackMessage,
}: {
  level: AccessLevel;
  children: ReactNode;
  fallbackMessage?: string;
}) {
  const hydrated = useHydrated();
  const { level: current, loading } = useAuth();
  const nav = useNavigate();
  const allowed = hasLevel(current, level);

  useEffect(() => {
    if (!hydrated || loading || allowed) return;
    if (current === "guest") {
      nav({ to: "/login", replace: true });
      return;
    }
    if (current === "user") {
      nav({ to: "/pending", replace: true });
      return;
    }
    nav({ to: "/feed", replace: true });
  }, [hydrated, loading, allowed, current, nav]);

  if (!hydrated || loading) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Verificando permissões...</p>;
  }

  if (!allowed) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border bg-card p-12 text-center">
        <ShieldAlert className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {fallbackMessage ?? `Acesso restrito: nível ${LEVEL_LABEL[level]} necessário.`}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
