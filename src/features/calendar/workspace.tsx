"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  X,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIES, PROVINCES, type Category } from "@/lib/constants";
import { api, RequestError } from "@/lib/api";
import { isoDay, addDays, inRange } from "@/lib/dates";
import type { Entry } from "@/lib/validation";
import { EntryForm } from "@/features/entries/entry-form";
import {
  EntryDetail,
  type Capabilities,
} from "@/features/entries/entry-detail";
import { EntryList } from "./entry-list";
import { PeopleSection } from "@/features/people/people-section";
const CalendarGrid = dynamic(
  () => import("./calendar-grid").then((module) => module.CalendarGrid),
  {
    ssr: false,
    loading: () => <div className="empty-state">Loading calendar…</div>,
  },
);
type FormState = { entry?: Entry; type: Category; day: string };
export function Workspace({
  email,
  isTony,
  capabilities,
  initialEntryId,
}: {
  email: string;
  isTony: boolean;
  capabilities: Capabilities;
  initialEntryId?: string;
}) {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [category, setCategory] = useState<Category | "all">("all");
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [province, setProvince] = useState("all");
  const [destination, setDestination] = useState("all");
  const [anchor, setAnchor] = useState(() => isoDay(new Date()));
  const [selected, setSelected] = useState<string | null>(
    initialEntryId || null,
  );
  const [form, setForm] = useState<FormState | null>(null);
  const [menu, setMenu] = useState(false);
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshed, setRefreshed] = useState("");
  const reload = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const result = await api<{ entries: Entry[] }>("/api/entries");
        setEntries(result.entries);
        setError("");
        setRefreshed(
          new Date().toLocaleTimeString("en-CA", {
            hour: "numeric",
            minute: "2-digit",
          }),
        );
      } catch (error) {
        if (error instanceof RequestError && error.status === 401) {
          router.replace("/login");
          router.refresh();
        } else
          setError(
            error instanceof Error
              ? error.message
              : "Unable to load the calendar.",
          );
      } finally {
        setLoading(false);
      }
    },
    [router],
  );
  useEffect(() => {
    reload();
    const onFocus = () => {
      if (!document.hidden) reload(true);
    };
    window.addEventListener("focus", onFocus);
    const timer = setInterval(() => {
      if (!document.hidden) reload(true);
    }, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [reload]);
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timer);
  }, [message]);
  const date = new Date(`${anchor}T12:00:00`);
  const monthStart = `${anchor.slice(0, 7)}-01`;
  const monthEnd = isoDay(new Date(date.getFullYear(), date.getMonth() + 1, 1));
  const weekStart = addDays(anchor, -((date.getDay() + 6) % 7));
  const rangeStart = view === "week" ? weekStart : monthStart;
  const rangeEnd = view === "week" ? addDays(weekStart, 7) : monthEnd;
  const matching = useMemo(
    () =>
      entries.filter(
        (entry) =>
          (category === "all" || entry.type === category) &&
          (category === "tender"
            ? destination === "all" || entry.destination === destination
            : province === "all" || entry.provinces.includes(province)),
      ),
    [entries, category, destination, province],
  );
  const visible = matching.filter((entry) =>
    inRange(entry, rangeStart, rangeEnd),
  );
  const monthEntries = matching.filter((entry) =>
    inRange(entry, monthStart, monthEnd),
  );
  const destinations = [
    ...new Set(
      entries
        .filter((entry) => entry.type === "tender")
        .map((entry) => entry.destination),
    ),
  ].sort();
  const current = entries.find((entry) => entry.id === selected);
  const title =
    category === "all" ? "All calendar" : CATEGORIES[category].label;
  function update(entry: Entry) {
    setEntries((previous) =>
      previous.some((e) => e.id === entry.id)
        ? previous.map((e) => (e.id === entry.id ? entry : e))
        : [...previous, entry],
    );
  }
  function navigate(direction: number) {
    setAnchor(
      view === "week"
        ? addDays(anchor, direction * 7)
        : isoDay(new Date(date.getFullYear(), date.getMonth() + direction, 1)),
    );
  }
  function chooseCategory(value: Category | "all") {
    setPeopleOpen(false);
    setCategory(value);
    setMenu(false);
    if (
      value === "tender" &&
      !entries.some(
        (e) => e.type === "tender" && inRange(e, monthStart, monthEnd),
      )
    ) {
      const first = entries
        .filter((e) => e.type === "tender")
        .map((e) => e.preSubmissionDeadline)
        .sort()[0];
      if (first) setAnchor(first);
    }
  }
  return (
    <div className="app-shell">
      {menu && (
        <button
          className="mobile-backdrop"
          aria-label="Close menu"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            T<span>·</span>C
          </span>
          <div>
            Tony Calendar<small>Planning workspace</small>
          </div>
        </div>
        <p className="sidebar-label">WORKSPACE</p>
        <nav aria-label="Calendar sections">
          <button
            className={!peopleOpen && category === "all" ? "active" : ""}
            onClick={() => chooseCategory("all")}
          >
            <CalendarDays size={17} />
            <span>All calendar</span>
            <small>{entries.length}</small>
          </button>
          {Object.entries(CATEGORIES).map(([key, info]) => (
            <button
              key={key}
              className={!peopleOpen && category === key ? "active" : ""}
              onClick={() => chooseCategory(key as Category)}
            >
              <i style={{ background: info.color }} />
              <span>{info.label}</span>
              <small>{entries.filter((e) => e.type === key).length}</small>
            </button>
          ))}
          {isTony && (
            <button
              className={`people-nav ${peopleOpen ? "active" : ""}`}
              onClick={() => {
                setPeopleOpen(true);
                setMenu(false);
                setSelected(null);
                setForm(null);
              }}
            >
              <UsersRound size={17} />
              <span>People</span>
            </button>
          )}
        </nav>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <span>✳</span>
            <strong>Shared workspace</strong>
            <p>
              One calendar for Tony and distributors, wherever the next visit
              takes you.
            </p>
          </div>
          <div className="session-person">
            <span>{email}</span>
            <button
              aria-label="Leave workspace"
              title="Leave workspace"
              onClick={async () => {
                try {
                  await api("/api/session", { method: "DELETE" });
                  router.replace("/login");
                  router.refresh();
                } catch {
                  setMessage(
                    "Unable to leave the workspace. Please try again.",
                  );
                }
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-column">
        <header className="topbar">
          <div>
            <Button
              variant="icon"
              className="mobile-menu"
              aria-label="Open menu"
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X size={19} /> : <Menu size={19} />}
            </Button>
            <span className="eyebrow">{date.getFullYear()} PLANNING</span>
            <span className="topbar-subtitle">
              A shared view of visits, events, and deadlines
            </span>
          </div>
          <span className="connection-pill">
            <i />
            Shared workspace
          </span>
        </header>
        <main className="content">
          {peopleOpen && isTony ? (
            <PeopleSection onMessage={setMessage} />
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR SCHEDULE AT A GLANCE</p>
                  <h1>{title}</h1>
                  <p>
                    {category === "all"
                      ? "Visits, events, and provincial tender deadlines in one place."
                      : CATEGORIES[category].description}
                  </p>
                </div>
                <Button
                  disabled={loading || !!error}
                  onClick={() =>
                    setForm({
                      type: category === "all" ? "market" : category,
                      day: anchor,
                    })
                  }
                >
                  <Plus size={17} />
                  New entry
                </Button>
              </div>
              <div
                className={`summary-row ${category !== "all" ? "single" : ""}`}
              >
                {Object.entries(CATEGORIES)
                  .filter(([key]) => category === "all" || key === category)
                  .map(([key, info]) => (
                    <div className="summary-card" key={key}>
                      <span
                        style={{
                          background: info.background,
                          color: info.color,
                        }}
                      >
                        {info.icon}
                      </span>
                      <div>
                        <strong>
                          {monthEntries.filter((e) => e.type === key).length}
                        </strong>
                        <small>{info.label} this month</small>
                      </div>
                    </div>
                  ))}
              </div>
              {error && (
                <div className="error-banner" role="alert">
                  {error}
                  <Button variant="secondary" onClick={() => reload()}>
                    Try again
                  </Button>
                </div>
              )}
              <section className="calendar-panel" aria-label="Calendar">
                <div className="calendar-toolbar">
                  <div className="period-controls">
                    <Button
                      variant="icon"
                      aria-label="Previous period"
                      onClick={() => navigate(-1)}
                    >
                      <ChevronLeft size={17} />
                    </Button>
                    <Button
                      variant="icon"
                      aria-label="Next period"
                      onClick={() => navigate(1)}
                    >
                      <ChevronRight size={17} />
                    </Button>
                    <h2>
                      {view === "week"
                        ? `${weekStart.slice(5)} – ${addDays(weekStart, 6).slice(5)}, ${date.getFullYear()}`
                        : date.toLocaleDateString("en-CA", {
                            month: "long",
                            year: "numeric",
                          })}
                    </h2>
                    <Button
                      variant="secondary"
                      onClick={() => setAnchor(isoDay(new Date()))}
                    >
                      Today
                    </Button>
                  </div>
                  <div className="toolbar-actions">
                    {category === "tender" ? (
                      <label className="filter-field">
                        <span>Destination</span>
                        <select
                          aria-label="Filter by destination"
                          value={destination}
                          onChange={(event) => {
                            const value = event.target.value;
                            setDestination(value);
                            if (
                              value !== "all" &&
                              !entries.some(
                                (e) =>
                                  e.type === "tender" &&
                                  e.destination === value &&
                                  inRange(e, monthStart, monthEnd),
                              )
                            ) {
                              const first = entries
                                .filter(
                                  (e) =>
                                    e.type === "tender" &&
                                    e.destination === value,
                                )
                                .map((e) => e.preSubmissionDeadline)
                                .sort()[0];
                              if (first) setAnchor(first);
                            }
                          }}
                        >
                          <option value="all">All destinations</option>
                          {destinations.map((d) => (
                            <option key={d}>{d}</option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <label className="filter-field">
                        <span>Province</span>
                        <select
                          aria-label="Filter by province"
                          value={province}
                          onChange={(event) => setProvince(event.target.value)}
                        >
                          <option value="all">All provinces</option>
                          {Object.entries(PROVINCES).map(([id, label]) => (
                            <option value={id} key={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <div
                      className="view-switch"
                      role="group"
                      aria-label="Calendar view"
                    >
                      {(["month", "week", "list"] as const).map((value) => (
                        <button
                          key={value}
                          aria-pressed={view === value}
                          className={view === value ? "selected" : ""}
                          onClick={() => setView(value)}
                        >
                          {value[0].toUpperCase() + value.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="legend">
                  {category === "tender" ? (
                    <>
                      <span>
                        <i style={{ background: "#537da4" }} />
                        Pre-submission deadline
                      </span>
                      <span>
                        <i style={{ background: "#8b7938" }} />
                        Call back deadline
                      </span>
                      <small>Both dates open the same tender</small>
                    </>
                  ) : (
                    Object.entries(CATEGORIES)
                      .filter(([key]) => category === "all" || key === category)
                      .map(([key, info]) => (
                        <span key={key}>
                          <i style={{ background: info.color }} />
                          {info.label}
                        </span>
                      ))
                  )}
                </div>
                {loading ? (
                  <div className="empty-state">Loading your calendar…</div>
                ) : error ? (
                  <div className="empty-state">
                    The calendar is unavailable. Your entries have not been
                    changed.
                  </div>
                ) : view === "list" ? (
                  <EntryList
                    entries={visible}
                    start={rangeStart}
                    end={rangeEnd}
                    tenders={category === "tender"}
                    onOpen={(entry) => setSelected(entry.id)}
                  />
                ) : (
                  <CalendarGrid
                    entries={matching}
                    anchor={anchor}
                    view={view}
                    onOpen={(entry) => setSelected(entry.id)}
                    onAdd={(day) =>
                      setForm({
                        type: category === "all" ? "market" : category,
                        day,
                      })
                    }
                  />
                )}
                <footer className="calendar-foot">
                  <span>
                    {view === "week"
                      ? "Dates and times follow each entry’s selected time zone."
                      : "Select a date to add an entry."}
                  </span>
                  <button onClick={() => reload(true)} disabled={loading}>
                    <RefreshCw size={12} />
                    {refreshed ? `Updated ${refreshed}` : "Refresh"}
                  </button>
                </footer>
              </section>
            </>
          )}
        </main>
      </div>
      {form ? (
        <EntryForm
          key={form.entry?.id || `${form.type}-${form.day}`}
          entry={form.entry}
          type={form.type}
          day={form.day}
          destinations={destinations}
          onClose={() => setForm(null)}
          onSaved={(entry) => {
            update(entry);
            setForm(null);
            setSelected(entry.id);
            setAnchor(
              entry.type === "tender"
                ? entry.preSubmissionDeadline
                : entry.startDate,
            );
            setCategory(entry.type);
            setProvince("all");
            setDestination("all");
            setMessage("Entry saved.");
          }}
        />
      ) : current ? (
        <EntryDetail
          key={current.id}
          entry={current}
          email={email}
          capabilities={capabilities}
          onClose={() => setSelected(null)}
          onEdit={() =>
            setForm({
              entry: current,
              type: current.type,
              day:
                current.type === "tender"
                  ? current.preSubmissionDeadline
                  : current.startDate,
            })
          }
          onUpdated={update}
          onMessage={setMessage}
        />
      ) : null}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </div>
  );
}
