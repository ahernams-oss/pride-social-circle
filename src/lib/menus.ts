import type { AccessLevel } from "@/lib/permissions";

/** Ações controláveis por menu/módulo. */
export const ACTIONS = ["view", "create", "edit", "delete", "approve"] as const;
export type AccessAction = (typeof ACTIONS)[number];

export const ACTION_LABEL: Record<AccessAction, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  approve: "Aprovar",
};

export const ACTION_COLUMN: Record<AccessAction, "can_view" | "can_create" | "can_edit" | "can_delete" | "can_approve"> = {
  view: "can_view",
  create: "can_create",
  edit: "can_edit",
  delete: "can_delete",
  approve: "can_approve",
};

export type MenuDef = {
  key: string;
  label: string;
  path: string;
  /** Ícone (nome usado no mapa de ícones do layout). */
  icon: string;
  /** Aparece na barra lateral do painel. */
  sidebar: boolean;
  /** Nível mínimo herdado (fallback quando não há matriz configurada). */
  minLevel: AccessLevel;
};

export const MENUS: MenuDef[] = [
  { key: "feed", label: "Feed", path: "/feed", icon: "Home", sidebar: false, minLevel: "approved" },
  { key: "messages", label: "Mensagens", path: "/messages", icon: "MessageCircle", sidebar: false, minLevel: "approved" },
  { key: "notifications", label: "Notificações", path: "/notifications", icon: "Bell", sidebar: false, minLevel: "approved" },
  { key: "profile", label: "Perfil", path: "/profile", icon: "UserIcon", sidebar: false, minLevel: "approved" },
  { key: "ranking", label: "Ranking", path: "/ranking", icon: "Trophy", sidebar: true, minLevel: "approved" },
  { key: "friends", label: "Amigos", path: "/friends", icon: "Users", sidebar: true, minLevel: "approved" },
  { key: "groups", label: "Grupos", path: "/groups", icon: "Users2", sidebar: true, minLevel: "approved" },
  { key: "events", label: "Eventos", path: "/events", icon: "Calendar", sidebar: true, minLevel: "approved" },
  { key: "missions", label: "Missões", path: "/missions", icon: "Target", sidebar: true, minLevel: "approved" },
  { key: "clubs", label: "Clubes", path: "/clubs", icon: "Landmark", sidebar: true, minLevel: "approved" },
  { key: "district-roles", label: "Cargos no Distrito", path: "/district-roles", icon: "Award", sidebar: true, minLevel: "approved" },
  { key: "club-roles", label: "Cargos no Clube", path: "/club-roles", icon: "BadgeCheck", sidebar: true, minLevel: "approved" },
  { key: "distrito", label: "Distrito LC-11", path: "/distrito", icon: "Globe", sidebar: true, minLevel: "approved" },
  { key: "documents", label: "Documentos", path: "/documents", icon: "FileText", sidebar: true, minLevel: "approved" },
  { key: "elections", label: "Votações", path: "/elections", icon: "Vote", sidebar: true, minLevel: "approved" },
  { key: "kiosk", label: "Urna Eletrônica", path: "/kiosk", icon: "Monitor", sidebar: true, minLevel: "admin" },
  { key: "eleicoes-oficiais", label: "Eleições Oficiais", path: "/eleicoes-oficiais", icon: "Gavel", sidebar: true, minLevel: "admin" },
  { key: "votar-eleicao", label: "Votar (delegado)", path: "/votar-eleicao", icon: "Vote", sidebar: true, minLevel: "approved" },
  { key: "admin", label: "Painel administrativo", path: "/admin", icon: "Shield", sidebar: false, minLevel: "moderator" },
];

export const MENU_BY_KEY = new Map(MENUS.map((m) => [m.key, m]));

/** Descobre a qual menu uma rota pertence. */
export function menuKeyFor(pathname: string): string | null {
  const match = MENUS.filter((m) => pathname === m.path || pathname.startsWith(`${m.path}/`)).sort(
    (a, b) => b.path.length - a.path.length,
  )[0];
  return match?.key ?? null;
}
