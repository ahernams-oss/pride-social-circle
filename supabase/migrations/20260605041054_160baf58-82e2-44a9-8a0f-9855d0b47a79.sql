CREATE TABLE public.user_role_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('club','district')),
  role_name TEXT NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_role_history TO authenticated;
GRANT ALL ON public.user_role_history TO service_role;
ALTER TABLE public.user_role_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View history" ON public.user_role_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner or admin insert" ON public.user_role_history FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin update" ON public.user_role_history FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin')) WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner or admin delete" ON public.user_role_history FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.user_role_history FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
CREATE INDEX idx_user_role_history_user ON public.user_role_history(user_id);