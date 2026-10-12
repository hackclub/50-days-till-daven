import { SOURCES } from "@/lib/sources";
import { AGE_BUCKETS, type Breakdown } from "@/lib/types";
import { Columns } from "./charts/Columns";
import { HBars } from "./charts/HBars";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, h) => (h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`));

export function medianAge(ages: number[]) {
  const total = ages.reduce((a, b) => a + b, 0);
  for (let k = 0, run = 0; k < ages.length && total; k++) {
    run += ages[k];
    if (run >= total / 2) return AGE_BUCKETS[k];
  }
  return "–";
}

/** Weekday, hour, age and "how they heard" panels; `signups` is how many people `b` covers. */
export function Breakdowns({ b, signups }: { b: Breakdown; signups: number }) {
  const answered = signups - b.unanswered;
  const sources = SOURCES.map((label) => ({ label, value: b.sources[label] ?? 0 }))
    .filter((r) => r.value > 0)
    .sort((x, y) => y.value - x.value);

  return (
    <div className="ev-pair">
      <section className="panel">
        <div className="panel-head">
          <h2>By weekday</h2>
        </div>
        <Columns values={b.weekdays} labels={WEEKDAYS} ariaLabel="Signups by weekday" />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>By hour</h2>
        </div>
        <Columns values={b.hours} labels={HOURS} showLabel={(h) => h % 6 === 0} ariaLabel="Signups by local hour of day" />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>Ages</h2>
        </div>
        <Columns values={b.ages} labels={AGE_BUCKETS} unit={["person", "people"]} ariaLabel="Signups by age" />
      </section>
      <section className="panel">
        <div className="panel-head">
          <h2>How they heard</h2>
        </div>
        {sources.length > 0 ? <HBars rows={sources} total={answered} /> : <p className="empty">Nothing yet.</p>}
      </section>
    </div>
  );
}
