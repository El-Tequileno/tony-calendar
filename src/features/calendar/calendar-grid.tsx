"use client";
import { useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import themePlugin from "@fullcalendar/react/themes/monarch";
import { CATEGORIES } from "@/lib/constants";
import { occurrences } from "@/lib/dates";
import type { Entry } from "@/lib/validation";
const plugins = [themePlugin, dayGridPlugin, interactionPlugin];
export function CalendarGrid({
  entries,
  anchor,
  view,
  onOpen,
  onAdd,
}: {
  entries: Entry[];
  anchor: string;
  view: "month" | "week";
  onOpen: (entry: Entry) => void;
  onAdd: (day: string) => void;
}) {
  const events = useMemo(
    () =>
      occurrences(entries).map((occurrence) => ({
        ...occurrence,
        color:
          occurrence.deadline === "callback"
            ? "#f5efdb"
            : CATEGORIES[occurrence.type].background,
        contrastColor:
          occurrence.deadline === "callback"
            ? "#766329"
            : CATEGORIES[occurrence.type].color,
        extendedProps: {
          entry: occurrence.entry,
          deadline: occurrence.deadline,
        },
      })),
    [entries],
  );
  return (
    <div className="calendar-widget">
      <FullCalendar
        key={`${anchor}-${view}`}
        plugins={plugins}
        initialView={view === "month" ? "dayGridMonth" : "dayGridWeek"}
        initialDate={anchor}
        headerToolbar={false}
        events={events}
        firstDay={1}
        height="auto"
        fixedWeekCount={false}
        dayMaxEvents={3}
        eventDisplay="block"
        displayEventTime={false}
        tableClass="calendar-table"
        dayCellClass="calendar-day"
        dayHeaderClass="calendar-day-header"
        eventClass={(info) =>
          `calendar-chip ${info.event.extendedProps.deadline === "callback" ? "callback" : info.event.extendedProps.entry.type}`
        }
        eventClick={(info) => onOpen(info.event.extendedProps.entry as Entry)}
        dateClick={(info) => onAdd(info.dateStr.slice(0, 10))}
        eventContent={(info) => {
          const entry = info.event.extendedProps.entry as Entry;
          const deadline = info.event.extendedProps.deadline;
          return (
            <div className="calendar-event-content" title={info.event.title}>
              {deadline ? (
                <small>
                  {deadline === "pre" ? "Pre-submission" : "Call back"}
                </small>
              ) : entry.startTime ? (
                <small>{entry.startTime}</small>
              ) : null}
              <span>
                {entry.type === "tender" ? `${entry.destination} · ` : ""}
                {entry.title}
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}
