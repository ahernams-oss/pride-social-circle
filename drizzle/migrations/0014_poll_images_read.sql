CREATE POLICY "Members read poll images" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'poll-images' AND (public.is_approved(auth.uid()) OR public.has_role(auth.uid(),'admin')));