ALTER TABLE public.member_lions_awards ADD COLUMN updated_by uuid, ADD COLUMN updated_at timestamptz;
GRANT UPDATE ON public.member_lions_awards TO authenticated;
CREATE POLICY awards_edit ON public.member_lions_awards FOR UPDATE TO authenticated
USING (public.is_approved(auth.uid()) AND (public.has_role(auth.uid(), 'admin') OR (public.can_menu(auth.uid(), 'laurear', 'view') AND public.can_menu(auth.uid(), 'laurear', 'edit'))))
WITH CHECK (public.is_approved(auth.uid()) AND public.is_approved(user_id) AND (public.has_role(auth.uid(), 'admin') OR (public.can_menu(auth.uid(), 'laurear', 'view') AND public.can_menu(auth.uid(), 'laurear', 'edit'))));
CREATE FUNCTION public.tg_lions_award_edit() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 NEW.id := OLD.id;
 NEW.granted_by := OLD.granted_by;
 NEW.created_at := OLD.created_at;
 NEW.updated_by := auth.uid();
 NEW.updated_at := now();
 RETURN NEW;
END;
$$;
CREATE TRIGGER lions_award_edit BEFORE UPDATE ON public.member_lions_awards FOR EACH ROW EXECUTE FUNCTION public.tg_lions_award_edit();