import { Children, type ButtonHTMLAttributes } from "react";

import { restoreTurkishText } from "@/lib/turkish";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg" | "icon";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "bg-[color:var(--panel-text)] text-[color:var(--panel-bg-base)] hover:opacity-90 disabled:opacity-40",
    secondary:
      "bg-[color:var(--panel-bg-elevated)] text-[color:var(--panel-text)] ring-1 ring-[color:var(--panel-border)] hover:bg-[color:var(--panel-bg-hover)] disabled:opacity-50",
    ghost:
      "bg-transparent text-[color:var(--panel-text-muted)] ring-1 ring-[color:var(--panel-border)] hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)] disabled:bg-transparent disabled:opacity-50",
    danger:
      "bg-[color:var(--panel-danger-bg)] text-[color:var(--panel-danger-text)] ring-1 ring-[color:var(--panel-danger-border)] hover:opacity-90 disabled:opacity-50",
    outline:
      "bg-transparent text-[color:var(--panel-text)] ring-1 ring-[color:var(--panel-border)] hover:bg-[color:var(--panel-bg-hover)] disabled:opacity-50",
  };
  const sizes = {
    sm: "min-h-8 rounded-lg px-2.5 py-1.5 text-[13px]",
    md: "min-h-9 rounded-xl px-3.5 py-2 text-[13px]",
    lg: "min-h-10 rounded-xl px-4 py-2.5 text-[13px]",
    icon: "size-9 rounded-xl px-0 py-0 text-[13px]",
  } as const;

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/15 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {Children.map(children, (child) => (typeof child === "string" ? restoreTurkishText(child) : child))}
    </button>
  );
}
