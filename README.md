# 50 Days Till Daven

A public dashboard for the 50 Days Till Daven streak program for Hack Club Haven.

Each Haven event needs at least one new signup every day from Sept 25 to Nov 13 (50 days before Haven on Nov 14). Days run midnight to midnight in the event's own timezone. An event that holds a 30-day streak earns $100.

- `/` shows a globe of every event (dot size is streak length), the havens on a streak ranked by length, and the ones without a streak.
- `/global` adds every haven together: total signups, signups per day, a running total, the same breakdowns as an event page, and the top countries.
- `/<slug>` (the `Slug` from the Airtable Events table) shows one event's streak, its progress toward 30 days, a GitHub-style daily calendar, a running total, and signups by weekday, local hour, age and how people heard about Haven.

The look, fonts and artwork come from [haven.hackclub.com](https://haven.hackclub.com) ([hackclub/haven](https://github.com/hackclub/haven)).

## How streaks are counted

- **Signups**: rows in the Attendees table with `Role = Participant`, excluding `Soft Deleted` (duplicates) and `!Withdrawn`.
- **Day**: the `Signup Time` converted to the event's timezone. The timezone is looked up from the event's `!Latitude` / `!Longitude`.
- **Current streak**: consecutive program days with at least one signup, ending today if today already has one, otherwise yesterday (today still has until local midnight).
- **Events**: everything in the Events table except `Cancelled` and `_Is Test`.

The rules are in [`lib/config.ts`](lib/config.ts) and the logic is in [`lib/streak.ts`](lib/streak.ts). Streaks are computed in the browser against the live clock, so day rollovers stay accurate between data refreshes.

## Data, caching and privacy

Airtable is pulled every hour by a Vercel Cron job ([`vercel.json`](vercel.json)) that calls [`/api/pull`](app/api/pull/route.ts). That route is the only code that talks to Airtable:

- **A pull** is about 25 requests: one per 100 rows, across the Events (Active only) and Attendees (counted signups only) tables, fetching just the fields the dashboard uses. Requests go one at a time, at least 1.05s apart, so Airtable never sees more than 1 per second. After a 429 the pull waits 30s, as Airtable asks.
- **The result** is aggregated into exactly what the pages show (no raw signup rows) and saved to a private Vercel Blob ([`lib/storage.ts`](lib/storage.ts)). The route then clears the page cache.
- **Pages** render from that saved copy, cached across all requests and instances (`getHavenData` in [`lib/data.ts`](lib/data.ts)). Visitor traffic never reaches Airtable, so Airtable gets about 600 requests a day however busy the site is.
- **The route** needs `Authorization: Bearer $CRON_SECRET`, which Vercel Cron sends automatically. It also skips a pull within 10 minutes of the last one, so nobody can make it hammer Airtable.
- **If a pull fails**, the last good copy stays up and the next scheduled pull tries again.

The hourly gap has a cost: a signup made after the last pull won't show until the next one, up to an hour later. In the last hour before local midnight, that can make an event look like it missed a day it actually made.

### What's public

- Only **Active** events, the same set haven.hackclub.com publishes. On Hold, Cancelled, Merged and test events never leave the server.
- Only per-event aggregates: daily signup counts and totals, plus the hour, weekday and age histograms, grouped "how did you hear" buckets and referral share. These breakdowns are left out entirely for events with fewer than 5 signups (`MIN_BREAKDOWN`), so a single teenager can't be singled out. `/global` adds the breakdowns of every event together; the small events only go in once they add up to 5 signups between them, so subtracting the published ones can't give back a small event's own. Names, emails, free-text answers and record IDs never leave the server.

### Keeping the token safe

- `AIRTABLE_TOKEN` and `AIRTABLE_BASE_ID` are read only by `/api/pull` and the server-only modules it uses (`lib/airtable.ts`, `lib/airtable-config.ts`, `lib/data.ts`, `lib/storage.ts`, all guarded by `import "server-only"`). Importing any of them from browser code fails the build.
- The token is only ever sent to `https://api.airtable.com`. `AIRTABLE_API_URL` exists for a local test mock and rejects any other host.
- Use a dedicated token with only the `data.records:read` scope, and give it access to only the YSWS - Haven base. Set it as an environment variable in Vercel; the build doesn't need it.

## Running it

```bash
cp .env.example .env.local   # add the token, base id and a CRON_SECRET
pnpm install
pnpm dev
```

Locally, with no Blob token, pulls are saved to `data/haven.json` (gitignored). `pnpm pull` pulls if that copy is missing or over an hour old, and so does `pnpm build`. To force one, call the route the way the cron does:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/pull
```

Before the first pull the app reads `data/snapshot.json`, which you can make with `pnpm snapshot`.

## Deploying on Vercel

[`vercel.json`](vercel.json) sets up the framework, install and build commands, and the hourly cron. Vercel doesn't allow storage or secrets in that file, so those are two dashboard steps:

1. Import the repo into Vercel.
2. In the project's Storage tab, create a **private** Blob store and connect it. That adds `BLOB_READ_WRITE_TOKEN`.
3. Set `AIRTABLE_TOKEN`, `AIRTABLE_BASE_ID` and `CRON_SECRET` (a long random string, e.g. `openssl rand -hex 32`).
4. Deploy. The build does the first pull itself ([`scripts/pull.ts`](scripts/pull.ts)), so the site has data straight away. Later builds skip it while the saved pull is under an hour old, and a failed pull never blocks a deploy.

**The project must be on a Pro team.** Vercel's Hobby plan only allows daily crons, and a deploy with the hourly schedule fails there. On Hobby, change the schedule in `vercel.json` to once a day (e.g. `"0 0 * * *"`).

To pull outside the schedule, call the route the way the cron does:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-app>.vercel.app/api/pull
```

`public/land-dots.json` (the globe's dotted land) is generated by `pnpm land-dots` and only needs regenerating if you want a different dot density.
