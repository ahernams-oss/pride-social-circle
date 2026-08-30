/**
 * Níveis de permissão do sistema.
 *
 * guest    – visitante sem sessão
 * user     – logado, mas com cadastro pendente/rejeitado
 * approved – sócio com cadastro aprovado (acesso ao painel)
 * admin    – administrador (acesso total)
 */
export type AccessLevel = "guest" | "user" | "approved" | "admin";

export const LEVEL_RANK: Record<AccessLevel, number> = {
  guest: 0,
  user: 1,
  approved: 2,
  admin: 3,
};

export const LEVEL_LABEL: Record<AccessLevel, string> = {
  guest: "Visitante",
  user: "Cadastro pendente",
  approved: "Sócio aprovado",
  admin: "Administrador",
};

export function resolveLevel(opts: {
  hasUser: boolean;
  status?: "pending" | "approved" | "rejected" | null;
  isAdmin: boolean;
}): AccessLevel {
  if (!opts.hasUser) return "guest";
  if (opts.isAdmin) return "admin";
  if (opts.status === "approved") return "approved";
  return "user";
}

export function hasLevel(current: AccessLevel, required: AccessLevel) {
  return LEVEL_RANK[current] >= LEVEL_RANK[required];
}

/** Regra mínima de acesso por página sensível do painel. */
export const PAGE_ACCESS: Record<string, AccessLevel> = {
  "/admin": "admin",
  "/kiosk": "admin",
  "/eleicoes-oficiais": "approved",
  "/elections": "approved",
  "/votar-eleicao": "approved",
  "/documents": "approved",
  "/district-roles": "approved",
  "/club-roles": "approved",
  "/clubs": "approved",
  "/missions": "approved",
  "/feed": "approved",
};

/** Nível exigido para ações de escrita/gestão em páginas de cadastro. */
export const MANAGE_ACCESS: AccessLevel = "admin";

export function requiredLevelFor(pathname: string): AccessLevel {
  const match = Object.keys(PAGE_ACCESS)
    .filter((p) => pathname === p || pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_ACCESS[match]! : "approved";
}
