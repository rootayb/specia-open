import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import { GoalSparkline } from "@/components/analysis/goal-sparkline";
import type { GoalTrend, PhaseStat } from "@/lib/educational-analysis";
import { LEARNING_PHASE_META } from "@/lib/learning-phases";

const TREND_ICON: Record<GoalTrend, typeof Minus> = {
  increasing: TrendingUp,
  decreasing: TrendingDown,
  stable: Minus,
  insufficient_data: Minus,
};

const TREND_LABEL: Record<GoalTrend, string> = {
  increasing: "Artıyor",
  decreasing: "Düşüyor",
  stable: "Sabit",
  insufficient_data: "Veri az",
};

/**
 * Her öğrenme aşaması için ayrı mini grafik: tek büyük grafik yerine
 * edinim / akıcılık / kalıcılık / genelleme gidişatı yan yana okunur.
 * `showDescriptions` veli görünümünde aşama açıklamalarını gösterir.
 */
export function PhaseSmallMultiples({
  phaseStats,
  showDescriptions = false,
}: {
  phaseStats: PhaseStat[];
  showDescriptions?: boolean;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {phaseStats.map((stat) => {
        const meta = LEARNING_PHASE_META[stat.phase];
        const TrendIcon = TREND_ICON[stat.trend];
        const hasRecords = stat.recordCount > 0;

        return (
          <div
            key={stat.phase}
            className="rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--panel-text)]">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: meta.colorVar }}
                />
                {meta.label}
              </span>
              {hasRecords ? (
                <span className="text-lg font-semibold tabular-nums" style={{ color: meta.colorVar }}>
                  %{stat.latestValue}
                </span>
              ) : (
                <span className="text-xs text-[color:var(--panel-text-soft)]">—</span>
              )}
            </div>

            {showDescriptions ? (
              <p className="mt-1 text-[11px] leading-4 text-[color:var(--panel-text-soft)]">
                {meta.description}
              </p>
            ) : null}

            <div className="mt-2">
              <GoalSparkline dataPoints={stat.dataPoints} />
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px] text-[color:var(--panel-text-soft)]">
              <span>{hasRecords ? `${stat.recordCount} kayıt` : "Henüz kayıt yok"}</span>
              {hasRecords ? (
                <span className="inline-flex items-center gap-1">
                  <TrendIcon className="size-3.5" />
                  {TREND_LABEL[stat.trend]}
                </span>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
