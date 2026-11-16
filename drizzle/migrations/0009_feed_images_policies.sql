create policy "authenticated read feed images"
on storage.objects for select to authenticated
using (bucket_id = 'feed-images');

create policy "users upload own feed images"
on storage.objects for insert to authenticated
with check (bucket_id = 'feed-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users update own feed images"
on storage.objects for update to authenticated
using (bucket_id = 'feed-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "users delete own feed images"
on storage.objects for delete to authenticated
using (bucket_id = 'feed-images' and (storage.foldername(name))[1] = auth.uid()::text);