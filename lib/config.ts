// Program rules for 50 Days Till Daven.
// Announced Sept 25, 2026 in #haven-organizers-bulletin, 50 days before Haven (Nov 14).
export const PROGRAM_START = "2026-09-25"; // day 1, in each event's local timezone
export const PROGRAM_DAYS = 50; // Sept 25 → Nov 13
export const HAVEN_DATE = "2026-11-14";
export const STREAK_GOAL = 30;
export const REWARD = "$100";

// Below this many signups an event's age/hour/weekday/source/referral breakdowns aren't published:
// with one or two signups they'd describe a specific teenager.
export const MIN_BREAKDOWN = 5;

// The contribution grid spans whole weeks around the program (Mon Sept 21 → Sun Nov 15).
export const CHART_START = "2026-09-21";
export const CHART_DAYS = 56;

// Airtable is pulled every 12 hours by Vercel Cron (vercel.json → app/api/pull). Keep the two in sync.
export const PULL_EVERY_MS = 12 * 60 * 60_000;
