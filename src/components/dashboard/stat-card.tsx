import type { CSSProperties } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const accentStyles = {
  blue: {
    "--stat-accent": "var(--panel-info-text)",
    "--stat-accent-bg": "var(--panel-info-bg)",
    "--stat-accent-border": "var(--panel-info-border)",
  },
  emerald: {
    "--stat-accent": "var(--panel-success-text)",
    "--stat-accent-bg": "var(--panel-success-bg)",
    "--stat-accent-border": "var(--panel-success-border)",
  },
  amber: {
    "--stat-accent": "var(--panel-warning-text)",
    "--stat-accent-bg": "var(--panel-warning-bg)",
    "--stat-accent-border": "var(--panel-warning-border)",
  },
  rose: {
    "--stat-accent": "var(--panel-danger-text)",
    "--stat-accent-bg": "var(--panel-danger-bg)",
    "--stat-accent-border": "var(--panel-danger-border)",
  },
  neutral: {
    "--stat-accent": "var(--panel-text-muted)",
    "--stat-accent-bg": "var(--panel-bg-hover)",
    "--stat-accent-border": "var(--panel-border-strong)",
  },
} as const;

type StatAccent = keyof typeof accentStyles;

function resolveAccent(accent: string | undefined, label: string): StatAccent {
  if (accent && accent in accentStyles) {
    return accent as StatAccent;
  }

  const normalized = label.toLocaleLowerCase("tr-TR");
  if (normalized.includes("aktif") || normalized.includes("tamam") || normalized.includes("yayın")) {
    return "emerald";
  }
  if (normalized.includes("taslak") || normalized.includes("bekleyen") || normalized.includes("plan")) {
    return "amber";
  }
  if (normalized.includes("kritik") || normalized.includes("pasif") || normalized.includes("hata")) {
    return "rose";
  }
  if (normalized.includes("öğrenci") || normalized.includes("bep") || normalized.includes("değerlendirme")) {
    return "blue";
  }

  return "neutral";
}

export function StatCard(props: {
  label: string;
  value: number | string;
  accent?: string;
  meta?: string;
  size?: "sm" | "md";
}) {
  const { label, value, meta, size = "md" } = props;
  const compact = size === "sm";
  const accent = resolveAccent(props.accent, label);

  return (
    <Card
      variant="subtle"
      padding="sm"
      className={cn(
        "relative overflow-hidden border-[color:var(--stat-accent-border)] bg-[linear-gradient(135deg,var(--stat-accent-bg),var(--panel-bg-soft)_48%,var(--panel-bg-base)_125%)]",
        compact ? "" : "min-h-[96px]",
      )}
      style={accentStyles[accent] as CSSProperties}
    >
      <div className={compact ? "flex flex-col gap-1.5" : "flex h-full flex-col justify-between gap-4"}>
        <div className="text-[11px] font-medium uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
          {label}
        </div>
        <div>
          <div
            className={
              compact
                ? "text-2xl font-semibold tracking-[-0.03em] text-[color:var(--panel-text)]"
                : "text-2xl font-semibold tracking-[-0.03em] text-[color:var(--panel-text)] sm:text-3xl"
            }
          >
            {value}
          </div>
          {meta ? (
            <div className="mt-2 text-sm text-[color:var(--panel-text-muted)]">{meta}</div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
