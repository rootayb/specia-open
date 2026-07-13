import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

export function Card({
  children,
  className,
  variant = "default",
  padding = "md",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "subtle" | "ghost" | "interactive";
  padding?: "none" | "sm" | "md" | "lg";
  style?: CSSProperties;
}) {
  const variantClasses = {
    default:
      "border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] shadow-[var(--panel-shadow),inset_0_1px_0_rgba(255,255,255,0.08)]",
    subtle:
      "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]",
    ghost: "border-transparent bg-transparent shadow-none",
    interactive:
      "border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] shadow-[var(--panel-shadow),inset_0_1px_0_rgba(255,255,255,0.08)] transition hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)]",
  } as const;
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4",
    lg: "p-5",
  } as const;

  return (
    <div
      data-card
      className={cn(
        "rounded-[var(--panel-radius-card)] border text-[color:var(--panel-text)]",
        variantClasses[variant],
        paddingClasses[padding],
        className,
      )}
      style={style}
    >
      {children}
    </div>
  );
}
