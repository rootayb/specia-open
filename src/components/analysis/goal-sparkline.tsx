import type { GoalAnalysisDataPoint } from "@/lib/educational-analysis";
import { LEARNING_PHASE_META } from "@/lib/learning-phases";
import { cn } from "@/lib/utils";

/* Görünüm sabitleri (viewBox birimleri) */
const W = 120;
const H = 36;
const PAD = 4;

/**
 * Eksensiz mini eğri: hedef kartlarında ve hızlı giriş geri bildiriminde
 * son gidişatı tek bakışta gösterir. Segmentler ait oldukları kaydın
 * öğrenme aşamasının rengiyle çizilir.
 */
export function GoalSparkline({
  dataPoints,
  className,
}: {
  dataPoints: GoalAnalysisDataPoint[];
  className?: string;
}) {
  if (dataPoints.length === 0) {
    return (
      <div
        className={cn(
          "flex h-9 items-center justify-center rounded-[var(--panel-radius-sm)] border border-dashed border-[color:var(--panel-border)] text-[10px] text-[color:var(--panel-text-soft)]",
          className,
        )}
      >
        Kayıt yok
      </div>
    );
  }

  const n = dataPoints.length;
  const x = (index: number) => (n === 1 ? W / 2 : PAD + ((W - PAD * 2) / (n - 1)) * index);
  const y = (value: number) => PAD + (H - PAD * 2) - (value / 100) * (H - PAD * 2);

  const coords = dataPoints.map((point, index) => ({
    cx: x(index),
    cy: y(point.value),
    point,
  }));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={cn("h-9 w-full", className)}
      role="img"
      aria-label="Hedef ilerleme mini grafiği"
      preserveAspectRatio="none"
    >
      {coords.slice(1).map((c, index) => {
        const prev = coords[index];
        return (
          <line
            key={index}
            x1={prev.cx}
            y1={prev.cy}
            x2={c.cx}
            y2={c.cy}
            stroke={LEARNING_PHASE_META[c.point.phase].colorVar}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}
      {coords.map((c, index) => (
        <circle
          key={index}
          cx={c.cx}
          cy={c.cy}
          r="2.4"
          fill={LEARNING_PHASE_META[c.point.phase].colorVar}
        />
      ))}
    </svg>
  );
}
