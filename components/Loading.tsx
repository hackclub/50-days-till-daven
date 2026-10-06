import Image from "next/image";

/** Shown while a page streams in (the Suspense fallback), so a click never lands on a blank screen. */
export function Loading({ label }: { label: string }) {
  return (
    <div className="loading" role="status" aria-live="polite">
      <header className="hero loading-hero">
        <Image className="nav-banner" src="/haven/nav-banner.webp" alt="" aria-hidden="true" width={646} height={260} />
        <div className="hero-inner loading-inner">
          <Image className="loading-daven" src="/haven/daven-smol.webp" alt="" aria-hidden="true" width={127} height={116} />
          <p className="loading-text glow">{label}</p>
        </div>
      </header>
    </div>
  );
}
