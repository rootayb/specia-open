import type { LearningPhase } from "@/lib/prisma-shim";

import { LEARNING_PHASE_META } from "@/lib/learning-phases";
import { cn } from "@/lib/utils";

/**
 * Öğrenme aşaması rozeti. Aşama renkleri semantik durum tonlarından ayrı,
 * `--panel-phase-*` veri token'larından gelir; portal dışı kullanım da güvenlidir.
 */
export function PhaseBadge({
  phase,
  className,
}: {
  phase: LearningPhase;
  className?: string;
}) {
  const meta = LEARNING_PHASE_META[phase];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        className,
      )}
      style={{
        color: meta.colorVar,
        backgroundColor: meta.bgVar,
        borderColor: meta.borderVar,
      }}
    >
      <span
        className="size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: meta.colorVar }}
      />
      {meta.label}
    </span>
  );
}
