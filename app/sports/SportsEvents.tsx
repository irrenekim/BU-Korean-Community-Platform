"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import SportsCalendar from "./SportsCalendar";
import SportsEventForm, { sports } from "./SportsEventForm";
import SportsEventRoster from "./SportsEventRoster";

type SportsEvent = {
  id: string;
  organizer_id: string;
  title: string;
  sport: string;
  starts_at: string;
  location: string;
  description: string;
  photo_url: string | null;
  capacity: number;
  is_open: boolean;
  attending_count: number;
  waitlist_count: number;
};

type RsvpStatus = "attending" | "waitlisted";
type EventList = {
  events: SportsEvent[];
  registrations: Record<string, RsvpStatus>;
  loadedAt: number;
};

export default function SportsEvents() {
  const { isLoaded, session } = useSession();
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (configured && session) {
    return <SignedInSportsEvents key={session.id} userId={session.user.id} />;
  }

  return (
    <>
      <SportsCalendar />
      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-lg font-semibold">Sports events</h2>
        {!configured ? (
          <p className="mt-2 text-sm text-gray-600">Sports events are unavailable while the database is being set up.</p>
        ) : !isLoaded ? (
          <p role="status">Checking sign-in…</p>
        ) : (
          <SignInButton mode="modal">
            <button type="button" className="mt-2 rounded border px-3 py-2">
              Log in to view sports events
            </button>
          </SignInButton>
        )}
      </section>
    </>
  );
}

function SignedInSportsEvents({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const [data, setData] = useState<EventList>();
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const channel = supabase.channel("sports-events")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "sports_events",
      }, refresh)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") refresh();
      });
    const timer = window.setInterval(refresh, 30_000);
    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [supabase, refresh]);

  useEffect(() => {
    const abort = new AbortController();
    const now = new Date();
    async function loadEvents() {
      try {
        const [events, registrations] = await Promise.all([
          supabase.from("sports_events").select("*")
            .gte("starts_at", now.toISOString()).order("starts_at").abortSignal(abort.signal),
          supabase.from("sports_event_rsvps").select("event_id,status")
            .eq("user_id", userId).abortSignal(abort.signal),
        ]);
        if (events.error || registrations.error) throw events.error ?? registrations.error;
        if (abort.signal.aborted) return;
        setData({
          events: events.data,
          registrations: Object.fromEntries(registrations.data.map(({ event_id, status }) => [event_id, status])),
          loadedAt: now.getTime(),
        });
        setLoadError(false);
      } catch {
        if (!abort.signal.aborted) setLoadError(true);
      }
    }
    void loadEvents();
    return () => abort.abort();
  }, [supabase, userId, revision]);

  async function changeRegistration(event: SportsEvent, action: "join" | "cancel" | "close") {
    setBusy(true);
    setActionError("");
    setNotice("");
    try {
      const { error } = action === "close"
        ? await supabase.from("sports_events").update({ is_open: false }).eq("id", event.id).select("id").single()
        : await supabase.rpc("set_sports_rsvp", { p_event_id: event.id, p_join: action === "join" });
      if (error) throw error;
      setNotice(action === "close" ? "Registration closed." : "Registration updated.");
    } catch {
      setActionError("Could not update registration. Check the event status and try again.");
    } finally {
      refresh();
      setBusy(false);
    }
  }

  const search = query.trim().toLowerCase();
  const events = (data?.events ?? []).filter((event) =>
    (!sport || event.sport === sport) &&
    [event.title, event.location, event.description].some((value) => value.toLowerCase().includes(search))
  );

  return (
    <>
      <SportsCalendar events={events.map((event) => ({ id: event.id, title: event.title, start: event.starts_at }))} />
      <SportsEventForm onCreated={() => { setNotice("Event created."); refresh(); }} />
      <section className="mt-6 space-y-4" aria-labelledby="upcoming-sports-events">
        <h2 id="upcoming-sports-events" className="text-xl font-semibold">Upcoming sports events</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input aria-label="Search events" type="search" placeholder="Search events" value={query}
            onChange={(event) => setQuery(event.target.value)} className="rounded border bg-white px-3 py-2" />
          <select aria-label="Filter by sport" value={sport} onChange={(event) => setSport(event.target.value)}
            className="rounded border bg-white px-3 py-2">
            <option value="">All sports</option>
            {sports.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        {notice && <p role="status">{notice}</p>}
        {loadError && (
          <p role="alert" className="text-red-700">
            Could not load sports events. <button type="button" onClick={refresh} className="underline">Retry</button>
          </p>
        )}
        {actionError && <p role="alert" className="text-red-700">{actionError}</p>}
        {!data && !loadError && <p role="status">Loading sports events…</p>}
        {data && events.length === 0 && <p>No upcoming events match your search.</p>}
        <ul className="grid gap-4 sm:grid-cols-2">
          {events.map((event) => {
            const registration = data?.registrations[event.id];
            const open = event.is_open && Date.parse(event.starts_at) > (data?.loadedAt ?? 0);
            return (
              <li key={event.id} className="overflow-hidden rounded-lg border bg-white">
                {event.photo_url && (
                  // User-supplied URLs are loaded directly and never fetched by the app server.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.photo_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-40 w-full object-cover" />
                )}
                <div className="space-y-2 p-4">
                  <p className="text-sm text-gray-600">{event.sport} · {open ? "Open" : "Closed"}</p>
                  <h3 className="break-words text-lg font-semibold">{event.title}</h3>
                  <p><time dateTime={event.starts_at}>{new Date(event.starts_at).toLocaleString()}</time> · {event.location}</p>
                  <p className="break-words whitespace-pre-wrap">{event.description}</p>
                  <p aria-live="polite" className="text-sm">{event.attending_count}/{event.capacity} attending · {event.waitlist_count} waiting</p>
                  {registration && <p className="text-sm font-medium">{registration === "attending" ? "You’re attending" : "You’re on the waitlist"}</p>}
                  <div className="flex flex-wrap gap-2">
                    {(registration || open) && (
                      <button type="button" disabled={busy}
                        onClick={() => void changeRegistration(event, registration ? "cancel" : "join")}
                        className="rounded bg-red-700 px-3 py-2 text-sm text-white disabled:opacity-50">
                        {registration ? "Cancel RSVP" : event.attending_count >= event.capacity ? "Join waitlist" : "RSVP"}
                      </button>
                    )}
                    {open && event.organizer_id === userId && (
                      <button type="button" disabled={busy} onClick={() => void changeRegistration(event, "close")}
                        className="rounded border px-3 py-2 text-sm disabled:opacity-50">Close registration</button>
                    )}
                  </div>
                  {event.organizer_id === userId && (
                    <SportsEventRoster eventId={event.id} revision={revision} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
