REVOKE ALL ON FUNCTION public.current_access_level(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.current_access_level(uuid) TO authenticated;