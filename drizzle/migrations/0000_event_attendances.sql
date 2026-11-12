CREATE TABLE public.event_attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
CREATE TABLE public.event_companions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_id uuid NOT NULL REFERENCES public.event_attendances(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  age integer NOT NULL CHECK (age BETWEEN 0 AND 120),
  is_lion boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_attendances TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_companions TO authenticated;
GRANT ALL ON public.event_attendances TO service_role;
GRANT ALL ON public.event_companions TO service_role;
ALTER TABLE public.event_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_companions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "att read own or admin" ON public.event_attendances FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "att insert own" ON public.event_attendances FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_approved(auth.uid()));
CREATE POLICY "att delete own or admin" ON public.event_attendances FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "comp read" ON public.event_companions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_attendances a WHERE a.id = attendance_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));
CREATE POLICY "comp insert own" ON public.event_companions FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.event_attendances a WHERE a.id = attendance_id AND a.user_id = auth.uid()));
CREATE POLICY "comp delete own" ON public.event_companions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.event_attendances a WHERE a.id = attendance_id AND (a.user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))));