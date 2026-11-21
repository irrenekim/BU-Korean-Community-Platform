"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupabase } from "@/lib/supabase/client";
import AddToCalendar from "@/components/AddToCalendar";
import Avatar from "@/components/Avatar";
import {
  DAY_END, DAY_START, EVENT_MINUTES, WEEKDAYS, addDays, freeSlots, mergeBusy, rangeLabel, sameDay, type Block,
} from "@/lib/schedule";
import type { Friend, MyEvent } from "./usePlans";

type Person = { id: string; name: string; busy: { start: number; end: number; label: string | null }[] };
const DURATIONS = [30, 60, 120];

// Pick friends, a day and how long; see when everyone's free.
// Uses everyone's weekly classes plus sports games they're going to.
export default function FindTime({ blocks, events, friends, onAddFriends }: {
  blocks: Block[];
  events: MyEvent[];
  friends: Friend[];
  onAddFriends: () => void;
}) {
  const supabase = useSupabase();
  const [picked, setPicked] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [dayOffset, setDayOffset] = useState(0);
  const [friendBusy, setFriendBusy] = useState<Record<string, Person["busy"]>>({});
  const [chosen, setChosen] = useState<{ start: number; end: number } | null>(null);
  const [error, setError] = useState("");

  const day = useMemo(() => { const d = addDays(new Date(), dayOffset); d.setHours(0, 0, 0, 0); return d; }, [dayOffset]);

  // Load the picked friends' busy times for this day
  useEffect(() => {
    if (!picked.length) return;
    let ignore = false;
    (async () => {
      const [classes, games] = await Promise.all([
        supabase.rpc("friend_schedules", { p_friend_ids: picked }),
        supabase.rpc("friend_event_busy", {
          p_friend_ids: picked, p_from: day.toISOString(), p_to: addDays(day, 1).toISOString(),
        }),
      ]);
      if (ignore) return;
      if (classes.error) { setError("Could not load friends' schedules."); return; }
      setError("");
      const map: Record<string, Person["busy"]> = Object.fromEntries(picked.map((id) => [id, []]));
      for (const b of (classes.data ?? []) as { user_id: string; weekday: number; start_min: number; end_min: number; title: string | null }[]) {
        if (b.weekday === day.getDay()) map[b.user_id]?.push({ start: b.start_min, end: b.end_min, label: b.title });
      }
      for (const g of (games.data ?? []) as { user_id: string; starts_at: string; title: string }[]) {
        const s = new Date(g.starts_at);
        const min = s.getHours() * 60 + s.getMinutes();
        map[g.user_id]?.push({ start: min, end: Math.min(min + EVENT_MINUTES, 1440), label: g.title });
      }
      setFriendBusy(map);
    })();
    return () => { ignore = true; };
  }, [supabase, picked, day]);

  const me: Person = {
    id: "me",
    name: "You",
    busy: [
      ...blocks.filter((b) => b.weekday === day.getDay()).map((b) => ({ start: b.start_min, end: b.end_min, label: b.title })),
      ...events.filter((e) => sameDay(new Date(e.starts_at), day)).map((e) => {
        const s = new Date(e.starts_at);
        const min = s.getHours() * 60 + s.getMinutes();
        return { start: min, end: Math.min(min + EVENT_MINUTES, 1440), label: e.title };
      }),
    ],
  };
  const people: Person[] = [me, ...picked.map((id) => {
    const f = friends.find((x) => x.friend_id === id);
    return { id, name: f?.display_name || f?.username || "Friend", busy: friendBusy[id] ?? [] };
  })];

  const now = new Date();
  const notBefore = dayOffset === 0 ? now.getHours() * 60 + now.getMinutes() : DAY_START;
  const everyoneBusy = mergeBusy(people.flatMap((p) => p.busy));
  const slots = freeSlots(everyoneBusy, minutes, notBefore);

  if (friends.length === 0) {
    return (
      <div className="card px-6 py-12 text-center">
        <p className="font-semibold">Add a friend first</p>
        <p className="muted mt-1">Once they accept, you can see when you’re both free.</p>
        <button type="button" onClick={onAddFriends} className="btn-primary mt-4">Add friends</button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="card space-y-4 p-5">
        <div>
          <p className="mb-2 text-sm font-semibold">With</p>
          <div className="flex flex-wrap gap-2">
            {friends.map((f) => {
              const on = picked.includes(f.friend_id);
              return (
                <button key={f.friend_id} type="button" aria-pressed={on}
                  onClick={() => { setChosen(null); setPicked(on ? picked.filter((p) => p !== f.friend_id) : [...picked, f.friend_id]); }}
                  className={`chip gap-2 pl-1.5 ${on ? "chip-on" : ""}`}>
                  <Avatar name={f.display_name || f.username} size="sm" />
                  {f.display_name || f.username}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="mb-2 text-sm font-semibold">How long</p>
            <div className="inline-flex rounded-full bg-gray-100 p-1">
              {DURATIONS.map((d) => (
                <button key={d} type="button" aria-pressed={minutes === d} onClick={() => { setMinutes(d); setChosen(null); }}
                  className={`rounded-full px-3.5 py-1 text-sm font-semibold ${minutes === d ? "bg-white text-ink shadow-sm" : "text-gray-500"}`}>
                  {d < 60 ? `${d}m` : `${d / 60}h`}
                </button>
              ))}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-2 text-sm font-semibold">Day</p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)).map((d, i) => (
                <button key={i} type="button" aria-pressed={dayOffset === i} onClick={() => { setDayOffset(i); setChosen(null); }}
                  className={`chip shrink-0 flex-col px-3 py-1 leading-tight ${dayOffset === i ? "chip-on" : ""}`}>
                  <span className="text-[11px] opacity-70">{i === 0 ? "Today" : WEEKDAYS[d.getDay()]}</span>
                  <span className="font-bold">{d.getDate()}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-brand">{error}</p>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <section className="card p-5">
          <h2 className="section-title">{picked.length ? "Everyone’s free" : "You’re free"}</h2>
          <p className="muted">{day.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}</p>
          {slots.length === 0 ? (
            <p className="mt-3 text-sm">No {minutes < 60 ? `${minutes}-minute` : `${minutes / 60}-hour`} gap that works for everyone. Try another day or a shorter time.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {slots.map((slot) => {
                const pick = { start: slot.start, end: slot.start + minutes };
                const active = chosen?.start === pick.start;
                return (
                  <li key={slot.start}>
                    <button type="button" aria-pressed={active} onClick={() => setChosen(pick)}
                      className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm transition ${
                        active ? "bg-ink text-paper" : "bg-gray-50 hover:bg-gray-100"}`}>
                      <span className="font-semibold">{rangeLabel(slot.start, slot.end)}</span>
                      <span className={active ? "opacity-70" : "text-gray-500"}>{Math.floor((slot.end - slot.start) / 60)}h{(slot.end - slot.start) % 60 ? ` ${(slot.end - slot.start) % 60}m` : ""} open</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {chosen && (
            <div className="mt-4 space-y-2 rounded-2xl bg-brand-soft p-4">
              <p className="text-sm font-bold text-brand-dark">New plan · {rangeLabel(chosen.start, chosen.end)}</p>
              <p className="text-sm text-gray-700">With {people.slice(1).map((p) => p.name).join(", ") || "just you"}</p>
              <AddToCalendar event={{
                title: `Plan with ${people.slice(1).map((p) => p.name).join(", ") || "friends"}`,
                start: new Date(day.getTime() + chosen.start * 60_000).toISOString(),
                durationMinutes: minutes,
              }} />
            </div>
          )}
        </section>

        {/* Timeline: each person's busy times, then the shared free times */}
        <section className="card overflow-x-auto p-5">
          <div className="min-w-[520px] space-y-2">
            <div className="ml-30 flex justify-between text-[11px] text-gray-400">
              {[8, 11, 14, 17, 20, 23].map((h) => <span key={h}>{h > 12 ? h - 12 : h}{h >= 12 ? "pm" : "am"}</span>)}
            </div>
            {people.map((p) => (
              <Row key={p.id} label={p.name} avatar={p.id === "me" ? null : p.name}>
                {p.busy.map((b, i) => (
                  <Bar key={i} start={b.start} end={b.end} className="bg-gray-300" title={b.label ?? "Busy"} />
                ))}
              </Row>
            ))}
            <Row label="Everyone" strong>
              {freeSlots(everyoneBusy, 15, notBefore).map((s) => (
                <Bar key={s.start} start={s.start} end={s.end} className="bg-green-500/80" title="Everyone’s free" />
              ))}
              {chosen && <Bar start={chosen.start} end={chosen.end} className="bg-ink ring-2 ring-paper" title="Your pick" />}
            </Row>
            <div className="ml-30 flex gap-4 pt-1 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-gray-300" />Busy</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-4 rounded bg-green-500/80" />Everyone’s free</span>
            </div>
          </div>
          <p className="muted mt-3">Friends see “Busy” unless someone chose to show a class name.</p>
        </section>
      </div>
    </div>
  );
}

function Row({ label, avatar, strong, children }: { label: string; avatar?: string | null; strong?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`flex w-28 shrink-0 items-center gap-1.5 truncate text-sm ${strong ? "font-bold" : ""}`}>
        {avatar && <Avatar name={avatar} size="sm" />}{label}
      </span>
      <div className="relative h-7 flex-1 overflow-hidden rounded-lg bg-gray-50 ring-1 ring-gray-200">{children}</div>
    </div>
  );
}

function Bar({ start, end, className, title }: { start: number; end: number; className: string; title: string }) {
  const span = DAY_END - DAY_START;
  const s = Math.max(start, DAY_START);
  const e = Math.min(end, DAY_END);
  if (e <= s) return null;
  return (
    <span title={`${title}: ${rangeLabel(start, end)}`} className={`absolute inset-y-1 rounded-md ${className}`}
      style={{ left: `${((s - DAY_START) / span) * 100}%`, width: `${((e - s) / span) * 100}%` }} />
  );
}
