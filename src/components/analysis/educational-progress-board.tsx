"use client";

import { useMemo, useState } from "react";
import { LineChart as LineChartIcon, BarChart3, FileText } from "lucide-react";

import { GoalAnalysisCard } from "@/components/analysis/goal-analysis-card";
import { SessionOverviewCharts } from "@/components/analysis/session-overview-charts";
import { StatCard } from "@/components/dashboard/stat-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { SectionHeading } from "@/components/ui/section-heading";
import type {
  TeacherEducationalAnalysisSummary,
  TeacherEducationalProgressWorkspace,
} from "@/lib/data";
import { buildGoalAnalysis } from "@/lib/educational-analysis";
import { cn } from "@/lib/utils";

/* ─── Tipler ─────────────────────────────────────────────────── */

type Props = {
  workspace: TeacherEducationalProgressWorkspace;
  analysis: TeacherEducationalAnalysisSummary;
  canEdit?: boolean;
};

type ChartVariant = "line" | "bar";

/* ─── Ana bileşen ────────────────────────────────────────────── */

export function EducationalProgressBoard({ workspace, analysis: sessionAnalysis, canEdit = true }: Props) {
  const [studentId, setStudentId] = useState(workspace.students[0]?.id ?? "");
  const [documentId, setDocumentId] = useState(workspace.students[0]?.documents[0]?.id ?? "");
  const [goalId, setGoalId] = useState(
    workspace.students[0]?.documents[0]?.goals[0]?.id ?? "",
  );
  const [variant, setVariant] = useState<ChartVariant>("line");

  const student = useMemo(
    () => workspace.students.find((s) => s.id === studentId) ?? workspace.students[0] ?? null,
    [studentId, workspace.students],
  );
  const document = useMemo(
    () => student?.documents.find((d) => d.id === documentId) ?? student?.documents[0] ?? null,
    [documentId, student],
  );

  const goals = document?.goals ?? [];
  const goal = goals.find((g) => g.id === goalId) ?? goals[0] ?? null;
  const goalIndex = goal ? goals.findIndex((g) => g.id === goal.id) + 1 : 0;

  /* Yalnızca seçili amacın analizi: karışıklığı önlemek için tüm amaçlar aynı anda listelenmez. */
  const goalAnalysis = useMemo(() => {
    if (!goal) return null;
    return buildGoalAnalysis(goal, { startDateFallback: document?.startDate || null });
  }, [goal, document]);

  function onStudentChange(id: string) {
    const next = workspace.students.find((s) => s.id === id);
    const nextDocument = next?.documents[0] ?? null;
    setStudentId(id);
    setDocumentId(nextDocument?.id ?? "");
    setGoalId(nextDocument?.goals[0]?.id ?? "");
  }

  function onDocumentChange(id: string) {
    const nextDocument = student?.documents.find((d) => d.id === id) ?? null;
    setDocumentId(id);
    setGoalId(nextDocument?.goals[0]?.id ?? "");
  }

  /* Boş durum */
  if (workspace.students.length === 0) {
    return (
      <Card>
        <SectionHeading
          eyebrow="İlerleme"
          title="İzlenecek aktif BEP hedefi bulunmuyor."
          description="BEP belgelerine hedef eklendiğinde burada gelişimi grafikle takip edebilirsiniz."
        />
      </Card>
    );
  }

  const stats = [
    { label: "Aktif hedef", value: workspace.goalCount },
    { label: "Tamamlanan", value: workspace.completedGoalCount },
    { label: "Destek gerektiren", value: workspace.needsSupportGoalCount },
    { label: "Ort. ilerleme", value: `%${workspace.averageProgressPercent}` },
  ];

  const comparisons = workspace.studentProgressAverages;

  return (
    <div className="grid gap-5">
      {/* Özet istatistikler */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} size="sm" />
        ))}
      </div>

      {/* Bu ayın seans akışı ve türü (öğretmen/yönetici görünümü) */}
      {canEdit && <SessionOverviewCharts analysis={sessionAnalysis} />}

      {/* Seçim paneli: Öğrenci → BEP → Amaç + grafik tipi */}
      <Card padding="md">
        <div className="grid gap-3 sm:grid-cols-3 sm:items-start">
          <Field label="Öğrenci">
            <select
              className={inputClassName()}
              value={student?.id ?? ""}
              onChange={(event) => onStudentChange(event.target.value)}
            >
              {workspace.students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firstName} {s.lastName}
                  {s.classroom ? ` / ${s.classroom}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="BEP belgesi">
            <select
              className={inputClassName()}
              value={document?.id ?? ""}
              onChange={(event) => onDocumentChange(event.target.value)}
            >
              {(student?.documents ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          </Field>

          <Field label="BEP amaçı" hint={`${goals.length} amaç`}>
            <select
              className={inputClassName()}
              value={goal?.id ?? ""}
              onChange={(event) => setGoalId(event.target.value)}
            >
              {goals.map((g, index) => (
                <option key={g.id} value={g.id}>
                  {index + 1}. {g.courseName} / {g.learningArea}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          {/* Grafik tipi seçimi */}
          <div className="flex gap-1 rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] p-1">
            <button
              type="button"
              onClick={() => setVariant("line")}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--panel-radius-sm)] px-3 py-1.5 text-sm transition",
                variant === "line"
                  ? "bg-[color:var(--panel-bg-hover)] font-medium text-[color:var(--panel-text)]"
                  : "text-[color:var(--panel-text-soft)] hover:text-[color:var(--panel-text)]",
              )}
            >
              <LineChartIcon className="size-4" />
              Çizgi
            </button>
            <button
              type="button"
              onClick={() => setVariant("bar")}
              className={cn(
                "flex items-center gap-1.5 rounded-[var(--panel-radius-sm)] px-3 py-1.5 text-sm transition",
                variant === "bar"
                  ? "bg-[color:var(--panel-bg-hover)] font-medium text-[color:var(--panel-text)]"
                  : "text-[color:var(--panel-text-soft)] hover:text-[color:var(--panel-text)]",
              )}
            >
              <BarChart3 className="size-4" />
              Çubuk
            </button>
          </div>

          {document && (
            <a
              href={`/api/pdf/egitsel-analiz/${document.id}${goal ? `?goalId=${goal.id}` : ""}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="outline" size="sm">
                <FileText className="size-4 mr-2" />
                PDF
              </Button>
            </a>
          )}
        </div>
      </Card>

      {/* Yalnızca seçili amaç gösterilir: tüm amaçların aynı anda listelenmesi karışıklık yaratıyordu. */}
      {goal && goalAnalysis ? (
        <GoalAnalysisCard
          key={goal.id}
          analysis={goalAnalysis}
          goal={goal}
          studentId={student?.id ?? ""}
          index={goalIndex}
          variant={variant}
          canEdit={canEdit}
        />
      ) : (
        <Card>
          <div className="px-2 py-8 text-center text-sm text-[color:var(--panel-text-soft)]">
            Seçili BEP içinde izlenecek hedef bulunmuyor.
          </div>
        </Card>
      )}

      {/* Öğrenciler arası karşılaştırma (birden fazla öğrenci varsa) */}
      {comparisons.length > 1 && (
        <Card padding="md">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
            Öğrenci karşılaştırması
          </div>
          <div className="mt-3 grid gap-2.5">
            {comparisons.map((item) => (
              <button
                key={item.studentId}
                type="button"
                onClick={() => onStudentChange(item.studentId)}
                className={cn(
                  "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[var(--panel-radius-md)] px-2 py-1.5 text-left transition hover:bg-[color:var(--panel-bg-hover)]",
                  item.studentId === student?.id && "bg-[color:var(--panel-bg-soft)]",
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate font-medium text-[color:var(--panel-text)]">
                      {item.studentName}
                    </span>
                    <span className="text-[color:var(--panel-text-soft)]">
                      {item.completedGoalCount}/{item.goalCount} hedef
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[color:var(--panel-bg-hover)]">
                    <div
                      className="h-full rounded-full bg-[color:var(--panel-text)]"
                      style={{ width: `${item.averageProgressPercent}%`, opacity: 0.7 }}
                    />
                  </div>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[color:var(--panel-text)]">
                  %{item.averageProgressPercent}
                </span>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
