"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Edit2, Lightbulb, Trash2 } from "lucide-react";
import type { LearningPhase } from "@/lib/prisma-shim";

import { GoalSparkline } from "@/components/analysis/goal-sparkline";
import { PhaseBadge } from "@/components/analysis/phase-badge";
import { useActionToast } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { saveDailyQuickEntryAction, deleteDailyQuickEntryAction } from "@/app/daily-quick-entry-actions";
import {
  computeStepPerformance,
  suggestNextPhase,
  type GoalAnalysisDataPoint,
} from "@/lib/educational-analysis";
import { LEARNING_PHASES, LEARNING_PHASE_META } from "@/lib/learning-phases";
import type {
  DailyQuickEntryGoal,
  DailyQuickEntryRecord,
  DailyQuickEntryStudent,
} from "@/lib/daily-quick-entry-server";
import { cn } from "@/lib/utils";

const VALUE_PRESETS = [0, 25, 50, 75, 100];

function formatDateTimeLocal(value: Date) {
  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function formatMeasuredAt(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

/** Hedefin ölçüm geçmişini (yeniden eskiye) grafik/öneri veri noktalarına çevirir. */
function toDataPoints(goal: DailyQuickEntryGoal | undefined): GoalAnalysisDataPoint[] {
  if (!goal) return [];
  return goal.history
    .slice()
    .reverse()
    .map((entry, index) => ({
      date: entry.measuredAt.toISOString(),
      value: entry.value,
      label: `${index + 1}. Kayıt`,
      status: entry.value === 100 ? ("completed" as const) : ("in_progress" as const),
      phase: entry.phase,
      note: "",
    }));
}

/** Hedefin son kaydındaki aşama; kayıt yoksa edinim. */
function defaultPhaseFor(goal: DailyQuickEntryGoal | undefined): LearningPhase {
  return goal?.history[0]?.phase ?? "acquisition";
}

type Props = {
  students: DailyQuickEntryStudent[];
  initialStudentId?: string;
  initialGoalId?: string;
  initialPhase?: LearningPhase;
};

export function DailyQuickEntryForm({
  students,
  initialStudentId,
  initialGoalId,
  initialPhase,
}: Props) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [isPending, startTransition] = useTransition();

  const [studentId, setStudentId] = useState(initialStudentId ?? students[0]?.id ?? "");
  const student = useMemo(() => students.find((item) => item.id === studentId), [students, studentId]);

  const [planRowId, setPlanRowId] = useState(() => {
    const selectedStudent = students.find((item) => item.id === studentId);
    if (initialGoalId && selectedStudent?.goals.some((g) => g.id === initialGoalId)) {
      return initialGoalId;
    }
    return selectedStudent?.goals[0]?.id ?? "";
  });
  const goal = useMemo(() => student?.goals.find((item) => item.id === planRowId), [student, planRowId]);

  const [phase, setPhase] = useState<LearningPhase>(() => {
    if (initialPhase) return initialPhase;
    const selectedStudent = students.find((item) => item.id === studentId);
    const selectedGoal = selectedStudent?.goals.find((g) => g.id === planRowId);
    return defaultPhaseFor(selectedGoal);
  });

  const [value, setValue] = useState(50);
  const [note, setNote] = useState("");
  const [measuredAt, setMeasuredAt] = useState(formatDateTimeLocal(new Date()));
  const [editingId, setEditingId] = useState<string | null>(null);

  /* Deneme hesaplayıcı: doğru/toplam oranından yüzde üretir. */
  const [trialCorrect, setTrialCorrect] = useState("");
  const [trialTotal, setTrialTotal] = useState("");

  const dataPoints = useMemo(() => toDataPoints(goal), [goal]);
  const suggestion = useMemo(() => suggestNextPhase(dataPoints), [dataPoints]);
  const latestPoint = dataPoints[dataPoints.length - 1] ?? null;

  function selectGoal(nextGoalId: string, nextStudent?: DailyQuickEntryStudent) {
    const owner = nextStudent ?? student;
    const nextGoal = owner?.goals.find((g) => g.id === nextGoalId);
    setPlanRowId(nextGoalId);
    setPhase(defaultPhaseFor(nextGoal));
    setEditingId(null);
  }

  function handleStudentChange(nextStudentId: string) {
    const nextStudent = students.find((item) => item.id === nextStudentId);
    setStudentId(nextStudentId);
    selectGoal(nextStudent?.goals[0]?.id ?? "", nextStudent);
  }

  /** Aynı öğrencinin bir sonraki hedefine geçer (seans içi seri giriş akışı). */
  function goToNextGoal() {
    const goals = student?.goals ?? [];
    if (goals.length < 2) return;
    const currentIndex = goals.findIndex((g) => g.id === planRowId);
    const next = goals[(currentIndex + 1) % goals.length];
    selectGoal(next.id);
    setValue(50);
    setNote("");
    setTrialCorrect("");
    setTrialTotal("");
  }

  function applyTrials(correctRaw: string, totalRaw: string) {
    const correct = Number(correctRaw);
    const total = Number(totalRaw);
    if (Number.isFinite(correct) && Number.isFinite(total) && total > 0) {
      setValue(computeStepPerformance(correct, total));
    }
  }

  function resetForm() {
    setValue(50);
    setNote("");
    setMeasuredAt(formatDateTimeLocal(new Date()));
    setEditingId(null);
    setTrialCorrect("");
    setTrialTotal("");
  }

  function startEditing(entry: DailyQuickEntryRecord) {
    setEditingId(entry.id);
    setPlanRowId(entry.planRow.id);
    setPhase(entry.phase);
    setValue(entry.value);
    setNote(entry.note ?? "");
    setMeasuredAt(formatDateTimeLocal(new Date(entry.measuredAt)));
  }

  if (students.length === 0) {
    return (
      <Card padding="lg">
        <p className="text-sm text-[color:var(--panel-text-soft)]">
          Hizli veri girisi yapabilmeniz için once en az bir ogrenciye ait BEP hedefi tanimlanmis olmalidir.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
      <div className="grid gap-5">
        <Card padding="lg" className="grid gap-4 animate-in fade-in duration-200">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Öğrenci">
              <select
                className={inputClassName()}
                value={studentId}
                onChange={(event) => handleStudentChange(event.target.value)}
                disabled={isPending}
              >
                {students.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.firstName} {item.lastName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="BEP hedefi">
              <select
                className={inputClassName()}
                value={planRowId}
                onChange={(event) => selectGoal(event.target.value)}
                disabled={!student?.goals.length || isPending}
              >
                {student?.goals.length ? (
                  student.goals.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.courseName} - {item.learningArea}
                    </option>
                  ))
                ) : (
                  <option value="">Hedef bulunamadı</option>
                )}
              </select>
            </Field>
          </div>

          {goal ? (
            <p className="text-xs text-[color:var(--panel-text-soft)] leading-relaxed">{goal.learningOutcome}</p>
          ) : null}

          {/* Öğrenme aşaması seçimi */}
          <Field
            label="Ogrenme asamasi"
            hint={LEARNING_PHASE_META[phase].description}
          >
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {LEARNING_PHASES.map((item) => {
                const meta = LEARNING_PHASE_META[item];
                const selected = phase === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPhase(item)}
                    disabled={isPending}
                    aria-pressed={selected}
                    title={meta.description}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-[var(--panel-radius-md)] border px-2 py-2 text-xs font-medium transition",
                      selected
                        ? ""
                        : "border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)] hover:bg-[color:var(--panel-bg-hover)]",
                    )}
                    style={
                      selected
                        ? {
                            color: meta.colorVar,
                            backgroundColor: meta.bgVar,
                            borderColor: meta.borderVar,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="size-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: meta.colorVar }}
                    />
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Olcum tarihi">
              <input
                type="datetime-local"
                className={inputClassName()}
                value={measuredAt}
                onChange={(event) => setMeasuredAt(event.target.value)}
                disabled={isPending}
              />
            </Field>
            <Field label={`Değer (${value}/100)`}>
              <div className="grid gap-2">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(event) => setValue(Number(event.target.value))}
                  disabled={isPending}
                />
                <div className="flex gap-1.5">
                  {VALUE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setValue(preset)}
                      disabled={isPending}
                      className={cn(
                        "flex-1 rounded-[var(--panel-radius-sm)] border px-1.5 py-1 text-xs tabular-nums transition",
                        value === preset
                          ? "border-[color:var(--panel-border-strong)] bg-[color:var(--panel-bg-hover)] font-semibold text-[color:var(--panel-text)]"
                          : "border-[color:var(--panel-border)] text-[color:var(--panel-text-soft)] hover:text-[color:var(--panel-text)]",
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </Field>
          </div>

          {/* Deneme sayısından hesaplama */}
          <Field label="Deneme ile hesapla" hint="Doğru yapilan / toplam deneme sayisindan yüzde uretir">
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Doğru"
                className={cn(inputClassName(), "w-24")}
                value={trialCorrect}
                onChange={(event) => {
                  setTrialCorrect(event.target.value);
                  applyTrials(event.target.value, trialTotal);
                }}
                disabled={isPending}
              />
              <span className="text-sm text-[color:var(--panel-text-soft)]">/</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                placeholder="Deneme"
                className={cn(inputClassName(), "w-24")}
                value={trialTotal}
                onChange={(event) => {
                  setTrialTotal(event.target.value);
                  applyTrials(trialCorrect, event.target.value);
                }}
                disabled={isPending}
              />
              {trialTotal && Number(trialTotal) > 0 ? (
                <Badge tone="info">%{computeStepPerformance(Number(trialCorrect) || 0, Number(trialTotal))}</Badge>
              ) : null}
            </div>
          </Field>

          <Field label="Not" hint="Opsiyonel kısa not">
            <textarea
              className={`${inputClassName()} min-h-20`}
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              disabled={isPending}
            />
          </Field>

          <div className="flex flex-col gap-3 sm:flex-row pt-2">
            <Button
              className="w-full sm:w-auto"
              disabled={isPending || !student || !planRowId}
              onClick={() =>
                startTransition(async () => {
                  if (!student || !planRowId) return;

                  const result = await saveDailyQuickEntryAction({
                    id: editingId ?? undefined,
                    studentId: student.id,
                    documentId: student.documentId,
                    planRowId,
                    value,
                    phase,
                    note,
                    measuredAt,
                  });

                  showToast({
                    title: result.success
                      ? (editingId ? "Veri güncellendi" : "Veri kaydedildi")
                      : "Islem tamamlanmadi",
                    message: result.message,
                    tone: result.success ? "success" : "error",
                  });

                  if (result.success) {
                    resetForm();
                    router.refresh();
                  }
                })
              }
            >
              {editingId ? "Güncelle" : "Kaydet"}
            </Button>
            {(student?.goals.length ?? 0) > 1 && !editingId ? (
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                onClick={goToNextGoal}
                disabled={isPending}
              >
                <ArrowRight className="size-4" />
                Sıradaki hedef
              </Button>
            ) : null}
            <Button variant="ghost" className="w-full sm:w-auto" onClick={resetForm} disabled={isPending}>
              {editingId ? "Vazgeç" : "Temizle"}
            </Button>
          </div>
        </Card>

        {/* Seçili hedefin anlık gidişatı: giriş yapan öğretmen etkisini hemen görür */}
        {goal ? (
          <Card padding="md" className="grid gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                Bu hedefin gidişatı
              </span>
              {latestPoint ? (
                <span className="flex items-center gap-2">
                  <PhaseBadge phase={latestPoint.phase} />
                  <span className="text-lg font-semibold tabular-nums text-[color:var(--panel-text)]">
                    %{latestPoint.value}
                  </span>
                </span>
              ) : null}
            </div>

            <GoalSparkline dataPoints={dataPoints} className="h-12" />

            {suggestion ? (
              <div
                className="flex items-start gap-2.5 rounded-[var(--panel-radius-md)] border px-3.5 py-2.5 text-xs"
                style={{
                  borderColor: LEARNING_PHASE_META[suggestion.currentPhase].borderVar,
                  backgroundColor: LEARNING_PHASE_META[suggestion.currentPhase].bgVar,
                }}
              >
                <Lightbulb
                  className="mt-0.5 size-3.5 shrink-0"
                  style={{ color: LEARNING_PHASE_META[suggestion.currentPhase].colorVar }}
                />
                <span className="text-[color:var(--panel-text-muted)]">{suggestion.message}</span>
              </div>
            ) : (
              <p className="text-xs text-[color:var(--panel-text-soft)]">
                İlk kayıtla birlikte hedefin gelişim eğrisi burada oluşmaya başlar.
              </p>
            )}

            <Link
              href="/panel/egitsel-analiz"
              className="text-xs font-semibold text-[color:var(--panel-text-muted)] transition hover:text-[color:var(--panel-text)]"
            >
              Detaylı analizi aç →
            </Link>
          </Card>
        ) : null}
      </div>

      <Card padding="lg" className="grid gap-3 h-fit">
        <span className="text-xs uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
          Son kayitlar
        </span>
        {student?.recentEntries.length ? (
          <ul className="grid gap-3">
            {student.recentEntries.map((entry) => (
              <li
                key={entry.id}
                className={`rounded-[var(--panel-radius-md)] border p-3.5 transition flex flex-col justify-between gap-3 ${
                  editingId === entry.id
                    ? "border-[color:var(--panel-border-strong)] bg-[color:var(--panel-bg-hover)]"
                    : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]"
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-[color:var(--panel-text)] leading-tight">
                      {entry.planRow.courseName}
                    </span>
                    <Badge tone="info">{entry.value}/100</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <PhaseBadge phase={entry.phase} />
                    <p className="text-xs text-[color:var(--panel-text-soft)]">
                      {formatMeasuredAt(entry.measuredAt)}
                    </p>
                  </div>
                  {entry.note ? (
                    <p className="text-xs text-[color:var(--panel-text-muted)] leading-relaxed">{entry.note}</p>
                  ) : null}
                </div>

                <div className="flex justify-end gap-2.5 border-t border-[color:var(--panel-border)] pt-2.5">
                  <button
                    onClick={() => startEditing(entry)}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--panel-text-muted)] hover:text-[color:var(--panel-text)] transition disabled:opacity-50"
                  >
                    <Edit2 className="size-3.5" />
                    Düzenle
                  </button>
                  <button
                    onClick={() => {
                      if (!window.confirm("Bu ölçüm kaydını silmek istediğinizden emin misiniz?")) {
                        return;
                      }
                      startTransition(async () => {
                        const result = await deleteDailyQuickEntryAction({ id: entry.id });
                        showToast({
                          title: result.success ? "Veri silindi" : "İşlem tamamlanmadı",
                          message: result.message,
                          tone: result.success ? "success" : "error",
                        });
                        if (result.success) {
                          if (editingId === entry.id) {
                            resetForm();
                          }
                          router.refresh();
                        }
                      });
                    }}
                    disabled={isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--panel-danger-text)] hover:opacity-80 transition disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                    Sil
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[color:var(--panel-text-soft)]">
            Bu ogrenci için henüz kayit yok.
          </p>
        )}
      </Card>
    </div>
  );
}
