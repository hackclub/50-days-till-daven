import Image from "next/image";
import Link from "next/link";
import { HAVEN_DATE, PROGRAM_DAYS, PROGRAM_START } from "@/lib/config";
import { daysBetween, localParts } from "@/lib/dates";

/** Haven's orange cloud in the corner, with the day count where the site has its nav links. */
export function HeroNav({ now, tz, back = false }: { now: number; tz: string; back?: boolean }) {
  const today = localParts(now, tz).date;
  const day = daysBetween(PROGRAM_START, today) + 1;
  const label =
    day < 1
      ? "starts Sept 25"
      : day <= PROGRAM_DAYS
        ? `day ${day} of ${PROGRAM_DAYS}`
        : daysBetween(today, HAVEN_DATE) > 0
          ? "Haven soon"
          : "Haven!";

  return (
    <>
      <Image className="nav-banner" src="/haven/nav-banner.webp" alt="" aria-hidden="true" width={646} height={260} preload />
      <nav className="hero-nav" aria-label="Primary">
        {back && (
          <Link href="/" className="back">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 5l-7 7 7 7" />
            </svg>
            All havens
          </Link>
        )}
        <span className="hero-day">{label}</span>
      </nav>
    </>
  );
}
