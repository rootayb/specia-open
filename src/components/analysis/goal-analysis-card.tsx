"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Minus,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
} from "lucide-react";
import type { GoalProgressStatus } from "@/lib/prisma-shim";

import { deleteBepGoalProgressEntryAction } from "@/app/educational-analysis-actions";
import { PhaseBadge } from "@/components/analysis/phase-badge";
import { PhaseDistributionBar } from "@/components/analysis/phase-distribution-bar";
import { PhaseSmallMultiples } from "@/components/analysis/phase-small-multiples";
import { PhaseTimelineChart } from "@/components/analysis/phase-timeline-chart";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EducationalProgressGoalRecord } from "@/lib/data";
import type { GoalAnalysis, GoalTrend } from "@/lib/educational-analysis";
import { LEARNING_PHASE_META } from "@/lib/learning-phases";

type Props = {
  analysis: GoalAnalysis;
  goal: EducationalProgressGoalRecord;
  studentId: string;
  index: number;
  variant: "line" | "bar";
  canEdit?: boolean;
};

const STATUS_LABEL: Record<GoalProgressStatus, string> = {
  not_started: "Başlanmadı",
  in_progress: "Sürüyor",
  completed: "Tamamlandı",
  needs_support: "Destek gerekli",
};

const STATUS_TONE: Record<GoalProgressStatus, "neutral" | "info" | "success" | "danger"> = {
  not_started: "neutral",
  in_progress: "info",
  completed: "success",
  needs_support: "danger",
};

const TREND_META: Record<
  GoalTrend,
  { label: string; tone: "neutral" | "success" | "warning" | "danger"; Icon: typeof Minus }
> = {
  increasing: { label: "Artıyor", tone: "success", Icon: TrendingUp },
  decreasing: { label: "Düşüyor", tone: "danger", Icon: TrendingDown },
  stable: { label: "Sabit", tone: "neutral", Icon: Minus },
  insufficient_data: { label: "Veri yetersiz", tone: "warning", Icon: Minus },
};

function fmtDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(date);
}

