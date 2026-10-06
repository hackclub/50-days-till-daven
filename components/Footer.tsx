"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PULL_EVERY_MS } from "@/lib/config";
import { formatDuration } from "@/lib/dates";
import { useNow } from "./useNow";

// How often an open tab asks our server (never Airtable) whether there's a newer pull.
const RECHECK_MS = 5 * 60_000;

export function Footer({ generatedAt }: { generatedAt: number }) {
  const { now, live } = useNow(generatedAt, 30_000);
  const router = useRouter();
  const age = now - generatedAt;

  // A tab left open picks up the next pull without a reload.
  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() - generatedAt > PULL_EVERY_MS + RECHECK_MS) router.refresh();
    }, RECHECK_MS);
    return () => clearInterval(id);
  }, [generatedAt, router]);

  return (
    <footer className="foot">
      <Image className="foot-bushes" src="/haven/bottom-bushes.webp" alt="" aria-hidden="true" width={2147} height={415} sizes="100vw" />
      <p>
        {live && generatedAt > 0 ? `Updated ${age < 60_000 ? "just now" : `${formatDuration(age)} ago`} · ` : ""}
        <a href="https://haven.hackclub.com">haven.hackclub.com</a>
      </p>
    </footer>
  );
}
