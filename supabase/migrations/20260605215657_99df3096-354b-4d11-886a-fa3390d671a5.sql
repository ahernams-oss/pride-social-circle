
-- 1. Fix conversation_participants INSERT: also require auth.uid() = user_id
DROP POLICY IF EXISTS "approved add participants" ON public.conversation_participants;
CREATE POLICY "approved add own participant" ON public.conversation_participants
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND is_approved(auth.uid()));

-- 2. Restrict mission_completions SELECT to owner or admin
DROP POLICY IF EXISTS mc_select_all ON public.mission_completions;
CREATE POLICY mc_select_own ON public.mission_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 3. Set search_path on tg_updated_at
CREATE OR REPLACE FUNCTION public.tg_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$function$;

-- 4. Revoke EXECUTE on SECURITY DEFINER trigger functions from API roles
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_bump_conversation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_approved() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_notify_message() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tg_updated_at() FROM PUBLIC, anon, authenticated;

-- Restrict helpers from anon (still needed by authenticated for RLS evaluation)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_approved(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;

-- 5. Prevent listing files in the avatars bucket; public URL access still works
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

-- 6. Enable RLS on realtime.messages so unauthorized channel topics are blocked
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to subscribe only to channels scoped to themselves or
-- conversations they participate in. Topic conventions used by the app:
--   user:{uid}            -> personal notifications
--   conversation:{uuid}   -> messages for that conversation
CREATE POLICY "realtime user-scoped topics" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = 'user:' || auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND realtime.topic() = 'conversation:' || cp.conversation_id::text
    )
  );
