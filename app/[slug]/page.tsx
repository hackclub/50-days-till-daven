import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EventView } from "@/components/EventView";
import { Footer } from "@/components/Footer";
import { findEvent, getHavenData, toSummary } from "@/lib/data";

export async function generateStaticParams() {
  const { events } = await getHavenData();
  // Cache Components needs at least one param to validate the route
  return events.length ? events.map((e) => ({ slug: e.slug })) : [{ slug: "__none__" }];
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const event = findEvent(await getHavenData(), slug);
  if (!event) return { title: "Not found" };
  return {
    title: `Haven ${event.name}`,
    description: `Signup streak for Haven ${event.name} (${event.city}, ${event.country}).`,
  };
}

async function EventContent({ params }: { params: PageProps<"/[slug]">["params"] }) {
  const { slug } = await params;
  const data = await getHavenData();
  const event = findEvent(data, slug);
  if (!event) notFound();
  return (
    <>
      <EventView event={event} all={data.events.map(toSummary)} generatedAt={data.generatedAt} />
      <Footer generatedAt={data.generatedAt} />
    </>
  );
}

export default function EventPage(props: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<div className="wrap shell" aria-busy="true" />}>
      <EventContent params={props.params} />
    </Suspense>
  );
}
