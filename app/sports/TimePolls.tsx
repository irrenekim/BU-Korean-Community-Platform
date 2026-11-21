"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";
import { ALL_SPORTS } from "@/lib/tagOptions";
import AddToCalendar from "@/components/AddToCalendar";

// "When are you free?" polls, like When2meet: an organizer offers a few times,
// people tick the ones that work, and everyone sees how many are free for each.

type Slot = { id: number; starts_at: string };
type Poll = {
  id: string;
  organizer_id: string;
  title: string;
  sport: string;
  location: string | null;
  time_poll_slots: Slot[];
};

const when = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default function TimePolls({ userId }: { userId: string }) {
  const supabase = useSupabase();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<{ slot_id: number; user_id: string }[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
      const { data, error } = await supabase.from("time_polls")
        .select("id,organizer_id,title,sport,location,time_poll_slots(id,starts_at)")
        .gte("created_at", since).order("created_at", { ascending: false }).limit(20)
        .returns<Poll[]>();
      if (ignore) return;
      if (error) { setState("error"); return; }
      // Only show polls that still have a time in the future
      const now = Date.now();
      const upcoming = data
        .map((poll) => ({ ...poll, time_poll_slots: [...poll.time_poll_slots].sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }))
        .filter((poll) => poll.time_poll_slots.some((slot) => Date.parse(slot.starts_at) > now));
      const slotIds = upcoming.flatMap((poll) => poll.time_poll_slots.map((slot) => slot.id));
      const voteList = slotIds.length
        ? await supabase.from("time_poll_votes").select("slot_id,user_id").in("slot_id", slotIds)
        : { data: [], error: null };
      if (ignore) return;
      if (voteList.error) { setState("error"); return; }
      setPolls(upcoming);
      setVotes(voteList.data ?? []);
      setState("ready");
    })();
    return () => { ignore = true; };
  }, [supabase, revision]);

  async function toggleVote(slotId: number, isFree: boolean) {
    setBusy(true);
    const { error } = isFree
      ? await supabase.from("time_poll_votes").delete().eq("slot_id", slotId).eq("user_id", userId)
      : await supabase.from("time_poll_votes").insert({ slot_id: slotId });
    setBusy(false);
    if (!error) refresh();
  }

  async function deletePoll(pollId: string) {
    if (!confirm("Delete this poll?")) return;
    const { error } = await supabase.from("time_polls").delete().eq("id", pollId);
    if (!error) refresh();
  }

  if (state === "error") {
    return (
      <section className="card p-4 text-sm text-gray-600">
        Time polls aren&apos;t set up yet (run the new database file in Supabase).
      </section>
    );
  }

  return (
    <section className="space-y-4" aria-labelledby="time-polls-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="time-polls-heading" className="section-title">Find a time that works</h2>
          <p className="muted">Offer a few times, everyone taps when they&apos;re free, and the best time rises to the top. No group-chat back-and-forth.</p>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)}
            className="btn-primary">New time poll</button>
        )}
      </div>

      {creating && <NewPollForm onDone={(made) => { setCreating(false); if (made) refresh(); }} />}

      {state === "loading" && <p role="status">Loading polls…</p>}
      {state === "ready" && polls.length === 0 && !creating && (
        <div className="card px-6 py-10 text-center">
          <p className="font-semibold">No open polls</p>
          <p className="muted mt-1">Start one to find a time for your next game.</p>
        </div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2">
        {polls.map((poll) => {
          const counts = poll.time_poll_slots.map((slot) => votes.filter((vote) => vote.slot_id === slot.id).length);
          const best = Math.max(0, ...counts);
          return (
            <li key={poll.id} className="card space-y-3 p-5">
              <div>
                <p className="flex flex-wrap items-center gap-2"><span className="tag">{poll.sport}</span>
                  {poll.location && <span className="text-sm text-gray-600">{poll.location}</span>}</p>
                <h3 className="break-words text-lg font-semibold">{poll.title}</h3>
              </div>
              <ul className="space-y-2">
                {poll.time_poll_slots.map((slot, index) => {
                  const past = Date.parse(slot.starts_at) <= Date.now();
                  const mine = votes.some((vote) => vote.slot_id === slot.id && vote.user_id === userId);
                  const top = best > 0 && counts[index] === best;
                  return (
                    <li key={slot.id} className={`relative flex items-center justify-between gap-2 overflow-hidden rounded-xl border px-3 py-2 ${top ? "border-green-600" : "border-gray-200"}`}>
                      {/* bar showing how many are free, relative to the best time */}
                      <span aria-hidden className={`absolute inset-y-0 left-0 ${top ? "bg-green-100" : "bg-gray-100"}`}
                        style={{ width: `${best ? (counts[index] / best) * 100 : 0}%` }} />
                      <span className={`relative text-sm ${past ? "text-gray-400 line-through" : ""}`}>
                        {when(slot.starts_at)} {top && <span className="ml-1 rounded-md bg-green-600 px-1.5 py-0.5 text-[11px] font-bold text-white">Best</span>}
                      </span>
                      <span className="relative flex items-center gap-2">
                        <span className="text-sm font-medium">{counts[index]} free</span>
                        {!past && (
                          <button type="button" disabled={busy} aria-pressed={mine}
                            onClick={() => void toggleVote(slot.id, mine)}
                            className={`rounded-full px-3 py-1 text-sm font-semibold disabled:opacity-50 ${mine ? "bg-green-600 text-white" : "bg-white ring-1 ring-gray-300"}`}>
                            {mine ? "Free ✓" : "I'm free"}
                          </button>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {best > 0 && (() => {
                const slot = poll.time_poll_slots[counts.indexOf(best)];
                return <AddToCalendar event={{ title: poll.title, start: slot.starts_at, location: poll.location ?? undefined }} />;
              })()}
              {poll.organizer_id === userId && (
                <button type="button" onClick={() => void deletePoll(poll.id)}
                  className="text-sm text-brand hover:underline">Delete poll</button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NewPollForm({ onDone }: { onDone: (made: boolean) => void }) {
  const supabase = useSupabase();
  const [times, setTimes] = useState(["", "", ""]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    const slots = times.filter(Boolean).map((value) => new Date(value));
    if (slots.length < 2) return setError("Offer at least 2 times.");
    if (slots.some((date) => !Number.isFinite(date.getTime()) || date.getTime() <= Date.now())) {
      return setError("All times need to be in the future.");
    }
    setSaving(true);
    setError("");
    const { data: poll, error: pollError } = await supabase.from("time_polls").insert({
      title: String(fields.get("title")).trim(),
      sport: String(fields.get("sport")),
      location: String(fields.get("location")).trim() || null,
    }).select("id").single();
    if (pollError) {
      setSaving(false);
      return setError("Could not create the poll.");
    }
    const { error: slotError } = await supabase.from("time_poll_slots")
      .insert(slots.map((date) => ({ poll_id: poll.id, starts_at: date.toISOString() })));
    if (slotError) {
      await supabase.from("time_polls").delete().eq("id", poll.id);
      setSaving(false);
      return setError("Could not save the times.");
    }
    onDone(true);
  }

  const inputClass = "input";
  return (
    <form onSubmit={create} className="card space-y-3 p-5">
      <h3 className="text-lg font-semibold">New time poll</h3>
      <fieldset disabled={saving} className="space-y-3 text-sm font-medium">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">What&apos;s it for?
            <input name="title" required maxLength={100} placeholder="e.g. Sunday pickup soccer" className={inputClass} />
          </label>
          <label className="block">Sport
            <select name="sport" required defaultValue="" className={inputClass}>
              <option value="" disabled>Choose a sport</option>
              {[...ALL_SPORTS, "Other"].map((sport) => <option key={sport}>{sport}</option>)}
            </select>
          </label>
        </div>
        <label className="block">Where? (optional)
          <input name="location" maxLength={160} placeholder="e.g. Nickerson Field" className={inputClass} />
        </label>
        <div className="space-y-2">
          <p>Times to offer (2–6)</p>
          {times.map((value, index) => (
            <div key={index} className="flex gap-2">
              <input type="datetime-local" value={value} aria-label={`Time ${index + 1}`}
                onChange={(event) => setTimes((list) => list.map((item, i) => (i === index ? event.target.value : item)))}
                className="input mt-0 w-auto" />
              {times.length > 2 && (
                <button type="button" aria-label={`Remove time ${index + 1}`}
                  onClick={() => setTimes((list) => list.filter((_, i) => i !== index))}
                  className="btn-ghost">Remove</button>
              )}
            </div>
          ))}
          {times.length < 6 && (
            <button type="button" onClick={() => setTimes((list) => [...list, ""])}
              className="text-sm font-medium text-brand hover:underline">Add another time</button>
          )}
        </div>
        <div className="flex gap-3">
          <button type="submit" className="btn-primary">{saving ? "Creating…" : "Create poll"}</button>
          <button type="button" onClick={() => onDone(false)} className="btn-secondary">Cancel</button>
        </div>
      </fieldset>
      {error && <p role="alert" className="text-brand">{error}</p>}
    </form>
  );
}
