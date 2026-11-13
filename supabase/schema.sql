-- Korean Community: database setup (Clerk login version)
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- Safe to run more than once. It removes the old Supabase-login tables
-- (they're empty) and recreates them for Clerk.

---------------------------------------------------------------
-- 0. Clean up the old version
---------------------------------------------------------------
drop trigger if exists check_bu_email on auth.users;
drop function if exists public.only_bu_emails();
drop table if exists public.reports;
drop table if exists public.comments;
drop table if exists public.posts;

---------------------------------------------------------------
-- 1. Helpers that read the logged-in user's Clerk token
---------------------------------------------------------------
-- The Clerk user ID of whoever is making the request (e.g. "user_2abc...")
create or replace function public.clerk_user_id()
returns text language sql stable
as $$ select auth.jwt()->>'sub' $$;

-- True only if the user's email ends in @bu.edu.
-- Needs the "email" claim added in Clerk → Sessions → Customize session token.
create or replace function public.is_bu_student()
returns boolean language sql stable
as $$ select coalesce(auth.jwt()->>'email', '') ilike '%@bu.edu' $$;

---------------------------------------------------------------
-- 2. Posts (used from Week 2)
---------------------------------------------------------------
create table public.posts (
  id          bigint generated always as identity primary key,
  author_id   text not null default public.clerk_user_id(),
  author_name text,          -- display name, copied from Clerk when posting
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

create policy "BU students can read posts"
  on public.posts for select to authenticated using (public.is_bu_student());
create policy "BU students can create their own posts"
  on public.posts for insert to authenticated
  with check (public.is_bu_student() and author_id = public.clerk_user_id());
create policy "Users can edit their own posts"
  on public.posts for update to authenticated using (author_id = public.clerk_user_id());
create policy "Users can delete their own posts"
  on public.posts for delete to authenticated using (author_id = public.clerk_user_id());

---------------------------------------------------------------
-- 3. Comments (used from Week 3)
---------------------------------------------------------------
create table public.comments (
  id          bigint generated always as identity primary key,
  post_id     bigint not null references public.posts(id) on delete cascade,
  author_id   text not null default public.clerk_user_id(),
  author_name text,
  body        text not null,
  created_at  timestamptz not null default now()
);

alter table public.comments enable row level security;

create policy "BU students can read comments"
  on public.comments for select to authenticated using (public.is_bu_student());
create policy "BU students can write their own comments"
  on public.comments for insert to authenticated
  with check (public.is_bu_student() and author_id = public.clerk_user_id());
create policy "Users can delete their own comments"
  on public.comments for delete to authenticated using (author_id = public.clerk_user_id());

---------------------------------------------------------------
-- 4. Reports (used from Week 3)
--    No admin page needed: admins read reports in Supabase → Table Editor
---------------------------------------------------------------
create table public.reports (
  id           bigint generated always as identity primary key,
  reporter_id  text not null default public.clerk_user_id(),
  post_id      bigint references public.posts(id) on delete cascade,
  reason       text not null,
  created_at   timestamptz not null default now()
);

alter table public.reports enable row level security;

-- Users can submit reports but cannot read anyone's reports
create policy "BU students can submit reports"
  on public.reports for insert to authenticated
  with check (public.is_bu_student() and reporter_id = public.clerk_user_id());
