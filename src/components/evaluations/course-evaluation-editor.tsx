"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, FileDown, Square } from "lucide-react";

import { saveCourseEvaluationAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  buildCourseEvaluationDocumentMeta,
  buildCourseEvaluationRows,
  buildCourseEvaluationTitle,
} from "@/lib/course-evaluation";
import type { CourseEvaluationCourseOption } from "@/lib/course-evaluation-catalog";
import type { CourseEvaluationDocumentInput } from "@/lib/schemas";
import { restoreTurkishText } from "@/lib/turkish";
import { cn } from "@/lib/utils";

type Props = {
  defaultValues: CourseEvaluationDocumentInput;
  studentName: string;
  studentSchoolName?: string | null;
  documentId?: string;
  courseOptions: CourseEvaluationCourseOption[];
};

type FormRow = CourseEvaluationDocumentInput["rows"][number];

function countMarkedRows(rows: CourseEvaluationDocumentInput["rows"]) {
  return rows.filter((row) => row.result === "+" || row.result === "-").length;
}

function buildRowKey(row: Pick<FormRow, "courseId" | "unitName" | "learningArea" | "learningOutcome" | "processComponent">) {
  return [row.courseId, row.unitName, row.learningArea, row.learningOutcome, row.processComponent ?? ""]
    .map((value) => value.trim())
    .join("||");
}

function syncRowsForCourses(existingRows: FormRow[], courseIds: string[]) {
  const existingMap = new Map(existingRows.map((row) => [buildRowKey(row), row]));
  let sortOrder = 0;

  return courseIds.flatMap((courseId) =>
    buildCourseEvaluationRows(courseId).map((templateRow) => {
      const existing = existingMap.get(buildRowKey(templateRow));
      const nextRow = {
        ...(existing ?? templateRow),
        courseId: templateRow.courseId,
        courseName: templateRow.courseName,
        sortOrder,
      };
      sortOrder += 1;
      return nextRow;
    }),
  );
}

function summarizeSelectedCourses(courseIds: string[], courseOptions: CourseEvaluationCourseOption[]) {
  return courseIds
    .map((courseId) => courseOptions.find((course) => course.courseId === courseId)?.courseName ?? "")
    .filter(Boolean);
}

