DROP POLICY IF EXISTS "author update own posts" ON public.posts;
CREATE POLICY "author update own posts within 3 min" ON public.posts FOR UPDATE TO authenticated
USING (auth.uid() = author_id AND created_at > now() - interval '3 minutes')
WITH CHECK (auth.uid() = author_id);
CREATE OR REPLACE FUNCTION public.tg_posts_lock_fields() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.id := OLD.id; NEW.author_id := OLD.author_id; NEW.created_at := OLD.created_at;
  IF OLD.created_at <= now() - interval '3 minutes' THEN
    RAISE EXCEPTION 'O prazo de 3 minutos para editar esta publicação terminou';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS posts_lock_fields ON public.posts;
CREATE TRIGGER posts_lock_fields BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.tg_posts_lock_fields();