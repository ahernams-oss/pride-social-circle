
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS cep text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logradouro text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS numero text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS complemento text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bairro text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT '';

CREATE TABLE public.profile_educations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution text NOT NULL DEFAULT '',
  course text NOT NULL DEFAULT '',
  level text NOT NULL DEFAULT '',
  year_start int,
  year_end int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_educations TO authenticated;
GRANT ALL ON public.profile_educations TO service_role;

ALTER TABLE public.profile_educations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view educations if approved or self or admin"
  ON public.profile_educations FOR SELECT TO authenticated
  USING (is_approved(auth.uid()) OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "users insert own educations"
  ON public.profile_educations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own educations"
  ON public.profile_educations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users delete own educations"
  ON public.profile_educations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER profile_educations_updated_at
  BEFORE UPDATE ON public.profile_educations
  FOR EACH ROW EXECUTE FUNCTION public.tg_updated_at();
