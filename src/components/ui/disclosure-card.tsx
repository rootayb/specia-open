"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { restoreTurkishText } from "@/lib/turkish";
import { cn } from "@/lib/utils";

export function DisclosureCard({
  eyebrow,
  title,
  description,
  summary,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className,
  bodyClassName,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  summary?: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (nextOpen: boolean) => void;
  className?: string;
  bodyClassName?: string;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = typeof open === "boolean";
  const isOpen = isControlled ? Boolean(open) : internalOpen;

  const toggle = () => {
    const nextOpen = !isOpen;
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <div
      className={cn(
        "rounded-[16px] border border-white/10 bg-white/[0.03] shadow-[var(--panel-shadow)]",
        className,
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-start justify-between gap-4 px-4 py-4 text-left"
      >
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-2">
            {eyebrow ? (
              <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-neutral-500">
                {restoreTurkishText(eyebrow)}
              </div>
            ) : null}
            <div className="text-base font-semibold text-white">{restoreTurkishText(title)}</div>
            {description ? (
              <p className="max-w-3xl text-sm leading-6 text-neutral-400">
                {restoreTurkishText(description)}
              </p>
            ) : null}
          </div>
          {summary ? <div className="flex flex-wrap gap-2 text-sm text-neutral-300">{summary}</div> : null}
        </div>
        <span className="mt-1 inline-flex rounded-lg border border-white/10 bg-white/[0.05] p-2 text-neutral-300">
          {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </span>
      </button>

      {isOpen ? <div className={cn("border-t border-white/8 px-4 pb-4 pt-4", bodyClassName)}>{children}</div> : null}
    </div>
  );
}
