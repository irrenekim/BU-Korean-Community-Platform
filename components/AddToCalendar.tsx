"use client";

import Icon from "./icons";
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";

export default function AddToCalendar({ event }: { event: CalendarEvent }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-1.5 text-gray-500"><Icon name="calendar" className="h-4 w-4" />Add to calendar</span>
      <a href={googleCalendarUrl(event)} target="_blank" rel="noopener noreferrer"
        className="rounded-full bg-gray-100 px-3 py-1 font-medium hover:bg-gray-200">Google</a>
      <button type="button" onClick={() => downloadIcs(event)}
        className="rounded-full bg-gray-100 px-3 py-1 font-medium hover:bg-gray-200">Apple / Outlook</button>
    </div>
  );
}
