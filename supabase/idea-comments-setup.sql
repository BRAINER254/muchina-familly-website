-- Run after supabase/setup.sql to enable public comments on ideas.
create table if not exists public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.content_posts(id) on delete cascade,
  author_name text check (author_name is null or char_length(author_name) <= 80),
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idea_comments_idea_created_at_idx
  on public.idea_comments (idea_id, created_at);

alter table public.idea_comments enable row level security;

drop policy if exists "Public can read idea comments" on public.idea_comments;
create policy "Public can read idea comments"
  on public.idea_comments for select
  to anon, authenticated
  using (true);

drop policy if exists "Public can comment on ideas" on public.idea_comments;
create policy "Public can comment on ideas"
  on public.idea_comments for insert
  to anon, authenticated
  with check (
    exists (
      select 1
      from public.content_posts
      where content_posts.id = idea_comments.idea_id
        and content_posts.kind = 'idea'
    )
  );

grant select, insert on public.idea_comments to anon, authenticated;
