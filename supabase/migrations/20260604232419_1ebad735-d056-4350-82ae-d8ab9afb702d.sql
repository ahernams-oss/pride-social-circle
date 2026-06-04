CREATE TABLE public.missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  points INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.missions TO authenticated;
GRANT ALL ON public.missions TO service_role;
ALTER TABLE public.missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "missions_select_all" ON public.missions FOR SELECT TO authenticated USING (true);
CREATE POLICY "missions_insert_own" ON public.missions FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "missions_update_own_or_admin" ON public.missions FOR UPDATE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "missions_delete_own_or_admin" ON public.missions FOR DELETE TO authenticated USING (auth.uid() = created_by OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.mission_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mission_id UUID NOT NULL REFERENCES public.missions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (mission_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.mission_completions TO authenticated;
GRANT ALL ON public.mission_completions TO service_role;
ALTER TABLE public.mission_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mc_select_all" ON public.mission_completions FOR SELECT TO authenticated USING (true);
CREATE POLICY "mc_insert_self" ON public.mission_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "mc_delete_self" ON public.mission_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);