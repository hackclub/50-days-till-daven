"use client";

import { useEffect, useState } from "react";

/**
 * Starts at the server's timestamp so the first client render matches the prerendered HTML,
 * then follows the real clock.
 */
export function useNow(initial: number, everyMs = 10_000) {
  const [state, setState] = useState({ now: initial, tz: "UTC", live: false });
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const tick = () => setState({ now: Date.now(), tz, live: true });
    tick();
    const id = setInterval(tick, everyMs);
    return () => clearInterval(id);
  }, [everyMs]);
  return state;
}
