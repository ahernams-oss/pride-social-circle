CREATE TABLE public.access_level_audit (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null,
  changed_by uuid,
  old_level text not null,
  new_level text not null,
  reason text,
  created_at timestamptz not null default now()
);

GRANT SELECT ON public.access_level_audit TO authenticated;
GRANT ALL ON public.access_level_audit TO service_role;

ALTER TABLE public.access_level_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit"
ON public.access_level_audit FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_access_level_audit_target ON public.access_level_audit(target_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.current_access_level(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status = 'approved') THEN 'approved'
    ELSE 'user'
  END
$$;

CREATE OR REPLACE FUNCTION public.admin_set_access_level(_user_id uuid, _level text, _reason text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _old text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem alterar níveis de acesso';
  END IF;
  IF _level NOT IN ('user', 'approved', 'admin') THEN
    RAISE EXCEPTION 'Nível inválido: %', _level;
  END IF;
  IF _user_id = auth.uid() AND _level <> 'admin' THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador';
  END IF;

  _old := public.current_access_level(_user_id);

  IF _level = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSIF _level = 'approved' THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
    UPDATE public.profiles SET status = 'pending' WHERE id = _user_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.access_level_audit (target_user_id, changed_by, old_level, new_level, reason)
  VALUES (_user_id, auth.uid(), _old, _level, NULLIF(_reason, ''));

  RETURN _level;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_access_level(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_access_level(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_access_level(uuid) TO authenticated;