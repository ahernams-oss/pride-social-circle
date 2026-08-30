REVOKE EXECUTE ON FUNCTION public.registry_verification(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.registry_verification(uuid) TO authenticated;