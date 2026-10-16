import type { Entry } from "./validation";
import { CALENDAR_TIME_ZONE } from "./constants";
export function calendarToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CALENDAR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) =>
    parts.find((part) => part.type === type)!.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}
export function isoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(day: string, count: number) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function formatDay(day: string, short = false) {
  return day
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "UTC",
        month: short ? "short" : "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(`${day}T12:00:00Z`))
    : "Not entered";
}
export type Occurrence = {
  id: string;
  entryId: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  deadline?: "pre" | "callback";
  type: Entry["type"];
  entry: Entry;
};
export function occurrences(entries: Entry[]): Occurrence[] {
  return entries.flatMap<Occurrence>((entry) =>
    entry.type === "tender"
      ? [
          {
            id: `${entry.id}:pre`,
            entryId: entry.id,
            title: `Pre-submission · ${entry.destination} · ${entry.title}`,
            start: entry.preSubmissionDeadline,
            end: addDays(entry.preSubmissionDeadline, 1),
            allDay: true,
            deadline: "pre" as const,
            type: entry.type,
            entry,
          },
          {
            id: `${entry.id}:callback`,
            entryId: entry.id,
            title: `Call back · ${entry.destination} · ${entry.title}`,
            start: entry.callBackDeadline,
            end: addDays(entry.callBackDeadline, 1),
            allDay: true,
            deadline: "callback" as const,
            type: entry.type,
            entry,
          },
        ]
      : [
          {
            id: entry.id,
            entryId: entry.id,
            title: entry.title,
            start: entry.startDate,
            end: addDays(entry.endDate, 1),
            allDay: true,
            type: entry.type,
            entry,
          },
        ],
  );
}
export function inRange(entry: Entry, start: string, endExclusive: string) {
  return occurrences([entry]).some(
    (o) => o.start < endExclusive && o.end > start,
  );
}
export function when(entry: Entry) {
  if (entry.type === "tender")
    return `Pre-submission: ${formatDay(entry.preSubmissionDeadline)} · Call back: ${formatDay(entry.callBackDeadline)}`;
  return `${formatDay(entry.startDate)}${entry.endDate !== entry.startDate ? ` – ${formatDay(entry.endDate)}` : ""}${entry.startTime ? ` · ${entry.startTime}${entry.endTime ? `–${entry.endTime}` : ""} (${entry.timeZone})` : ""}`;
}
