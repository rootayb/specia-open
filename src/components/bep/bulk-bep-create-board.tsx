"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, CheckSquare, ChevronDown, ChevronUp, FilePlus2, Plus, Search, Square, Trash2 } from "lucide-react";

import { bulkCreateBepAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { WorkspaceCardGrid, WorkspacePanel } from "@/components/ui/workspace-switcher";
import {
  buildPlanRowDefaults,
  fixedTendencyOptions,
  type CurriculumCourseOption,
} from "@/lib/curriculum";

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
  classroom: string | null;
  documentCount: number;
};

type Row = {
  id: string;
  courseId: string;
  themeName: string;
  outcomeCode: string;
  courseName: string;
  learningArea: string;
  learningOutcome: string;
  processComponents: string[];
  processComponentSchedules: Array<{
    label: string;
    startDate: string;
    endDate: string;
    evaluationDate: string;
  }>;
  criterion: string;
  methodTechnique: string;
  materials: string;
  tendencies: string;
  startDate: string;
  endDate: string;
  evaluationMethods: string;
  evaluationDates: string[];
  performanceResult: string;
  isManualEntry: boolean;
};

type WorkspaceId = "setup" | "rows" | "students";

const methodOptions = ["Doğrudan ogretim", "Asamali yardim", "Model olma", "Ipucu verme", "Görev analizi", "Tekrar calismasi", "Video model"];
const materialOptions = ["Gorsel kartlar", "Calisma kagidi", "Gercek nesneler", "Görev cizelgesi", "Kontrol listesi", "Tablet uygulamasi"];
const evaluationOptions = ["Gozlem formu", "Kontrol listesi", "Performans kaydı", "Urun dosyasi", "Sozlu yoklama", "Uygulama görevi"];

function emptyRow(): Row {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    courseId: "",
    themeName: "",
    outcomeCode: "",
    courseName: "",
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
  };
}

function normalizeValue(value: string) {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function splitValues(value?: string) {
  if (!value) return [];
  const seen = new Set<string>();
  return value
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = normalizeValue(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function joinValues(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean))).join("; ");
}

function toggleListValue(values: string[], nextValue: string) {
  const nextKey = normalizeValue(nextValue);
  return values.some((value) => normalizeValue(value) === nextKey)
    ? values.filter((value) => normalizeValue(value) !== nextKey)
    : [...values, nextValue];
}

function ChipField({
  label,
  options,
  value,
  placeholder,
  compact = false,
  onChange,
}: {
  label: string;
  options: string[];
  value: string;
  placeholder: string;
  compact?: boolean;
  onChange: (value: string) => void;
}) {
  const selected = splitValues(value);
  const [custom, setCustom] = useState("");
  const [isExpanded, setIsExpanded] = useState(() => !compact || selected.length === 0);
  const showExpandedContent = !compact || isExpanded || selected.length === 0;

  return (
    <Field label={label}>
      <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
        {compact ? (
          <button
            type="button"
            onClick={() => setIsExpanded((current) => !current)}
            className="flex items-start justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-neutral-100">
                  {selected.length > 0 ? `${selected.length} seçili` : "Seçim yapin"}
                </span>
                {selected.length > 0 ? (
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-1 text-[11px] text-neutral-300">
                    Coklu seçim
                  </span>
                ) : null}
              </div>
              {selected.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {selected.slice(0, 3).map((item) => (
                    <span
                      key={`${label}-${item}`}
                      className="rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-1 text-xs text-neutral-200"
                    >
                      {item}
                    </span>
                  ))}
                  {selected.length > 3 ? (
                    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-neutral-400">
                      +{selected.length - 3} daha
                    </span>
                  ) : null}
                </div>
              ) : (
                <p className="mt-2 text-xs text-neutral-500">
                  Onerileri acip secim yapabilir veya özel değer ekleyebilirsiniz.
                </p>
              )}
            </div>
            <span className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-2 text-neutral-300">
              {showExpandedContent ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </span>
          </button>
        ) : null}

        {showExpandedContent ? (
          <>
            <div className={compact ? "max-h-36 overflow-y-auto pr-1" : undefined}>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set([...options, ...selected])).map((option) => {
                  const active = selected.some((item) => normalizeValue(item) === normalizeValue(option));
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onChange(joinValues(toggleListValue(selected, option)))}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${active ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.04] text-neutral-200"}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-[1fr_auto]">
              <input
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const next = custom.trim();
                    if (!next) return;
                    onChange(joinValues([...selected, next]));
                    setCustom("");
                  }
                }}
                className={inputClassName()}
                placeholder={placeholder}
              />
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const next = custom.trim();
                  if (!next) return;
                  onChange(joinValues([...selected, next]));
                  setCustom("");
                }}
              >
                Ekle
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </Field>
  );
}

