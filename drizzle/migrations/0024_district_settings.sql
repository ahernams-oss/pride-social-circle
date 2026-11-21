CREATE TABLE public.district_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.district_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.district_settings TO authenticated;
GRANT ALL ON public.district_settings TO service_role;

ALTER TABLE public.district_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read district settings"
  ON public.district_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert district settings"
  ON public.district_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update district settings"
  ON public.district_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete district settings"
  ON public.district_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));