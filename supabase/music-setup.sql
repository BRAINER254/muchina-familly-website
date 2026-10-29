-- Run after supabase/setup.sql to enable public music uploads.
alter table public.content_posts drop constraint if exists content_posts_kind_check;
alter table public.content_posts add constraint content_posts_kind_check
  check (kind in ('announcement', 'idea', 'video', 'photo', 'music'));

alter table public.content_posts drop constraint if exists content_posts_video_fields;
alter table public.content_posts drop constraint if exists content_posts_media_fields;
alter table public.content_posts add constraint content_posts_media_fields check (
  (kind in ('video', 'photo', 'music') and video_path is not null and body = '') or
  (kind in ('announcement', 'idea') and video_path is null and char_length(btrim(body)) > 0)
);

drop policy if exists "Public can publish posts" on public.content_posts;
create policy "Public can publish posts"
  on public.content_posts for insert
  to anon, authenticated
  with check (
    (kind in ('announcement', 'idea') and video_path is null and char_length(btrim(body)) > 0) or
    (kind = 'video' and video_path like 'videos/%' and body = '') or
    (kind = 'photo' and video_path like 'photos/%' and body = '') or
    (kind = 'music' and video_path like 'music/%' and body = '')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'family-music',
  'family-music',
  true,
  20971520,
  array['audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/ogg', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view family music" on storage.objects;
create policy "Public can view family music"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'family-music');

drop policy if exists "Public can upload family music" on storage.objects;
create policy "Public can upload family music"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'family-music'
    and (storage.foldername(name))[1] = 'music'
    and lower(storage.extension(name)) in ('mp3', 'm4a', 'ogg', 'wav')
  );
