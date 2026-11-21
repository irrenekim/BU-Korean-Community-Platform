-- Friends and shared schedules ("find a time when everyone's free").
-- Only ADDS things: two columns on profiles, two new tables, three helper functions.
-- Run AFTER 20261121000000_settings_follows_polls.sql.

begin;

---------------------------------------------------------------
-- 1. @username and display name on profiles
---------------------------------------------------------------
alter table public.profiles
  add column if not exists username text unique
    check (username is null or username ~ '^[a-z0-9_.]{3,20}$'),
  add column if not exists display_name text
    check (display_name is null or char_length(display_name) <= 60);

-- Look someone up by @username to send a friend request.
create function public.find_user_by_username(p_username text)
returns table (user_id text, username text, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.user_id, p.username, p.display_name
  from public.profiles p
  where public.is_bu_student()
    and p.username = lower(trim(p_username));
$$;

revoke execute on function public.find_user_by_username(text) from public, anon, authenticated;
grant execute on function public.find_user_by_username(text) to authenticated;

---------------------------------------------------------------
-- 2. Friendships (a request, then accepted)
---------------------------------------------------------------
create table public.friendships (
  id           bigint generated always as identity primary key,
  requester_id text not null default public.clerk_user_id(),
  addressee_id text not null,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

-- Only one friendship per pair, whoever asked first
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

alter table public.friendships enable row level security;

create policy "See your own friendships"
  on public.friendships for select to authenticated
  using (public.clerk_user_id() in (requester_id, addressee_id));
create policy "Send a friend request"
  on public.friendships for insert to authenticated
  with check (public.is_bu_student() and requester_id = public.clerk_user_id() and status = 'pending');
create policy "Accept a request sent to you"
  on public.friendships for update to authenticated
  using (addressee_id = public.clerk_user_id())
  with check (addressee_id = public.clerk_user_id() and status = 'accepted');
create policy "Decline, cancel or unfriend"
  on public.friendships for delete to authenticated
  using (public.clerk_user_id() in (requester_id, addressee_id));

-- Your friends and requests, with their names.
create function public.my_friends()
returns table (friendship_id bigint, friend_id text, username text, display_name text, status text, incoming boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id,
         case when f.requester_id = public.clerk_user_id() then f.addressee_id else f.requester_id end,
         p.username, p.display_name, f.status,
         f.addressee_id = public.clerk_user_id()
  from public.friendships f
  left join public.profiles p
    on p.user_id = case when f.requester_id = public.clerk_user_id() then f.addressee_id else f.requester_id end
  where public.clerk_user_id() in (f.requester_id, f.addressee_id)
  order by f.status desc, p.display_name;
$$;

revoke execute on function public.my_friends() from public, anon, authenticated;
grant execute on function public.my_friends() to authenticated;

---------------------------------------------------------------
-- 3. Weekly schedule blocks (repeat every week)
--    weekday: 0 = Sunday … 6 = Saturday; times in minutes after midnight
---------------------------------------------------------------
create table public.schedule_blocks (
  id         bigint generated always as identity primary key,
  user_id    text not null default public.clerk_user_id(),
  title      text not null check (char_length(trim(title)) between 1 and 80),
  weekday    smallint not null check (weekday between 0 and 6),
  start_min  smallint not null check (start_min between 0 and 1439),
  end_min    smallint not null check (end_min between 1 and 1440),
  is_public  boolean not null default false,  -- false: friends only see "Busy"
  created_at timestamptz not null default now(),
  check (end_min > start_min)
);

create index schedule_blocks_user_idx on public.schedule_blocks (user_id, weekday);

alter table public.schedule_blocks enable row level security;

-- Only you can read or change your own blocks directly…
create policy "Read your schedule"
  on public.schedule_blocks for select to authenticated using (user_id = public.clerk_user_id());
create policy "Add to your schedule"
  on public.schedule_blocks for insert to authenticated
  with check (public.is_bu_student() and user_id = public.clerk_user_id());
create policy "Edit your schedule"
  on public.schedule_blocks for update to authenticated
  using (user_id = public.clerk_user_id()) with check (user_id = public.clerk_user_id());
create policy "Delete from your schedule"
  on public.schedule_blocks for delete to authenticated using (user_id = public.clerk_user_id());

-- …and friends see it only through this function: busy times, plus titles you made public.
create function public.friend_schedules(p_friend_ids text[])
returns table (user_id text, weekday smallint, start_min smallint, end_min smallint, title text)
language sql
stable
security definer
set search_path = ''
as $$
  select b.user_id, b.weekday, b.start_min, b.end_min,
         case when b.is_public then b.title end
  from public.schedule_blocks b
  where public.is_bu_student()
    and b.user_id = any (p_friend_ids)
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = public.clerk_user_id() and f.addressee_id = b.user_id)
          or (f.addressee_id = public.clerk_user_id() and f.requester_id = b.user_id))
    );
$$;

revoke execute on function public.friend_schedules(text[]) from public, anon, authenticated;
grant execute on function public.friend_schedules(text[]) to authenticated;

---------------------------------------------------------------
-- 4. Sports events friends are going to also count as "busy"
--    (events are listed publicly on the Sports tab anyway, so titles are shown)
---------------------------------------------------------------
create function public.friend_event_busy(p_friend_ids text[], p_from timestamptz, p_to timestamptz)
returns table (user_id text, starts_at timestamptz, title text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.user_id, e.starts_at, e.title
  from public.sports_event_rsvps r
  join public.sports_events e on e.id = r.event_id
  where public.is_bu_student()
    and r.status = 'attending'
    and r.user_id = any (p_friend_ids)
    and e.starts_at >= p_from and e.starts_at < p_to
    and exists (
      select 1 from public.friendships f
      where f.status = 'accepted'
        and ((f.requester_id = public.clerk_user_id() and f.addressee_id = r.user_id)
          or (f.addressee_id = public.clerk_user_id() and f.requester_id = r.user_id))
    );
$$;

revoke execute on function public.friend_event_busy(text[], timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.friend_event_busy(text[], timestamptz, timestamptz) to authenticated;

commit;
