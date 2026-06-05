
CREATE TABLE public.club_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.club_roles TO authenticated;
GRANT ALL ON public.club_roles TO service_role;

ALTER TABLE public.club_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "club_roles_select_all" ON public.club_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "club_roles_insert_admin" ON public.club_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "club_roles_update_admin" ON public.club_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "club_roles_delete_admin" ON public.club_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_club_roles_updated_at BEFORE UPDATE ON public.club_roles FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
