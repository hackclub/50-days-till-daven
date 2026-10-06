import { PROGRAM_DAYS } from "@/lib/config";
import { level } from "@/lib/levels";
import { PROGRAM_START_INDEX } from "@/lib/dates";

/** The 50 program days as a row of cells; future days are hollow. */
export function DayStrip({ days, todayIndex }: { days: number[]; todayIndex: number }) {
  return (
    <span className="strip" aria-hidden="true">
      {Array.from({ length: PROGRAM_DAYS }, (_, k) => {
        const i = PROGRAM_START_INDEX + k;
        const cls = i > todayIndex ? "future" : `l${level(days[i] ?? 0)}${i === todayIndex ? " now" : ""}`;
        return <i key={k} className={cls} />;
      })}
    </span>
  );
}
