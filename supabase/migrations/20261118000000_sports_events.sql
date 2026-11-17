begin;

create table public.sports_events (
  id uuid primary key default gen_random_uuid(),
  organizer_id text not null default public.clerk_user_id(),
  title text not null check (char_length(trim(title)) between 1 and 100),
  sport text not null check (sport in ('Soccer', 'Basketball', 'Volleyball', 'Tennis', 'Running', 'Other')),
  starts_at timestamptz not null,
  location text not null check (char_length(trim(location)) between 1 and 160),
  description text not null check (char_length(trim(description)) between 1 and 2000),
  photo_url text check (photo_url like 'https://%' and char_length(photo_url) <= 2048),
  capacity integer not null check (capacity between 1 and 1000),
  is_open boolean not null default true,
  attending_count integer not null default 0 check (attending_count between 0 and capacity),
  waitlist_count integer not null default 0 check (waitlist_count >= 0)
);

create index sports_events_starts_at_idx on public.sports_events (starts_at);

create table public.sports_event_rsvps (
  id bigint generated always as identity primary key,
  event_id uuid not null references public.sports_events(id) on delete cascade,
  user_id text not null,
  status text not null check (status in ('attending', 'waitlisted')),
  unique (event_id, user_id)
);

create index sports_event_rsvps_queue_idx
  on public.sports_event_rsvps (event_id, status, id);

alter table public.sports_events enable row level security;
alter table public.sports_event_rsvps enable row level security;

revoke all on public.sports_events, public.sports_event_rsvps from public, anon, authenticated;
grant select on public.sports_events to authenticated;
grant insert (title, sport, starts_at, location, description, photo_url, capacity)
  on public.sports_events to authenticated;
grant update (is_open) on public.sports_events to authenticated;
grant select on public.sports_event_rsvps to authenticated;

create policy "BU students can read sports events"
  on public.sports_events for select to authenticated
  using (public.is_bu_student());

create policy "BU students can create sports events"
  on public.sports_events for insert to authenticated
  with check (
    public.is_bu_student()
    and organizer_id = public.clerk_user_id()
    and starts_at > now()
  );

create policy "Organizers can close their sports events"
  on public.sports_events for update to authenticated
  using (public.is_bu_student() and organizer_id = public.clerk_user_id())
  with check (public.is_bu_student() and organizer_id = public.clerk_user_id() and not is_open);

create policy "BU students can read their own RSVP"
  on public.sports_event_rsvps for select to authenticated
  using (public.is_bu_student() and user_id = public.clerk_user_id());

create function public.set_sports_rsvp(p_event_id uuid, p_join boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  attendee text := public.clerk_user_id();
  event public.sports_events%rowtype;
  previous_status text;
  attending_delta integer := 0;
  waitlist_delta integer := 0;
begin
  if attendee is null or not public.is_bu_student() then
    raise exception 'A BU account is required.' using errcode = '42501';
  end if;

  if p_join is null then
    raise exception 'Choose whether to join or cancel.';
  end if;

  -- Closing an event and changing its RSVPs all lock this same row.
  select * into event from public.sports_events where id = p_event_id for update;
  if not found then
    raise exception 'This event no longer exists.';
  end if;

  select status into previous_status from public.sports_event_rsvps
    where event_id = p_event_id and user_id = attendee;

  if p_join then
    if previous_status is not null then
      return;
    end if;

    if not event.is_open or event.starts_at <= clock_timestamp() then
      raise exception 'Registration is closed.';
    end if;

    if event.attending_count < event.capacity then
      insert into public.sports_event_rsvps (event_id, user_id, status)
        values (p_event_id, attendee, 'attending');
      attending_delta := 1;
    else
      insert into public.sports_event_rsvps (event_id, user_id, status)
        values (p_event_id, attendee, 'waitlisted');
      waitlist_delta := 1;
    end if;
  else
    if previous_status is null then
      return;
    end if;

    delete from public.sports_event_rsvps
      where event_id = p_event_id and user_id = attendee;

    if previous_status = 'waitlisted' then
      waitlist_delta := -1;
    else
      attending_delta := -1;
      if event.is_open and event.starts_at > clock_timestamp() then
        update public.sports_event_rsvps set status = 'attending'
          where id = (
            select id from public.sports_event_rsvps
              where event_id = p_event_id and status = 'waitlisted'
              order by id limit 1
          );
        if found then
          attending_delta := 0;
          waitlist_delta := -1;
        end if;
      end if;
    end if;
  end if;

  update public.sports_events
    set attending_count = attending_count + attending_delta,
        waitlist_count = waitlist_count + waitlist_delta
    where id = p_event_id;
end;
$$;

revoke execute on function public.set_sports_rsvp(uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_sports_rsvp(uuid, boolean) to authenticated;

alter publication supabase_realtime add table public.sports_events;

commit;
