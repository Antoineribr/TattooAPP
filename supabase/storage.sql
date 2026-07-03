-- Crée le bucket pour les posts (photos/vidéos des artistes)
insert into storage.buckets (id, name, public) values ('posts', 'posts', true)
on conflict do nothing;

-- Politique : les artistes peuvent uploader leurs propres fichiers
create policy "artists_upload" on storage.objects
  for insert with check (
    bucket_id = 'posts' and auth.role() = 'authenticated'
  );

-- Lecture publique
create policy "public_read" on storage.objects
  for select using (bucket_id = 'posts');
