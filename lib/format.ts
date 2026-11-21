// Small display helpers shared across the site.

// "just now", "5m ago", "3h ago", "2d ago", then a date.
export function timeAgo(iso: string) {
  const seconds = Math.round((Date.now() - Date.parse(iso)) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

// "Irene Kim" → "IK"; "BU student" → "BS"
export function initials(name: string | null | undefined) {
  const parts = (name || "BU student").trim().split(/\s+/);
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

// Days until a date, counted by calendar day: "D-Day", "D-3"
export function dDay(iso: string) {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const day = new Date(iso); day.setHours(0, 0, 0, 0);
  const days = Math.round((day.getTime() - start.getTime()) / 86_400_000);
  return days <= 0 ? "D-Day" : `D-${days}`;
}

// "Sat, Nov 22 · 2:00 PM"
export function shortWhen(iso: string) {
  const date = new Date(iso);
  return `${date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

// Same soft color for the same name every time
const avatarColors = ["bg-rose-100 text-rose-700", "bg-amber-100 text-amber-800", "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700", "bg-violet-100 text-violet-700", "bg-teal-100 text-teal-700"];
export function avatarColor(name: string | null | undefined) {
  let hash = 0;
  for (const char of name || "") hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return avatarColors[hash % avatarColors.length];
}
