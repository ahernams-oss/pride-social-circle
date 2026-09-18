ALTER TABLE public.mission_completions
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

UPDATE public.mission_completions SET status = 'approved' WHERE status = 'pending';

ALTER TABLE public.mission_completions
  ADD CONSTRAINT mission_completions_status_check CHECK (status IN ('pending','approved','rejected'));

CREATE OR REPLACE FUNCTION public.can_menu(_user_id uuid, _menu text, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _level text;
  _ok boolean;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;
  IF public.has_role(_user_id, 'admin') THEN RETURN true; END IF;

  SELECT p.access_level INTO _level FROM public.profiles p WHERE p.id = _user_id;
  IF _level IS NULL THEN RETURN false; END IF;

  SELECT CASE _action
    WHEN 'view' THEN alp.can_view
    WHEN 'create' THEN alp.can_create
    WHEN 'edit' THEN alp.can_edit
    WHEN 'delete' THEN alp.can_delete
    WHEN 'approve' THEN alp.can_approve
    ELSE false END
  INTO _ok
  FROM public.access_level_permissions alp
  WHERE alp.level_key = _level AND alp.menu_key = _menu;

  RETURN COALESCE(_ok, false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_menu(uuid, text, text) TO authenticated;

DROP POLICY IF EXISTS mc_select_own ON public.mission_completions;
CREATE POLICY mc_select_own ON public.mission_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.can_menu(auth.uid(), 'missions', 'approve'));

DROP POLICY IF EXISTS mc_delete_self ON public.mission_completions;
CREATE POLICY mc_delete_self ON public.mission_completions
  FOR DELETE TO authenticated
  USING ((auth.uid() = user_id AND status = 'pending') OR public.can_menu(auth.uid(), 'missions', 'approve'));

DROP POLICY IF EXISTS mc_update_reviewer ON public.mission_completions;
CREATE POLICY mc_update_reviewer ON public.mission_completions
  FOR UPDATE TO authenticated
  USING (public.can_menu(auth.uid(), 'missions', 'approve'))
  WITH CHECK (public.can_menu(auth.uid(), 'missions', 'approve'));
