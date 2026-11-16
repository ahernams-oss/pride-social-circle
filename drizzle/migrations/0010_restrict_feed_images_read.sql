DROP POLICY IF EXISTS "authenticated read feed images" ON storage.objects;
CREATE POLICY "owner read feed images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'feed-images' AND (storage.foldername(name))[1] = auth.uid()::text);