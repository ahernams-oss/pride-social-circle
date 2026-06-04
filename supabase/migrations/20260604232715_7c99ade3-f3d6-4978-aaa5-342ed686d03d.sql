DROP POLICY IF EXISTS "missions_insert_own" ON public.missions;
DROP POLICY IF EXISTS "missions_update_own_or_admin" ON public.missions;
DROP POLICY IF EXISTS "missions_delete_own_or_admin" ON public.missions;

CREATE POLICY "missions_insert_admin_only" ON public.missions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "missions_update_admin_only" ON public.missions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "missions_delete_admin_only" ON public.missions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));