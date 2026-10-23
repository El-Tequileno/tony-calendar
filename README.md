# El Tequileño’s Canada Calendar

A shared planning workspace for Tony and Canadian distributors. Built with Next.js App Router, React, TypeScript, Drizzle ORM, and Neon PostgreSQL; prepared for Netlify hosting.

## Features

- **BBG Market visits:** multiple grouped customer names, meeting purposes, and meeting locations.
- **Casa Salles Visits:** visiting parties' Canadian provinces and a link to a separate agenda.
- **Events in Canada:** venue name, address, Canadian postal code, Special Notes, activation terms, owner name and company, repeatable activation team names with phone numbers, event logistics, and serving-alcohol certificates.
- **Provincial tender calls:** destination grouping/filtering, repeated priority/specification rows, price range, and two linked deadline occurrences. No Call ID field.
- Month, week, and list views; province filters; a destination filter for tenders.
- Acknowledgments attached to the entered approved email, preserved through edits.
- Arbitrary invitation recipients, email preview, and explicit send action. Informational emails without RSVP.
- Transactional database saves and revision checks to prevent stale edits.
- New or changed visit/event dates and tender deadlines must be today or later, using America/Edmonton for the shared calendar day. Existing past dates may stay unchanged when correcting an older entry's other details. The form and server enforce this rule.
- Delete entries from their details after confirming in a dialog. Cancel keeps the entry. Deletion removes both tender dates and related records; certificate files are cleaned up after the database deletion.
- Background refresh every minute while visible and refresh when returning to the tab.
- Tony-only **People** section to add approved emails and disable or restore calendar access.

## Access model

Visitors enter an address stored as active in Neon's `authorized_emails` table. The server checks the database and issues a signed, HttpOnly, seven-day session cookie. Every protected request rechecks database access; disabling a person blocks their existing session on its next request. Writes check the request origin.

**This is an email allowlist gate, not verified identity.** There is no password or ownership verification: anyone who knows an approved address can enter it. Acknowledgments are self-reported. All admitted people can view the full calendar and edit entries. Only the database-designated Tony can see People or call its APIs. The form cannot assign Tony's permission, and Tony cannot disable his own access. There are no customer accounts or change-history interface.

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

| Variable         | Purpose                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`   | Neon connection string; use the dashboard's pooled connection string |
| `SESSION_SECRET` | Random secret of at least 32 characters                              |
| `APP_URL`        | Exact application origin, initially `http://localhost:3000`          |
| `RESEND_API_KEY` | Resend API key; optional until sending is needed                     |
| `EMAIL_FROM`     | Sender on a verified Resend domain                                   |

Then:

```sh
npm run db:migrate
npm run db:setup-access -- "<Tony's exact email>"
npm run dev
```

Open `http://localhost:3000` and enter Tony's configured email. Use **People** to add other approved addresses. The database starts with an empty calendar; setup creates only Tony's access record. Setup is safe to repeat for the same owner and refuses to replace an existing owner. Restart the server after environment changes if they are not picked up automatically.

## Session signing key

`SESSION_SECRET` is a private random server key used to sign session cookies and reject tampering. It does not encrypt the cookie or verify email ownership. Generate at least 32 random bytes, for example `node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))"`, and store the result only in private environment configuration.

Keep the key stable across application instances and deploys. Rotating it signs everyone out. The app requires Neon and a configured signing key; it has no demo mode or fallback sample records.

## Import original tender data privately

The original workbook, generated `tender-data.js`, HTML prototype, ZIP, credentials, and local uploads are excluded from Git.

If you retained the local tender data file from the prototype:

```sh
npm run db:import-tenders -- ./tender-data.js
```

The importer parses its JSON array without executing JavaScript, imports the repeated priorities into the configured database, and skips existing imported IDs. It does not publish business data or send email. Browser-only edits made in the old prototype are not automatically imported.

## Canadian address search

