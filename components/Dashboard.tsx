"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { computeStreak, type Streak } from "@/lib/streak";
import type { EventSummary } from "@/lib/types";
import { DayStrip } from "./DayStrip";
import { Globe, type GlobeMarker } from "./Globe";
import { HeroNav } from "./HeroNav";
import { useNow } from "./useNow";

type Row = { e: EventSummary; s: Streak };

const href = (e: EventSummary) => `/${encodeURIComponent(e.slug)}`;
const matches = (e: EventSummary, q: string) =>
  !q || `${e.name} ${e.city} ${e.country} ${e.slug}`.toLowerCase().includes(q.toLowerCase());

export function Dashboard({ events, generatedAt }: { events: EventSummary[]; generatedAt: number }) {
  const { now, tz } = useNow(generatedAt, 30_000);
  const [query, setQuery] = useState("");

  const rows: Row[] = events.map((e) => ({ e, s: computeStreak(e.days, e.tz, now) }));
  const streaking = rows.filter((r) => r.s.current > 0);
  const signups = events.reduce((n, e) => n + e.total, 0);

  const markers: GlobeMarker[] = rows
    .filter((r) => r.e.lat !== null && r.e.lon !== null)
    .map(({ e, s }) => ({ slug: e.slug, city: e.city, country: e.country, lat: e.lat!, lon: e.lon!, current: s.current }));

  const shown = rows.filter((r) => matches(r.e, query));
  const onStreak = shown
    .filter((r) => r.s.current > 0)
    .sort((a, b) => b.s.current - a.s.current || a.e.city.localeCompare(b.e.city));
  const noStreak = shown.filter((r) => r.s.current === 0).sort((a, b) => a.e.city.localeCompare(b.e.city));

  // equal streaks share a rank
  const ranks: number[] = [];
  onStreak.forEach((r, i) => ranks.push(i && onStreak[i - 1].s.current === r.s.current ? ranks[i - 1] : i + 1));

  return (
    <>
      <header className="hero">
        <HeroNav now={now} tz={tz} />
        <div className="hero-inner home-hero">
          <div className="home-copy">
            <Image className="home-logo" src="/haven/logo.webp" alt="Hack Club Haven" width={762} height={491} preload />
            <h1 className="home-title glow">50 days till Daven</h1>
            <div className="home-stats">
              <p className="home-stat glow">
                <span className="home-stat-n">{streaking.length}</span> havens on a streak
              </p>
              <Link href="/global" className="home-stat home-stat-link glow">
                <span className="home-stat-n">{signups.toLocaleString("en-US")}</span> signups
                <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
          <div className="home-globe">
            <Globe markers={markers} label={`Globe of ${markers.length} Haven events, ${streaking.length} on a streak.`} />
          </div>
        </div>
      </header>

      <main className="page">
        <section className="panel">
          <div className="panel-head">
            <h2>
              On a streak<span className="count">{onStreak.length}</span>
            </h2>
            <input
              className="search"
              type="search"
              placeholder="find your haven"
              value={query}
              onChange={(ev) => setQuery(ev.target.value)}
              aria-label="Filter havens by city or country"
            />
          </div>
          <ol className="board">
            {onStreak.map(({ e, s }, i) => (
              <li key={e.slug}>
                <Link href={href(e)} className="board-row">
                  <span className="rank num">{ranks[i]}</span>
                  <span className="who">
                    <span className="city">{e.city}</span>
                    <span className="country">{e.country}</span>
                  </span>
                  <DayStrip days={e.days} todayIndex={s.todayIndex} />
                  <span className="streak-n">
                    {s.current}
                    <span className="streak-unit">{s.current === 1 ? "day" : "days"}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {onStreak.length === 0 && <p className="empty">{query ? "No matches." : "No streaks yet."}</p>}
        </section>

        {noStreak.length > 0 && (
          <section className="panel evil">
            <Image
              className="evil-art"
              src="/haven/evil-daven.jpg"
              alt="Evil Daven, grinning in front of flames"
              width={1600}
              height={937}
              sizes="(min-width: 1184px) 1120px, 100vw"
            />
            <div className="panel-head">
              <h2>
                No streak<span className="count">{noStreak.length}</span>
              </h2>
            </div>
            <ul className="chips">
              {noStreak.map(({ e }) => (
                <li key={e.slug}>
                  <Link href={href(e)} title={`${e.city}, ${e.country}`}>
                    {e.city}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
