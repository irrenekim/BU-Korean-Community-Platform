begin;

create policy "Organizers can read their event RSVPs"
  on public.sports_event_rsvps for select to authenticated
  using (
    public.is_bu_student()
    and exists (
      select 1 from public.sports_events as event
      where event.id = sports_event_rsvps.event_id
        and event.organizer_id = public.clerk_user_id()
    )
  );

commit;
