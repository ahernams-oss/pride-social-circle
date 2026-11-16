ALTER TABLE public.polls ADD COLUMN image_url text;
ALTER TABLE public.poll_questions ADD COLUMN image_url text;
ALTER TABLE public.poll_options ADD COLUMN image_url text;
CREATE POLICY "Poll managers upload poll images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'poll-images' AND (public.can_menu(auth.uid(),'polls','create') OR public.can_menu(auth.uid(),'polls','edit')));
CREATE POLICY "Poll managers delete poll images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'poll-images' AND public.can_menu(auth.uid(),'polls','delete'));