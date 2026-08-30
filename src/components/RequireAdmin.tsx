import type { ReactNode } from "react";
import { RequireAccess } from "@/components/RequireAccess";

/**
 * Atalho para páginas administrativas: exige sessão, cadastro aprovado
 * e papel de administrador.
 */
export function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAccess level="admin" fallbackMessage="Acesso restrito a administradores.">
      {children}
    </RequireAccess>
  );
}
