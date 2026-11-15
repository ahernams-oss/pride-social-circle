CREATE OR REPLACE FUNCTION public.signup_club_directory()
RETURNS TABLE(id uuid, name text, city text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.city FROM public.clubs c ORDER BY c.name;
$$;
REVOKE ALL ON FUNCTION public.signup_club_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.signup_club_directory() TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.signup_club_directory() IS 'Public signup directory exposing only club identifiers, names and cities; no write access or creator information.';