CREATE TABLE public.super_admins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY super_admins_read ON public.super_admins FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.admin_set_access_level(_user_id uuid, _level text, _reason text DEFAULT NULL::text)
 RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _old text;
  _base text;
BEGIN
  IF public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'O nível de um Super Administrador não pode ser alterado';
  END IF;

  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF public.has_role(auth.uid(), 'moderator') AND _level IN ('user', 'approved') THEN
      NULL;
    ELSE
      RAISE EXCEPTION 'Sem permissão para alterar níveis de acesso';
    END IF;
  END IF;

  SELECT base_level INTO _base FROM public.access_levels WHERE key = _level;
  IF _base IS NULL THEN
    IF _level IN ('user','approved','moderator','admin') THEN
      _base := _level;
    ELSE
      RAISE EXCEPTION 'Nível inválido: %', _level;
    END IF;
  END IF;

  IF _user_id = auth.uid() AND _base <> 'admin' AND public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador';
  END IF;

  _old := public.current_access_level(_user_id);

  IF _base = 'admin' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'moderator';
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSIF _base = 'moderator' THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'moderator') ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSIF _base = 'approved' THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator');
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator');
    UPDATE public.profiles SET status = 'pending' WHERE id = _user_id;
  END IF;

  UPDATE public.profiles SET access_level = _level WHERE id = _user_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'member') ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.access_level_audit (target_user_id, changed_by, old_level, new_level, reason)
  VALUES (_user_id, auth.uid(), _old, _level, NULLIF(_reason, ''));
  RETURN _level;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_set_user_active(_user_id uuid, _active boolean, _reason text DEFAULT NULL::text)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem ativar ou desativar usuários';
  END IF;
  IF public.is_super_admin(_user_id) AND NOT _active THEN
    RAISE EXCEPTION 'Um Super Administrador não pode ser desativado';
  END IF;
  IF _user_id = auth.uid() AND NOT _active THEN
    RAISE EXCEPTION 'Você não pode desativar sua própria conta';
  END IF;
  UPDATE public.profiles SET is_active = _active WHERE id = _user_id;
  INSERT INTO public.user_activation_audit (target_user_id, changed_by, active, reason)
  VALUES (_user_id, auth.uid(), _active, NULLIF(_reason, ''));
  RETURN _active;
END;
$function$;

-- Impede alteração direta do perfil que tire o status/acesso de um Super Administrador
CREATE OR REPLACE FUNCTION public.tg_protect_super_admin_profile()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF public.is_super_admin(NEW.id) THEN
    NEW.is_active := true;
    NEW.status := 'approved';
    NEW.access_level := OLD.access_level;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_super_admin_profile BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.tg_protect_super_admin_profile();