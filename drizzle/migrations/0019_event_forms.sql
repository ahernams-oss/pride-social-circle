CREATE TABLE public.event_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.event_form_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.event_forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (form_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_forms TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.event_form_responses TO authenticated;
GRANT ALL ON public.event_forms, public.event_form_responses TO service_role;
ALTER TABLE public.event_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_form_responses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_manage_event(_event_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user,'admin') OR EXISTS (SELECT 1 FROM public.events WHERE id=_event_id AND created_by=_user)
$$;
CREATE OR REPLACE FUNCTION public.can_manage_event_form(_form_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_forms f WHERE f.id=_form_id AND public.can_manage_event(f.event_id,_user))
$$;

CREATE POLICY "forms read" ON public.event_forms FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.can_manage_event(event_id, auth.uid()));
CREATE POLICY "forms insert" ON public.event_forms FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.can_manage_event(event_id, auth.uid()));
CREATE POLICY "forms update" ON public.event_forms FOR UPDATE TO authenticated
  USING (public.can_manage_event(event_id, auth.uid())) WITH CHECK (public.can_manage_event(event_id, auth.uid()));
CREATE POLICY "forms delete" ON public.event_forms FOR DELETE TO authenticated
  USING (public.can_manage_event(event_id, auth.uid()));

CREATE POLICY "responses read" ON public.event_form_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_event_form(form_id, auth.uid()));
CREATE POLICY "responses insert" ON public.event_form_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_approved(auth.uid()));
CREATE POLICY "responses delete" ON public.event_form_responses FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.can_manage_event_form(form_id, auth.uid()));

CREATE TRIGGER event_forms_updated_at BEFORE UPDATE ON public.event_forms
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();