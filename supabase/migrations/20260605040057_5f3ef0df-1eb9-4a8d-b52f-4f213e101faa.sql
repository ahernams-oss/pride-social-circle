
CREATE TABLE public.district_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.district_roles TO authenticated;
GRANT ALL ON public.district_roles TO service_role;

ALTER TABLE public.district_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "district_roles_select_all" ON public.district_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "district_roles_insert_admin" ON public.district_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "district_roles_update_admin" ON public.district_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "district_roles_delete_admin" ON public.district_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_district_roles_updated_at BEFORE UPDATE ON public.district_roles FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role_in_district TEXT NOT NULL DEFAULT '';