export function BulkBepCreateBoard({
  students,
  curriculumOptions,
}: {
  students: StudentOption[];
  curriculumOptions: CurriculumCourseOption[];
}) {
  const { showToast } = useActionToast();
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("2025-2026 BEP");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState("");
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceId>("setup");
  const [activeRowId, setActiveRowId] = useState(rows[0]?.id ?? "");
  const [isPending, startTransition] = useTransition();
  const deferredSearch = useDeferredValue(search.trim().toLocaleLowerCase("tr-TR"));
  const courseMap = useMemo(() => new Map(curriculumOptions.map((course) => [course.courseId, course])), [curriculumOptions]);

  const filteredStudents = useMemo(
    () =>
      students.filter((student) => {
        if (!deferredSearch) return true;
        const haystack = `${student.firstName} ${student.lastName} ${student.schoolName ?? ""} ${student.classroom ?? ""}`.toLocaleLowerCase("tr-TR");
        return haystack.includes(deferredSearch);
      }),
    [deferredSearch, students],
  );

  const selectedSet = useMemo(() => new Set(selectedStudentIds), [selectedStudentIds]);
  const resolvedActiveRowId = rows.some((row) => row.id === activeRowId) ? activeRowId : rows[0]?.id ?? "";
  const activeRow = useMemo(
    () => rows.find((row) => row.id === resolvedActiveRowId) ?? rows[0] ?? null,
    [resolvedActiveRowId, rows],
  );

  const validRows = useMemo(
    () =>
      rows.filter(
        (row) => row.courseName.trim() && row.learningArea.trim() && row.learningOutcome.trim(),
      ),
    [rows],
  );

  const rowIssues = useMemo(
    () =>
      rows
        .map((row, index) => {
          const touched = row.courseName || row.learningArea || row.learningOutcome || row.courseId;
          if (!touched) return null;
          if (!row.courseName.trim() || !row.learningArea.trim() || !row.learningOutcome.trim()) {
            return `${index + 1}. hedef satiri eksik.`;
          }
          return null;
        })
        .filter((item): item is string => Boolean(item)),
    [rows],
  );

  const workspaceItems = useMemo(
    () => [
      {
        id: "setup",
        icon: FilePlus2,
        title: "Hazirlik",
        description: "Belge basligini ve ortak tarihleri bir kez belirleyin.",
        value: title.trim() || "Baslik bekleniyor",
      },
      {
        id: "rows",
        icon: Plus,
        title: "Hedef Satirlari",
        description: "Satirlari tek tek acip daha rahat duzenleyin.",
        value: `${rows.length} satir / ${validRows.length} hazir`,
      },
      {
        id: "students",
        icon: CheckSquare,
        title: "Öğrenci Seçimi",
        description: "Toplu acilacak öğrencileri secip listeyi sade tutun.",
        value: `${selectedStudentIds.length} öğrenci seçili`,
      },
    ],
    [rows.length, selectedStudentIds.length, title, validRows.length],
  );

  const updateRow = (rowId: string, patch: Partial<Row>) => {
    setRows((current) => current.map((row) => (row.id === rowId ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const nextRow = emptyRow();
    setRows((current) => [...current, nextRow]);
    setActiveWorkspace("rows");
    setActiveRowId(nextRow.id);
  };

  const removeRow = (rowId: string) => {
    setRows((current) => {
      if (current.length === 1) {
        const nextRow = emptyRow();
        setActiveRowId(nextRow.id);
        return [nextRow];
      }
      const nextRows = current.filter((item) => item.id !== rowId);
      if (activeRowId === rowId) {
        setActiveRowId(nextRows[0]?.id ?? "");
      }
      return nextRows;
    });
  };

  const updateRowFromCatalog = (
    rowId: string,
    nextCourseId?: string,
    nextThemeName?: string,
    nextOutcomeCode?: string,
  ) => {
    setRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) return row;
        const course = courseMap.get(nextCourseId ?? row.courseId);
        if (!course) return { ...emptyRow(), id: row.id };
        if (!course.hasCatalogContent) {
          return {
            ...row,
            courseId: course.courseId,
            courseName: course.courseName,
            themeName: "",
            outcomeCode: "",
            isManualEntry: true,
          };
        }
        const theme =
          course.themes.find((item) => item.themeName === (nextThemeName ?? row.themeName)) ?? course.themes[0];
        const outcome =
          theme?.outcomes.find((item) => item.outcomeCode === (nextOutcomeCode ?? row.outcomeCode)) ??
          theme?.outcomes[0];
        const defaults = buildPlanRowDefaults({
          courseName: course.courseName,
          learningArea: theme?.themeName ?? "",
          learningOutcome: outcome?.outcomeText ?? "",
          processComponents: outcome?.processComponents ?? [],
          tendencies: theme?.tendencies ?? [],
        });
        return {
          ...row,
          courseId: course.courseId,
          courseName: course.courseName,
          themeName: theme?.themeName ?? "",
          outcomeCode: outcome?.outcomeCode ?? "",
          learningArea: defaults.learningArea,
          learningOutcome: defaults.learningOutcome,
          processComponents: defaults.processComponents,
          processComponentSchedules: [],
          criterion: defaults.criterion ?? "4/5 (%80)",
          methodTechnique: defaults.methodTechnique ?? "",
          materials: defaults.materials ?? "",
          tendencies: defaults.tendencies ?? "",
          evaluationMethods: defaults.evaluationMethods ?? "",
          isManualEntry: false,
        };
      }),
    );
  };

  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) =>
      current.includes(studentId) ? current.filter((id) => id !== studentId) : [...current, studentId],
    );
  };

  const submit = () => {
    setFeedback("");
    startTransition(async () => {
      const result = await bulkCreateBepAction({
        studentIds: selectedStudentIds,
        title,
        startDate,
        endDate,
        skipExisting,
        planRows: validRows.map((row) => ({
          courseId: row.courseId,
          themeName: row.themeName,
          outcomeCode: row.outcomeCode,
          courseName: row.courseName,
          learningArea: row.learningArea,
          learningOutcome: row.learningOutcome,
          processComponents: row.processComponents,
          processComponentSchedules: row.processComponentSchedules,
          criterion: row.criterion,
          methodTechnique: row.methodTechnique,
          materials: row.materials,
          tendencies: row.tendencies,
          startDate: row.startDate,
          endDate: row.endDate,
          evaluationMethods: row.evaluationMethods,
          evaluationDates: row.evaluationDates,
          performanceResult: row.performanceResult,
          isManualEntry: row.isManualEntry,
        })),
      });
      setFeedback(result.message);
      showToast({
        title: result.success ? "Toplu BEP hazir" : "Toplu BEP olusmadi",
        message: result.message,
        tone: result.success ? "success" : "error",
      });
      if (result.success) {
        setSelectedStudentIds([]);
      }
    });
  };

  const renderActiveRow = () => {
    if (!activeRow) return null;

    const selectedCourse = courseMap.get(activeRow.courseId);
    const selectedTheme =
      selectedCourse?.themes.find((theme) => theme.themeName === activeRow.themeName) ?? selectedCourse?.themes[0];
    const selectedOutcome =
      selectedTheme?.outcomes.find((outcome) => outcome.outcomeCode === activeRow.outcomeCode) ??
      selectedTheme?.outcomes[0];
    const processOptions = Array.from(
      new Set([...(selectedOutcome?.processComponents ?? []), ...activeRow.processComponents]),
    );
    const activeRowIndex = rows.findIndex((row) => row.id === activeRow.id) + 1;

    return (
      <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5 sm:p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-neutral-100">Hedef Satiri {activeRowIndex}</div>
            <div className="mt-2 break-words text-sm text-neutral-500">
              {[activeRow.courseName, activeRow.learningArea].filter(Boolean).join(" / ") || "Plan satirini buradan duzenleyin"}
            </div>
          </div>
          <Button type="button" variant="danger" onClick={() => removeRow(activeRow.id)}>
            <Trash2 className="mr-2 size-4" />Sil
          </Button>
        </div>

        <div className="grid gap-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="Ders" className="min-w-0">
              <select
                className={inputClassName()}
                value={activeRow.courseId}
                onChange={(event) => updateRowFromCatalog(activeRow.id, event.target.value, undefined, undefined)}
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
            <Field label="Olcut" className="min-w-0">
              <select
                className={inputClassName()}
                value={activeRow.criterion}
                onChange={(event) => updateRow(activeRow.id, { criterion: event.target.value })}
              >
                <option value="5/5 (%100)">5/5 (%100)</option>
                <option value="4/5 (%80)">4/5 (%80)</option>
                <option value="3/5 (%60)">3/5 (%60)</option>
              </select>
            </Field>
            <Field label="Ogrenme alani" className="min-w-0">
              {selectedCourse?.hasCatalogContent ? (
                <select
                  className={inputClassName()}
                  value={activeRow.themeName}
                  onChange={(event) => updateRowFromCatalog(activeRow.id, activeRow.courseId, event.target.value, undefined)}
                >
                  {selectedCourse.themes.map((theme) => (
                    <option key={theme.themeName} value={theme.themeName}>
                      {theme.themeName}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={inputClassName()}
                  value={activeRow.learningArea}
                  onChange={(event) => updateRow(activeRow.id, { learningArea: event.target.value })}
                />
              )}
            </Field>
            <Field label="Ogrenme çıktısı" className="min-w-0 lg:col-span-2">
              {selectedCourse?.hasCatalogContent && selectedTheme ? (
                <select
                  className={inputClassName()}
                  value={activeRow.outcomeCode}
                  onChange={(event) => updateRowFromCatalog(activeRow.id, activeRow.courseId, selectedTheme.themeName, event.target.value)}
                >
                  {selectedTheme.outcomes.map((outcome) => (
                    <option key={outcome.outcomeCode} value={outcome.outcomeCode}>
                      {outcome.outcomeCode} - {outcome.outcomeText}
                    </option>
                  ))}
                </select>
              ) : (
                <textarea
                  className={`${inputClassName()} min-h-28`}
                  value={activeRow.learningOutcome}
                  onChange={(event) => updateRow(activeRow.id, { learningOutcome: event.target.value })}
                />
              )}
            </Field>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Baslama tarihi" className="min-w-0">
              <input
                type="date"
                className={inputClassName()}
                value={activeRow.startDate}
                onChange={(event) => updateRow(activeRow.id, { startDate: event.target.value })}
              />
            </Field>
            <Field label="Bitis tarihi" className="min-w-0">
              <input
                type="date"
                className={inputClassName()}
                value={activeRow.endDate}
                onChange={(event) => updateRow(activeRow.id, { endDate: event.target.value })}
              />
            </Field>
            <Field label="Değerlendirme tarihleri" hint="Virgulle ayirin." className="min-w-0">
              <input
                className={inputClassName()}
                value={activeRow.evaluationDates.join(", ")}
                onChange={(event) =>
                  updateRow(activeRow.id, {
                    evaluationDates: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
          </div>

          <ChipField
            label="Surec bilesenleri"
            options={processOptions}
            value={joinValues(activeRow.processComponents)}
            placeholder="Özel surec bileseni ekleyin"
            onChange={(value) => updateRow(activeRow.id, { processComponents: splitValues(value) })}
          />
          <div className="grid gap-4 2xl:grid-cols-2">
            <ChipField
              label="Yöntem ve teknik"
              options={methodOptions}
              value={activeRow.methodTechnique}
              placeholder="Özel yöntem ekleyin"
              compact
              onChange={(value) => updateRow(activeRow.id, { methodTechnique: value })}
            />
            <ChipField
              label="Kullanilacak materyaller"
              options={materialOptions}
              value={activeRow.materials}
              placeholder="Özel materyal ekleyin"
              compact
              onChange={(value) => updateRow(activeRow.id, { materials: value })}
            />
            <ChipField
              label="Egilimler"
              options={fixedTendencyOptions}
              value={activeRow.tendencies}
              placeholder="Özel egilim ekleyin"
              compact
              onChange={(value) => updateRow(activeRow.id, { tendencies: value })}
            />
            <ChipField
              label="Değerlendirme yöntem ve teknikleri"
              options={evaluationOptions}
              value={activeRow.evaluationMethods}
              placeholder="Özel değerlendirme yöntemi ekleyin"
              compact
              onChange={(value) => updateRow(activeRow.id, { evaluationMethods: value })}
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">Toplu BEP Olusturma</div>
            <h1 className="text-3xl font-semibold text-white">Birden fazla öğrenci için BEP hazirlayin</h1>
            <p className="text-sm text-neutral-400">Toplu sayfayi daha rahat kullanmak için adimlara ayirip her alani tek tek aciyoruz.</p>
          </div>
          <Link href="/panel/bep">
            <Button variant="ghost"><ArrowLeft className="size-4" />BEP merkezine don</Button>
          </Link>
        </div>
      </Card>

      <WorkspaceCardGrid items={workspaceItems} activeId={activeWorkspace} onChange={(id) => setActiveWorkspace(id as WorkspaceId)} />

      {activeWorkspace === "setup" ? (
        <WorkspacePanel eyebrow="Ayarlar" title="Olusturma bilgileri" description="Bu bilgiler secilen tum öğrencilere ayni sekilde uygulanir.">
          <div className="grid gap-4 lg:grid-cols-2">
            <Field label="BEP basligi" className="lg:col-span-2">
              <input value={title} onChange={(event) => setTitle(event.target.value)} className={inputClassName()} />
            </Field>
            <Field label="Başlangıç tarihi">
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={inputClassName()} />
            </Field>
            <Field label="Bitis tarihi">
              <input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={inputClassName()} />
            </Field>
            <label className="flex items-start gap-3 rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-neutral-200 lg:col-span-2">
              <input type="checkbox" checked={skipExisting} onChange={(event) => setSkipExisting(event.target.checked)} className="mt-1 size-4 rounded border-white/15 bg-transparent" />
              <span>Ayni baslikta BEP bulunan öğrencileri atla.</span>
            </label>
            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <Button type="button" onClick={() => setActiveWorkspace("rows")}>
                Hedef satirlarina gec
              </Button>
              <Button type="button" variant="ghost" onClick={() => setActiveWorkspace("students")}>
                Öğrenci secimine gec
              </Button>
            </div>
          </div>
        </WorkspacePanel>
      ) : null}

      {activeWorkspace === "rows" ? (
        <WorkspacePanel
          eyebrow="III. Plan Satirlari"
          title="BEP ders hedefleri"
          description="Soldan satir seçin, sagda sadece o satiri duzenleyin. Boylesi hem daha sade hem daha rahat."
          actions={<Button type="button" variant="secondary" onClick={addRow}><Plus className="size-4" />Hedef satiri ekle</Button>}
        >
          <div className="grid gap-5 2xl:grid-cols-[320px_minmax(0,1fr)]">
            <div className="grid gap-3 2xl:max-h-[920px] 2xl:overflow-y-auto 2xl:pr-1">
              {rows.map((row, index) => {
                const complete = row.courseName.trim() && row.learningArea.trim() && row.learningOutcome.trim();
                const active = row.id === resolvedActiveRowId;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => setActiveRowId(row.id)}
                    className={`rounded-[var(--panel-radius-card)] border p-4 text-left transition ${active ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.05]"}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold">Hedef Satiri {index + 1}</div>
                        <div className={`mt-2 text-sm ${active ? "text-black/65" : "text-neutral-400"}`}>
                          {[row.courseName, row.learningArea].filter(Boolean).join(" / ") || "Plan satirini acip doldurun"}
                        </div>
                      </div>
                      <div className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? "border-black/10 bg-black/5 text-black/70" : complete ? "border-emerald-400/20 bg-emerald-500/[0.08] text-emerald-200" : "border-white/10 bg-white/[0.04] text-neutral-400"}`}>
                        {complete ? "Hazir" : "Taslak"}
                      </div>
                    </div>
                  </button>
                );
              })}

              {rowIssues.length > 0 ? (
                <div className="rounded-[var(--panel-radius-card)] border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100">
                  {rowIssues.join(" ")}
                </div>
              ) : null}
            </div>

            {renderActiveRow()}
          </div>
        </WorkspacePanel>
      ) : null}

      {activeWorkspace === "students" ? (
        <WorkspacePanel
          eyebrow="Öğrenci Seçimi"
          title="BEP acilacak öğrenciler"
          description="Arama yapin, topluca seçin ve sadece islem yapmak istediginiz öğrencileri birakin."
          actions={
            <>
              <Button type="button" variant="secondary" onClick={() => setSelectedStudentIds((current) => Array.from(new Set([...current, ...filteredStudents.map((student) => student.id)])))}>
                <CheckSquare className="size-4" />Gorunenleri sec
              </Button>
              <Button type="button" variant="ghost" onClick={() => {
                const filteredIds = new Set(filteredStudents.map((student) => student.id));
                setSelectedStudentIds((current) => current.filter((id) => !filteredIds.has(id)));
              }}>
                Gorunen secimi kaldir
              </Button>
            </>
          }
        >
          <div className="grid gap-4">
            <Field label="Ara">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClassName()} pl-10`} placeholder="Öğrenci, okul veya sınıf ile ara" />
              </div>
            </Field>
            <div className="grid gap-3 2xl:grid-cols-2">
              {filteredStudents.length === 0 ? (
                <Card className="border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-500 2xl:col-span-2">Filtreye uygun öğrenci bulunamadı.</Card>
              ) : filteredStudents.map((student) => {
                const selected = selectedSet.has(student.id);
                return (
                  <button key={student.id} type="button" onClick={() => toggleStudent(student.id)} className={`rounded-[var(--panel-radius-card)] border p-4 text-left transition ${selected ? "border-white bg-white text-black" : "border-white/10 bg-white/[0.03] text-white hover:border-white/20 hover:bg-white/[0.06]"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-semibold">{student.firstName} {student.lastName}</div>
                        <div className={`mt-2 text-sm ${selected ? "text-black/65" : "text-neutral-400"}`}>{student.schoolName || "Okul bilgisi eklenmedi"} / Sinif: {student.classroom || "-"}</div>
                        <div className={`mt-2 text-sm ${selected ? "text-black/65" : "text-neutral-500"}`}>Mevcut BEP sayısı: {student.documentCount}</div>
                      </div>
                      <div className={`rounded-full border p-2 ${selected ? "border-black/10 bg-black/5 text-black" : "border-white/10 bg-white/[0.03] text-neutral-300"}`}>
                        {selected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </WorkspacePanel>
      ) : null}

      <Card className="sticky bottom-4 z-10 border-white/12 bg-black/90 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1 text-sm text-neutral-400">
            <div>{rows.length} hedef satiri hazirlandi</div>
            <div>{selectedStudentIds.length} öğrenci secildi</div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="ghost" onClick={() => setActiveWorkspace("students")}>
              Öğrenci secimine gec
            </Button>
            <Button
              type="button"
              disabled={isPending || selectedStudentIds.length === 0 || !title.trim() || rowIssues.length > 0}
              onClick={submit}
            >
              <FilePlus2 className="size-4" />
              {isPending ? "Olusturuluyor..." : "Secilen öğrenciler için BEP oluştur"}
            </Button>
          </div>
        </div>
        {feedback ? <div className="mt-4 rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-200">{feedback}</div> : null}
      </Card>
    </div>
  );
}
