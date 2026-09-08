CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(_target_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _caller_id uuid := auth.uid();
  _conversation_id uuid;
BEGIN
  IF _caller_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _target_user_id IS NULL OR _target_user_id = _caller_id THEN
    RAISE EXCEPTION 'Destinatário inválido';
  END IF;

  IF NOT public.is_approved(_caller_id) THEN
    RAISE EXCEPTION 'Usuário sem permissão para iniciar conversas';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = _target_user_id
      AND status = 'approved'
      AND is_active
  ) THEN
    RAISE EXCEPTION 'Destinatário indisponível';
  END IF;

  SELECT cp1.conversation_id
  INTO _conversation_id
  FROM public.conversation_participants cp1
  JOIN public.conversation_participants cp2
    ON cp2.conversation_id = cp1.conversation_id
   AND cp2.user_id = _target_user_id
  WHERE cp1.user_id = _caller_id
    AND (
      SELECT count(*)
      FROM public.conversation_participants cp3
      WHERE cp3.conversation_id = cp1.conversation_id
    ) = 2
  LIMIT 1;

  IF _conversation_id IS NULL THEN
    INSERT INTO public.conversations DEFAULT VALUES
    RETURNING id INTO _conversation_id;

    INSERT INTO public.conversation_participants (conversation_id, user_id)
    VALUES
      (_conversation_id, _caller_id),
      (_conversation_id, _target_user_id);
  END IF;

  RETURN _conversation_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid) TO authenticated;