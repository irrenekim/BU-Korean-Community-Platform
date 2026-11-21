// Helpers for weekly schedules and "when is everyone free?"
// Times are minutes after midnight (600 = 10:00 AM). Weekdays: 0 = Sunday … 6 = Saturday.

export type Block = { id?: number; title: string | null; weekday: number; start_min: number; end_min: number; is_public?: boolean };
export type Busy = { start: number; end: number; label?: string | null; kind: "class" | "event" };

export const DAY_START = 8 * 60;   // calendar shows 8 AM …
export const DAY_END = 23 * 60;    // … to 11 PM
export const EVENT_MINUTES = 120;  // sports events count as 2 hours busy
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function minutesLabel(min: number) {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, "0")} ${suffix}` : `${h12} ${suffix}`;
}

export function rangeLabel(start: number, end: number) {
  return `${minutesLabel(start)} – ${minutesLabel(end)}`;
}

// Sunday 00:00 of the week containing `date`
export function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// A dated event (ISO start) → busy minutes on its own day
export function eventToBusy(startIso: string, label?: string | null): { date: Date; busy: Busy } {
  const start = new Date(startIso);
  const min = start.getHours() * 60 + start.getMinutes();
  return { date: start, busy: { start: min, end: Math.min(min + EVENT_MINUTES, 24 * 60), label, kind: "event" } };
}

// Join overlapping busy times: [9–10, 9:30–11] → [9–11]
export function mergeBusy(list: { start: number; end: number }[]) {
  const sorted = [...list].sort((a, b) => a.start - b.start);
  const out: { start: number; end: number }[] = [];
  for (const item of sorted) {
    const last = out[out.length - 1];
    if (last && item.start <= last.end) last.end = Math.max(last.end, item.end);
    else out.push({ ...item });
  }
  return out;
}

// Gaps of at least `minutes` between DAY_START and DAY_END where nobody is busy.
// `notBefore` skips times that already passed today.
export function freeSlots(busy: { start: number; end: number }[], minutes: number, notBefore = DAY_START) {
  const merged = mergeBusy(busy);
  const slots: { start: number; end: number }[] = [];
  let cursor = Math.max(DAY_START, Math.ceil(notBefore / 30) * 30);
  for (const b of merged) {
    if (b.end <= cursor) continue;
    if (b.start - cursor >= minutes) slots.push({ start: cursor, end: b.start });
    cursor = Math.max(cursor, b.end);
  }
  if (DAY_END - cursor >= minutes) slots.push({ start: cursor, end: DAY_END });
  return slots;
}
