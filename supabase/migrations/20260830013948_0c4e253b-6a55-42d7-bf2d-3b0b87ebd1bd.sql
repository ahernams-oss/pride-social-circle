CREATE TABLE public.member_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  cpf text NOT NULL,
  lion_number text NOT NULL,
  birth_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX member_registry_cpf_key ON public.member_registry (cpf);
CREATE INDEX member_registry_lion_number_idx ON public.member_registry (lion_number);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.member_registry TO authenticated;
GRANT ALL ON public.member_registry TO service_role;

ALTER TABLE public.member_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage member registry"
  ON public.member_registry FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER member_registry_updated_at
  BEFORE UPDATE ON public.member_registry
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS lion_number text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.registry_verification(_user_id uuid)
RETURNS TABLE(matched boolean, cpf_ok boolean, lion_ok boolean, birth_ok boolean, name_ok boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    r.id IS NOT NULL AND r.lion_number = regexp_replace(p.lion_number, '\D', '', 'g')
      AND (r.birth_date IS NULL OR p.birth_date IS NULL OR r.birth_date = p.birth_date) AS matched,
    r.id IS NOT NULL AS cpf_ok,
    COALESCE(r.lion_number = regexp_replace(p.lion_number, '\D', '', 'g'), false) AS lion_ok,
    COALESCE(r.birth_date = p.birth_date, false) AS birth_ok,
    COALESCE(lower(btrim(r.full_name)) = lower(btrim(p.full_name)), false) AS name_ok
  FROM public.profiles p
  LEFT JOIN public.member_registry r
    ON r.cpf = regexp_replace(p.cpf, '\D', '', 'g')
  WHERE p.id = _user_id
    AND (public.has_role(auth.uid(), 'admin') OR auth.uid() = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, club_name, city, cpf, lion_number, birth_date)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'club_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'city', ''),
    COALESCE(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'cpf',''), '\D', '', 'g'), ''),
    COALESCE(regexp_replace(COALESCE(NEW.raw_user_meta_data->>'lion_number',''), '\D', '', 'g'), ''),
    NULLIF(NEW.raw_user_meta_data->>'birth_date','')::date
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member');
  RETURN NEW;
END;
$$;