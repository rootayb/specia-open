import { Card } from "@/components/ui/card";
import type { TeacherEducationalAnalysisSummary } from "@/lib/data";

const FLOW_SERIES = [
  { key: "completed" as const, label: "Tamamlanan", color: "var(--panel-success-text)" },
  { key: "planned" as const, label: "Planlanan", color: "var(--panel-info-text)" },
  { key: "cancelled" as const, label: "İptal", color: "var(--panel-danger-text)" },
];

/**
 * Bu ayki seans akışını ve seans türü dağılımını iki küçük grafikte özetler.
 * Veri girilen oturumların gerçekten işlendiğini üst düzeyde gösterir.
 */
export function SessionOverviewCharts({
  analysis,
}: {
  analysis: TeacherEducationalAnalysisSummary;
}) {
  const weeks = analysis.weeklySessionFlow;
  const types = analysis.sessionTypeBreakdown;
  const maxWeekTotal = Math.max(1, ...weeks.map((week) => week.total));
  const maxTypeCount = Math.max(1, ...types.map((item) => item.count));

  if (analysis.totalSessionsThisMonth === 0) {
    return null;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {/* Haftalık seans akışı: yığılmış mini çubuklar */}
      <Card padding="md">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
          Bu ayın seans akışı
        </div>
        <div className="mt-3 flex items-end gap-3">
          {weeks.map((week) => (
            <div key={week.week} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-20 w-full max-w-10 flex-col-reverse overflow-hidden rounded-[var(--panel-radius-sm)] bg-[color:var(--panel-bg-hover)]">
                {FLOW_SERIES.map((series) =>
                  week[series.key] > 0 ? (
                    <div
                      key={series.key}
                      style={{
                        height: `${(week[series.key] / maxWeekTotal) * 100}%`,
                        backgroundColor: series.color,
                        opacity: 0.85,
                      }}
                    />
                  ) : null,
                )}
              </div>
              <span className="text-[10px] text-[color:var(--panel-text-soft)]">{week.label}</span>
              <span className="text-[11px] font-semibold tabular-nums text-[color:var(--panel-text)]">
                {week.total}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[color:var(--panel-text-muted)]">
          {FLOW_SERIES.map((series) => (
            <span key={series.key} className="inline-flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: series.color }} />
              {series.label}
            </span>
          ))}
        </div>
      </Card>

      {/* Seans türü dağılımı: yatay çubuklar */}
      <Card padding="md">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
          Seans türü dağılımı
        </div>
        <div className="mt-3 grid gap-2">
          {types.length === 0 ? (
            <p className="text-sm text-[color:var(--panel-text-soft)]">
              Bu ay için seans türü verisi yok.
            </p>
          ) : (
            types.map((item) => (
              <div key={item.type} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                <div>
                  <div className="flex items-center justify-between text-xs text-[color:var(--panel-text-muted)]">
                    <span className="truncate">{item.type}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[color:var(--panel-bg-hover)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--panel-info-text)]"
                      style={{ width: `${(item.count / maxTypeCount) * 100}%`, opacity: 0.8 }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[color:var(--panel-text)]">
                  {item.count}
                </span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