export function GoalAnalysisCard({
  analysis,
  goal,
  studentId,
  index,
  variant,
  canEdit = true,
}: Props) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [isPending, startTransition] = useTransition();
  const [showRecords, setShowRecords] = useState(false);

  const trend = TREND_META[analysis.trend];
  const TrendIcon = trend.Icon;
  const suggestion = analysis.phaseSuggestion;

  const entryHref = `/panel/hizli-veri-girisi?studentId=${studentId}&goalId=${goal.id}${
    suggestion?.suggestedPhase ? `&phase=${suggestion.suggestedPhase}` : ""
  }`;


  function deleteEntry(id: string) {
    if (!window.confirm("Bu kayıt silinsin mi?")) return;
    startTransition(async () => {
      const result = await deleteBepGoalProgressEntryAction({ id });
      showResult(result, { successTitle: "Kayıt silindi", errorTitle: "Silme başarısız" });
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <Card padding="md">
      <div className="grid gap-4">
        {/* Başlık + performans */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              {index}. Amaç · {analysis.course} / {analysis.learningArea}
            </div>
            <p className="mt-2 text-base font-medium leading-6 text-[color:var(--panel-text)]">
              {analysis.goalTitle}
            </p>
            {analysis.targetOutcome && (
              <p className="mt-1 text-xs text-[color:var(--panel-text-muted)]">
                Hedeflenen kazanım: {analysis.targetOutcome}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[color:var(--panel-text-soft)]">
              <span>Başlangıç: {fmtDate(analysis.startDate)}</span>
              <span>Son kayıt: {fmtDate(analysis.latestRecordDate)}</span>
              <span>{analysis.recordCount} kayıt</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex items-center gap-1.5">
              <PhaseBadge phase={analysis.currentPhase} />
              <Badge tone={trend.tone}>
                <TrendIcon className="size-3.5" />
                {trend.label}
              </Badge>
            </div>
            <div className="text-3xl font-semibold tabular-nums text-[color:var(--panel-text)]">
              %{analysis.currentPerformance}
            </div>
            <Badge tone={STATUS_TONE[analysis.status]}>{STATUS_LABEL[analysis.status]}</Badge>
          </div>
        </div>

        {/* İnce ilerleme çubuğu (mevcut aşamanın renginde) */}
        <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--panel-bg-hover)]">
          <div
            className="h-full rounded-full"
            style={{
              width: `${analysis.currentPerformance}%`,
              backgroundColor: LEARNING_PHASE_META[analysis.currentPhase].colorVar,
              opacity: 0.85,
            }}
          />
        </div>

        {/* Zaman çizelgesi: tüm kayıtlar aşama renkleriyle */}
        <PhaseTimelineChart
          dataPoints={analysis.dataPoints}
          variant={variant}
          target={analysis.targetPerformance}
        />

        {/* Aşama bazlı mini grafikler */}
        {analysis.recordCount > 0 && (
          <div className="grid gap-3">
            <PhaseSmallMultiples phaseStats={analysis.phaseStats} showDescriptions={!canEdit} />
            <PhaseDistributionBar phaseStats={analysis.phaseStats} />
          </div>
        )}

        {/* Aşama geçiş önerisi */}
        {suggestion && (
          <div
            className="flex items-start gap-2.5 rounded-[var(--panel-radius-md)] border px-4 py-3 text-sm"
            style={{
              borderColor: LEARNING_PHASE_META[suggestion.currentPhase].borderVar,
              backgroundColor: LEARNING_PHASE_META[suggestion.currentPhase].bgVar,
            }}
          >
            <Lightbulb
              className="mt-0.5 size-4 shrink-0"
              style={{ color: LEARNING_PHASE_META[suggestion.currentPhase].colorVar }}
            />
            <span className="text-[color:var(--panel-text-muted)]">{suggestion.message}</span>
          </div>
        )}

        {/* Otomatik yorum */}
        <div className="rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-3 text-sm text-[color:var(--panel-text-muted)]">
          {analysis.summary}
        </div>

        {/* Eylemler */}
        <div className="flex flex-wrap items-center gap-2">
          {analysis.recordCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setShowRecords((value) => !value)}>
              {showRecords ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
              Kayıtlar ({analysis.recordCount})
            </Button>
          )}
          {canEdit && (
            <Link href={entryHref}>
              <Button variant="secondary" size="sm">
                <Plus className="size-4" />
                İlerleme kaydı ekle
              </Button>
            </Link>
          )}
          {canEdit && suggestion?.suggestedPhase && (
            <Link href={entryHref}>
              <Button variant="ghost" size="sm">
                <ArrowRight className="size-4" />
                {LEARNING_PHASE_META[suggestion.suggestedPhase].label} kaydı başlat
              </Button>
            </Link>
          )}
        </div>

        {/* Kayıt geçmişi tablosu */}
        {showRecords && analysis.recordCount > 0 && (
          <div className="overflow-x-auto rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)]">
            <table className="min-w-full divide-y divide-[color:var(--panel-border)] text-sm">
              <thead className="bg-[color:var(--panel-bg-soft)]">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Tarih
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Aşama
                  </th>
                  <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Durum
                  </th>
                  <th className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    İlerleme
                  </th>
                  <th className="hidden px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)] md:table-cell">
                    Gözlem notu
                  </th>
                  {canEdit && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]">
                {goal.history.map((entry, rowIndex) => (
                  <tr
                    key={entry.id}
                    className={rowIndex % 2 === 0 ? "" : "bg-[color:var(--panel-bg-soft)]"}
                  >
                    <td className="whitespace-nowrap px-4 py-2.5 text-[color:var(--panel-text-muted)]">
                      {fmtDate(entry.measuredAt)}
                    </td>
                    <td className="px-4 py-2.5">
                      <PhaseBadge phase={entry.phase} />
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge tone={STATUS_TONE[entry.status]}>{STATUS_LABEL[entry.status]}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-[color:var(--panel-text)]">
                      %{entry.progressPercent}
                    </td>
                    <td className="hidden max-w-xs px-4 py-2.5 text-[color:var(--panel-text-muted)] md:table-cell">
                      <span className="line-clamp-2">{entry.note || "—"}</span>
                    </td>
                    {canEdit && (
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="danger"
                            size="sm"
                            disabled={isPending}
                            onClick={() => deleteEntry(entry.id)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
