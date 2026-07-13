"use client";

import { useEffect, useState } from "react";

function buildCountdownParts(target: string, now: number) {
  const endTime = new Date(target).getTime();
  if (Number.isNaN(endTime)) {
    return null;
  }

  const remainingMs = Math.max(0, endTime - now);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    done: remainingMs <= 0,
    items: [
      { label: "Gun", value: String(days).padStart(2, "0") },
      { label: "Saat", value: String(hours).padStart(2, "0") },
      { label: "Dakika", value: String(minutes).padStart(2, "0") },
      { label: "Saniye", value: String(seconds).padStart(2, "0") },
    ],
  };
}

export function MaintenanceCountdown({ endsAt }: { endsAt?: string | null }) {
  const [now, setNow] = useState(() => Date.now());
  const countdown = endsAt ? buildCountdownParts(endsAt, now) : null;

  useEffect(() => {
    if (!endsAt) {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [endsAt]);

  if (!endsAt) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-neutral-300">
        Bakim suresi belirtilmedi. Güncel durum için birazdan tekrar kontrol edin.
      </div>
    );
  }

  if (!countdown) {
    return null;
  }

  if (countdown.done) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
        Planlanan bakim süresi doldu. Sayfayi yenileyerek normal akisa donmeyi deneyin.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {countdown.items.map((item) => (
        <div
          key={item.label}
          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-center"
        >
          <div className="text-3xl font-semibold tracking-[-0.06em] text-white">{item.value}</div>
          <div className="mt-1 text-xs uppercase tracking-[0.22em] text-neutral-500">
            {item.label}
          </div>
        </div>
      ))}
    </div>
  );
}
