"use client";

import FullCalendar from "@fullcalendar/react";
import type { EventInput } from "@fullcalendar/core";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import "./sports-calendar.css";

export default function SportsCalendar({ events }: { events?: EventInput[] }) {
  return (
    <section
      aria-labelledby="sports-calendar-heading"
      className="card p-3 sm:p-5"
    >
      <h2 id="sports-calendar-heading" className="section-title mb-4">
        Calendar
      </h2>
      <div className="sports-calendar">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            start: "title",
            center: "",
            end: "prev,next today dayGridMonth,timeGridWeek",
          }}
          height="auto"
          events={events}
        />
      </div>
    </section>
  );
}
