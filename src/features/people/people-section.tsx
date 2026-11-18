"use client";
import { useCallback, useEffect, useState } from "react";
import { UserPlus, ShieldCheck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, RequestError } from "@/lib/api";
import type { Person, Permission } from "@/lib/people";
import { ALL_CALENDARS } from "@/lib/people";
import { CATEGORIES, type Category } from "@/lib/constants";
import { useRouter } from "next/navigation";
function CalendarChecks({
  value,
  onChange,
  disabled,
}: {
  value: Category[];
  onChange: (value: Category[]) => void;
  disabled?: boolean;
}) {
  const all = ALL_CALENDARS.every((category) => value.includes(category));
  return (
    <fieldset disabled={disabled}>
      <legend>Calendars</legend>
      <label>
        <input
          type="checkbox"
          checked={all}
          onChange={(event) =>
            onChange(event.target.checked ? [...ALL_CALENDARS] : [])
          }
        />{" "}
        All calendars
      </label>
      {ALL_CALENDARS.map((category) => (
        <label key={category} style={{ display: "block" }}>
          <input
            type="checkbox"
            checked={value.includes(category)}
            onChange={(event) =>
              onChange(
                event.target.checked
                  ? [...value, category]
                  : value.filter((item) => item !== category),
              )
            }
          />{" "}
          {CATEGORIES[category].label}
        </label>
      ))}
    </fieldset>
  );
}
export function PeopleSection({
  onMessage,
}: {
  onMessage: (message: string) => void;
}) {
  const router = useRouter();
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<Permission>("write");
  const [calendars, setCalendars] = useState<Category[]>([...ALL_CALENDARS]);
  async function changeCalendars(person: Person, calendars: Category[]) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ person: Person }>("/api/people", {
        method: "PATCH",
        body: JSON.stringify({ email: person.email, calendars }),
      });
      setPeople((list) =>
        list.map((p) => (p.email === person.email ? result.person : p)),
      );
      onMessage("Calendar access updated.");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to update calendar access.",
      );
    } finally {
      setBusy(false);
    }
  }
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<{ people: Person[] }>("/api/people");
      setPeople(result.people);
      setError("");
    } catch (error) {
      if (
        error instanceof RequestError &&
        (error.status === 401 || error.status === 403)
      ) {
        router.refresh();
      }
      setError(
        error instanceof Error ? error.message : "Unable to load people.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);
  useEffect(() => {
    load();
  }, [load]);
  async function toggle(person: Person) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ person: Person }>("/api/people", {
        method: "PATCH",
        body: JSON.stringify({ email: person.email, active: !person.active }),
      });
      setPeople((list) =>
        list.map((p) => (p.email === person.email ? result.person : p)),
      );
      onMessage(
        result.person.active
          ? "Calendar access restored."
          : "Calendar access disabled.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to update access.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function changePermission(person: Person, permission: Permission) {
    setBusy(true);
    setError("");
    try {
      const result = await api<{ person: Person }>("/api/people", {
        method: "PATCH",
        body: JSON.stringify({ email: person.email, permission }),
      });
      setPeople((list) =>
        list.map((p) => (p.email === person.email ? result.person : p)),
      );
      onMessage(
        permission === "write"
          ? "Write access granted."
          : "Read-only access set.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to update permission.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">WORKSPACE ACCESS</p>
          <h1>People</h1>
          <p>Choose who can view the calendar and who can make changes.</p>
        </div>
        <span className="owner-pill">
          <ShieldCheck size={15} />
          Tony only
        </span>
      </div>
      <div className="people-grid">
        <section className="people-add-card">
          <span className="people-icon">
            <UserPlus size={23} />
          </span>
          <h2>Add a person</h2>
          <p>
            Approve an email for calendar access. No invitation or verification
            email is sent.
          </p>
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setBusy(true);
              setError("");
              try {
                const result = await api<{ person: Person }>("/api/people", {
                  method: "POST",
                  body: JSON.stringify({ name, email, permission, calendars }),
                });
                setPeople((list) => [...list, result.person]);
                setName("");
                setEmail("");
                setPermission("write");
                setCalendars([...ALL_CALENDARS]);
                onMessage(
                  "Person added. Their email can now access the calendar.",
                );
              } catch (error) {
                setError(
                  error instanceof Error
                    ? error.message
                    : "Unable to add this person.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            <label className="field">
              <span>Name</span>
              <input
                maxLength={150}
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Person’s name"
              />
            </label>
            <label className="field">
              <span>Email address *</span>
              <input
                type="email"
                required
                maxLength={254}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="person@company.com"
              />
            </label>
            <label className="field">
              <span>Permission</span>
              <select
                value={permission}
                onChange={(event) =>
                  setPermission(event.target.value as Permission)
                }
              >
                <option value="read">Read only</option>
                <option value="write">Read and write</option>
              </select>
              <small>
                Read can view and acknowledge entries. Write can also change
                entries, upload files, and send invitations.
              </small>
            </label>
            <CalendarChecks
              value={calendars}
              onChange={setCalendars}
              disabled={busy}
            />
            <Button type="submit" disabled={busy || loading}>
              <UserPlus size={15} />
              {busy ? "Saving…" : "Add person"}
            </Button>
          </form>
        </section>
        <section className="people-list-card">
          <header>
            <div>
              <h2>Approved people</h2>
              <p>{people.filter((p) => p.active).length} with active access</p>
            </div>
            <UsersRound size={23} />
          </header>
          {loading ? (
            <div className="empty-state">Loading people…</div>
          ) : (
            <ul className="people-list">
              {people.map((person) => (
                <li key={person.email}>
                  <span
                    className={`person-avatar ${person.active ? "" : "inactive"}`}
                  >
                    {(person.name || person.email).slice(0, 1).toUpperCase()}
                  </span>
                  <div className="person-info">
                    <strong>{person.name || person.email}</strong>
                    <span>{person.email}</span>
                    <small>
                      {person.isTony
                        ? "Tony · write access · manages people"
                        : person.active
                          ? person.permission === "write"
                            ? "Read and write access"
                            : "Read-only access"
                          : `Access disabled · ${person.permission === "write" ? "Read and write" : "Read only"}`}
                    </small>
                  </div>
                  {person.isTony ? (
                    <span className="owner-pill small">
                      <ShieldCheck size={12} />
                      Tony
                    </span>
                  ) : (
                    <>
                      <CalendarChecks
                        value={person.calendars}
                        onChange={(value) => changeCalendars(person, value)}
                        disabled={busy}
                      />
                      <label className="field person-permission">
                        <span>Permission</span>
                        <select
                          aria-label={`Permission for ${person.email}`}
                          value={person.permission}
                          disabled={busy}
                          onChange={(event) =>
                            changePermission(
                              person,
                              event.target.value as Permission,
                            )
                          }
                        >
                          <option value="read">Read only</option>
                          <option value="write">Read and write</option>
                        </select>
                      </label>
                      <Button
                        variant="secondary"
                        disabled={busy}
                        onClick={() => toggle(person)}
                        aria-label={`${person.active ? "Disable" : "Restore"} access for ${person.email}`}
                      >
                        {person.active ? "Disable access" : "Restore access"}
                      </Button>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          {!people.length && (
            <Button variant="secondary" onClick={load}>
              Try again
            </Button>
          )}
        </div>
      )}
    </>
  );
}
