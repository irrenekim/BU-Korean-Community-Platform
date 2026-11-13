-- Korean Community: initial database setup
-- Paste this whole file into Supabase → SQL Editor → New query → Run.

---------------------------------------------------------------
-- 1. Only @bu.edu emails can create an account
--    (the login page checks too, but this check can't be bypassed)
---------------------------------------------------------------
create or replace function public.only_bu_emails()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if lower(new.email) not like '%@bu.edu' then
    raise exception 'Only @bu.edu email addresses can sign up';
  end if;
  return new;
end;
$$;

drop trigger if exists check_bu_email on auth.users;
create trigger check_bu_email
  before insert on auth.users
  for each row execute function public.only_bu_emails();

---------------------------------------------------------------
-- 2. Posts (used from Week 2)
---------------------------------------------------------------
create table if not exists public.posts (
  id          bigint generated always as identity primary key,
  author_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  category    text not null check (category in ('academics', 'sports', 'housing')),
  title       text not null,
  body        text not null,
  image_url   text,
  tag         text,          -- course / major, sport type, or neighborhood
  event_date  timestamptz,   -- for sports recruitment posts
  is_open     boolean not null default true,  -- Open / Closed status
  created_at  timestamptz not null default now()
);

alter table public.posts enable row level security;

-- Logged-in users can read all posts
create policy "Logged-in users can read posts"
  on public.posts for select to authenticated using (true);

-- Users can only create, edit, and delete their OWN posts
create policy "Users can create their own posts"
  on public.posts for insert to authenticated with check (auth.uid() = author_id);
create policy "Users can edit their own posts"
  on public.posts for update to authenticated using (auth.uid() = author_id);
create policy "Users can delete their own posts"
  on public.posts for delete to authenticated using (auth.uid() = author_id);

---------------------------------------------------------------
-- 3. Comments (used from Week 3)
---------------------------------------------------------------
create table if not exists public.comments (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references public.posts(id) on delete cascade,
  author_id   uuid not null references auth.users(id) on delete cascade default auth.uid(),
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "Logged-in users can read comments"
  on public.comments for select to authenticated using (true);
create policy "Users can write their own comments"
  on public.comments for insert to authenticated with check (auth.uid() = author_id);
create policy "Users can delete their own comments"
  on public.comments for delete to authenticated using (auth.uid() = author_id);

---------------------------------------------------------------
-- 4. Reports (used from Week 3)
--    No admin page needed: admins read reports in Supabase → Table Editor
---------------------------------------------------------------
create table if not exists public.reports (
  id           bigint generated always as identity primary key,
  reporter_id  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  post_id      bigint references public.posts(id) on delete cascade,
  reason       text not null,
  created_at   timestamptz not null default now()
);

alter table public.reports enable row level security;

-- Users can submit reports but cannot read anyone's reports
create policy "Users can submit reports"
  on public.reports for insert to authenticated with check (auth.uid() = reporter_id);
