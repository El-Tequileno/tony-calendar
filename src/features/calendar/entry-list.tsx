"use client";
import { ArrowRight } from "lucide-react";
import { CATEGORIES } from "@/lib/constants";
import { formatDay, occurrences } from "@/lib/dates";
import type { Entry } from "@/lib/validation";
export function EntryList({
  entries,
  start,
  end,
  tenders,
  canWrite,
  onOpen,
}: {
  entries: Entry[];
  start: string;
  end: string;
  tenders: boolean;
  canWrite: boolean;
  onOpen: (entry: Entry) => void;
}) {
  if (!entries.length)
    return (
      <div className="empty-state">
        <h3>No entries in this view</h3>
        <p>
          {canWrite
            ? "Try another month or filter, or add a new entry."
            : "Try another month or filter."}
        </p>
      </div>
    );
  if (tenders) {
    const destinations = [...new Set(entries.map((e) => e.destination))].sort();
    return (
      <div className="tender-list">
        {destinations.map((destination) => {
          const calls = entries.filter((e) => e.destination === destination);
          return (
            <section key={destination} className="destination-group">
              <header>
                <h3>{destination}</h3>
                <span>
                  {calls.length} tender {calls.length === 1 ? "call" : "calls"}
                </span>
              </header>
              {calls.map((entry) => (
                <article className="tender-card" key={entry.id}>
                  <button
                    className="tender-title"
                    onClick={() => onOpen(entry)}
                  >
                    <strong>{entry.title}</strong>
                    <span>
                      View tender <ArrowRight size={13} />
                    </span>
                  </button>
                  <p>
                    {entry.priceRange || "Price range not entered"} ·{" "}
                    {entry.requirements.length}{" "}
                    {entry.requirements.length === 1
                      ? "priority"
                      : "priorities"}
                  </p>
                  <p className="spec-preview">
                    {entry.requirements[0]?.specification}
                  </p>
                  <div className="deadline-buttons">
                    <button onClick={() => onOpen(entry)}>
                      <i />{" "}
                      <span>
                        Pre-submission Deadline
                        <strong>
                          {formatDay(entry.preSubmissionDeadline, true)}
                        </strong>
                      </span>
                    </button>
                    <button onClick={() => onOpen(entry)}>
                      <i />
                      <span>
                        Call Back Deadline
                        <strong>
                          {formatDay(entry.callBackDeadline, true)}
                        </strong>
                      </span>
                    </button>
                  </div>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    );
  }
  const items = occurrences(entries)
    .filter((o) => o.start < end && o.end > start)
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) ||
        a.entry.startTime.localeCompare(b.entry.startTime),
    );
  return (
    <div className="entry-list">
      {items.map((item) => (
        <button
          className="list-entry"
          onClick={() => onOpen(item.entry)}
          key={item.id}
        >
          <span className="list-date">{formatDay(item.start, true)}</span>
          <i style={{ background: CATEGORIES[item.type].color }} />
          <span>
            <strong>{item.entry.title}</strong>
            <small>
              {item.deadline
                ? `${item.deadline === "pre" ? "Pre-submission" : "Call back"} · ${item.entry.destination}`
                : `${CATEGORIES[item.type].singular} · ${item.entry.city}${item.entry.startTime ? ` · ${item.entry.startTime} (${item.entry.timeZone})` : ""}`}
            </small>
          </span>
          <ArrowRight size={17} />
        </button>
      ))}
    </div>
  );
}