The Canada event form includes explicit **Search** actions beside **Venue name** and **Address**. Set `GEOAPIFY_API_KEY` in `.env.local` and in the hosting environment to enable [Geoapify](https://www.geoapify.com/) business/place and address search. The key is used only on the server. Search is restricted to Canadian results; the entered city/province helps narrow the query. A venue search uses Address Autocomplete, then the Places API within the entered city if autocomplete finds no venues. Selecting a result fills available venue, street, city, province and full postal-code details. Check the results and complete missing details manually; business coverage and house numbers vary. Geoapify/OpenStreetMap attribution is displayed with results.

Searches run only when requested, are limited to 20 per minute per approved email, and public results are cached for one day. Without a Geoapify key, address search uses Natural Resources Canada's free [Geolocator API](https://natural-resources.canada.ca/maps-tools-publications/satellite-elevation-air-photos/geolocation-service); venue-name search is unavailable. `ADDRESS_LOOKUP_URL` can override this fallback endpoint. Manual entry remains available when a service fails. No database migration is required.

## Email invitations

Save recipient addresses, choose **Invite by email**, review, and select **Send invitations**. Sending is unavailable until Resend, a verified sender, and the shared database are configured. Each recipient receives a separate email. Provider acceptance does not guarantee inbox delivery.

Sending has per-email rate limits and a one-minute entry cooldown. Provider requests use an idempotency key. Delivery requests are recorded separately from entry edits. Saving an entry does not send mail.

## Document and certificate uploads

Choose files in the Canada event form, then save. Files upload after the event is saved. You can also add more from the details panel. Accepted: PDF, DOCX, XLSX, PPTX, UTF-8 TXT/CSV, JPEG, PNG and WebP; maximum 4 MB per file and ten attachments per event. The server validates file content against the extension with the free `file-type` library, including Office containers. Downloads require a session and are served as attachments. Legacy `.doc`, `.xls`, `.ppt`, macros and arbitrary ZIP/executable files are not accepted.

If an upload fails after saving, the form keeps the saved entry ID and the remaining files. Saving again retries without creating a duplicate event. Closing keeps the saved event. The attachment count is checked inside a transaction to handle simultaneous uploads.

On Netlify, files live in the existing site-wide `certificates` Blobs store, with metadata in Neon. Storage detection recognizes Netlify's runtime Blobs context as well as its deployment flag. No separate upload credentials are needed on Netlify. Local development uses ignored `local-data/certificates`. Other production hosts need a storage adapter; ephemeral application filesystems are not used in production.

## Project structure

```text
src/app/                  Pages, layouts, styles, API route handlers
src/components/ui/        Reusable buttons, accessible Radix dialogs
src/features/access/      Approved-email entry screen
src/features/calendar/    Calendar shell, FullCalendar, grouped lists
src/features/entries/     Category forms and entry details
src/features/people/      Tony's approved-email management
src/db/                   Drizzle schema and Neon driver
src/server/               Sessions, repository, email, uploads, API guards
src/lib/                  Validation, dates, types, constants
scripts/                  Migrations, owner setup, private tender import
scripts/insert-entry.ts   Transactional import helper
drizzle/                  Generated SQL migrations
tests/                    Domain, session, and access-control tests
```

The database has entries with category-specific values, normalized customer meetings and tender requirements, and separate acknowledgment, attachment, invitation, rate-limit, and authorized-email tables. Repeated rows save atomically. Tender deadlines are dates. Visit start/end dates are inclusive. Timed entries display their recorded time zone; the calendar does not convert them into the viewer's time zone.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

GitHub Actions runs type checking, unit tests, and a production build. Unit-test fixtures are confined to tests and are never loaded into the calendar or database.

## Deploy to Netlify

1. Import the GitHub repository. `netlify.toml` supplies build/output settings. Netlify provisions its Next.js adapter automatically.
2. Set runtime environment variables in Netlify: real HTTPS `APP_URL`, random session secret, and database connection. Add Resend settings when ready. Approved people live in Neon, not environment variables.
3. Run `npm run db:migrate` against the target database before enabling the deployment, then `npm run db:setup-access -- "<Tony's exact email>"` once. If using the already-configured database, its owner and approved people are preserved. Migrations run explicitly, not during every preview build.
4. Give previews separate Neon branches/databases and environment values. Set each preview's `APP_URL` to its actual origin for write requests. Do not point previews at production data.
5. Netlify Blobs uses the site's Netlify environment. No separate Neon Functions or custom Edge Functions are required.

A public source repository does not make Neon public. Keep credentials in environment variables; never prefix secrets with `NEXT_PUBLIC_`.

## Current scope

Pricing/promotions, verified account authentication, a general role system, edit history, RSVP, instant push synchronization, recurring events, and scheduled reminders are outside this first version. Users can create, edit, and delete entries; individual attachment removal is not exposed yet. Tony's people-management permission is stored in the database.
