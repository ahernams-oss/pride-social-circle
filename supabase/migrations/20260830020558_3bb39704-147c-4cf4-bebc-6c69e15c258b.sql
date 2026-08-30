CREATE TABLE public.access_levels (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  base_level text NOT NULL DEFAULT 'approved' CHECK (base_level IN ('user','approved','moderator','admin')),
  rank integer NOT NULL DEFAULT 50,
  is_builtin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.access_levels TO authenticated;
GRANT ALL ON public.access_levels TO service_role;
ALTER TABLE public.access_levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem niveis" ON public.access_levels
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam niveis" ON public.access_levels
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.access_levels TO authenticated;

CREATE TRIGGER access_levels_updated_at BEFORE UPDATE ON public.access_levels
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

CREATE TABLE public.access_level_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  level_key text NOT NULL REFERENCES public.access_levels(key) ON DELETE CASCADE,
  menu_key text NOT NULL,
  can_view boolean NOT NULL DEFAULT false,
  can_create boolean NOT NULL DEFAULT false,
  can_edit boolean NOT NULL DEFAULT false,
  can_delete boolean NOT NULL DEFAULT false,
  can_approve boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (level_key, menu_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_level_permissions TO authenticated;
GRANT ALL ON public.access_level_permissions TO service_role;
ALTER TABLE public.access_level_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados leem permissoes" ON public.access_level_permissions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gerenciam permissoes" ON public.access_level_permissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER access_level_permissions_updated_at BEFORE UPDATE ON public.access_level_permissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS access_level text REFERENCES public.access_levels(key) ON DELETE SET NULL;

INSERT INTO public.access_levels (key, label, description, base_level, rank, is_builtin) VALUES
  ('user','Cadastro pendente','Aguardando aprovação do cadastro.','user',10,true),
  ('approved','Sócio aprovado','Acesso completo ao painel do sócio.','approved',20,true),
  ('moderator','Moderador','Aprova cadastros e modera conteúdo, sem gestão total.','moderator',30,true),
  ('admin','Administrador','Acesso total, incluindo eleições, urna e criação de usuários.','admin',40,true);

DO $$
DECLARE
  menus text[] := ARRAY['feed','messages','notifications','profile','friends','groups','events','missions','ranking','clubs','club-roles','district-roles','distrito','documents','elections','votar-eleicao','eleicoes-oficiais','kiosk','admin'];
  m text;
BEGIN
  FOREACH m IN ARRAY menus LOOP
    -- admin: tudo
    INSERT INTO public.access_level_permissions (level_key, menu_key, can_view, can_create, can_edit, can_delete, can_approve)
    VALUES ('admin', m, true, true, true, true, true);

    -- moderador: tudo exceto urna e eleições oficiais; aprova cadastros
    INSERT INTO public.access_level_permissions (level_key, menu_key, can_view, can_create, can_edit, can_delete, can_approve)
    VALUES ('moderator', m,
      m NOT IN ('kiosk','eleicoes-oficiais'),
      m IN ('feed','messages','events','missions','clubs','club-roles','district-roles'),
      m IN ('feed','messages','events','missions','clubs','club-roles','district-roles','profile'),
      false,
      m = 'admin');

    -- aprovado: conteúdo do sócio, sem admin/urna/eleições oficiais
    INSERT INTO public.access_level_permissions (level_key, menu_key, can_view, can_create, can_edit, can_delete, can_approve)
    VALUES ('approved', m,
      m NOT IN ('admin','kiosk','eleicoes-oficiais'),
      m IN ('feed','messages','profile'),
      m IN ('feed','messages','profile'),
      false, false);

    -- pendente: nada
    INSERT INTO public.access_level_permissions (level_key, menu_key, can_view, can_create, can_edit, can_delete, can_approve)
    VALUES ('user', m, false, false, false, false, false);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_access_level(_user_id uuid, _level text, _reason text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _old text;
  _base text;
BEGIN
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
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'moderator';
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSIF _base = 'moderator' THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role = 'admin';
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'moderator')
      ON CONFLICT (user_id, role) DO NOTHING;
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSIF _base = 'approved' THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator');
    UPDATE public.profiles SET status = 'approved' WHERE id = _user_id;
  ELSE
    DELETE FROM public.user_roles WHERE user_id = _user_id AND role IN ('admin', 'moderator');
    UPDATE public.profiles SET status = 'pending' WHERE id = _user_id;
  END IF;

  UPDATE public.profiles SET access_level = _level WHERE id = _user_id;

  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'member')
    ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.access_level_audit (target_user_id, changed_by, old_level, new_level, reason)
  VALUES (_user_id, auth.uid(), _old, _level, NULLIF(_reason, ''));

  RETURN _level;
END;
$function$;

CREATE OR REPLACE FUNCTION public.current_access_level(_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT p.access_level FROM public.profiles p
      JOIN public.access_levels al ON al.key = p.access_level
      WHERE p.id = _user_id),
    CASE
      WHEN public.has_role(_user_id, 'admin') THEN 'admin'
      WHEN public.has_role(_user_id, 'moderator') THEN 'moderator'
      WHEN EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user_id AND p.status = 'approved') THEN 'approved'
      ELSE 'user'
    END)
$function$;