export function CourseEvaluationEditor({
  defaultValues,
  studentName,
  studentSchoolName,
  documentId,
  courseOptions,
}: Props) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [form, setForm] = useState<CourseEvaluationDocumentInput>(defaultValues);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const markedCount = useMemo(() => countMarkedRows(form.rows), [form.rows]);
  const selectedCourseNames = useMemo(
    () => summarizeSelectedCourses(form.selectedCourseIds, courseOptions),
    [courseOptions, form.selectedCourseIds],
  );
  const allCourseIds = useMemo(() => courseOptions.map((course) => course.courseId), [courseOptions]);
  const allSelected = form.selectedCourseIds.length === allCourseIds.length && allCourseIds.length > 0;

  const courseGroups = useMemo(() => {
    const courses = new Map<
      string,
      {
        courseName: string;
        units: Array<{
          unitName: string;
          rows: Array<FormRow & { originalIndex: number }>;
        }>;
      }
    >();

    form.rows.forEach((row, index) => {
      const courseKey = row.courseId || row.courseName;
      const currentCourse =
        courses.get(courseKey) ??
        {
          courseName: row.courseName,
          units: [],
        };
      const currentUnit = currentCourse.units.find((unit) => unit.unitName === row.unitName);
      if (currentUnit) {
        currentUnit.rows.push({ ...row, originalIndex: index });
      } else {
        currentCourse.units.push({
          unitName: row.unitName,
          rows: [{ ...row, originalIndex: index }],
        });
      }
      courses.set(courseKey, currentCourse);
    });

    return Array.from(courses.values());
  }, [form.rows]);

  function applyCourseSelection(nextCourseIds: string[]) {
    const meta = buildCourseEvaluationDocumentMeta(nextCourseIds);
    setForm((current) => {
      const nextTitle =
        !current.title.trim() ||
        current.title === buildCourseEvaluationTitle(summarizeSelectedCourses(current.selectedCourseIds, courseOptions)) ||
        current.title === "Kaba Değerlendirme"
          ? meta.title
          : current.title;

      return {
        ...current,
        title: nextTitle,
        courseId: meta.courseId,
        courseName: meta.courseName,
        selectedCourseIds: meta.selectedCourseIds,
        rows: syncRowsForCourses(current.rows, meta.selectedCourseIds),
      };
    });
  }

  function toggleCourse(courseId: string) {
    applyCourseSelection(
      form.selectedCourseIds.includes(courseId)
        ? form.selectedCourseIds.filter((item) => item !== courseId)
        : [...form.selectedCourseIds, courseId],
    );
  }

  function setRowResult(index: number, result: "+" | "-") {
    setForm((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) =>
        rowIndex === index
          ? { ...row, result: row.result === result ? "" : result }
          : row,
      ),
    }));
  }

  function setGroupResult(indexes: number[], result: "+" | "-") {
    const selectedIndexes = new Set(indexes);

    setForm((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) =>
        selectedIndexes.has(rowIndex) ? { ...row, result } : row,
      ),
    }));
  }

  function clearGroupResult(indexes: number[]) {
    const selectedIndexes = new Set(indexes);

    setForm((current) => ({
      ...current,
      rows: current.rows.map((row, rowIndex) =>
        selectedIndexes.has(rowIndex) ? { ...row, result: "" } : row,
      ),
    }));
  }

  function saveForm() {
    const unmarkedCount = form.rows.length - markedCount;
    if (unmarkedCount > 0) {
      showToast({
        title: "Eksik Değerlendirme Satırları",
        message: `${unmarkedCount} kazanıma henüz + veya - işareti konulmamış.`,
        tone: "info",
      });
    }

    startTransition(async () => {
      const result = await saveCourseEvaluationAction(form);
      setMessage(result.message);
      showToast({
        title: result.success ? "Kaba değerlendirme hazir" : "Kayıt tamamlanmadi",
        message: result.message,
        tone: result.success ? "success" : "error",
      });

      if (result.success && result.id) {
        if (!documentId) {
          router.push(`/panel/degerlendirmeler/kaba/${result.id}`);
          router.refresh();
          return;
        }

        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-6">
      <Card>
        <SectionHeading
          eyebrow="Değerlendirme"
          title={documentId ? "Kaba değerlendirmeyi düzenle" : "Yeni kaba değerlendirme oluştur"}
          description="Tek dersten ya da birden fazla dersten kaba değerlendirme alabilir, tum satirlari ayni formda doldurabilirsiniz."
        />

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Field label="Öğrenci">
            <input className={inputClassName()} value={studentName} readOnly />
          </Field>
          <Field label="Okul">
            <input className={inputClassName()} value={studentSchoolName ?? "-"} readOnly />
          </Field>
          <Field label="Degerlendiren">
            <input
              className={inputClassName()}
              value={form.evaluatorName ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, evaluatorName: event.target.value }))
              }
            />
          </Field>
          <Field label="Değerlendirme tarihi">
            <input
              className={inputClassName()}
              type="date"
              value={form.evaluationDate ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, evaluationDate: event.target.value }))
              }
            />
          </Field>
          <Field label="Belge basligi" className="md:col-span-2 xl:col-span-4">
            <input
              className={inputClassName()}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Ders seçimi</div>
              <div className="mt-1 text-sm text-neutral-400">
                Tek ders, birkac ders ya da tum dersler için ayni belgede kaba değerlendirme olusturun.
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => applyCourseSelection(allCourseIds)}
                disabled={allSelected}
              >
                Tum dersleri seç
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => applyCourseSelection([])}
                disabled={form.selectedCourseIds.length === 0}
              >
                Secimi temizle
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {courseOptions.map((course) => {
              const selected = form.selectedCourseIds.includes(course.courseId);
              return (
                <button
                  key={course.courseId}
                  type="button"
                  onClick={() => toggleCourse(course.courseId)}
                  className={cn(
                    "rounded-[var(--panel-radius-card)] border px-4 py-4 text-left transition",
                    selected
                      ? "border-white bg-white text-black"
                      : "border-white/10 bg-white/[0.02] text-white hover:border-white/20 hover:bg-white/[0.05]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-semibold">{course.courseName}</div>
                      <div className={cn("mt-2 text-sm", selected ? "text-black/65" : "text-neutral-400")}>
                        Bu dersi belgeye ekle
                      </div>
                    </div>
                    <div className={cn("rounded-full border p-2", selected ? "border-black/10 bg-black/5 text-black" : "border-white/10 bg-white/[0.03] text-neutral-300")}>
                      {selected ? <CheckSquare className="size-4" /> : <Square className="size-4" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-sm text-neutral-500">Secilen ders</div>
            <div className="mt-2 text-2xl font-semibold text-white">{form.selectedCourseIds.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
            <div className="text-sm text-neutral-500">Toplam satir</div>
            <div className="mt-2 text-2xl font-semibold text-white">{form.rows.length}</div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled={isPending || form.selectedCourseIds.length === 0 || form.rows.length === 0} onClick={saveForm}>
            {isPending
              ? "Kaydediliyor..."
              : documentId
                ? "Değerlendirmeyi Kaydet"
                : "Değerlendirme Oluştur"}
          </Button>

          {documentId ? (
            <Button
              variant="secondary"
              onClick={() => {
                const pdfWindow = window.open(
                  `/api/pdf/kaba-degerlendirme-formu/${documentId}`,
                  "_blank",
                  "noopener,noreferrer",
                );

                showToast({
                  title: pdfWindow ? "PDF hazir" : "PDF acilamadi",
                  message: pdfWindow
                    ? "Kaba değerlendirme PDF'i yeni sekmede acildi."
                    : "Tarayici yeni sekmeyi engelledi.",
                  tone: pdfWindow ? "success" : "error",
                });
              }}
            >
              <FileDown className="mr-2 size-4" />
              Çıktıyı Ac
            </Button>
          ) : null}
        </div>

        {message ? <div className="mt-4 text-sm text-neutral-400">{restoreTurkishText(message)}</div> : null}
      </Card>

      {form.rows.length === 0 ? (
        <Card>
          <div className="rounded-2xl border border-dashed border-white/10 px-5 py-12 text-sm text-neutral-500">
            Once en az bir ders seçin. Sectiginiz derslerin kaba değerlendirme satirlari tek tabloda
            otomatik acilacak.
          </div>
        </Card>
      ) : null}

      {courseGroups.map((course) => (
        <Card key={course.courseName}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Ders
              </div>
              <div className="mt-2 text-xl font-semibold text-white">{course.courseName}</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300">
              {course.units.reduce((sum, unit) => sum + unit.rows.length, 0)} satir
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {course.units.map((group) => (
              <div key={`${course.courseName}-${group.unitName}`} className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      Unite / Tema
                    </div>
                    <div className="mt-2 text-lg font-semibold text-white">{group.unitName}</div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300">
                      {group.rows.length} satir
                    </div>
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => setGroupResult(group.rows.map((row) => row.originalIndex), "+")}
                    >
                      Tamamini isaretle
                    </Button>
                    <Button
                      variant="ghost"
                      className="px-3 py-1.5 text-xs"
                      onClick={() => clearGroupResult(group.rows.map((row) => row.originalIndex))}
                    >
                      Isaretleri kaldir
                    </Button>
                  </div>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-white/[0.05] text-left text-neutral-300">
                        <th className="border border-white/10 px-3 py-3 font-semibold">Ogrenme alani</th>
                        <th className="border border-white/10 px-3 py-3 font-semibold">Ogrenme çıktısı</th>
                        <th className="border border-white/10 px-3 py-3 font-semibold">Surec bileseni</th>
                        <th className="border border-white/10 px-3 py-3 text-center font-semibold">+</th>
                        <th className="border border-white/10 px-3 py-3 text-center font-semibold">-</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((row) => (
                        <tr key={`${course.courseName}-${group.unitName}-${row.originalIndex}`} className="align-top">
                          <td className="border border-white/10 px-3 py-3 text-neutral-300">{row.learningArea}</td>
                          <td className="border border-white/10 px-3 py-3 text-neutral-200">{row.learningOutcome}</td>
                          <td className="border border-white/10 px-3 py-3 text-neutral-300">
                            {row.processComponent || row.learningOutcome}
                          </td>
                          <td className="border border-white/10 px-3 py-3 text-center">
                            <button
                              type="button"
                              className={cn(
                                "inline-flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition",
                                row.result === "+"
                                  ? "border-white bg-white text-black"
                                  : "border-white/10 bg-white/[0.03] text-neutral-200 hover:bg-white/10",
                              )}
                              onClick={() => setRowResult(row.originalIndex, "+")}
                            >
                              +
                            </button>
                          </td>
                          <td className="border border-white/10 px-3 py-3 text-center">
                            <button
                              type="button"
                              className={cn(
                                "inline-flex size-10 items-center justify-center rounded-full border text-sm font-semibold transition",
                                row.result === "-"
                                  ? "border-white bg-white text-black"
                                  : "border-white/10 bg-white/[0.03] text-neutral-200 hover:bg-white/10",
                              )}
                              onClick={() => setRowResult(row.originalIndex, "-")}
                            >
                              -
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}

      {form.rows.length > 0 ? (
        <div className="sticky bottom-4 z-10">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-black/90 px-5 py-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur">
            <div className="text-sm text-neutral-400">
              {selectedCourseNames.length > 0 ? restoreTurkishText(buildCourseEvaluationTitle(selectedCourseNames)) : "Ders secilmedi"}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    rows: current.rows.map((row) => ({ ...row, result: "" })),
                  }))
                }
              >
                Isaretleri Temizle
              </Button>
              <Button disabled={isPending || form.selectedCourseIds.length === 0} onClick={saveForm}>
                {documentId ? "Kaydet" : "Belgeyi Oluştur"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
