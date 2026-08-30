import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { hasLevel, resolveLevel, type AccessLevel } from "@/lib/permissions";

export type Profile = {
  id: string;
  full_name: string;
  bio: string;
  avatar_url: string | null;
  cover_url: string | null;
  club_name: string;
  city: string;
  role_in_club: string;
  role_in_district: string;
  status: "pending" | "approved" | "rejected";
  is_active: boolean;
  onboarding_done: boolean;
  cpf: string | null;
  lion_number: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  bairro: string | null;
  estado: string | null;
};

type AuthCtx = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isModerator: boolean;
  isApproved: boolean;
  level: AccessLevel;
  can: (required: AccessLevel) => boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadExtras = async (uid: string) => {
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    // Conta desativada pelo administrador: encerra a sessão imediatamente
    if (p && (p as Profile).is_active === false) {
      setProfile(null);
      setIsAdmin(false);
      setIsModerator(false);
      toast.error("Sua conta está desativada. Fale com um administrador.");
      await supabase.auth.signOut();
      return;
    }
    setProfile((p as Profile) ?? null);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    setIsModerator(!!roles?.some((r) => r.role === "moderator"));
  };


  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setLoading(true);
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadExtras(s.user.id).finally(() => setLoading(false)), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsModerator(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) loadExtras(data.session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const refresh = async () => {
    if (user) await loadExtras(user.id);
  };
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const level = resolveLevel({ hasUser: !!user, status: profile?.status ?? null, isAdmin, isModerator });
  const can = (required: AccessLevel) => hasLevel(level, required);

  return (
    <Ctx.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        isModerator,
        isApproved: profile?.status === "approved",
        level,
        can,
        loading,
        refresh,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}
