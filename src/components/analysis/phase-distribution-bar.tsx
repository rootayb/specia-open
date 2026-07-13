import type { PhaseStat } from "@/lib/educational-analysis";
import { LEARNING_PHASE_META } from "@/lib/learning-phases";

/**
 * Kayıtların öğrenme aşamalarına dağılımı: yatay yığılmış bar + sayaçlı lejant.
 * Hangi aşamada ne kadar veri toplandığını tek satırda gösterir.
 */
export function PhaseDistributionBar({ phaseStats }: { phaseStats: PhaseStat[] }) {
  const total = phaseStats.reduce((sum, stat) => sum + stat.recordCount, 0);

  if (total === 0) {
    return null;
  }

  const active = phaseStats.filter((stat) => stat.recordCount > 0);

  return (
    <div className="grid gap-2">
      <div className="flex h-2 overflow-hidden rounded-full bg-[color:var(--panel-bg-hover)]">
        {active.map((stat) => (
          <div
            key={stat.phase}
            className="h-full"
            style={{
              width: `${(stat.recordCount / total) * 100}%`,
              backgroundColor: LEARNING_PHASE_META[stat.phase].colorVar,
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--panel-text-muted)]">
        {active.map((stat) => (
          <span key={stat.phase} className="inline-flex items-center gap-1.5">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: LEARNING_PHASE_META[stat.phase].colorVar }}
            />
            {LEARNING_PHASE_META[stat.phase].label} · {stat.recordCount}
          </span>
        ))}
      </div>
    </div>
  );
}
