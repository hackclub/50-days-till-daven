import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { Footer } from "@/components/Footer";
import { Loading } from "@/components/Loading";
import { getHavenData, toSummary } from "@/lib/data";

// Rendered from the cached latest pull (lib/data.ts), streamed in behind the boundary.
async function HomeContent() {
  const data = await getHavenData();
  return (
    <>
      <Dashboard events={data.events.map(toSummary)} generatedAt={data.generatedAt} />
      <Footer generatedAt={data.generatedAt} />
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<Loading label="Loading havens…" />}>
      <HomeContent />
    </Suspense>
  );
}
