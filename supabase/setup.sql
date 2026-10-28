-- Run in the Supabase SQL Editor. These policies intentionally permit public posting.
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  author_name text check (author_name is null or char_length(author_name) <= 80),
  video_path text unique,
  created_at timestamptz not null default now()
);

alter table public.content_posts drop constraint if exists content_posts_kind_check;
alter table public.content_posts add constraint content_posts_kind_check
  check (kind in ('announcement', 'idea', 'video', 'photo'));

alter table public.content_posts drop constraint if exists content_posts_video_fields;
alter table public.content_posts drop constraint if exists content_posts_media_fields;
alter table public.content_posts add constraint content_posts_media_fields check (
  (kind in ('video', 'photo') and video_path is not null and body = '') or
  (kind in ('announcement', 'idea') and video_path is null and char_length(btrim(body)) > 0)
);

create index if not exists content_posts_kind_created_at_idx
  on public.content_posts (kind, created_at desc);

alter table public.content_posts enable row level security;

drop policy if exists "Public can read posts" on public.content_posts;
create policy "Public can read posts"
  on public.content_posts for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can publish posts" on public.content_posts;
create policy "Public can publish posts"
  on public.content_posts for insert
  to anon, authenticated
  with check (
    (kind in ('announcement', 'idea') and video_path is null and char_length(btrim(body)) > 0) or
    (kind = 'video' and video_path like 'videos/%' and body = '') or
    (kind = 'photo' and video_path like 'photos/%' and body = '')
  );

grant select, insert on public.content_posts to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'family-videos',
  'family-videos',
  true,
  52428800,
  array['video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view family videos" on storage.objects;
create policy "Public can view family videos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'family-videos');

drop policy if exists "Public can upload family videos" on storage.objects;
create policy "Public can upload family videos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'family-videos'
    and (storage.foldername(name))[1] = 'videos'
    and lower(storage.extension(name)) in ('mp4', 'webm', 'mov')
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'family-photos',
  'family-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view family photos" on storage.objects;
create policy "Public can view family photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'family-photos');

drop policy if exists "Public can upload family photos" on storage.objects;
create policy "Public can upload family photos"
  on storage.objects for insert
  to anon, authenticated
  with check (
    bucket_id = 'family-photos'
    and (storage.foldername(name))[1] = 'photos'
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );
