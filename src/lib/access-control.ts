import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { hasLevel, type AccessLevel } from "@/lib/permissions";
import { ACTION_COLUMN, MENU_BY_KEY, MENUS, type AccessAction } from "@/lib/menus";

export type LevelRow = {
  key: string;
  label: string;
  description: string;
  base_level: AccessLevel extends never ? never : "user" | "approved" | "moderator" | "admin";
  rank: number;
  is_builtin: boolean;
};

export type PermRow = {
  id: string;
  level_key: string;
  menu_key: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_approve: boolean;
};

type Matrix = { levels: LevelRow[]; perms: PermRow[] };

let cache: Matrix | null = null;
let inflight: Promise<Matrix> | null = null;
const listeners = new Set<(m: Matrix) => void>();

async function fetchMatrix(): Promise<Matrix> {
  const [{ data: levels }, { data: perms }] = await Promise.all([
    supabase.from("access_levels").select("*").order("rank"),
    supabase.from("access_level_permissions").select("*"),
  ]);
  const m: Matrix = { levels: (levels ?? []) as LevelRow[], perms: (perms ?? []) as PermRow[] };
  cache = m;
  listeners.forEach((l) => l(m));
  return m;
}

export function invalidateAccessMatrix() {
  cache = null;
  inflight = null;
  return fetchMatrix();
}

/** Carrega (com cache em memória) a matriz de níveis e permissões. */
export function useAccessMatrix() {
  const [matrix, setMatrix] = useState<Matrix | null>(cache);
  const [loading, setLoading] = useState(!cache);

  useEffect(() => {
    listeners.add(setMatrix);
    if (!cache) {
      setLoading(true);
      inflight = inflight ?? fetchMatrix();
      inflight.then(() => setLoading(false)).catch(() => setLoading(false));
    }
    return () => {
      listeners.delete(setMatrix);
    };
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await invalidateAccessMatrix();
    setLoading(false);
  }, []);

  return {
    levels: matrix?.levels ?? [],
    perms: matrix?.perms ?? [],
    loading,
    reload,
  };
}

export function permissionFor(perms: PermRow[], levelKey: string, menuKey: string) {
  return perms.find((p) => p.level_key === levelKey && p.menu_key === menuKey) ?? null;
}

/** Permissões efetivas do usuário logado. */
export function useAccess() {
  const { level, profile } = useAuth();
  const { levels, perms, loading } = useAccessMatrix();

  const levelKey = profile?.access_level && levels.some((l) => l.key === profile.access_level)
    ? profile.access_level
    : level;

  const baseLevel: AccessLevel =
    (levels.find((l) => l.key === levelKey)?.base_level as AccessLevel | undefined) ?? level;

  const can = (menuKey: string, action: AccessAction = "view") => {
    if (baseLevel === "admin") return true;
    const row = permissionFor(perms, levelKey, menuKey);
    if (row) return !!row[ACTION_COLUMN[action]];
    // Sem matriz configurada: cai no nível mínimo declarado do menu
    const menu = MENU_BY_KEY.get(menuKey);
    if (!menu) return hasLevel(baseLevel, "admin");
    return action === "view" ? hasLevel(baseLevel, menu.minLevel) : hasLevel(baseLevel, "moderator");
  };

  const visibleMenus = MENUS.filter((m) => can(m.key, "view"));

  return { levelKey, baseLevel, can, visibleMenus, loading };
}
