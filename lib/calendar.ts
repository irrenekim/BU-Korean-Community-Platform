// "Add to calendar" links. Nobody connects an account: Google gets a pre-filled
// link, Apple (and Outlook) get a small .ics calendar file to open.

export type CalendarEvent = {
  title: string;
  start: string; // ISO date
  durationMinutes?: number;
  location?: string;
  details?: string;
};

// 2026-11-21T17:00:00.000Z → 20261121T170000Z
function stamp(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function range(event: CalendarEvent) {
  const start = new Date(event.start);
  const end = new Date(start.getTime() + (event.durationMinutes ?? 120) * 60_000);
  return { start, end };
}

export function googleCalendarUrl(event: CalendarEvent) {
  const { start, end } = range(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: event.details ?? "",
    location: event.location ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

// Text in .ics files needs commas, semicolons and new lines escaped.
function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

export function downloadIcs(event: CalendarEvent) {
  const { start, end } = range(event);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Korean Community BU//EN",
    "BEGIN:VEVENT",
    `UID:${stamp(start)}-${Math.random().toString(36).slice(2)}@korean-community`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${icsText(event.title)}`,
    event.location ? `LOCATION:${icsText(event.location)}` : "",
    event.details ? `DESCRIPTION:${icsText(event.details)}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");

  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${event.title.replace(/[^\w ]+/g, "").trim() || "event"}.ics`;
  link.click();
  URL.revokeObjectURL(url);
}
