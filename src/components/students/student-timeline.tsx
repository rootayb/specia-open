"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarRange, FileText, MessageSquare, Sparkles, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type TimelineItem = {
  key: string;
  occurredAt: Date;
  type: "student" | "document" | "file" | "message" | "meeting" | "session";
  title: string;
  description: string;
  href: string;
};

const timelineStyles: Record<
  TimelineItem["type"],
  {
    label: string;
    icon: typeof Sparkles;
    dotClassName: string;
  }
> = {
  student: {
    label: "Profil",
    icon: Sparkles,
    dotClassName: "bg-white",
  },
  document: {
    label: "BEP",
    icon: FileText,
    dotClassName: "bg-emerald-300",
  },
  file: {
    label: "Belge",
    icon: FileText,
    dotClassName: "bg-sky-300",
  },
  message: {
    label: "İletişim",
    icon: MessageSquare,
    dotClassName: "bg-amber-300",
  },
  meeting: {
    label: "Toplantı",
    icon: Users2,
    dotClassName: "bg-fuchsia-300",
  },
  session: {
    label: "Seans",
    icon: CalendarRange,
    dotClassName: "bg-orange-300",
  },
};

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function StudentTimeline({ items }: { items: TimelineItem[] }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const visibleItems = items.slice(0, visibleCount);
  const hasMore = items.length > visibleCount;

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
            Bu öğrenci için henüz zaman çizgisi oluşturacak hareket bulunmuyor.
          </div>
        ) : (
          visibleItems.map((item, index) => {
            const style = timelineStyles[item.type];
            const Icon = style.icon;
            // Parse occurredAt as Date object to support dynamic date formatting
            const occurredAtDate = new Date(item.occurredAt);

            return (
              <div key={item.key} className="grid grid-cols-[24px_1fr] gap-4">
                <div className="relative flex justify-center">
                  <span
                    className={`mt-2 size-3 rounded-full border border-black/20 ${style.dotClassName}`}
                  />
                  {index < visibleItems.length - 1 ? (
                    <span className="absolute top-6 h-[calc(100%+1rem)] w-px bg-white/10" />
                  ) : null}
                </div>
                <Link
                  href={item.href}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-neutral-300">
                        <Icon className="size-3.5" />
                        {style.label}
                      </div>
                      <div className="text-base font-semibold text-white">{item.title}</div>
                      <p className="max-w-2xl text-sm leading-6 text-neutral-400">
                        {item.description}
                      </p>
                    </div>
                    <div className="text-sm text-neutral-500">
                      {dateTimeFormatter.format(occurredAtDate)}
                    </div>
                  </div>
                </Link>
              </div>
            );
          })
        )}
      </div>
      {hasMore && (
        <div className="flex justify-start pl-10">
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-400 hover:text-white px-0 hover:bg-transparent text-xs"
            onClick={() => setVisibleCount((prev) => prev + 5)}
          >
            Daha fazla göster ({items.length - visibleCount} kalan)
          </Button>
        </div>
      )}
    </div>
  );
}
