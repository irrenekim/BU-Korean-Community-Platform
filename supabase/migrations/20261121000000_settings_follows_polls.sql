-- Try-out features: phone number settings, follow-a-filter notifications,
-- and "when are you free?" polls for sports.
-- This only ADDS new tables and one new column on posts. Nothing existing is
-- changed or deleted, so the live site keeps working as before.

begin;

---------------------------------------------------------------
-- 1. Profiles: phone number and notification settings (only you can see yours)
---------------------------------------------------------------
create table public.profiles (
  user_id      text primary key default public.clerk_user_id(),
  phone        text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  email_alerts boolean not null default true,
  sms_alerts   boolean not null default false,  -- saved for later; texts are not sent yet
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (public.is_bu_student() and user_id = public.clerk_user_id());
create policy "Users can create their own profile"
  on public.profiles for insert to authenticated
  with check (public.is_bu_student() and user_id = public.clerk_user_id());
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (user_id = public.clerk_user_id())
  with check (user_id = public.clerk_user_id());

---------------------------------------------------------------
-- 2. Follows: "tell me about new Soccer / Allston / CAS · Economics posts"
---------------------------------------------------------------
create table public.follows (
  id           bigint generated always as identity primary key,
  user_id      text not null default public.clerk_user_id(),
  category     text not null check (category in ('academics', 'sports', 'housing')),
  filter_value text not null check (char_length(trim(filter_value)) between 1 and 100),
  created_at   timestamptz not null default now(),
  unique (user_id, category, filter_value)
);

alter table public.follows enable row level security;

create policy "Users can read their own follows"
  on public.follows for select to authenticated
  using (public.is_bu_student() and user_id = public.clerk_user_id());
create policy "Users can follow"
  on public.follows for insert to authenticated
  with check (public.is_bu_student() and user_id = public.clerk_user_id());
create policy "Users can unfollow"
  on public.follows for delete to authenticated
  using (user_id = public.clerk_user_id());

-- Marks a post once its follower emails have gone out, so they're sent only once.
alter table public.posts add column if not exists notified_at timestamptz;

-- Called by the website right after someone publishes a post.
-- Only the post's author can call it, only once, and only for a new post.
-- Returns who follows that category (people who turned emails off are skipped);
-- the website then checks which follows actually match the post's tag.
create function public.claim_post_followers(p_post_id bigint)
returns table (follower_id text, filter_value text, post_category text, post_tag text, post_title text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller text := public.clerk_user_id();
  post public.posts%rowtype;
begin
  if caller is null or not public.is_bu_student() then
    raise exception 'A BU account is required.' using errcode = '42501';
  end if;

  update public.posts set notified_at = now()
    where id = p_post_id
      and author_id = caller
      and notified_at is null
      and created_at > now() - interval '15 minutes'
    returning * into post;
  if not found then
    return;  -- not your post, too old, or already done
  end if;

  return query
    select f.user_id, f.filter_value, post.category, post.tag, post.title
    from public.follows f
    left join public.profiles p on p.user_id = f.user_id
    where f.category = post.category
      and f.user_id <> caller
      and coalesce(p.email_alerts, true);
end;
$$;

revoke execute on function public.claim_post_followers(bigint) from public, anon, authenticated;
grant execute on function public.claim_post_followers(bigint) to authenticated;

---------------------------------------------------------------
-- 3. Time polls: an organizer offers a few times, people tick when they're free
---------------------------------------------------------------
create table public.time_polls (
  id           uuid primary key default gen_random_uuid(),
  organizer_id text not null default public.clerk_user_id(),
  title        text not null check (char_length(trim(title)) between 1 and 100),
  sport        text not null check (char_length(trim(sport)) between 1 and 60),
  location     text check (location is null or char_length(location) <= 160),
  created_at   timestamptz not null default now()
);

create table public.time_poll_slots (
  id         bigint generated always as identity primary key,
  poll_id    uuid not null references public.time_polls(id) on delete cascade,
  starts_at  timestamptz not null
);

create table public.time_poll_votes (
  slot_id  bigint not null references public.time_poll_slots(id) on delete cascade,
  user_id  text not null default public.clerk_user_id(),
  primary key (slot_id, user_id)
);

alter table public.time_polls enable row level security;
alter table public.time_poll_slots enable row level security;
alter table public.time_poll_votes enable row level security;

create policy "BU students can read polls"
  on public.time_polls for select to authenticated using (public.is_bu_student());
create policy "BU students can create polls"
  on public.time_polls for insert to authenticated
  with check (public.is_bu_student() and organizer_id = public.clerk_user_id());
create policy "Organizers can delete their polls"
  on public.time_polls for delete to authenticated
  using (organizer_id = public.clerk_user_id());

create policy "BU students can read poll times"
  on public.time_poll_slots for select to authenticated using (public.is_bu_student());
create policy "Organizers can add times to their polls"
  on public.time_poll_slots for insert to authenticated
  with check (
    public.is_bu_student()
    and starts_at > now()
    and exists (select 1 from public.time_polls p
                where p.id = poll_id and p.organizer_id = public.clerk_user_id())
  );

-- Everyone can see the votes, so the site can show "5 free" for each time.
create policy "BU students can read votes"
  on public.time_poll_votes for select to authenticated using (public.is_bu_student());
create policy "BU students can mark themselves free"
  on public.time_poll_votes for insert to authenticated
  with check (public.is_bu_student() and user_id = public.clerk_user_id());
create policy "Users can remove their own vote"
  on public.time_poll_votes for delete to authenticated
  using (user_id = public.clerk_user_id());

commit;
