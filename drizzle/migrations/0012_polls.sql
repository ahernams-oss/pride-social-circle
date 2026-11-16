CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.poll_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  allow_multiple boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0
);
CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.poll_questions(id) ON DELETE CASCADE,
  text text NOT NULL,
  order_index integer NOT NULL DEFAULT 0
);
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.poll_questions(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, option_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.polls, public.poll_questions, public.poll_options TO authenticated;
GRANT SELECT, INSERT ON public.poll_votes TO authenticated;
GRANT ALL ON public.polls, public.poll_questions, public.poll_options, public.poll_votes TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY polls_read ON public.polls FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY polls_ins ON public.polls FOR INSERT TO authenticated
  WITH CHECK (public.can_menu(auth.uid(),'polls','create') AND created_by = auth.uid());
CREATE POLICY polls_upd ON public.polls FOR UPDATE TO authenticated
  USING (public.can_menu(auth.uid(),'polls','edit')) WITH CHECK (public.can_menu(auth.uid(),'polls','edit'));
CREATE POLICY polls_del ON public.polls FOR DELETE TO authenticated
  USING (public.can_menu(auth.uid(),'polls','delete'));

CREATE POLICY pq_read ON public.poll_questions FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY pq_write ON public.poll_questions FOR ALL TO authenticated
  USING (public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit'))
  WITH CHECK (public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit'));
CREATE POLICY po_read ON public.poll_options FOR SELECT TO authenticated
  USING (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'));
CREATE POLICY po_write ON public.poll_options FOR ALL TO authenticated
  USING (public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit'))
  WITH CHECK (public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit'));

CREATE POLICY pv_read_own ON public.poll_votes FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY pv_insert ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND public.is_approved(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.poll_options o
      JOIN public.poll_questions q ON q.id = o.question_id
      JOIN public.polls p ON p.id = q.poll_id
      WHERE o.id = option_id AND q.id = question_id
        AND now() >= p.starts_at AND now() <= p.ends_at
        AND (q.allow_multiple OR NOT EXISTS (
          SELECT 1 FROM public.poll_votes v WHERE v.question_id = q.id AND v.user_id = auth.uid()))
    )
  );

CREATE OR REPLACE FUNCTION public.poll_results(_poll_id uuid)
RETURNS TABLE(option_id uuid, votes bigint, voters bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT o.id, COUNT(v.id)::bigint,
    (SELECT COUNT(DISTINCT v2.user_id) FROM public.poll_votes v2 WHERE v2.question_id = q.id)::bigint
  FROM public.poll_options o
  JOIN public.poll_questions q ON q.id = o.question_id
  LEFT JOIN public.poll_votes v ON v.option_id = o.id
  WHERE q.poll_id = _poll_id
    AND (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin'))
  GROUP BY o.id, q.id;
$$;
GRANT EXECUTE ON FUNCTION public.poll_results(uuid) TO authenticated;