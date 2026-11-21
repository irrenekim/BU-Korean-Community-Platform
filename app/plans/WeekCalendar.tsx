"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent, type PointerEvent } from "react";
import { useSupabase } from "@/lib/supabase/client";
import {
  DAY_END, DAY_START, EVENT_MINUTES, WEEKDAYS, addDays, minutesLabel, rangeLabel, sameDay, startOfWeek, type Block,
} from "@/lib/schedule";
import type { MyEvent } from "./usePlans";

const HOUR_PX = 44;
const SNAP = 15;
const toPx = (min: number) => ((min - DAY_START) / 60) * HOUR_PX;

type Draft = { id?: number; weekday: number; start: number; end: number; title: string; isPublic: boolean };

// Your week: classes and anything busy repeat every week; sports events you
// RSVP'd to show on their date. Drag on an empty time to add something.
export default function WeekCalendar({ blocks, events, onChange }: {
  blocks: Block[];
  events: MyEvent[];
  onChange: () => void;
}) {
  const supabase = useSupabase();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [drag, setDrag] = useState<{ weekday: number; from: number; to: number } | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const dragging = useRef(false);
  const today = new Date();

  function minuteAt(event: PointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const raw = DAY_START + ((event.clientY - rect.top) / HOUR_PX) * 60;
    return Math.min(DAY_END, Math.max(DAY_START, Math.round(raw / SNAP) * SNAP));
  }

  function startDrag(weekday: number, event: PointerEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return; // started on an existing block
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    const at = minuteAt(event);
    setDrag({ weekday, from: at, to: at + 60 });
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    if (!dragging.current || !drag) return;
    const at = minuteAt(event);
    setDrag({ ...drag, to: Math.max(at, drag.from + SNAP) });
  }

  function endDrag() {
    if (!dragging.current || !drag) return;
    dragging.current = false;
    setDraft({ weekday: drag.weekday, start: drag.from, end: Math.min(drag.to, DAY_END), title: "", isPublic: false });
    setDrag(null);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || !draft.title.trim()) return;
    setError("");
    const values = {
      title: draft.title.trim(), weekday: draft.weekday, start_min: draft.start, end_min: draft.end, is_public: draft.isPublic,
    };
    const { error: saveError } = draft.id
      ? await supabase.from("schedule_blocks").update(values).eq("id", draft.id)
      : await supabase.from("schedule_blocks").insert(values);
    if (saveError) return setError("Could not save. Check the times and try again.");
    setDraft(null);
    onChange();
  }

  async function remove() {
    if (!draft?.id) return;
    const { error: deleteError } = await supabase.from("schedule_blocks").delete().eq("id", draft.id);
    if (deleteError) return setError("Could not delete.");
    setDraft(null);
    onChange();
  }

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-secondary px-3">‹</button>
          <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))} className="btn-secondary">This week</button>
          <button type="button" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-secondary px-3">›</button>
          <span className="ml-2 font-semibold">
            {days[0].toLocaleDateString([], { month: "short", day: "numeric" })} – {days[6].toLocaleDateString([], { month: "short", day: "numeric" })}
          </span>
        </div>
        <button type="button" onClick={() => setDraft({ weekday: today.getDay(), start: 600, end: 660, title: "", isPublic: false })}
          className="btn-primary">Add a class</button>
      </div>
      <p className="muted">Drag on an empty time to add something busy. It repeats every week. Games you RSVP to on Sports show up here too.</p>

      {draft && (
        <form onSubmit={save} className="card grid gap-3 p-5 sm:grid-cols-2">
          <h3 className="section-title sm:col-span-2">{draft.id ? "Edit" : "Add to your week"}</h3>
          <label className="block text-sm font-medium sm:col-span-2">What is it?
            <input autoFocus required maxLength={80} value={draft.title} placeholder="e.g. CS 111 lecture, Work shift"
              onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="input" />
          </label>
          <label className="block text-sm font-medium">Day
            <select value={draft.weekday} onChange={(e) => setDraft({ ...draft, weekday: Number(e.target.value) })} className="input">
              {WEEKDAYS.map((day, i) => <option key={day} value={i}>Every {day}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm font-medium">From
              <input type="time" step={900} required value={toTime(draft.start)}
                onChange={(e) => setDraft({ ...draft, start: fromTime(e.target.value) })} className="input" />
            </label>
            <label className="block text-sm font-medium">To
              <input type="time" step={900} required value={toTime(draft.end)}
                onChange={(e) => setDraft({ ...draft, end: fromTime(e.target.value) })} className="input" />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={draft.isPublic} onChange={(e) => setDraft({ ...draft, isPublic: e.target.checked })} />
            Show the name to friends <span className="text-gray-500">(otherwise they only see “Busy”)</span>
          </label>
          {error && <p role="alert" className="text-sm text-brand sm:col-span-2">{error}</p>}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <button type="submit" disabled={draft.end <= draft.start} className="btn-primary">Save</button>
            <button type="button" onClick={() => { setDraft(null); setError(""); }} className="btn-secondary">Cancel</button>
            {draft.id && <button type="button" onClick={() => void remove()} className="btn-ghost ml-auto text-brand">Delete</button>}
          </div>
        </form>
      )}

      {/* The week grid (scrolls sideways on small phones) */}
      <div className="card overflow-x-auto p-3">
        <div className="grid min-w-[640px] grid-cols-[52px_repeat(7,minmax(0,1fr))]">
          <div />
          {days.map((day) => (
            <div key={day.toISOString()} className="pb-2 text-center">
              <span className="block text-xs text-gray-500">{WEEKDAYS[day.getDay()]}</span>
              <span className={`mx-auto grid h-8 w-8 place-items-center rounded-full text-sm font-bold ${
                sameDay(day, today) ? "bg-brand text-on-brand" : ""}`}>{day.getDate()}</span>
            </div>
          ))}

          {/* hour labels */}
          <div className="relative" style={{ height: toPx(DAY_END) }}>
            {hours.slice(0, -1).map((h) => (
              <span key={h} className="absolute -translate-y-1/2 text-[11px] text-gray-400" style={{ top: toPx(h) }}>
                {minutesLabel(h)}
              </span>
            ))}
          </div>

          {days.map((day) => {
            const weekday = day.getDay();
            const mine = blocks.filter((b) => b.weekday === weekday);
            const dayEvents = events.filter((e) => sameDay(new Date(e.starts_at), day));
            return (
              <div key={day.toISOString()} role="presentation"
                className="relative cursor-crosshair touch-none border-l border-gray-100"
                style={{ height: toPx(DAY_END), backgroundImage: "linear-gradient(var(--color-gray-100) 1px, transparent 1px)", backgroundSize: `100% ${HOUR_PX}px` }}
                onPointerDown={(e) => startDrag(weekday, e)} onPointerMove={moveDrag} onPointerUp={endDrag}>
                {mine.map((b) => (
                  <button key={b.id} type="button"
                    onClick={() => setDraft({ id: b.id, weekday: b.weekday, start: b.start_min, end: b.end_min, title: b.title ?? "", isPublic: Boolean(b.is_public) })}
                    className="absolute inset-x-1 overflow-hidden rounded-lg bg-ink/90 px-1.5 py-1 text-left text-[11px] leading-tight text-paper hover:bg-ink"
                    style={{ top: toPx(Math.max(b.start_min, DAY_START)), height: Math.max(18, toPx(Math.min(b.end_min, DAY_END)) - toPx(Math.max(b.start_min, DAY_START))) }}>
                    <span className="block truncate font-semibold">{b.title}</span>
                    <span className="block truncate opacity-75">{rangeLabel(b.start_min, b.end_min)}{b.is_public ? "" : " · private"}</span>
                  </button>
                ))}
                {dayEvents.map((e) => {
                  const start = new Date(e.starts_at);
                  const min = start.getHours() * 60 + start.getMinutes();
                  return (
                    <Link key={e.id} href="/sports#events"
                      className="absolute inset-x-1 overflow-hidden rounded-lg border-l-4 border-brand bg-brand-soft px-1.5 py-1 text-[11px] leading-tight text-brand-dark"
                      style={{ top: toPx(Math.max(min, DAY_START)), height: Math.max(18, toPx(Math.min(min + EVENT_MINUTES, DAY_END)) - toPx(Math.max(min, DAY_START))) }}>
                      <span className="block truncate font-semibold">{e.title}</span>
                      <span className="block truncate">{e.sport} · going</span>
                    </Link>
                  );
                })}
                {drag && drag.weekday === weekday && (
                  <div className="pointer-events-none absolute inset-x-1 rounded-lg bg-brand/25 ring-2 ring-brand"
                    style={{ top: toPx(drag.from), height: toPx(drag.to) - toPx(drag.from) }}>
                    <span className="block px-1.5 py-1 text-[11px] font-semibold text-ink">{rangeLabel(drag.from, drag.to)}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const toTime = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
const fromTime = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
