# Tony Calendar

A shared planning workspace for Tony and Canadian distributors. Built with Next.js App Router, React, TypeScript, Drizzle ORM, and Neon PostgreSQL; prepared for Netlify hosting.

## Features

- **BBG Market visits:** multiple grouped customer names, meeting purposes, and meeting locations.
- **Casa Salles Visits:** visiting parties' Canadian provinces and a link to a separate agenda.
- **Events in Canada:** activation terms, names, company, event logistics, and serving-alcohol certificates.
- **Provincial tender calls:** destination grouping/filtering, repeated priority/specification rows, price range, and two linked deadline occurrences. No Call ID field.
- Month, week, and list views; province filters; a destination filter for tenders.
- Acknowledgments attached to the entered approved email, preserved through edits.
- Arbitrary invitation recipients, email preview, and explicit send action. Informational emails without RSVP.
- Transactional database saves and revision checks to prevent stale edits.
- Background refresh every minute while visible and refresh when returning to the tab.

## Access model

Visitors enter an address in `APPROVED_EMAILS`. The server checks that list and issues a signed, HttpOnly, seven-day session cookie. APIs require the session; writes check the request origin. Removing an address from the environment allowlist invalidates it on subsequent requests.

**This is an email allowlist gate, not verified identity.** There is no password or ownership verification: anyone who knows an approved address can enter it. Acknowledgments are self-reported. There are no customer accounts, roles, or change-history interface. All admitted people can view the full calendar and edit entries.

## Requirements

- Node.js 24 recommended; Node.js 22 or newer supported by this project
- npm
- Neon PostgreSQL for persistent shared records
- Resend account and verified sender domain for real invitations
- Netlify Blobs for deployed certificates; local development uses an ignored local folder

## Run locally with Neon

```sh
npm ci
cp .env.example .env.local
```

On PowerShell, use `Copy-Item .env.example .env.local` if it does not already exist. Edit `.env.local`:

| Variable          | Purpose                                                              |
| ----------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`    | Neon connection string; use the dashboard's pooled connection string |
| `SESSION_SECRET`  | Random secret of at least 32 characters                              |
| `APPROVED_EMAILS` | Exact approved addresses, separated by commas                        |
| `APP_URL`         | Exact application origin, initially `http://localhost:3000`          |
| `RESEND_API_KEY`  | Resend API key; optional until sending is needed                     |
| `EMAIL_FROM`      | Sender on a verified Resend domain                                   |
| `DEMO_MODE`       | Set `false` for real shared records                                  |

Then:

```sh
npm run db:migrate
npm run dev
```

Open `http://localhost:3000` and enter an approved email. The database starts empty. Run `npm run db:seed` only if you want fictional examples. Existing records are preserved. Restart the server after environment changes if they are not picked up automatically.

## Demo mode

Set `DEMO_MODE=true` in `.env.local`. No database is needed. Use `tony@example.com` or `distributor@example.com`; a configured `APPROVED_EMAILS` overrides these defaults. The UI labels demo mode clearly.

Demo data lives in the server process, resets on restart, and is not reliable across serverless instances. Real email sends and uploads are disabled. Do not use it for real shared records. Production without a database fails closed unless demo mode is explicitly enabled.

## Import original tender data privately

The original workbook, generated `tender-data.js`, HTML prototype, ZIP, credentials, and local uploads are excluded from Git. Public examples are fictional.

If you retained the local tender data file from the prototype:

```sh
npm run db:import-tenders -- ./tender-data.js
```

The importer parses its JSON array without executing JavaScript, imports the repeated priorities into the configured database, and skips existing imported IDs. It does not publish business data or send email. Browser-only edits made in the old prototype are not automatically imported.

## Email invitations

Save recipient addresses, choose **Invite by email**, review, and select **Send invitations**. Sending is unavailable until Resend, a verified sender, and the shared database are configured. Each recipient receives a separate email. Provider acceptance does not guarantee inbox delivery.

Sending has per-email rate limits and a one-minute entry cooldown. Provider requests use an idempotency key. Delivery requests are recorded separately from entry edits. Saving an entry does not send mail.

## Certificate uploads

Save an event, then upload from its details panel. Accepted: PDF, JPEG, PNG, WebP; maximum 4 MB and ten attachments per event. The server checks file signatures. Downloads require a session and are served as attachments.

On Netlify, files live in a site-wide `certificates` Blobs store, with metadata in Neon. Local development uses ignored `local-data/certificates`. Other production hosts need a storage adapter; ephemeral application filesystems are not used in production.

## Project structure

```text
src/app/                  Pages, layouts, styles, API route handlers
src/components/ui/        Reusable buttons, accessible Radix dialogs
src/features/access/      Approved-email entry screen
src/features/calendar/    Calendar shell, FullCalendar, grouped lists
src/features/entries/     Category forms and entry details
src/db/                   Drizzle schema, Neon driver, fictional examples
src/server/               Sessions, repository, email, uploads, API guards
src/lib/                  Validation, dates, types, constants
scripts/                  Migration, seed, private import, smoke checks
scripts/insert-entry.ts   Transactional seed/import helper
drizzle/                  Generated SQL migrations
tests/                    Domain, session, concurrency tests
```

The database has entries with category-specific values, normalized customer meetings and tender requirements, and separate acknowledgment, attachment, invitation, and rate-limit tables. Repeated rows save atomically. Tender deadlines are dates. Visit start/end dates are inclusive. Timed entries display their recorded time zone; the calendar does not convert them into the viewer's time zone.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

Start an isolated demo server with the example approved emails, then run `npm run test:smoke` for HTTP checks. It creates labelled test entries in demo memory and never sends email. Restart the demo server to clear test data. GitHub Actions runs type checking, unit tests, and a production build.

## Deploy to Netlify

1. Import the GitHub repository. `netlify.toml` supplies build/output settings. Netlify provisions its Next.js adapter automatically.
2. Set runtime environment variables in Netlify: real HTTPS `APP_URL`, random session secret, approved emails, database connection, and `DEMO_MODE=false`. Add Resend settings when ready.
3. Run `npm run db:migrate` against the target database before enabling the deployment. Migrations run explicitly, not during every preview build.
4. Give previews separate Neon branches/databases and environment values. Set each preview's `APP_URL` to its actual origin for write requests. Do not point previews at production data.
5. Netlify Blobs uses the site's Netlify environment. No separate Neon Functions or custom Edge Functions are required.

A public source repository does not make Neon public. Keep credentials in environment variables; never prefix secrets with `NEXT_PUBLIC_`.

## Current scope

Pricing/promotions, verified account authentication, roles, edit history, RSVP, instant push synchronization, recurring events, and scheduled reminders are outside this first version. Users can create/edit entries; deletion and attachment removal are not exposed yet. The deliberately simple access model is described above.
