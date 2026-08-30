ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE public.user_activation_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  changed_by uuid,
  active boolean not null,
  reason text,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.user_activation_audit TO authenticated;
GRANT ALL ON public.user_activation_audit TO service_role;

ALTER TABLE public.user_activation_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read activation audit"
ON public.user_activation_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_user_activation_audit_target ON public.user_activation_audit(target_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'approved' AND is_active)
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_active(_user_id uuid, _active boolean, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem ativar ou desativar usuários';
  END IF;
  IF _user_id = auth.uid() AND NOT _active THEN
    RAISE EXCEPTION 'Você não pode desativar sua própria conta';
  END IF;

  UPDATE public.profiles SET is_active = _active WHERE id = _user_id;

  INSERT INTO public.user_activation_audit (target_user_id, changed_by, active, reason)
  VALUES (_user_id, auth.uid(), _active, NULLIF(_reason, ''));

  RETURN _active;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_user_active(uuid, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.account_is_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_active FROM public.profiles WHERE id = _user_id), true)
$$;

REVOKE ALL ON FUNCTION public.account_is_active(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.account_is_active(uuid) TO authenticated;