/**
 * Níveis de permissão do sistema.
 *
 * guest     – visitante sem sessão
 * user      – logado, mas com cadastro pendente/rejeitado
 * approved  – sócio com cadastro aprovado (acesso ao painel)
 * moderator – aprova cadastros e modera conteúdo
 * admin     – administrador (acesso total)
 */
export type AccessLevel = "guest" | "user" | "approved" | "moderator" | "admin";

export const LEVEL_RANK: Record<AccessLevel, number> = {
  guest: 0,
  user: 1,
  approved: 2,
  moderator: 3,
  admin: 4,
};

export const LEVEL_LABEL: Record<AccessLevel, string> = {
  guest: "Visitante",
  user: "Cadastro pendente",
  approved: "Sócio aprovado",
  moderator: "Moderador",
  admin: "Administrador",
};

export const LEVEL_DESCRIPTION: Record<AccessLevel, string> = {
  guest: "Sem sessão ativa.",
  user: "Aguardando aprovação do cadastro.",
  approved: "Acesso completo ao painel do sócio.",
  moderator: "Aprova cadastros e modera conteúdo, sem gestão total.",
  admin: "Acesso total, incluindo eleições, urna e criação de usuários.",
};

export function resolveLevel(opts: {
  hasUser: boolean;
  status?: "pending" | "approved" | "rejected" | null;
  isAdmin: boolean;
  isModerator?: boolean;
}): AccessLevel {
  if (!opts.hasUser) return "guest";
  if (opts.isAdmin) return "admin";
  if (opts.isModerator) return "moderator";
  if (opts.status === "approved") return "approved";
  return "user";
}

export function hasLevel(current: AccessLevel, required: AccessLevel) {
  return LEVEL_RANK[current] >= LEVEL_RANK[required];
}

/** Regra mínima de acesso por página sensível do painel. */
export const PAGE_ACCESS: Record<string, AccessLevel> = {
  "/admin": "moderator",
  "/kiosk": "admin",
  "/eleicoes-oficiais": "admin",
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
