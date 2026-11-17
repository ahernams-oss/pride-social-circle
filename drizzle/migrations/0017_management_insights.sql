CREATE TABLE public.user_activity_daily (
  user_id uuid NOT NULL,
  day date NOT NULL DEFAULT current_date,
  seconds integer NOT NULL DEFAULT 0,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT ALL ON public.user_activity_daily TO service_role;
ALTER TABLE public.user_activity_daily ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.track_activity(_seconds integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  INSERT INTO public.user_activity_daily (user_id, day, seconds, last_seen_at)
  VALUES (auth.uid(), current_date, LEAST(GREATEST(_seconds,0),120), now())
  ON CONFLICT (user_id, day) DO UPDATE
    SET seconds = public.user_activity_daily.seconds + LEAST(GREATEST(_seconds,0),120),
        last_seen_at = now();
END $$;
REVOKE ALL ON FUNCTION public.track_activity(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.track_activity(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.management_stats(_since date DEFAULT NULL)
RETURNS TABLE(user_id uuid, full_name text, club_name text, avatar_url text,
  seconds_online bigint, last_seen_at timestamptz, posts bigint, comments bigint,
  likes_given bigint, likes_received bigint, messages bigint, poll_votes bigint,
  events_joined bigint, missions_done bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE s timestamptz := COALESCE(_since, '1900-01-01'::date)::timestamptz;
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Apenas o Super Administrador pode ver as informações gerenciais';
  END IF;
  RETURN QUERY
  SELECT p.id, p.full_name, p.club_name, p.avatar_url,
    COALESCE((SELECT sum(a.seconds) FROM user_activity_daily a WHERE a.user_id=p.id AND a.day >= s::date),0)::bigint,
    (SELECT max(a.last_seen_at) FROM user_activity_daily a WHERE a.user_id=p.id),
    (SELECT count(*) FROM posts x WHERE x.author_id=p.id AND x.created_at>=s),
    (SELECT count(*) FROM post_comments x WHERE x.author_id=p.id AND x.created_at>=s),
    (SELECT count(*) FROM post_likes x WHERE x.user_id=p.id AND x.created_at>=s),
    (SELECT count(*) FROM post_likes x JOIN posts po ON po.id=x.post_id WHERE po.author_id=p.id AND x.created_at>=s),
    (SELECT count(*) FROM messages x WHERE x.sender_id=p.id AND x.created_at>=s),
    (SELECT count(*) FROM poll_votes x WHERE x.user_id=p.id AND x.created_at>=s),
    (SELECT count(*) FROM event_attendances x WHERE x.user_id=p.id AND x.canceled_at IS NULL AND x.created_at>=s),
    (SELECT count(*) FROM mission_completions x WHERE x.user_id=p.id AND x.status='approved' AND x.created_at>=s)
  FROM profiles p;
END $$;
REVOKE ALL ON FUNCTION public.management_stats(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.management_stats(date) TO authenticated;