CREATE OR REPLACE FUNCTION public.current_access_level(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.has_role(_user_id, 'admin') THEN 'admin'
    WHEN public.has_role(_user_id, 'moderator') THEN 'moderator'
    WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status = 'approved') THEN 'approved'
    ELSE 'user'
  END
$function$;

CREATE OR REPLACE FUNCTION public.is_moderator(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'moderator')
$function$;

REVOKE ALL ON FUNCTION public.is_moderator(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_moderator(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_access_level(_user_id uuid, _level text, _reason text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _old text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    -- moderadores podem apenas aprovar ou reverter para usuário comum
    IF public.has_role(auth.uid(), 'moderator') AND _level IN ('user', 'approved') THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Sem permissão para alterar níveis de acesso';
    END IF;
  END IF;

  IF _level NOT IN ('user', 'approved', 'moderator', 'admin') THEN
    RAISE EXCEPTION 'Nível inválido: %', _level;
  END IF;
  IF _user_id = auth.uid() AND _level <> 'admin' AND public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador';
  END IF;

  _old := public.current_access_level(_user_id);

  IF _level = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'moderator';
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSIF _level = 'moderator' THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'moderator')
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSIF _level = 'approved' THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator');
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator');
    UPDATE public.profiles SET status = 'pending' WHERE id = _user_id;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.access_level_audit (target_user_id, changed_by, old_level, new_level, reason)
  VALUES (_user_id, auth.uid(), _old, _level, NULLIF(_reason, ''));

  RETURN _level;
END;
$function$;