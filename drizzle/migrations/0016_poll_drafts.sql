ALTER TABLE public.polls ADD COLUMN published_at timestamptz;
UPDATE public.polls SET published_at = created_at WHERE published_at IS NULL;

CREATE OR REPLACE FUNCTION public.poll_is_draft(_poll_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.polls WHERE id = _poll_id AND published_at IS NULL)
$$;
GRANT EXECUTE ON FUNCTION public.poll_is_draft(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.tg_polls_lock_published() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    IF NEW.published_at IS DISTINCT FROM OLD.published_at
       OR NEW.title IS DISTINCT FROM OLD.title
       OR NEW.description IS DISTINCT FROM OLD.description
       OR NEW.image_url IS DISTINCT FROM OLD.image_url
       OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
       OR NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Enquete publicada não pode ser editada; apenas finalizada.';
    END IF;
    IF NEW.ends_at IS DISTINCT FROM OLD.ends_at THEN
      IF NEW.ends_at > OLD.ends_at OR NEW.ends_at > now() + interval '1 minute' THEN
        RAISE EXCEPTION 'Só é possível finalizar a enquete antes do tempo.';
      END IF;
    END IF;
  ELSIF NEW.published_at IS NOT NULL THEN
    NEW.published_at := now();
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER polls_lock_published BEFORE UPDATE ON public.polls
  FOR EACH ROW EXECUTE FUNCTION public.tg_polls_lock_published();

DROP POLICY polls_read ON public.polls;
CREATE POLICY polls_read ON public.polls FOR SELECT TO authenticated USING (
  (published_at IS NOT NULL AND (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin')))
  OR public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit'));

DROP POLICY pq_write ON public.poll_questions;
CREATE POLICY pq_write ON public.poll_questions FOR ALL TO authenticated
  USING ((public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit')) AND public.poll_is_draft(poll_id))
  WITH CHECK ((public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit')) AND public.poll_is_draft(poll_id));
DROP POLICY po_write ON public.poll_options;
CREATE POLICY po_write ON public.poll_options FOR ALL TO authenticated
  USING ((public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit'))
    AND EXISTS (SELECT 1 FROM public.poll_questions q WHERE q.id = question_id AND public.poll_is_draft(q.poll_id)))
  WITH CHECK ((public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit'))
    AND EXISTS (SELECT 1 FROM public.poll_questions q WHERE q.id = question_id AND public.poll_is_draft(q.poll_id)));

DROP POLICY pv_insert ON public.poll_votes;
CREATE POLICY pv_insert ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND public.is_approved(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.poll_options o
      JOIN public.poll_questions q ON q.id = o.question_id
      JOIN public.polls p ON p.id = q.poll_id
      WHERE o.id = option_id AND q.id = question_id
        AND p.published_at IS NOT NULL
        AND now() >= p.starts_at AND now() <= p.ends_at
        AND (q.allow_multiple OR NOT EXISTS (
          SELECT 1 FROM public.poll_votes v WHERE v.question_id = q.id AND v.user_id = auth.uid()))
    )
  );