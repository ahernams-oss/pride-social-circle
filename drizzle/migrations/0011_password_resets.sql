CREATE TABLE public.password_resets (
  user_id uuid PRIMARY KEY,
  email text NOT NULL,
  reset_by uuid,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX password_resets_email_idx ON public.password_resets (lower(email));
GRANT ALL ON public.password_resets TO service_role;
ALTER TABLE public.password_resets ENABLE ROW LEVEL SECURITY;