ALTER TABLE public.district_roles
  ADD COLUMN IF NOT EXISTS assigned_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_district_roles_assigned_user ON public.district_roles(assigned_user_id);