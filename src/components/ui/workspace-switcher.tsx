"use client";

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type WorkspaceCardItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  value?: string;
};

const workspaceTones = [
  {
    "--workspace-accent": "var(--panel-info-text)",
    "--workspace-accent-bg": "var(--panel-info-bg)",
    "--workspace-accent-border": "var(--panel-info-border)",
  },
  {
    "--workspace-accent": "var(--panel-success-text)",
    "--workspace-accent-bg": "var(--panel-success-bg)",
    "--workspace-accent-border": "var(--panel-success-border)",
  },
  {
    "--workspace-accent": "var(--panel-warning-text)",
    "--workspace-accent-bg": "var(--panel-warning-bg)",
    "--workspace-accent-border": "var(--panel-warning-border)",
  },
  {
    "--workspace-accent": "var(--panel-danger-text)",
    "--workspace-accent-bg": "var(--panel-danger-bg)",
    "--workspace-accent-border": "var(--panel-danger-border)",
  },
] as const;

export function WorkspaceCardGrid({
  items,
  activeId,
  onChange,
  className,
  compact = false,
}: {
  items: WorkspaceCardItem[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("grid gap-3 sm:grid-cols-2 2xl:grid-cols-4", className)}>
      {items.map((item, index) => {
        const Icon = item.icon;
        const active = item.id === activeId;
        const tone = workspaceTones[index % workspaceTones.length];

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            style={tone as CSSProperties}
            className={cn(
              compact
                ? "relative flex items-center gap-3 overflow-hidden rounded-xl border p-2.5 text-left transition"
                : "relative min-h-[100px] overflow-hidden rounded-[14px] border p-4 text-left transition sm:min-h-[140px] sm:rounded-[16px] sm:p-4",
              active
                ? "border-[color:var(--workspace-accent-border)] bg-[linear-gradient(135deg,var(--workspace-accent-bg),var(--panel-bg-base)_70%)] text-[color:var(--panel-text)] shadow-[var(--panel-shadow)]"
                : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] text-[color:var(--panel-text)] hover:border-[color:var(--workspace-accent-border)] hover:bg-[color:var(--panel-bg-hover)]",
            )}
          >
            {compact ? (
              <>
                <div
                  className={cn(
                    "inline-flex rounded-xl border p-2 shrink-0",
                    active
                      ? "border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-bg)] text-[color:var(--workspace-accent)]"
                      : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text-muted)]",
                  )}
                >
                  <Icon className="size-4.5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="font-semibold text-sm sm:text-base text-inherit truncate leading-tight">
                    {item.title}
                  </div>
                  {item.value ? (
                    <div className={cn("text-[11px] mt-0.5 leading-none truncate", active ? "text-[color:var(--workspace-accent)]" : "text-[color:var(--panel-text-soft)]")}>
                      {item.value}
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="flex h-full flex-col justify-between gap-6">
                <div>
                  <div
                    className={cn(
                      "inline-flex rounded-xl border p-2 sm:p-2.5",
                      active
                        ? "border-[color:var(--workspace-accent-border)] bg-[color:var(--workspace-accent-bg)] text-[color:var(--workspace-accent)]"
                        : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text-muted)]",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="mt-4 text-base font-semibold sm:text-lg text-inherit">{item.title}</div>
                  <p
                    className={cn(
                      "mt-3 text-sm leading-6",
                      active ? "text-[color:var(--panel-text-muted)]" : "text-[color:var(--panel-text-muted)]",
                    )}
                  >
                    {item.description}
                  </p>
                </div>
                {item.value ? (
                  <div className={cn("text-sm", active ? "text-[color:var(--workspace-accent)]" : "text-[color:var(--panel-text-soft)]")}>
                    {item.value}
                  </div>
                ) : null}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function WorkspacePanel({
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-base),var(--panel-bg-soft))] p-4 shadow-[var(--panel-shadow)] sm:rounded-[16px] sm:p-4",
        "before:absolute before:inset-x-4 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,var(--panel-border-strong),transparent)]",
        className,
      )}
    >
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-3xl">
          {eyebrow ? (
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              {eyebrow}
            </div>
          ) : null}
          <div className="mt-2 text-lg font-semibold text-[color:var(--panel-text)]">{title}</div>
          {description ? <p className="mt-2 text-sm leading-6 text-[color:var(--panel-text-muted)]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
      <div className="relative z-10 mt-5">{children}</div>
    </div>
  );
}
