"use client";

import dynamic from "next/dynamic";

/**
 * Three.js sahnesini ilk JS paketinden ayırıp yalnızca istemcide yükler.
 * Yükleninceye kadar yumuşak bir gradyan placeholder gösterir; böylece
 * hero anında boyanır, ağır WebGL kodu arka planda gelir.
 */
const SpeciaOrbitScene = dynamic(
  () => import("@/components/landing/specia-orbit-scene").then((mod) => mod.SpeciaOrbitScene),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,rgba(111,255,210,0.16),transparent_60%)]"
      />
    ),
  },
);

export function HeroScene() {
  return <SpeciaOrbitScene />;
}
