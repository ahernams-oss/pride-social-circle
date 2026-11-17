DROP POLICY IF EXISTS "super_admins_read" ON public.super_admins;
CREATE POLICY "super_admins_read" ON public.super_admins FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));