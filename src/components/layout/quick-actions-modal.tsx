"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import type { ComponentType } from "react";
import { ArrowRight, X } from "lucide-react";

import { cn } from "@/lib/utils";

export type QuickActionItem = {
  href: string;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
};

export function QuickActionsModal({
  items,
  isOpen,
  onClose,
}: {
  items: QuickActionItem[];
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[140] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:px-6 sm:py-10">
      <button
        type="button"
        aria-label="Hızlı işlemleri kapat"
        className="absolute inset-0"
        onClick={onClose}
      />

      <div className="relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-[16px] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] p-4 shadow-[var(--panel-shadow)] sm:max-h-[min(88vh,920px)] sm:max-w-3xl sm:rounded-[16px] sm:p-5">
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1.5 w-14 rounded-full bg-white/12" />
        </div>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[color:var(--panel-text-soft)]">
              Hızlı İşlemler
            </div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-[color:var(--panel-text)] sm:text-xl">
              Sık kullanılan modüller
            </h2>
            <p className="max-w-xl text-xs leading-5 text-[color:var(--panel-text-muted)]">
              Sık kullandığınız ekranları tek yerden açın. Mobilde daha hızlı erişim için alt panel
              davranışı korunur.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
            aria-label="Hızlı işlemleri kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 flex-1 overflow-y-auto pb-4 sm:pb-0">
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-3.5 transition",
                    "hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)] sm:p-4",
                  )}
                >
                  <div className="flex items-start gap-3.5 sm:flex-col sm:gap-4">
                    <div className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text)]">
                      <Icon className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-[color:var(--panel-text)]">
                        {item.label}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-[color:var(--panel-text-muted)]">
                        {item.description}
                      </p>
                    </div>

                    <div className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-[color:var(--panel-text-soft)] transition group-hover:text-[color:var(--panel-text)] sm:mt-auto">
                      Aç
                      <ArrowRight className="size-3.5" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
