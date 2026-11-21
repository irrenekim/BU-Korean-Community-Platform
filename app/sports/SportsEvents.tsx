"use client";

import { SignInButton, useSession } from "@clerk/nextjs";
import { useCallback, useEffect, useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import SportsCalendar from "./SportsCalendar";
import SportsEventForm, { sports } from "./SportsEventForm";
import SportsEventRoster from "./SportsEventRoster";
import AddToCalendar from "@/components/AddToCalendar";
import { dDay } from "@/lib/format";
import Icon from "@/components/icons";

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
    <section className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <p className="font-semibold">Sports events</p>
      {!configured ? (
        <p className="muted">Sports events are unavailable while the database is being set up.</p>
      ) : !isLoaded ? (
        <p role="status" className="muted">Checking sign-in…</p>
      ) : (
        <>
          <p className="muted">Log in with your @bu.edu email to see games, RSVP and join waitlists.</p>
          <SignInButton mode="modal">
            <button type="button" className="btn-primary">Log in</button>
          </SignInButton>
        </>
      )}
    </section>
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <input aria-label="Search events" type="search" placeholder="Search events" value={query}
          onChange={(event) => setQuery(event.target.value)} className="input mt-0 w-full rounded-full sm:w-64" />
        <select aria-label="Filter by sport" value={sport} onChange={(event) => setSport(event.target.value)}
          className="input mt-0 w-auto rounded-full">
          <option value="">All sports</option>
          {sports.map((item) => <option key={item}>{item}</option>)}
        </select>
        <SportsEventForm onCreated={() => { setNotice("Event created."); refresh(); }} />
      </div>

      <section className="space-y-4" aria-labelledby="upcoming-sports-events">
        <h2 id="upcoming-sports-events" className="section-title px-1">Coming up</h2>
        {notice && <p role="status" className="rounded-2xl bg-green-50 px-4 py-2.5 text-sm font-medium text-green-800">{notice}</p>}
        {loadError && (
          <p role="alert" className="text-brand">
            Could not load sports events. <button type="button" onClick={refresh} className="underline">Retry</button>
          </p>
        )}
        {actionError && <p role="alert" className="text-brand">{actionError}</p>}
        {!data && !loadError && <p role="status" className="muted">Loading sports events…</p>}
        {data && events.length === 0 && (
          <div className="card px-6 py-10 text-center">
            <p className="font-semibold">No upcoming events{query || sport ? " match your search" : " yet"}</p>
            <p className="muted mt-1">Start one with “Create event”, or use Find a time to pick a date first.</p>
          </div>
        )}
        <ul className="grid gap-4 md:grid-cols-2">
          {events.map((event) => {
            const registration = data?.registrations[event.id];
            const open = event.is_open && Date.parse(event.starts_at) > (data?.loadedAt ?? 0);
            const start = new Date(event.starts_at);
            const full = event.attending_count >= event.capacity;
            return (
              <li key={event.id} className="card overflow-hidden">
                {event.photo_url && (
                  // User-supplied URLs are loaded directly and never fetched by the app server.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={event.photo_url} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-40 w-full object-cover" />
                )}
                <div className="space-y-3 p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 shrink-0 overflow-hidden rounded-2xl bg-gray-50 text-center ring-1 ring-gray-200">
                      <p className="bg-brand py-0.5 text-[11px] font-bold text-on-brand">
                        {start.toLocaleDateString([], { month: "short" })}
                      </p>
                      <p className="py-1 text-xl font-bold leading-none">{start.getDate()}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tag">{event.sport}</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${open ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                          {open ? "Open" : "Closed"}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">{dDay(event.starts_at)}</span>
                      </div>
                      <h3 className="mt-1 break-words text-lg font-semibold">{event.title}</h3>
                      <p className="text-sm text-gray-600">
                        <span className="inline-flex items-center gap-1"><Icon name="clock" className="h-4 w-4" />
                          <time dateTime={event.starts_at}>{start.toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })}</time></span>
                        <span className="ml-3 inline-flex items-center gap-1"><Icon name="pin" className="h-4 w-4" />{event.location}</span>
                      </p>
                    </div>
                  </div>
                  <p className="break-words whitespace-pre-wrap text-sm text-gray-700">{event.description}</p>
                  <div aria-live="polite">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{event.attending_count}/{event.capacity} going</span>
                      {event.waitlist_count > 0 && <span>{event.waitlist_count} on waitlist</span>}
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${full ? "bg-amber-500" : "bg-green-600"}`}
                        style={{ width: `${Math.min(100, (event.attending_count / event.capacity) * 100)}%` }} />
                    </div>
                  </div>
                  {registration && (
                    <p className="text-sm font-medium text-green-800">
                      {registration === "attending" ? "You’re going" : "You’re on the waitlist"}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {(registration || open) && (
                      <button type="button" disabled={busy}
                        onClick={() => void changeRegistration(event, registration ? "cancel" : "join")}
                        className={registration ? "btn-secondary" : "btn-primary"}>
                        {registration ? "Cancel RSVP" : full ? "Join waitlist" : "RSVP"}
                      </button>
                    )}
                    {open && event.organizer_id === userId && (
                      <button type="button" disabled={busy} onClick={() => void changeRegistration(event, "close")}
                        className="btn-secondary">Close registration</button>
                    )}
                  </div>
                  <AddToCalendar event={{
                    title: event.title, start: event.starts_at, location: event.location, details: event.description,
                  }} />
                  {event.organizer_id === userId && (
                    <SportsEventRoster eventId={event.id} revision={revision} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <SportsCalendar events={events.map((event) => ({ id: event.id, title: event.title, start: event.starts_at }))} />
    </div>
  );
}
