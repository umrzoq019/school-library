-- Run after schema.sql (needs Supabase Storage, so it is kept apart from the plain-Postgres schema).
-- Book cover images. Public to read (they are shown to everyone); only staff can upload, replace or delete.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('covers', 'covers', true, 2097152, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists covers_insert on storage.objects;
drop policy if exists covers_update on storage.objects;
drop policy if exists covers_delete on storage.objects;
create policy covers_insert on storage.objects for insert to authenticated with check (bucket_id = 'covers' and private.is_staff());
create policy covers_update on storage.objects for update to authenticated using (bucket_id = 'covers' and private.is_staff()) with check (bucket_id = 'covers' and private.is_staff());
create policy covers_delete on storage.objects for delete to authenticated using (bucket_id = 'covers' and private.is_staff());
