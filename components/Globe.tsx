"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export type GlobeMarker = {
  slug: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  current: number;
};

type Placed = { m: GlobeMarker; x: number; y: number; r: number; z: number };

const RAD = Math.PI / 180;
const radius = (m: GlobeMarker) => (m.current > 0 ? 2.8 + Math.sqrt(m.current) * 1.3 : 2);

export function Globe({ markers, label }: { markers: GlobeMarker[]; label: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markersRef = useRef(markers);
  const [hover, setHover] = useState<Placed | null>(null);
  const router = useRouter();

  useEffect(() => {
    markersRef.current = markers;
  }, [markers]);

  useEffect(() => {
    const wrap = wrapRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

    let dots: Float32Array | null = null;
    fetch("/land-dots.json")
      .then((r) => r.json())
      .then((arr: number[]) => {
        dots = Float32Array.from(arr, (v) => v * RAD);
        draw();
      })
      .catch(() => {});

    const cs = getComputedStyle(wrap);
    const v = (name: string) => cs.getPropertyValue(name).trim();
    const colors = { orange: v("--orange"), yellow: v("--yellow"), land: v("--green-deep"), dim: v("--brown-light") };

    let size = 0;
    let dpr = 1;
    const resize = () => {
      size = wrap.clientWidth;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(size * dpr);
      canvas.height = Math.round(size * dpr);
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
    };
    // draw on resize too, so the globe shows up even where rAF is throttled (background tabs)
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(wrap);
    resize();

    // view centre in degrees; starts over the Atlantic so the Americas and Europe both show
    let lon0 = -25;
    let lat0 = 24;
    let vLon = 0;
    let vLat = 0;
    let dragging = false;
    let moved = 0;
    let lastX = 0;
    let lastY = 0;
    let mouseInside = false;
    let hoverSlug: string | null = null;
    let placed: Placed[] = [];
    let visible = true;

    const draw = () => {
      if (size < 16) return; // not laid out yet (hidden, or mid-resize)
      const R = size / 2 - 2;
      const c = size / 2;
      const lonC = lon0 * RAD;
      const latC = lat0 * RAD;
      const sinC = Math.sin(latC);
      const cosC = Math.cos(latC);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);
      ctx.beginPath();
      ctx.arc(c, c, R, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,255,255,0.88)";
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = colors.yellow;
      ctx.stroke();

      if (dots) {
        // four depth bands, one path each, so the far side of the globe fades out
        const s = Math.max(1.1, size / 380);
        const bands = [new Path2D(), new Path2D(), new Path2D(), new Path2D()];
        for (let i = 0; i < dots.length; i += 2) {
          const lon = dots[i] - lonC;
          const lat = dots[i + 1];
          const cosLat = Math.cos(lat);
          const z = sinC * Math.sin(lat) + cosC * cosLat * Math.cos(lon);
          if (z <= 0.04) continue;
          const x = c + R * cosLat * Math.sin(lon);
          const y = c - R * (cosC * Math.sin(lat) - sinC * cosLat * Math.cos(lon));
          bands[Math.min(3, Math.floor(z * 4))].rect(x - s / 2, y - s / 2, s, s);
        }
        ctx.fillStyle = colors.land;
        bands.forEach((p, i) => {
          ctx.globalAlpha = 0.25 + i * 0.22;
          ctx.fill(p);
        });
        ctx.globalAlpha = 1;
      }

      placed = [];
      for (const m of markersRef.current) {
        const lon = m.lon * RAD - lonC;
        const lat = m.lat * RAD;
        const cosLat = Math.cos(lat);
        const z = sinC * Math.sin(lat) + cosC * cosLat * Math.cos(lon);
        if (z <= 0.05) continue;
        placed.push({
          m,
          x: c + R * cosLat * Math.sin(lon),
          y: c - R * (cosC * Math.sin(lat) - sinC * cosLat * Math.cos(lon)),
          r: radius(m),
          z,
        });
      }
      placed.sort((a, b) => Math.sign(a.m.current) - Math.sign(b.m.current) || a.z - b.z);

      for (const p of placed) {
        const { x, y, r, m } = p;
        ctx.globalAlpha = 0.5 + 0.5 * p.z;
        ctx.beginPath();
        if (m.current > 0) {
          ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
          ctx.fillStyle = "#fff";
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = colors.orange;
        } else {
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fillStyle = colors.dim;
        }
        ctx.fill();
        if (m.slug === hoverSlug) {
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(x, y, r + 4, 0, Math.PI * 2);
          ctx.lineWidth = 2;
          ctx.strokeStyle = colors.orange;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const hit = (px: number, py: number, slop: number) => {
      let best: Placed | null = null;
      let bestD = Infinity;
      for (const p of placed) {
        const d = Math.hypot(p.x - px, p.y - py);
        if (d <= Math.max(p.r + slop, 10) && d - p.r < bestD) {
          best = p;
          bestD = d - p.r;
        }
      }
      return best;
    };

    const setHovered = (p: Placed | null) => {
      const slug = p?.m.slug ?? null;
      if (slug === hoverSlug) return;
      hoverSlug = slug;
      canvas.style.cursor = dragging ? "grabbing" : p ? "pointer" : "grab";
      setHover(p ? { ...p } : null);
    };

    draw();
    let raf = 0;
    const frame = () => {
      if (!dragging) {
        if (Math.abs(vLon) > 0.005 || Math.abs(vLat) > 0.005) {
          lon0 -= vLon;
          lat0 += vLat;
          vLon *= 0.94;
          vLat *= 0.94;
        } else if (!mouseInside && !reduceMotion) {
          lon0 -= 0.04;
        }
      }
      lat0 = Math.max(-50, Math.min(65, lat0));
      lon0 = ((lon0 + 540) % 360) - 180;
      draw();
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    raf = requestAnimationFrame(frame);

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });
    io.observe(wrap);

    const local = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return [e.clientX - rect.left, e.clientY - rect.top];
    };

    const onDown = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      [lastX, lastY] = local(e);
      vLon = vLat = 0;
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const [x, y] = local(e);
      if (dragging) {
        const dx = x - lastX;
        const dy = y - lastY;
        moved += Math.abs(dx) + Math.abs(dy);
        const k = 1 / (size / 2) / RAD;
        vLon = dx * k;
        vLat = dy * k;
        lon0 -= vLon;
        lat0 += vLat;
        lastX = x;
        lastY = y;
        if (moved > 4) setHovered(null);
        canvas.style.cursor = "grabbing";
      } else if (e.pointerType === "mouse") {
        setHovered(hit(x, y, 6));
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      const [x, y] = local(e);
      if (moved < 6) {
        vLon = vLat = 0;
        const p = hit(x, y, e.pointerType === "mouse" ? 6 : 14);
        if (p && e.pointerType === "mouse") router.push(`/${encodeURIComponent(p.m.slug)}`);
        else setHovered(p); // touch: first tap shows the tooltip, the tooltip links through
      }
      canvas.style.cursor = "grab";
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") mouseInside = true;
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      mouseInside = false;
      if (!dragging) setHovered(null);
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerenter", onEnter);
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerenter", onEnter);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [router]);

  return (
    <div className="globe" ref={wrapRef}>
      <canvas ref={canvasRef} role="img" aria-label={label} />
      {hover && (
        <a
          className="tip globe-tip"
          href={`/${encodeURIComponent(hover.m.slug)}`}
          style={{ left: hover.x, top: hover.y - hover.r }}
        >
          <strong>{hover.m.city}</strong>
          <br />
          <span className="tip-sub">
            {hover.m.current > 0 ? `${hover.m.current} day streak` : "no streak"} · {hover.m.country}
          </span>
        </a>
      )}
    </div>
  );
}
