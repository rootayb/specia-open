"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import {
  ChevronDown,
  ChevronUp,
  FileDown,
  GripVertical,
  Plus,
  Trash2,
} from "lucide-react";

import { saveBepAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  buildPlanRowDefaults,
  fixedTendencyOptions,
  type CurriculumCourseOption,
  type CurriculumOutcomeOption,
} from "@/lib/curriculum";
import {
  derivePlanRowDateSummary,
  formatProcessComponentEvaluationDate,
  parseProcessComponentSchedules,
  syncProcessComponentSchedules,
  type ProcessComponentSchedule,
} from "@/lib/process-component-schedules";
import type { BepDocumentInput } from "@/lib/schemas";
import { restoreTurkishText } from "@/lib/turkish";
import { cn } from "@/lib/utils";

type EditorProps = {
  defaultValues: BepDocumentInput;
  studentName: string;
  documentId?: string;
  curriculumOptions: CurriculumCourseOption[];
  canEdit?: boolean;
  onSaveSuccess?: (payload: { id: string; status: BepDocumentInput["status"] }) => void;
};

type PlanRowInput = BepDocumentInput["planRows"][number];
type OtherDecisionEntryInput = {
  id?: string;
  value: string;
};
type BepEditorFormValues = Omit<
  BepDocumentInput,
  "otherDecisionOne" | "otherDecisionTwo" | "otherDecisionThree"
> & {
  otherDecisionEntries: OtherDecisionEntryInput[];
};
type DelimitedPlanField = "methodTechnique" | "materials" | "evaluationMethods";

type SelectionFieldProps = {
  label: string;
  hint?: string;
  options: string[];
  selectedValues: string[];
  customPlaceholder: string;
  onChange: (values: string[]) => void;
  compact?: boolean;
};

const editorSections = [
  { id: "document-meta", label: "Belge" },
  { id: "performance", label: "Performans" },
  { id: "plan-rows", label: "Hedefler" },
  { id: "environment", label: "Ortam" },
  { id: "services", label: "Hizmetler" },
  { id: "family-decisions", label: "Aile ve kararlar" },
  { id: "committee", label: "Kurul" },
] as const;

const sectionSurfaceClass =
  "rounded-[34px] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] px-5 py-6 text-[color:var(--panel-text)] shadow-[0_20px_80px_-58px_rgba(0,0,0,0.95)] sm:px-6 sm:py-7";

const listRowClass =
  "rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/38 p-4";

const fixedMethodTechniqueOptions = [
  "Doğrudan öğretim",
  "Aşamalı yardım",
  "Model olma",
  "İpucu verme",
  "İpucunu silikleştirme",
  "Rol oynama",
  "Görev analizi",
  "Tekrar çalışması",
  "Video model",
  "Akran destekli öğretim",
  "Soru-cevap",
  "Gösterip yaptırma",
];

const fixedMaterialOptions = [
  "Görsel kartlar",
  "Çalışma kağıdı",
  "Manipülatif materyaller",
  "Gerçek nesneler",
  "Görev çizelgesi",
  "Kontrol listesi",
  "Video örneği",
  "Tablet uygulaması",
  "Resimli metin",
  "Harf kartları",
  "Sayı kartları",
  "Duygu kartları",
];

const fixedEvaluationMethodOptions = [
  "Gözlem formu",
  "Kontrol listesi",
  "Performans kaydı",
  "Ürün dosyası",
  "Akran gözlemi",
  "Sözlü yoklama",
  "Uygulama görevi",
  "Video kaydı inceleme",
  "Aile geribildirimi",
];

const normalizedFixedMethodTechniqueOptions = fixedMethodTechniqueOptions.map((value) =>
  restoreTurkishText(value),
);
const normalizedFixedMaterialOptions = fixedMaterialOptions.map((value) =>
  restoreTurkishText(value),
);
const normalizedFixedEvaluationMethodOptions = fixedEvaluationMethodOptions.map((value) =>
  restoreTurkishText(value),
);

function normalizeSelectionValue(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function uniqueSelectionValues(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const normalized = normalizeSelectionValue(value);

      if (seen.has(normalized)) {
        return false;
      }

      seen.add(normalized);
      return true;
    });
}

function parseSelectionValue(value?: string) {
  if (!value) {
    return [];
  }

  const parts = /[;\n]/.test(value) ? value.split(/[;\n]/) : value.split(",");
  return uniqueSelectionValues(parts);
}

function buildInitialOtherDecisionEntries(values: BepDocumentInput): OtherDecisionEntryInput[] {
  const legacyEntries = [values.otherDecisionOne, values.otherDecisionTwo, values.otherDecisionThree]
    .map((value) => value?.trim() ?? "")
    .filter(Boolean)
    .map((value) => ({ value }));

  const relationalEntries = values.decisionEntries
    .filter((entry) => entry.category === "other")
    .map((entry) => ({
      id: entry.id,
      value: [entry.title?.trim(), entry.value?.trim()].filter(Boolean).join(": "),
    }))
    .filter((entry) => entry.value);

  const entries = [...relationalEntries, ...legacyEntries];

  return entries.length > 0 ? entries : [{ value: "" }];
}

function joinSelectionValues(values: string[]) {
  return uniqueSelectionValues(values).join("; ");
}

function toggleSelectionValue(values: string[], nextValue: string) {
  const normalized = normalizeSelectionValue(nextValue);

  if (values.some((value) => normalizeSelectionValue(value) === normalized)) {
    return values.filter((value) => normalizeSelectionValue(value) !== normalized);
  }

  return uniqueSelectionValues([...values, nextValue]);
}

function hasTextValue(value?: string) {
  return Boolean(value?.trim());
}

function getPlanRowCompletionStats(
  row?: PlanRowInput,
  effectiveProcessComponents: string[] = [],
  effectiveLearningOutcome?: string,
  processComponentSchedules: ProcessComponentSchedule[] = [],
) {
  const hasCompleteProcessDates =
    effectiveProcessComponents.length === 0 ||
    processComponentSchedules.length === 0
      ? false
      : processComponentSchedules.every(
          (item) => hasTextValue(item.startDate) && hasTextValue(item.endDate),
        );
  const checks = [
    hasTextValue(row?.courseId || row?.courseName),
    hasTextValue(row?.learningArea),
    hasTextValue(effectiveLearningOutcome ?? row?.learningOutcome),
    hasTextValue(row?.criterion),
    effectiveProcessComponents.length > 0,
    hasCompleteProcessDates,
    parseSelectionValue(row?.methodTechnique).length > 0,
    parseSelectionValue(row?.materials).length > 0,
    parseSelectionValue(row?.tendencies).length > 0,
    parseSelectionValue(row?.evaluationMethods).length > 0,
    (row?.evaluationDates?.length ?? 0) > 0,
  ];

  return {
    completed: checks.filter(Boolean).length,
    total: checks.length,
  };
}

function isPlanRowComplete(row?: PlanRowInput) {
  const effectiveProcessComponents = row?.processComponents ?? [];
  const processComponentSchedules = syncProcessComponentSchedules(
    effectiveProcessComponents,
    parseProcessComponentSchedules(row?.processComponentSchedules ?? [], {
      fallbackStartDate: row?.startDate,
      fallbackEndDate: row?.endDate,
      fallbackEvaluationDates: row?.evaluationDates ?? [],
    }),
  );
  const { completed, total } = getPlanRowCompletionStats(
    row,
    effectiveProcessComponents,
    row?.learningOutcome,
    processComponentSchedules,
  );
  return completed === total;
}

function buildPlanRowSummary(row?: PlanRowInput) {
  if (!row) {
    return [];
  }

  const summary = [row.courseName, row.learningArea]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  if (hasTextValue(row.learningOutcome)) {
    const compactOutcome = row.learningOutcome.trim().replace(/\s+/g, " ");
    summary.push(
      compactOutcome.length > 88 ? `${compactOutcome.slice(0, 88).trimEnd()}...` : compactOutcome,
    );
  }

  return summary;
}

function buildOutcomeOptionLabel(outcome: CurriculumOutcomeOption) {
  const fallbackText = outcome.processComponents[0]?.trim();
  const effectiveText = outcome.outcomeText?.trim() || fallbackText || "Öğrenme çıktısı eklenmedi";
  return `${outcome.outcomeCode} - ${effectiveText}`;
}

function resolveProcessComponentLabels(
  processComponents: string[] | undefined,
  learningOutcome?: string,
) {
  if ((processComponents?.length ?? 0) > 0) {
    return processComponents ?? [];
  }

  const fallbackLabel = learningOutcome?.trim() ?? "";
  return fallbackLabel ? [fallbackLabel] : [];
}

