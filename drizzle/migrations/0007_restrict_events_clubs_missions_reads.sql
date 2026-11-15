ALTER POLICY events_select ON public.events TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

ALTER POLICY clubs_select_authenticated ON public.clubs TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));

ALTER POLICY missions_select_all ON public.missions TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(), 'admin'));