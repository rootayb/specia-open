import { Children } from "react";

import { restoreTurkishText } from "@/lib/turkish";
import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

/**
 * Tek tip durum rozeti. Yalnızca semantik token kullanır; bu sayede açık/koyu
 * temada ve `.panel-surface` dışındaki portal/overlay'lerde de doğru çalışır.
 * `dot` verildiğinde nötr çerçeve + küçük renkli nokta (sakin) görünümü kullanılır.
 */
export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const toneClasses: Record<BadgeTone, string> = {
    neutral:
      "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] text-[color:var(--panel-text-muted)]",
    success:
      "border-[color:var(--panel-success-border)] bg-[color:var(--panel-success-bg)] text-[color:var(--panel-success-text)]",
    warning:
      "border-[color:var(--panel-warning-border)] bg-[color:var(--panel-warning-bg)] text-[color:var(--panel-warning-text)]",
    danger:
      "border-[color:var(--panel-danger-border)] bg-[color:var(--panel-danger-bg)] text-[color:var(--panel-danger-text)]",
    info:
      "border-[color:var(--panel-info-border)] bg-[color:var(--panel-info-bg)] text-[color:var(--panel-info-text)]",
  };

  const dotClasses: Record<BadgeTone, string> = {
    neutral: "bg-[color:var(--panel-text-soft)]",
    success: "bg-[color:var(--panel-success-text)]",
    warning: "bg-[color:var(--panel-warning-text)]",
    danger: "bg-[color:var(--panel-danger-text)]",
    info: "bg-[color:var(--panel-info-text)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        dot
          ? "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text-muted)]"
          : toneClasses[tone],
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 shrink-0 rounded-full", dotClasses[tone])} /> : null}
      {Children.map(children, (child) =>
        typeof child === "string" ? restoreTurkishText(child) : child,
      )}
    </span>
  );
}
