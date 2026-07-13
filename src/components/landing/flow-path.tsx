"use client";

import { useEffect, useRef } from "react";

/**
 * "Tek akış" çizgisi — kurum, öğretmen ve veliyi tek bir hat üzerinde
 * birleştiren scroll'a bağlı SVG animasyonu. Sayfa kaydıkça çizgi çizilir,
 * ışıklı nokta hat boyunca ilerler ve duraklar sırayla aktifleşir.
 * prefers-reduced-motion'da tamamı çizili statik hâl gösterilir.
 */

const VIEW_W = 1200;
const VIEW_H = 320;

const PATH_D =
  "M30,190 C120,190 210,110 300,110 C390,110 530,190 620,190 C710,190 850,110 940,110 C1030,110 1120,150 1170,150";

const STOPS = [
  { label: "Kurum", detail: "Kayıt ve düzen", x: 300, y: 110, t: 0.26 },
  { label: "Öğretmen", detail: "Plan ve seans", x: 620, y: 190, t: 0.52 },
  { label: "Veli", detail: "Takip ve iletişim", x: 940, y: 110, t: 0.79 },
] as const;

export function FlowPath() {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const progressPathRef = useRef<SVGPathElement | null>(null);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const stopRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const path = progressPathRef.current;
    const dot = dotRef.current;
    if (!section || !path || !dot) {
      return;
    }

    const length = path.getTotalLength();
    path.style.strokeDasharray = `${length}`;

    const apply = (progress: number) => {
      path.style.strokeDashoffset = `${length * (1 - progress)}`;
      const point = path.getPointAtLength(length * progress);
      dot.style.left = `${(point.x / VIEW_W) * 100}%`;
      dot.style.top = `${(point.y / VIEW_H) * 100}%`;
      dot.style.opacity = progress > 0.02 && progress < 0.99 ? "1" : "0";
      STOPS.forEach((stop, index) => {
        stopRefs.current[index]?.setAttribute(
          "data-active",
          progress >= stop.t ? "true" : "false",
        );
      });
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(1);
      return;
    }

    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const vh = Math.max(window.innerHeight, 1);
      const raw = (vh * 0.9 - rect.top) / (rect.height + vh * 0.45);
      apply(Math.min(1, Math.max(0, raw)));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      ref={sectionRef}
      aria-hidden="true"
      className="relative aspect-[1200/460] sm:aspect-[1200/320]"
      data-testid="landing-flow-path"
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <linearGradient
            id="landing-flow-gradient"
            x1="0"
            y1="0"
            x2={VIEW_W}
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="1" stopColor="#6fffd2" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <path
          d={PATH_D}
          className="stroke-white/10"
          strokeWidth={1.5}
          vectorEffect="non-scaling-stroke"
        />
        <path
          ref={progressPathRef}
          d={PATH_D}
          stroke="url(#landing-flow-gradient)"
          strokeWidth={2}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* Hat boyunca ilerleyen ışıklı nokta */}
      <div
        ref={dotRef}
        className="absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-200 opacity-0 shadow-[0_0_18px_5px_rgba(111,255,210,0.45)] transition-opacity duration-300"
      />

      {/* Duraklar */}
      {STOPS.map((stop, index) => (
        <div
          key={stop.label}
          ref={(node) => {
            stopRefs.current[index] = node;
          }}
          data-active="false"
          className="group absolute -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${(stop.x / VIEW_W) * 100}%`,
            top: `${(stop.y / VIEW_H) * 100}%`,
          }}
        >
          <span className="block size-3 rounded-full border border-white/30 bg-black transition duration-700 group-data-[active=true]:border-emerald-200 group-data-[active=true]:bg-emerald-200/90 group-data-[active=true]:shadow-[0_0_18px_2px_rgba(111,255,210,0.35)]" />
          <div className="absolute left-1/2 top-full mt-3 w-24 -translate-x-1/2 translate-y-1 text-center opacity-40 transition-all duration-700 group-data-[active=true]:translate-y-0 group-data-[active=true]:opacity-100 sm:w-36">
            <div className="text-xs font-semibold text-white sm:text-sm">{stop.label}</div>
            <div className="mt-0.5 hidden text-xs text-white/45 sm:block">{stop.detail}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
