DROP POLICY "auth view vf_candidaturas" ON public.vf_candidaturas;
CREATE POLICY "auth view vf_candidaturas" ON public.vf_candidaturas FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY "auth view vf_eleicoes" ON public.vf_eleicoes;
CREATE POLICY "auth view vf_eleicoes" ON public.vf_eleicoes FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY "auth view vf_comissao" ON public.vf_comissao;
CREATE POLICY "auth view vf_comissao" ON public.vf_comissao FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY "district_roles_select_all" ON public.district_roles;
CREATE POLICY "district_roles_select_all" ON public.district_roles FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY "club_roles_select_all" ON public.club_roles;
CREATE POLICY "club_roles_select_all" ON public.club_roles FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY "View history" ON public.user_role_history;
CREATE POLICY "View history" ON public.user_role_history FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
DROP POLICY "Autenticados leem niveis" ON public.access_levels;
CREATE POLICY "Autenticados leem niveis" ON public.access_levels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.is_approved(auth.uid())
         OR key = (SELECT p.access_level FROM public.profiles p WHERE p.id = auth.uid()));
DROP POLICY "Autenticados leem permissoes" ON public.access_level_permissions;
CREATE POLICY "Autenticados leem permissoes" ON public.access_level_permissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin')
         OR level_key = (SELECT p.access_level FROM public.profiles p WHERE p.id = auth.uid()));