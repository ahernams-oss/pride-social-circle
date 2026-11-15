CREATE TABLE public.member_lions_awards (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.profiles(id),
 category text NOT NULL,
 title text NOT NULL,
 institution text NOT NULL DEFAULT '',
 awarded_on date NOT NULL,
 description text NOT NULL DEFAULT '',
 document_url text,
 granted_by uuid NOT NULL DEFAULT auth.uid(),
 created_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT member_lions_awards_category CHECK (category IN ('curso', 'certificado', 'titulo')),
 CONSTRAINT member_lions_awards_title CHECK (length(btrim(title)) > 0)
);
GRANT SELECT, INSERT ON public.member_lions_awards TO authenticated;
GRANT ALL ON public.member_lions_awards TO service_role;
ALTER TABLE public.member_lions_awards ENABLE ROW LEVEL SECURITY;
CREATE POLICY awards_read ON public.member_lions_awards FOR SELECT TO authenticated USING (
 public.is_approved(auth.uid()) AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.can_menu(auth.uid(), 'laurear', 'view'))
);
CREATE POLICY awards_grant ON public.member_lions_awards FOR INSERT TO authenticated WITH CHECK (
 granted_by = auth.uid() AND public.is_approved(auth.uid()) AND public.is_approved(user_id)
 AND (public.has_role(auth.uid(), 'admin') OR (public.can_menu(auth.uid(), 'laurear', 'view') AND public.can_menu(auth.uid(), 'laurear', 'create')))
);
CREATE INDEX member_lions_awards_user_category ON public.member_lions_awards(user_id, category, awarded_on DESC);