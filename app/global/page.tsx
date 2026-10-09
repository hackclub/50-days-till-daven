import type { Metadata } from "next";
import { Suspense } from "react";
import { Footer } from "@/components/Footer";
import { GlobalView } from "@/components/GlobalView";
import { Loading } from "@/components/Loading";
import { getHavenData, globalStats, toSummary } from "@/lib/data";

export const metadata: Metadata = {
  title: "All signups",
  description: "Signups across every Hack Club Haven event, combined.",
};

async function GlobalContent() {
  const data = await getHavenData();
  return (
    <>
      <GlobalView stats={globalStats(data)} events={data.events.map(toSummary)} generatedAt={data.generatedAt} />
      <Footer generatedAt={data.generatedAt} />
    </>
  );
}

export default function GlobalPage() {
  return (
    <Suspense fallback={<Loading label="Loading signups…" />}>
      <GlobalContent />
    </Suspense>
  );
}
