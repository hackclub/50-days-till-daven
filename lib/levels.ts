/** Fixed buckets (not per-event quartiles) so the same shade means the same thing everywhere. */
export const LEVEL_LABELS = ["0", "1", "2–3", "4–7", "8+"];
export const level = (n: number) => (n <= 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : n <= 7 ? 3 : 4);
