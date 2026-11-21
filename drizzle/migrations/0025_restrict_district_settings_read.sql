DROP POLICY IF EXISTS "Authenticated users can read district settings" ON public.district_settings;

CREATE POLICY "Approved members can read district settings"
  ON public.district_settings FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));