function areProcessComponentSchedulesEqual(
  first: ProcessComponentSchedule[],
  second: ProcessComponentSchedule[],
) {
  if (first.length !== second.length) {
    return false;
  }

  return first.every((item, index) => {
    const nextItem = second[index];

    return (
      item.label === nextItem?.label &&
      item.startDate === nextItem?.startDate &&
      item.endDate === nextItem?.endDate &&
      item.evaluationDate === nextItem?.evaluationDate
    );
  });
}

function resolveLearningOutcomeLabel(
  row: PlanRowInput,
  selectedOutcome?: CurriculumOutcomeOption,
) {
  if (hasTextValue(row.learningOutcome)) {
    return row.learningOutcome.trim();
  }

  const catalogLearningOutcome = selectedOutcome?.outcomeText?.trim() ?? "";
  if (catalogLearningOutcome) {
    return catalogLearningOutcome;
  }

  return resolveProcessComponentLabels(row.processComponents, row.learningOutcome)[0] ?? "";
}

function SelectionField({
  label,
  hint,
  options,
  selectedValues,
  customPlaceholder,
  onChange,
  compact = false,
}: SelectionFieldProps) {
  const [customValue, setCustomValue] = useState("");
  const [isExpanded, setIsExpanded] = useState(() => !compact || selectedValues.length === 0);
  const availableOptions = useMemo(
    () => uniqueSelectionValues([...options, ...selectedValues]),
    [options, selectedValues],
  );
  const showExpandedContent = !compact || isExpanded || selectedValues.length === 0;

  const addCustomValue = () => {
    const nextValue = customValue.trim();

    if (!nextValue) {
      return;
    }

    onChange(uniqueSelectionValues([...selectedValues, nextValue]));
    setCustomValue("");
  };

  return (
    <Field
      label={label}
      hint={hint ?? "Otomatik gelen veya sizin eklediğiniz değerler burada listelenir."}
    >
      <div
        className={cn(
          "rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/38",
          compact ? "grid gap-3 p-3" : "grid gap-3 p-4",
        )}
      >
        {compact ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="flex items-start justify-between gap-3 rounded-[20px] bg-white/[0.02] px-3 py-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-neutral-100">
                  {selectedValues.length > 0 ? `${selectedValues.length} seçili` : "Seçim yapın"}
                </span>
                {selectedValues.length > 0 ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] text-neutral-300">
                    Çoklu seçim aktif
                  </span>
                ) : null}
              </div>
              {selectedValues.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedValues.slice(0, 3).map((value) => (
                    <span
                      key={`${label}-${value}`}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-neutral-200"
                    >
                      {value}
                    </span>
                  ))}
                  {selectedValues.length > 3 ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-neutral-400">
                      +{selectedValues.length - 3} daha
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">
                  Önerileri açıp tıklayarak seçim yapabilir veya özel değer ekleyebilirsiniz.
                </p>
              )}
            </div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-2 text-neutral-300">
              {showExpandedContent ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </span>
          </button>
        ) : null}

        {showExpandedContent ? (
          <>
            <div className={cn("flex flex-wrap gap-2", compact && "max-h-36 overflow-y-auto pr-1")}>
              {availableOptions.map((option) => {
                const isActive = selectedValues.some(
                  (value) => normalizeSelectionValue(value) === normalizeSelectionValue(option),
                );

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onChange(toggleSelectionValue(selectedValues, option))}
                    className={cn(
                      "rounded-full border text-sm font-medium transition",
                      compact ? "px-3 py-1.5" : "px-3 py-2",
                      isActive
                        ? "border-white bg-white text-black"
                        : "border-white/12 bg-white/[0.04] text-neutral-200 hover:bg-white/[0.08]",
                    )}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {availableOptions.length === 0 ? (
              <div className="rounded-[20px] border border-dashed border-white/10 px-3 py-4 text-sm text-neutral-500">
                Bu alan için sabit öneriler gösterilmiyor. İsterseniz kendi değerinizi ekleyin.
              </div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
              <input
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomValue();
                  }
                }}
                placeholder={customPlaceholder}
                className={inputClassName()}
              />
              <Button variant="ghost" onClick={addCustomValue}>
                Ekle
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Field>
  );
}

export function BepEditor({
  defaultValues,
  studentName,
  documentId,
  curriculumOptions,
  canEdit = true,
  onSaveSuccess,
}: EditorProps) {
  const editorDefaultValues = useMemo<BepEditorFormValues>(
    () => ({
      ...defaultValues,
      decisionEntries: defaultValues.decisionEntries.filter(
        (entry) => entry.category !== "other" && entry.category !== "school_service",
      ),
      otherDecisionEntries: buildInitialOtherDecisionEntries(defaultValues),
    }),
    [defaultValues],
  );
  const router = useRouter();
  const { showToast } = useActionToast();
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const [expandedPlanRowIds, setExpandedPlanRowIds] = useState<Record<string, boolean>>({});
  const [focusedPlanRowId, setFocusedPlanRowId] = useState<string | null>(null);
  const [draggedCommitteeIndex, setDraggedCommitteeIndex] = useState<number | null>(null);
  const [draggedSubjectTeacherIndex, setDraggedSubjectTeacherIndex] = useState<number | null>(null);
  const [allowNavigation, setAllowNavigation] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<(typeof editorSections)[number]["id"]>(
    editorSections[0].id,
  );
  const hasHistoryGuardRef = useRef(false);
  const form = useForm<BepEditorFormValues>({
    defaultValues: editorDefaultValues,
  });

  const {
    control,
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    formState: { isDirty },
  } = form;
  const planRows = useFieldArray({ control: form.control, name: "planRows" });
  const performanceRows = useFieldArray({
    control: form.control,
    name: "performanceEntries",
  });
  const supportServiceRows = useFieldArray({
    control: form.control,
    name: "supportServiceEntries",
  });
  const decisionRows = useFieldArray({
    control: form.control,
    name: "decisionEntries",
  });
  const otherDecisionRows = useFieldArray({
    control: form.control,
    name: "otherDecisionEntries",
  });
  const committeeRows = useFieldArray({
    control: form.control,
    name: "committeeMembers",
  });
  const subjectTeacherRows = useFieldArray({
    control: form.control,
    name: "subjectTeachers",
  });

  const watchedRows = useWatch({
    control,
    name: "planRows",
  });
  const watchedStatus = useWatch({
    control,
    name: "status",
  });
  const watchedPerformanceEntries = useWatch({
    control,
    name: "performanceEntries",
  });
  const familyTrainingRequired = useWatch({
    control,
    name: "familyTrainingRequired",
  });
  const unsavedChangesMessage =
    "Kaydetmediginiz degisiklikler var. BEP sayfasindan cikmak istediginize emin misiniz?";

  const courseMap = useMemo(
    () => new Map(curriculumOptions.map((course) => [course.courseId, course])),
    [curriculumOptions],
  );
  const completedPlanRowCount = useMemo(
    () => watchedRows.filter((row) => isPlanRowComplete(row)).length,
    [watchedRows],
  );
  const filledPerformanceCount = useMemo(
    () =>
      (watchedPerformanceEntries ?? []).filter(
        (entry) => Boolean(entry?.courseName?.trim()) || Boolean(entry?.performanceLevel?.trim()),
      ).length,
    [watchedPerformanceEntries],
  );

  const setDelimitedPlanField = (
    rowIndex: number,
    fieldName: DelimitedPlanField,
    values: string[],
  ) => {
    setValue(`planRows.${rowIndex}.${fieldName}`, joinSelectionValues(values), {
      shouldDirty: true,
    });
  };

  const setProcessComponentLabels = (rowIndex: number, labels: string[]) => {
    const currentRow = getValues(`planRows.${rowIndex}`);
    const currentSchedules = parseProcessComponentSchedules(
      currentRow.processComponentSchedules,
      {
        fallbackStartDate: currentRow.startDate,
        fallbackEndDate: currentRow.endDate,
        fallbackEvaluationDates: currentRow.evaluationDates,
      },
    );
    const nextSchedules = syncProcessComponentSchedules(labels, currentSchedules);
    const summaryDates = derivePlanRowDateSummary(nextSchedules);

    setValue(`planRows.${rowIndex}.processComponents`, labels, {
      shouldDirty: true,
    });
    setValue(`planRows.${rowIndex}.processComponentSchedules`, nextSchedules, {
      shouldDirty: true,
    });
    setValue(`planRows.${rowIndex}.startDate`, summaryDates.startDate, {
      shouldDirty: true,
    });
    setValue(`planRows.${rowIndex}.endDate`, summaryDates.endDate, {
      shouldDirty: true,
    });
    setValue(`planRows.${rowIndex}.evaluationDates`, summaryDates.evaluationDates, {
      shouldDirty: true,
    });
  };

  const updateProcessComponentSchedule = (
    rowIndex: number,
    scheduleIndex: number,
    fieldName: "startDate" | "endDate",
    value: string,
  ) => {
    const currentSchedules = parseProcessComponentSchedules(
      getValues(`planRows.${rowIndex}.processComponentSchedules`),
    );
    const nextSchedules = currentSchedules.map((item, index) =>
      index === scheduleIndex
        ? {
            ...item,
            [fieldName]: value,
            evaluationDate:
              fieldName === "endDate"
                ? formatProcessComponentEvaluationDate(value)
                : formatProcessComponentEvaluationDate(item.endDate),
          }
        : item,
    );
    const summaryDates = derivePlanRowDateSummary(nextSchedules);

    setValue(`planRows.${rowIndex}.processComponentSchedules`, nextSchedules, {
      shouldDirty: true,
    });
    setValue(`planRows.${rowIndex}.startDate`, summaryDates.startDate, {
      shouldDirty: true,
    });
    setValue(`planRows.${rowIndex}.endDate`, summaryDates.endDate, {
      shouldDirty: true,
    });
    setValue(`planRows.${rowIndex}.evaluationDates`, summaryDates.evaluationDates, {
      shouldDirty: true,
    });
  };

  const normalizePlanRowForSubmit = (row: PlanRowInput, index: number) => {
    const selectedCourse = courseMap.get(row.courseId ?? "");
    const selectedTheme =
      selectedCourse?.themes.find((theme) => theme.themeName === row.themeName) ??
      selectedCourse?.themes[0];
    const selectedOutcome =
      selectedTheme?.outcomes.find((outcome) => outcome.outcomeCode === row.outcomeCode) ??
      selectedTheme?.outcomes[0];
    const learningOutcome = resolveLearningOutcomeLabel(row, selectedOutcome);
    const processComponents = resolveProcessComponentLabels(
      (row.processComponents?.length ?? 0) > 0
        ? row.processComponents
        : selectedOutcome?.processComponents ?? [],
      learningOutcome,
    );
    const processComponentSchedules = syncProcessComponentSchedules(
      processComponents,
      parseProcessComponentSchedules(row.processComponentSchedules ?? [], {
        fallbackStartDate: row.startDate,
        fallbackEndDate: row.endDate,
        fallbackEvaluationDates: row.evaluationDates ?? [],
      }),
    );
    const summaryDates = derivePlanRowDateSummary(processComponentSchedules);

    return {
      ...row,
      sortOrder: index,
      courseName: hasTextValue(row.courseName)
        ? row.courseName
        : selectedCourse?.courseName ?? "",
      learningArea: hasTextValue(row.learningArea)
        ? row.learningArea
        : selectedTheme?.themeName ?? "",
      learningOutcome,
      processComponents,
      processComponentSchedules,
      startDate: summaryDates.startDate,
      endDate: summaryDates.endDate,
      evaluationDates: summaryDates.evaluationDates,
    };
  };

  const onSubmit = handleSubmit((values) => {
    setFeedback("");

    startTransition(async () => {
      const { otherDecisionEntries, ...restValues } = values;
      const mergedOtherDecisionEntries = otherDecisionEntries
        .map((entry, index) => ({
          category: "other" as const,
          sortOrder: values.decisionEntries.length + index,
          title: `Diger karar ${index + 1}`,
          value: entry.value.trim(),
        }))
        .filter((entry) => entry.value);

      const normalizedDecisionEntries = values.decisionEntries.map((entry, index) => ({
        ...entry,
        sortOrder: index,
      }));

      const result = await saveBepAction({
        ...restValues,
        otherDecisionOne: "",
        otherDecisionTwo: "",
        otherDecisionThree: "",
        supportServiceEntries: values.supportServiceEntries.map((entry, index) => ({
          ...entry,
          sortOrder: index,
        })),
        decisionEntries: [...normalizedDecisionEntries, ...mergedOtherDecisionEntries],
        performanceEntries: values.performanceEntries.map((entry, index) => ({
          ...entry,
          sortOrder: index,
        })),
        planRows: values.planRows.map((row, index) => normalizePlanRowForSubmit(row, index)),
        committeeMembers: values.committeeMembers.map((entry, index) => ({
          ...entry,
          sortOrder: index,
        })),
        subjectTeachers: values.subjectTeachers.map((entry, index) => ({
          ...entry,
          sortOrder: index,
        })),
      });

      setFeedback(result.message);
      showToast({
        title: result.success ? "BEP kaydı hazir" : "Kayıt tamamlanmadi",
        message: result.message,
        tone: result.success ? "success" : "error",
      });

      if (result.success && result.id) {
        const normalizedPlanRows = values.planRows.map((row, index) =>
          normalizePlanRowForSubmit(row, index),
        );
        const nextFormValues: BepEditorFormValues = {
          ...values,
          decisionEntries: normalizedDecisionEntries,
          otherDecisionEntries: values.otherDecisionEntries,
          supportServiceEntries: values.supportServiceEntries.map((entry, index) => ({
            ...entry,
            sortOrder: index,
          })),
          performanceEntries: values.performanceEntries.map((entry, index) => ({
            ...entry,
            sortOrder: index,
          })),
          planRows: normalizedPlanRows,
          committeeMembers: values.committeeMembers.map((entry, index) => ({
            ...entry,
            sortOrder: index,
          })),
          subjectTeachers: values.subjectTeachers.map((entry, index) => ({
            ...entry,
            sortOrder: index,
          })),
        };

        reset(nextFormValues);

        if (documentId && result.id === documentId && onSaveSuccess) {
          onSaveSuccess({ id: result.id, status: values.status });
          return;
        }

        setAllowNavigation(true);
        const nextUrl =
          values.status === "completed"
            ? `/panel/bep/${result.id}?feedback=1`
            : `/panel/bep/${result.id}`;

        router.push(nextUrl);
        router.refresh();
      }
    });
  });

  useEffect(() => {
    if (!isDirty) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigation) {
        return;
      }

      event.preventDefault();
      event.returnValue = unsavedChangesMessage;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [allowNavigation, isDirty, unsavedChangesMessage]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!isDirty || allowNavigation) {
        return;
      }

      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank" || anchor.hasAttribute("download")) {
        return;
      }

      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin !== window.location.origin) {
        return;
      }

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextPath = `${destination.pathname}${destination.search}${destination.hash}`;
      if (currentPath === nextPath) {
        return;
      }

      if (!window.confirm(unsavedChangesMessage)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      setAllowNavigation(true);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [allowNavigation, isDirty, unsavedChangesMessage]);

  useEffect(() => {
    if (!isDirty || hasHistoryGuardRef.current) {
      return;
    }

    window.history.pushState({ bepUnsavedChanges: true }, "", window.location.href);
    hasHistoryGuardRef.current = true;
  }, [isDirty]);

  useEffect(() => {
    const handlePopState = () => {
      if (!isDirty || allowNavigation) {
        return;
      }

      if (window.confirm(unsavedChangesMessage)) {
        setAllowNavigation(true);
        window.history.back();
        return;
      }

      window.history.pushState({ bepUnsavedChanges: true }, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => window.removeEventListener("popstate", handlePopState);
  }, [allowNavigation, isDirty, unsavedChangesMessage]);

  const updatePlanRowFromCatalog = (
    rowIndex: number,
    nextCourseId?: string,
    nextThemeName?: string,
    nextOutcomeCode?: string,
  ) => {
    const currentRow = getValues(`planRows.${rowIndex}`);
    const selectedCourseId = nextCourseId ?? currentRow.courseId ?? "";
    const course = courseMap.get(selectedCourseId);

    if (!course) {
      return;
    }

    setValue(`planRows.${rowIndex}.courseId`, selectedCourseId);
    setValue(`planRows.${rowIndex}.courseName`, course.courseName);

    if (!course.hasCatalogContent) {
      setValue(`planRows.${rowIndex}.isManualEntry`, true);
      return;
    }

    const theme =
      course.themes.find((item) => item.themeName === (nextThemeName ?? currentRow.themeName)) ??
      course.themes[0];

    if (!theme) {
      return;
    }

    const outcome =
      theme.outcomes.find(
        (item) => item.outcomeCode === (nextOutcomeCode ?? currentRow.outcomeCode),
      ) ?? theme.outcomes[0];

    if (!outcome) {
      return;
    }

    const defaults = buildPlanRowDefaults({
      courseName: course.courseName,
      learningArea: theme.themeName,
      learningOutcome: outcome.outcomeText,
      processComponents: outcome.processComponents,
      tendencies: theme.tendencies,
    });

    setValue(`planRows.${rowIndex}.themeName`, theme.themeName);
    setValue(`planRows.${rowIndex}.outcomeCode`, outcome.outcomeCode);
    setValue(`planRows.${rowIndex}.courseName`, course.courseName);
    setValue(`planRows.${rowIndex}.learningArea`, defaults.learningArea);
    setValue(`planRows.${rowIndex}.learningOutcome`, defaults.learningOutcome);
    setValue(`planRows.${rowIndex}.criterion`, defaults.criterion);
    setValue(`planRows.${rowIndex}.methodTechnique`, defaults.methodTechnique);
    setValue(`planRows.${rowIndex}.materials`, defaults.materials);
    setValue(`planRows.${rowIndex}.tendencies`, defaults.tendencies);
    setValue(`planRows.${rowIndex}.evaluationMethods`, defaults.evaluationMethods);
    setValue(`planRows.${rowIndex}.isManualEntry`, false);
    setProcessComponentLabels(
      rowIndex,
      resolveProcessComponentLabels(defaults.processComponents, defaults.learningOutcome),
    );
  };

  const togglePlanRow = (rowId: string, defaultExpanded: boolean) => {
    setExpandedPlanRowIds((current) => {
      const nextExpanded = !(current[rowId] ?? defaultExpanded);
      setFocusedPlanRowId(nextExpanded ? rowId : null);

      return {
        ...current,
        [rowId]: nextExpanded,
      };
    });
  };



  const appendPlanRow = () => {
    planRows.append({
      sortOrder: planRows.fields.length,
      courseName: "",
      courseId: "",
      themeName: "",
      outcomeCode: "",
      learningArea: "",
      learningOutcome: "",
      processComponents: [],
      processComponentSchedules: [],
      criterion: "4/5 (%80)",
      methodTechnique: "",
      materials: "",
      tendencies: "",
      startDate: "",
      endDate: "",
      evaluationMethods: "",
      evaluationDates: [],
      performanceResult: "",
      isManualEntry: false,
    });
  };

  const setCompletedPlanRowsExpanded = (expanded: boolean) => {
    if (!expanded) {
      setFocusedPlanRowId(null);
    }

    setExpandedPlanRowIds((current) => {
      const nextState = { ...current };

      planRows.fields.forEach((field, index) => {
        if (isPlanRowComplete(watchedRows[index])) {
          nextState[field.id] = expanded;
        }
      });

      return nextState;
    });
  };

  // Hedef satırlarının açık/kapalı olma durumunu sadece ilk kez yüklendiklerinde veya yeni eklendiklerinde belirle.
  // Böylece kullanıcı satırları düzenlerken (tamamlandığında) otomatik olarak kapanmazlar.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled || planRows.fields.length === 0) return;
      setExpandedPlanRowIds((current) => {
        const next = { ...current };
        let updated = false;
        planRows.fields.forEach((field, index) => {
          if (next[field.id] === undefined) {
            const isComplete = isPlanRowComplete(watchedRows[index]);
            next[field.id] = !isComplete;
            updated = true;
          }
        });
        return updated ? next : current;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [planRows.fields, watchedRows]);

  useEffect(() => {
    if (!focusedPlanRowId) {
      return;
    }

    const focusedIndex = planRows.fields.findIndex((field) => field.id === focusedPlanRowId);
    if (focusedIndex === -1) {
      setFocusedPlanRowId(null);
      return;
    }

    const focusedRow = watchedRows[focusedIndex];
    const defaultExpanded = !isPlanRowComplete(focusedRow);
    const isExpanded = expandedPlanRowIds[focusedPlanRowId] ?? defaultExpanded;

    if (!isExpanded) {
      setFocusedPlanRowId(null);
    }
  }, [expandedPlanRowIds, focusedPlanRowId, planRows.fields, watchedRows]);

  useEffect(() => {
    planRows.fields.forEach((field, index) => {
      const currentRow = watchedRows[index];
      const effectiveProcessLabels = resolveProcessComponentLabels(
        currentRow?.processComponents ?? [],
        currentRow?.learningOutcome,
      );
      const nextSchedules = syncProcessComponentSchedules(
        effectiveProcessLabels,
        parseProcessComponentSchedules(currentRow?.processComponentSchedules ?? []),
      );
      const summaryDates = derivePlanRowDateSummary(nextSchedules);

      if (
        !areProcessComponentSchedulesEqual(
          parseProcessComponentSchedules(currentRow?.processComponentSchedules ?? []),
          nextSchedules,
        )
      ) {
        setValue(`planRows.${index}.processComponentSchedules`, nextSchedules, {
          shouldDirty: false,
        });
      }

      if ((currentRow?.startDate ?? "") !== summaryDates.startDate) {
        setValue(`planRows.${index}.startDate`, summaryDates.startDate, {
          shouldDirty: false,
        });
      }

      if ((currentRow?.endDate ?? "") !== summaryDates.endDate) {
        setValue(`planRows.${index}.endDate`, summaryDates.endDate, {
          shouldDirty: false,
        });
      }

      const currentEvaluationDates = currentRow?.evaluationDates ?? [];
      if (currentEvaluationDates.join("|") !== summaryDates.evaluationDates.join("|")) {
        setValue(`planRows.${index}.evaluationDates`, summaryDates.evaluationDates, {
          shouldDirty: false,
        });
      }
    });
  }, [planRows.fields, setValue, watchedRows]);

  useEffect(() => {
    const syncFromHash = () => {
      const currentHash = window.location.hash.replace("#", "");
      if (editorSections.some((section) => section.id === currentHash)) {
        setActiveSectionId(currentHash as (typeof editorSections)[number]["id"]);
      }
    };

    syncFromHash();

    const intersectingSections = new Map<string, boolean>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          intersectingSections.set(entry.target.id, entry.isIntersecting);
        });

        // Find the first intersecting section in document order
        const active = editorSections.find((section) => intersectingSections.get(section.id));
        if (active) {
          setActiveSectionId(active.id);
        } else {
          // Fallback: find the section closest to the top of the viewport
          let closestSectionId: (typeof editorSections)[number]["id"] | null = null;
          let minDistance = Infinity;

          editorSections.forEach((section) => {
            const element = document.getElementById(section.id);
            if (element) {
              const rect = element.getBoundingClientRect();
              const distance = Math.abs(rect.top - 120); // 120px buffer from top
              if (distance < minDistance) {
                minDistance = distance;
                closestSectionId = section.id;
              }
            }
          });

          if (closestSectionId) {
            setActiveSectionId(closestSectionId);
          }
        }
      },
      {
        rootMargin: "-10% 0px -60% 0px",
        threshold: 0,
      },
    );

    editorSections.forEach((section) => {
      const element = document.getElementById(section.id);
      if (element) {
        observer.observe(element);
      }
    });

    window.addEventListener("hashchange", syncFromHash);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", syncFromHash);
    };
  }, []);


  return (
    <form className="relative grid gap-6 min-[1800px]:grid-cols-[196px_minmax(0,1fr)]" onSubmit={onSubmit}>
      {focusedPlanRowId ? (
        <button
          type="button"
          aria-label="Hedef satırı odağını kapat"
          className="fixed inset-0 z-20 cursor-default bg-black/72 backdrop-blur-[3px]"
          onClick={() => setFocusedPlanRowId(null)}
        />
      ) : null}
      <aside className="hidden min-[1800px]:block">
        <div className="sticky top-6 grid gap-3 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]/72 p-4 backdrop-blur-xl">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--panel-text-soft)]">
            Çalışma Akışı
          </div>
          <div className="grid gap-1">
            {editorSections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                onClick={() => setActiveSectionId(section.id)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition",
                  activeSectionId === section.id
                    ? "bg-[color:var(--panel-bg-hover)] text-[color:var(--panel-text)]"
                    : "text-[color:var(--panel-text-muted)] hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full transition",
                    activeSectionId === section.id
                      ? "bg-[color:var(--panel-text)] shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
                      : "bg-white/15",
                  )}
                />
                {section.label}
              </a>
            ))}
          </div>
          <div className="mt-3 rounded-[20px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/45 p-3 text-xs leading-6 text-[color:var(--panel-text-soft)]">
            Uzun BEP içerikleri için bölümler arasında hızlı geçiş yapın. Kaydetme davranışı ve form akışı korunur.
          </div>
        </div>
      </aside>

      <div className="min-[1800px]:hidden">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {editorSections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              onClick={() => setActiveSectionId(section.id)}
              className={cn(
                "whitespace-nowrap rounded-full border px-3 py-2 text-sm font-medium transition",
                activeSectionId === section.id
                  ? "border-[color:var(--panel-text)] bg-[color:var(--panel-bg-hover)] text-[color:var(--panel-text)]"
                  : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] text-[color:var(--panel-text-muted)] hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]",
              )}
            >
              {section.label}
            </a>
          ))}
        </div>
      </div>

      <fieldset disabled={!canEdit} className="grid min-w-0 gap-6 disabled:opacity-100">
      <section id="document-meta" className={sectionSurfaceClass}>
        <SectionHeading
          eyebrow="III. Bireyselleştirilmiş Eğitim Planı"
          title={`${studentName} için BEP düzenleyici`}
          description="Bu alanda öğrenci için ders hedeflerini ve uygulanacak calismalari planlayin."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 min-[1800px]:grid-cols-4">
          <Field label="Belge başlığı">
            <input className={inputClassName()} {...register("title")} />
          </Field>
          <Field label="Durum">
            <select className={inputClassName()} {...register("status")}>
              <option value="draft">Taslak</option>
              <option value="completed">Tamamlandı</option>
            </select>
          </Field>
          <Field label="Başlangıç tarihi">
            <input type="date" className={inputClassName()} {...register("startDate")} />
          </Field>
          <Field label="Bitiş tarihi">
            <input type="date" className={inputClassName()} {...register("endDate")} />
          </Field>
        </div>
      </section>
      <section id="performance" className={sectionSurfaceClass}>
        <div className="flex items-center justify-between gap-3">
          <SectionHeading
            eyebrow="II. Performans"
            title="Eğitsel performans satırları"
            description="Öğrencinin ders bazlı mevcut düzeyini yazın."
          />
          <Button
            variant="ghost"
            onClick={() =>
              performanceRows.append({
                sortOrder: performanceRows.fields.length,
                courseName: "",
                performanceLevel: "",
              })
            }
          >
            <Plus className="mr-2 size-4" />
            Satır Ekle
          </Button>
        </div>
        <div className="mt-6 grid gap-4">
          {performanceRows.fields.map((field, index) => (
            <div
              key={field.id}
              className={listRowClass}
            >
              <div className="grid gap-4 md:grid-cols-[220px_1fr_auto]">
                <Field label="Ders">
                  <input
                    className={inputClassName()}
                    {...register(`performanceEntries.${index}.courseName`)}
                  />
                </Field>
                <Field label="Performans düzeyi">
                  <textarea
                    className={`${inputClassName()} min-h-24`}
                    {...register(`performanceEntries.${index}.performanceLevel`)}
                  />
                </Field>
                <div className="flex flex-col justify-end gap-2">
                  <Button
                    variant="danger"
                    onClick={() => performanceRows.remove(index)}
                    disabled={performanceRows.fields.length === 1}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Sil
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="plan-rows" className={sectionSurfaceClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionHeading
            eyebrow="III. Plan Satırları"
            title="BEP ders hedefleri"
            description="Her hedef satirinda öğrencinin ne calisacagini, nasil desteklenecegini ve nasil izlenecegini duzenleyin."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              className="w-full sm:w-auto sm:min-w-[8rem]"
              onClick={() => {
                setFocusedPlanRowId(null);
                setExpandedPlanRowIds(
                  Object.fromEntries(planRows.fields.map((planField) => [planField.id, true])),
                );
              }}
            >
              Tümünü Aç
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto sm:min-w-[9rem]"
              onClick={() => {
                setFocusedPlanRowId(null);
                setExpandedPlanRowIds(
                  Object.fromEntries(planRows.fields.map((planField) => [planField.id, false])),
                );
              }}
            >
              Tümünü Kapat
            </Button>
            <Button
              variant="ghost"
              className="w-full sm:w-auto sm:min-w-[11rem]"
              onClick={() => setCompletedPlanRowsExpanded(false)}
            >
              Tamamlananları Daralt
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                planRows.append({
                  sortOrder: planRows.fields.length,
                  courseName: "",
                  courseId: "",
                  themeName: "",
                  outcomeCode: "",
                  learningArea: "",
                  learningOutcome: "",
                  processComponents: [],
                  processComponentSchedules: [],
                  criterion: "4/5 (%80)",
                  methodTechnique: "",
                  materials: "",
                  tendencies: "",
                  startDate: "",
                  endDate: "",
                  evaluationMethods: "",
                  evaluationDates: [],
                  performanceResult: "",
                  isManualEntry: false,
                })
              }
            >
              <Plus className="mr-2 size-4" />
              Hedef Satırı Ekle
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          {planRows.fields.map((field, index) => {
            const currentRow = watchedRows[index];
            const selectedCourse = courseMap.get(currentRow?.courseId ?? "");
            const selectedTheme =
              selectedCourse?.themes.find(
                (theme) => theme.themeName === currentRow?.themeName,
              ) ?? selectedCourse?.themes[0];
            const selectedOutcome =
              selectedTheme?.outcomes.find(
                (outcome) => outcome.outcomeCode === currentRow?.outcomeCode,
              ) ?? selectedTheme?.outcomes[0];
            const catalogLearningOutcome = selectedOutcome?.outcomeText?.trim() ?? "";
            const catalogProcessComponents = selectedOutcome?.processComponents ?? [];
            const effectiveProcessComponents = resolveProcessComponentLabels(
              (currentRow?.processComponents?.length ?? 0) > 0
                ? currentRow?.processComponents ?? []
                : catalogProcessComponents.length > 0
                  ? catalogProcessComponents
                  : [],
              currentRow?.learningOutcome,
            );
            const processComponentSchedules = syncProcessComponentSchedules(
              effectiveProcessComponents,
              parseProcessComponentSchedules(currentRow?.processComponentSchedules ?? [], {
                fallbackStartDate: currentRow?.startDate,
                fallbackEndDate: currentRow?.endDate,
                fallbackEvaluationDates: currentRow?.evaluationDates ?? [],
              }),
            );
            const effectiveLearningOutcome = hasTextValue(currentRow?.learningOutcome)
              ? currentRow?.learningOutcome?.trim() ?? ""
              : !catalogLearningOutcome && effectiveProcessComponents.length > 0
                ? effectiveProcessComponents[0] ?? ""
                : "";
            const processOptions = uniqueSelectionValues([
              ...catalogProcessComponents,
              ...effectiveProcessComponents,
            ]);
            const selectedMethods = parseSelectionValue(currentRow?.methodTechnique);
            const selectedMaterials = parseSelectionValue(currentRow?.materials);
            const selectedTendencies = parseSelectionValue(currentRow?.tendencies);
            const selectedEvaluationMethods = parseSelectionValue(
              currentRow?.evaluationMethods,
            );
            const completion = getPlanRowCompletionStats(
              currentRow,
              effectiveProcessComponents,
              effectiveLearningOutcome,
              processComponentSchedules,
            );
            const isComplete = completion.completed === completion.total;
            const defaultExpanded = !isComplete;
            const isExpanded = expandedPlanRowIds[field.id] ?? defaultExpanded;
            const summaryItems = buildPlanRowSummary({
              ...currentRow,
              learningOutcome: effectiveLearningOutcome || currentRow?.learningOutcome || "",
            });

            return (
              <div
                key={field.id}
                className={cn(
                  "rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] border-l-4 border-l-transparent bg-[color:var(--panel-bg-base)]/42 p-5 transition-all duration-200",
                  isExpanded
                    ? "bg-[color:var(--panel-bg-elevated)]/75 border-indigo-500/25 border-l-indigo-500 shadow-[0_20px_50px_-40px_rgba(0,0,0,0.95)] ring-1 ring-indigo-500/10"
                    : "",
                  focusedPlanRowId === field.id &&
                    "relative z-30 border-[color:var(--panel-border-strong)] bg-[color:var(--panel-bg-elevated)] shadow-[0_32px_120px_-36px_rgba(0,0,0,0.55)] ring-2 ring-[color:var(--panel-border-strong)]",
                )}
                onFocusCapture={() => {
                  if (isExpanded) {
                    setFocusedPlanRowId(field.id);
                  }
                }}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlanRow(field.id, defaultExpanded)}
                    className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                  >
                    <div className="grid gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-neutral-100">
                          Hedef Satırı {index + 1}
                        </span>
                        <span
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-semibold",
                            isComplete
                              ? "border-white/15 bg-white text-black"
                              : "border-white/10 bg-white/[0.05] text-neutral-200",
                          )}
                        >
                          {isComplete
                            ? "Hazır"
                            : `${completion.completed}/${completion.total} alan tamam`}
                        </span>
                      </div>

                      {summaryItems.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {summaryItems.map((item) => (
                          <span
                            key={`${field.id}-${item}`}
                            className="rounded-full border border-[color:var(--panel-border)] bg-white/[0.03] px-3 py-1 text-xs text-neutral-300"
                          >
                            {item}
                          </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-neutral-500">
                          Ders, öğrenme alanı ve çıktı seçildikçe bu satır burada özetlenir.
                        </p>
                      )}
                    </div>

                    <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-2 text-neutral-300">
                      {isExpanded ? (
                        <ChevronUp className="size-4" />
                      ) : (
                        <ChevronDown className="size-4" />
                      )}
                    </span>
                  </button>

                  <Button
                    variant="danger"
                    onClick={() => {
                      if (focusedPlanRowId === field.id) {
                        setFocusedPlanRowId(null);
                      }
                      planRows.remove(index);
                    }}
                    disabled={planRows.fields.length === 1}
                  >
                    <Trash2 className="mr-2 size-4" />
                    Sil
                  </Button>
                </div>

                {isExpanded ? (
                  <div className="mt-5 grid gap-4 border-t border-[color:var(--panel-border)] pt-5">
                    <div className="grid gap-4 md:grid-cols-2 min-[1800px]:grid-cols-4">
                  <Field label="Ders">
                    <select
                      className={inputClassName()}
                      value={currentRow?.courseId ?? ""}
                      onChange={(event) =>
                        updatePlanRowFromCatalog(index, event.target.value, undefined, undefined)
                      }
                    >
                      <option value="">Ders seçin</option>
                      {curriculumOptions.map((course) => (
                        <option key={course.courseId} value={course.courseId}>
                          {course.courseName}
                          {!course.hasCatalogContent ? " (manuel)" : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Öğrenme alanı">
                    {selectedCourse?.hasCatalogContent ? (
                      <select
                        className={inputClassName()}
                        value={currentRow?.themeName ?? selectedTheme?.themeName ?? ""}
                        onChange={(event) =>
                          updatePlanRowFromCatalog(
                            index,
                            currentRow?.courseId,
                            event.target.value,
                            undefined,
                          )
                        }
                      >
                        {selectedCourse?.themes.map((theme) => (
                          <option key={theme.themeName} value={theme.themeName}>
                            {theme.themeName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className={inputClassName()}
                        {...register(`planRows.${index}.learningArea`)}
                      />
                    )}
                  </Field>
                  <Field label="Öğrenme çıktısı">
                    {selectedCourse?.hasCatalogContent && selectedTheme ? (
                      <select
                        className={inputClassName()}
                        value={currentRow?.outcomeCode ?? ""}
                        onChange={(event) =>
                          updatePlanRowFromCatalog(
                            index,
                            currentRow?.courseId,
                            selectedTheme.themeName,
                            event.target.value,
                          )
                        }
                        >
                          {selectedTheme.outcomes.map((outcome) => (
                            <option key={outcome.outcomeCode} value={outcome.outcomeCode}>
                              {buildOutcomeOptionLabel(outcome)}
                            </option>
                          ))}
                        </select>
                    ) : (
                      <textarea
                        className={`${inputClassName()} min-h-24`}
                        {...register(`planRows.${index}.learningOutcome`)}
                      />
                    )}
                  </Field>
                  <Field label="Ölçüt">
                    <select className={inputClassName()} {...register(`planRows.${index}.criterion`)}>
                      <option value="5/5 (%100)">5/5 (%100)</option>
                      <option value="4/5 (%80)">4/5 (%80)</option>
                      <option value="3/5 (%60)">3/5 (%60)</option>
                    </select>
                  </Field>
                  <Field label="" className="hidden">
                    <input
                      type="date"
                      className="hidden"
                      {...register(`planRows.${index}.startDate`)}
                    />
                  </Field>
                  <Field label="" className="hidden">
                    <input
                      type="date"
                      className="hidden"
                      {...register(`planRows.${index}.endDate`)}
                    />
                  </Field>
                  <Field label="" className="hidden">
                    <input
                      className="hidden"
                      value={(currentRow?.evaluationDates ?? []).join(", ")}
                      onChange={(event) =>
                        setValue(
                          `planRows.${index}.evaluationDates`,
                          event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                          { shouldDirty: true },
                        )
                      }
                    />
                  </Field>
                    </div>

                    <div className="grid gap-5">
                      <SelectionField
                        key={`process-${index}-${currentRow?.courseId ?? "manual"}-${currentRow?.outcomeCode ?? "manual"}`}
                        label="Süreç bileşenleri"
                        hint={
                          catalogProcessComponents.length === 0 &&
                          effectiveProcessComponents.length > 0
                            ? "Bu amaç için ayrı süreç bileşeni gelmediği için öğrenme çıktısı burada geçici olarak gösterilir."
                            : "Tekli veya çoklu seçim yapabilirsiniz. Katalogdan gelen maddeler otomatik seçilir."
                        }
                        options={processOptions}
                        selectedValues={effectiveProcessComponents}
                        customPlaceholder="Özel süreç bileşeni ekleyin"
                        onChange={(values) => setProcessComponentLabels(index, values)}
                      />

                      <div className="grid gap-3 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/38 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="grid gap-1">
                            <h4 className="text-sm font-semibold text-neutral-100">
                              {restoreTurkishText("Baslama ve Bitis Tarihi")}
                            </h4>
                            <p className="text-sm text-neutral-400">
                              {restoreTurkishText(
                                "Seçili her surec bileseni için tarih belirleyin. Değerlendirme tarihi bitis tarihinden otomatik alinir.",
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-neutral-300">
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                              {restoreTurkishText("Başlangıç")}: {currentRow?.startDate || "-"}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                              {restoreTurkishText("Bitis")}: {currentRow?.endDate || "-"}
                            </span>
                          </div>
                        </div>

                        {processComponentSchedules.length > 0 ? (
                          <div className="overflow-hidden rounded-2xl border border-[color:var(--panel-border)]">
                            <div className="hidden grid-cols-[minmax(0,1.8fr)_150px_150px_150px] gap-px bg-[color:var(--panel-border)] md:grid">
                              {[
                                restoreTurkishText("Surec bileseni"),
                                restoreTurkishText("Başlangıç tarihi"),
                                restoreTurkishText("Bitis tarihi"),
                                restoreTurkishText("Değerlendirme tarihi"),
                              ].map((label) => (
                                <div
                                  key={`${field.id}-${label}`}
                                  className="bg-[color:var(--panel-bg-soft)] px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-neutral-300"
                                >
                                  {label}
                                </div>
                              ))}
                            </div>

                            <div className="grid gap-px bg-[color:var(--panel-border)]">
                              {processComponentSchedules.map((schedule, scheduleIndex) => (
                                <div
                                  key={`${field.id}-${schedule.label}-${scheduleIndex}`}
                                  className="grid gap-4 bg-[color:var(--panel-bg-base)] px-4 py-4 md:grid-cols-[minmax(0,1.8fr)_150px_150px_150px] md:items-center"
                                >
                                  <div className="grid gap-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 md:hidden">
                                      {restoreTurkishText("Surec bileseni")}
                                    </span>
                                    <p className="text-sm font-medium text-neutral-100">
                                      {restoreTurkishText(schedule.label)}
                                    </p>
                                  </div>

                                  <div className="grid gap-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 md:hidden">
                                      {restoreTurkishText("Başlangıç tarihi")}
                                    </span>
                                    <input
                                      type="date"
                                      className={cn(inputClassName(), "h-11")}
                                      value={schedule.startDate}
                                      onChange={(event) =>
                                        updateProcessComponentSchedule(
                                          index,
                                          scheduleIndex,
                                          "startDate",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="grid gap-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 md:hidden">
                                      {restoreTurkishText("Bitis tarihi")}
                                    </span>
                                    <input
                                      type="date"
                                      className={cn(inputClassName(), "h-11")}
                                      value={schedule.endDate}
                                      onChange={(event) =>
                                        updateProcessComponentSchedule(
                                          index,
                                          scheduleIndex,
                                          "endDate",
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </div>

                                  <div className="grid gap-1">
                                    <span className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500 md:hidden">
                                      {restoreTurkishText("Değerlendirme tarihi")}
                                    </span>
                                    <div className={cn(inputClassName(), "flex h-11 items-center text-neutral-300")}>
                                      {schedule.evaluationDate || "-"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-neutral-400">
                            {restoreTurkishText(
                              "Once surec bileseni seçin. Tarih alanlari secilen maddeler için burada acilir.",
                            )}
                          </p>
                        )}
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <SelectionField
                          key={`method-${index}-${currentRow?.courseId ?? "manual"}-${currentRow?.outcomeCode ?? "manual"}`}
                          label="Yöntem ve teknik"
                          options={normalizedFixedMethodTechniqueOptions}
                          selectedValues={selectedMethods}
                          customPlaceholder="Özel yöntem veya teknik ekleyin"
                          compact
                          onChange={(values) =>
                            setDelimitedPlanField(index, "methodTechnique", values)
                          }
                        />
                        <SelectionField
                          key={`materials-${index}-${currentRow?.courseId ?? "manual"}-${currentRow?.outcomeCode ?? "manual"}`}
                          label="Kullanılacak materyaller"
                          options={normalizedFixedMaterialOptions}
                          selectedValues={selectedMaterials}
                          customPlaceholder="Özel materyal ekleyin"
                          compact
                          onChange={(values) =>
                            setDelimitedPlanField(index, "materials", values)
                          }
                        />
                        <SelectionField
                          key={`tendencies-${index}-${currentRow?.courseId ?? "manual"}-${currentRow?.outcomeCode ?? "manual"}`}
                          label="Eğilimler"
                          options={fixedTendencyOptions}
                          selectedValues={selectedTendencies}
                          customPlaceholder="Özel eğilim ekleyin"
                          compact
                          onChange={(values) =>
                            setValue(`planRows.${index}.tendencies`, joinSelectionValues(values), {
                              shouldDirty: true,
                            })
                          }
                        />
                        <SelectionField
                          key={`evaluation-${index}-${currentRow?.courseId ?? "manual"}-${currentRow?.outcomeCode ?? "manual"}`}
                          label="Değerlendirme yöntem ve teknikleri"
                          options={normalizedFixedEvaluationMethodOptions}
                          selectedValues={selectedEvaluationMethods}
                          customPlaceholder="Özel değerlendirme yöntemi ekleyin"
                          compact
                          onChange={(values) =>
                            setDelimitedPlanField(index, "evaluationMethods", values)
                          }
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          <button
            type="button"
            onClick={appendPlanRow}
            className="flex min-h-24 items-center justify-center rounded-[var(--panel-radius-card)] border border-dashed border-white/12 bg-white/[0.02] px-6 py-6 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-white/[0.04]"
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="size-4" />
              Yeni hedef satırını buradan ekle
            </span>
          </button>
        </div>
      </section>

      <section id="environment" className={sectionSurfaceClass}>
        <SectionHeading
          eyebrow="III. Ortam Düzenlemeleri"
          title="Çevresel destekler"
          description="Öğrencinin öğrenme, fiziksel erişim, sosyal katılım ve dijital destek ihtiyaçlarını yazın."
        />
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {[
            { name: "learningEnvironmentText", label: "Eğitim ortamı düzenlemeleri" },
            { name: "physicalEnvironmentText", label: "Fiziksel ortam düzenlemeleri" },
            { name: "socialInteractionText", label: "Sosyal etkileşim ortamları" },
            { name: "digitalSupportsText", label: "Dijital destekler" },
          ].map((field) => (
            <div key={field.name} className="grid gap-2">
              <Field label={field.label}>
                <textarea
                  className={`${inputClassName()} min-h-28`}
                  {...register(field.name as keyof BepEditorFormValues)}
                />
              </Field>
            </div>
          ))}
        </div>
      </section>

      <section id="services" className={sectionSurfaceClass}>
        <div className="flex items-center justify-between gap-3">
          <SectionHeading
            eyebrow="IV. BEP Geliştirme Birim Kararları"
            title="Okul içi diğer eğitim hizmetleri"
            description="Öğrenciye sunulacak destek hizmetlerini ders, süre ve sorumlu kişi bilgileriyle ekleyin."
          />
          <Button
            variant="ghost"
            onClick={() =>
              supportServiceRows.append({
                sortOrder: supportServiceRows.fields.length,
                serviceType: "",
                courseName: "",
                weeklyDuration: "",
                responsiblePeople: "",
              })
            }
          >
            <Plus className="mr-2 size-4" />
            Hizmet Satırı Ekle
          </Button>
        </div>

        <div className="mt-6 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/35">
          <div className="hidden gap-4 border-b border-[color:var(--panel-border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)] md:grid md:grid-cols-[1.15fr_1fr_0.8fr_1fr_auto]">
            {[
              "Hizmet Türü",
              "Ders",
              "Haftalık Süre",
              "Sorumlu Kişi(ler)",
              "",
            ].map((label) => (
              <div key={label || "actions"}>
                {label}
              </div>
            ))}
          </div>
          <div className="divide-y divide-[color:var(--panel-border)]">
            {supportServiceRows.fields.map((field, index) => (
              <div
                key={field.id}
                className="grid gap-4 px-4 py-4 md:grid-cols-[1.15fr_1fr_0.8fr_1fr_auto] md:items-end"
              >
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)] md:hidden">
                    Hizmet Türü
                  </div>
                  <input
                    className={inputClassName()}
                    {...register(`supportServiceEntries.${index}.serviceType`)}
                    placeholder="Destek eğitim odası"
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)] md:hidden">
                    Ders
                  </div>
                  <input
                    className={inputClassName()}
                    {...register(`supportServiceEntries.${index}.courseName`)}
                    placeholder="Türkçe"
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)] md:hidden">
                    Haftalık Süre
                  </div>
                  <input
                    className={inputClassName()}
                    {...register(`supportServiceEntries.${index}.weeklyDuration`)}
                    placeholder="2 ders saati"
                  />
                </div>
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)] md:hidden">
                    Sorumlu Kişiler
                  </div>
                  <input
                    className={inputClassName()}
                    {...register(`supportServiceEntries.${index}.responsiblePeople`)}
                    placeholder="Sınıf öğretmeni, özel eğitim öğretmeni"
                  />
                </div>
                <div className="flex items-end border-t border-[color:var(--panel-border)] pt-4 md:justify-center md:border-0 md:pt-0">
                  <Button className="w-full md:w-auto" variant="danger" onClick={() => supportServiceRows.remove(index)}>
                    <Trash2 className="mr-2 size-4" />
                    Sil
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="family-decisions" className={sectionSurfaceClass}>
        <div className="flex items-center justify-between gap-3">
          <SectionHeading
            eyebrow="V. Aile Süreci ve Diğer Kararlar"
            title="Aile süreci ve diğer kararlar"
            description="Aile bilgilendirme planını, aile eğitimi sürecini ve ek kararları kaydedin."
          />
          <Button
            variant="ghost"
            onClick={() =>
              decisionRows.append({
                category: "family_process",
                sortOrder: decisionRows.fields.length,
                title: "",
                value: "",
              })
            }
          >
            <Plus className="mr-2 size-4" />
            Karar Ekle
          </Button>
        </div>

        <div className="mt-6 grid gap-4">
          {decisionRows.fields.map((field, index) => (
            <div
              key={field.id}
              className={cn(
                listRowClass,
                "grid gap-4 lg:grid-cols-[180px_minmax(0,0.9fr)_minmax(0,1.1fr)_auto] lg:items-start",
              )}
            >
              <Field label="Kategori">
                <select className={inputClassName()} {...register(`decisionEntries.${index}.category`)}>
                  <option value="school_service">Okul içi hizmet</option>
                  <option value="family_process">Aile süreci</option>
                </select>
              </Field>
              <Field label="Başlık">
                <input className={inputClassName()} {...register(`decisionEntries.${index}.title`)} />
              </Field>
              <Field label="İçerik">
                <textarea
                  className={`${inputClassName()} min-h-24`}
                  {...register(`decisionEntries.${index}.value`)}
                />
              </Field>
              <div className="flex items-end border-t border-[color:var(--panel-border)] pt-4 lg:border-0 lg:pt-0">
                <Button className="w-full lg:w-auto" variant="danger" onClick={() => decisionRows.remove(index)}>
                  <Trash2 className="mr-2 size-4" />
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <Field label="Ailenin bilgilendirilme sıklığı">
            <input className={inputClassName()} {...register("familyFrequency")} />
          </Field>
          <Field label="Bilgilendirme yöntemi">
            <input className={inputClassName()} {...register("familyMethod")} />
          </Field>
          <Field label="Aile eğitimi yapılacak mı?">
            <select
              className={inputClassName()}
              value={familyTrainingRequired ? "true" : "false"}
              onChange={(event) =>
                setValue("familyTrainingRequired", event.target.value === "true")
              }
            >
              <option value="false">Hayır</option>
              <option value="true">Evet</option>
            </select>
          </Field>
          <Field label="Aile eğitimi yöntemi">
            <input className={inputClassName()} {...register("familyTrainingMethod")} />
          </Field>
          <Field label="Bir sonraki toplantı tarihi">
            <input type="date" className={inputClassName()} {...register("nextMeetingDate")} />
          </Field>
          <Field label="Genel BEP değerlendirmesi">
            <textarea className={`${inputClassName()} min-h-28`} {...register("generalEvaluation")} />
          </Field>
          <div className="lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Field
                label="Diğer kararlar"
                hint="İstediğiniz kadar diğer karar ekleyebilirsiniz. Tüm satırlar silinirse bu bölüm kaldırılmış olur."
                className="flex-1"
              >
                <div />
              </Field>
              <Button
                variant="ghost"
                onClick={() => otherDecisionRows.append({ value: "" })}
              >
                <Plus className="mr-2 size-4" />
                Diğer Karar Ekle
              </Button>
            </div>

            <div className="mt-3 grid gap-3">
              {otherDecisionRows.fields.length > 0 ? (
                otherDecisionRows.fields.map((field, index) => (
                  <div
                    key={field.id}
                    className={cn(listRowClass, "grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end")}
                  >
                    <Field label={`Diğer karar ${index + 1}`}>
                      <input className={inputClassName()} {...register(`otherDecisionEntries.${index}.value`)} />
                    </Field>
                    <div className="flex items-end border-t border-[color:var(--panel-border)] pt-4 lg:border-0 lg:pt-0">
                      <Button className="w-full lg:w-auto" variant="danger" onClick={() => otherDecisionRows.remove(index)}>
                        <Trash2 className="mr-2 size-4" />
                        Sil
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-neutral-400">
                  Diğer karar bölümü kaldırıldı. İsterseniz yeniden ekleyebilirsiniz.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="committee" className={sectionSurfaceClass}>
        <div className="flex items-center justify-between gap-3">
          <SectionHeading
            eyebrow="VI. Kurul Üyeleri"
            title="BEP geliştirme birimi"
            description="BEP sürecine katılan kurul üyelerini rol ve ad soyad bilgileriyle düzenleyin."
          />
          <Button
            variant="ghost"
            onClick={() =>
              committeeRows.append({
                sortOrder: committeeRows.fields.length,
                role: "",
                fullName: "",
              })
            }
          >
            <Plus className="mr-2 size-4" />
            Üye Ekle
          </Button>
        </div>

        <div className="mt-4 text-sm text-neutral-400">
          Kurul üyelerini ihtiyaç duyulan sıraya göre düzenleyebilirsiniz. Sol tutamacı sürükleyip bırakarak sıralamayı değiştirebilirsiniz.
        </div>

        <div className="mt-6 grid gap-4">
          {committeeRows.fields.map((field, index) => (
            <div
              key={field.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (draggedCommitteeIndex === null || draggedCommitteeIndex === index) {
                  setDraggedCommitteeIndex(null);
                  return;
                }

                committeeRows.move(draggedCommitteeIndex, index);
                setDraggedCommitteeIndex(null);
              }}
              className={cn(
                `${listRowClass} grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end`,
                draggedCommitteeIndex === index && "border-white/30 bg-white/[0.06]",
              )}
            >
              <div className="flex items-start lg:items-end">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    setDraggedCommitteeIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => setDraggedCommitteeIndex(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-neutral-300 transition hover:bg-white/[0.08]"
                  aria-label={`Kurul üyesi ${index + 1} sırasını değiştir`}
                  title="Sürükleyip bırakarak sırayı değiştirin"
                >
                  <GripVertical className="size-4" />
                </button>
              </div>
              <Field label="Rol">
                <input className={inputClassName()} {...register(`committeeMembers.${index}.role`)} />
              </Field>
              <Field label="Ad soyad">
                <input
                  className={inputClassName()}
                  {...register(`committeeMembers.${index}.fullName`)}
                />
              </Field>
              <div className="flex items-end border-t border-[color:var(--panel-border)] pt-4 lg:border-0 lg:pt-0">
                <Button className="w-full lg:w-auto" variant="danger" onClick={() => committeeRows.remove(index)}>
                  <Trash2 className="mr-2 size-4" />
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-8">
          <SectionHeading
            eyebrow="VI.A Alan Öğretmenleri"
            title="Öğrencinin dersini okutan alan öğretmenleri"
            description="Öğrencinin dersine giren alan öğretmenlerini ders ve ad soyad bilgileriyle ekleyin."
          />
          <Button
            variant="ghost"
            onClick={() =>
              subjectTeacherRows.append({
                sortOrder: subjectTeacherRows.fields.length,
                courseName: "",
                fullName: "",
              })
            }
          >
            <Plus className="mr-2 size-4" />
            Öğretmen Ekle
          </Button>
        </div>

        <div className="mt-4 text-sm text-neutral-400">
          Alan öğretmenlerini de ihtiyaç duyulan sıraya göre düzenleyebilirsiniz. Sol tutamacı sürükleyip bırakarak sıralamayı değiştirebilirsiniz.
        </div>

        <div className="mt-4 grid gap-4">
          {subjectTeacherRows.fields.map((field, index) => (
            <div
              key={field.id}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => {
                if (
                  draggedSubjectTeacherIndex === null ||
                  draggedSubjectTeacherIndex === index
                ) {
                  setDraggedSubjectTeacherIndex(null);
                  return;
                }

                subjectTeacherRows.move(draggedSubjectTeacherIndex, index);
                setDraggedSubjectTeacherIndex(null);
              }}
              className={cn(
                `${listRowClass} grid gap-4 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end`,
                draggedSubjectTeacherIndex === index && "border-white/30 bg-white/[0.06]",
              )}
            >
              <div className="flex items-start lg:items-end">
                <button
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    setDraggedSubjectTeacherIndex(index);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", String(index));
                  }}
                  onDragEnd={() => setDraggedSubjectTeacherIndex(null)}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-neutral-300 transition hover:bg-white/[0.08]"
                  aria-label={`Alan öğretmeni ${index + 1} sırasını değiştir`}
                  title="Sürükleyip bırakarak sırayı değiştirin"
                >
                  <GripVertical className="size-4" />
                </button>
              </div>
              <Field label="Alan / ders">
                <input
                  className={inputClassName()}
                  {...register(`subjectTeachers.${index}.courseName`)}
                />
              </Field>
              <Field label="Ad soyad">
                <input
                  className={inputClassName()}
                  {...register(`subjectTeachers.${index}.fullName`)}
                />
              </Field>
              <div className="flex items-end border-t border-[color:var(--panel-border)] pt-4 lg:border-0 lg:pt-0">
                <Button className="w-full lg:w-auto" variant="danger" onClick={() => subjectTeacherRows.remove(index)}>
                  <Trash2 className="mr-2 size-4" />
                  Sil
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {feedback ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-neutral-200">
          {restoreTurkishText(feedback)}
        </div>
      ) : null}

      <div className="sticky bottom-0 z-10 flex flex-col gap-3 rounded-t-[24px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]/92 px-4 py-3 backdrop-blur-xl sm:bottom-3 sm:flex-row sm:items-center sm:justify-between sm:rounded-[var(--panel-radius-card)]">
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/72 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              Durum
            </div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--panel-text)]">
              {watchedStatus === "completed" ? "TAMAMLANDI" : "TASLAK"}
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/72 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              Hedef ilerleme
            </div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--panel-text)]">
              {completedPlanRowCount}/{watchedRows.length} satır tamam
            </div>
          </div>
          <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/72 px-3 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              Bu oturum
            </div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--panel-text)]">
              {isDirty
                ? "Kaydedilmemiş değişiklik var"
                : `${filledPerformanceCount} performans satırı hazır`}
            </div>
          </div>
        </div>
        {false && documentId ? (
          <>
          <Button
            variant="secondary"
            onClick={() => {
              const pdfWindow = window.open(`/api/pdf/${documentId}`, "_blank", "noopener,noreferrer");
              showToast({
                title: pdfWindow ? "PDF hazir" : "PDF acilamadi",
                message: pdfWindow
                  ? "BEP PDF'i yeni sekmede acildi."
                  : "Tarayici yeni sekmeyi engelledi.",
                tone: pdfWindow ? "success" : "error",
              });
            }}
          >
            <FileDown className="mr-2 size-4" />
            PDF Önizle
          </Button>
          
          </>
        ) : null}
        {canEdit ? (
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button className="w-full sm:w-auto" type="submit" disabled={isPending}>
              {isPending ? "Kaydediliyor..." : "BEP Kaydet"}
            </Button>
          </div>
        ) : (
          <div className="text-sm font-medium text-[color:var(--panel-text-soft)]">
            Bu belge veli görünümünde yalnız görüntülenebilir.
          </div>
        )}
      </div>
      </fieldset>
    </form>
  );
}
