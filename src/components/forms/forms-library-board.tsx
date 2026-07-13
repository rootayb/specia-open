"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileDown, FileStack, GraduationCap, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import {
  buildInitialFormValues,
  FORM_TEMPLATES,
  getFormTemplate,
  type FormFieldDefinition,
  type FormTemplateContext,
  type FormTemplateSlug,
} from "@/lib/forms";

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
  classroom: string | null;
  schoolNumber: string | null;
  kademe: string | null;
  district: string | null;
  birthDate: string | null;
  diagnosis: string | null;
  placementDecision: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  developmentHistory: string | null;
  strengths: string | null;
  improvementAreas: string | null;
  behaviorNotes: string | null;
  bepStartDate: string | null;
  bepEndDate: string | null;
};

type Props = {
  students: StudentOption[];
  initialStudentId?: string;
  currentUserName: string;
  initialTemplateSlug?: FormTemplateSlug;
  mode?: "library" | "editor";
};

function buildTemplateContext(
  student: StudentOption | null,
  currentUserName: string,
): FormTemplateContext {
  return {
    currentUserName,
    student:
      student && {
        firstName: student.firstName,
        lastName: student.lastName,
        schoolName: student.schoolName,
        schoolNumber: student.schoolNumber,
        classroom: student.classroom,
        kademe: student.kademe,
        district: student.district,
        birthDate: student.birthDate,
        diagnosis: student.diagnosis,
        placementDecision: student.placementDecision,
        guardianName: student.guardianName,
        guardianPhone: student.guardianPhone,
        developmentHistory: student.developmentHistory,
        strengths: student.strengths,
        improvementAreas: student.improvementAreas,
        behaviorNotes: student.behaviorNotes,
        bepStartDate: student.bepStartDate,
        bepEndDate: student.bepEndDate,
      },
  };
}

function parseChecklistValue(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function updateChecklistValue(
  currentValue: string,
  optionValue: string,
  checked: boolean,
) {
  const currentItems = parseChecklistValue(currentValue);
  const nextItems = checked
    ? currentItems.includes(optionValue)
      ? currentItems
      : [...currentItems, optionValue]
    : currentItems.filter((item) => item !== optionValue);

  return nextItems.join("\n");
}

function checklistOptionsWithCustomValues(field: FormFieldDefinition, value: string) {
  const baseOptions = field.options ?? [];
  const baseValues = new Set(baseOptions.map((option) => option.value));
  const customOptions = parseChecklistValue(value)
    .filter((item) => !baseValues.has(item))
    .map((item) => ({ label: item, value: item, isCustom: true }));

  return [
    ...baseOptions.map((option) => ({ ...option, isCustom: false })),
    ...customOptions,
  ];
}

function checklistGridClass(field: FormFieldDefinition) {
  const columnCount = field.columns ?? 3;

  if (columnCount >= 4) {
    return "grid gap-3 sm:grid-cols-2 2xl:grid-cols-4";
  }

  if (columnCount === 2) {
    return "grid gap-3 md:grid-cols-2";
  }

  return "grid gap-3 sm:grid-cols-2 2xl:grid-cols-3";
}

export function FormsLibraryBoard({
  students,
  initialStudentId,
  currentUserName,
  initialTemplateSlug,
  mode = "library",
}: Props) {
  const defaultStudentId = initialStudentId ?? students[0]?.id ?? "";
  const [studentId, setStudentId] = useState(defaultStudentId);
  const activeTemplateSlug =
    initialTemplateSlug ?? FORM_TEMPLATES[0]?.slug ?? "pekistirec-belirleme-aile";
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [listInputs, setListInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? null,
    [studentId, students],
  );

  const activeTemplate = useMemo(() => getFormTemplate(activeTemplateSlug), [activeTemplateSlug]);

  const templateContext = useMemo(
    () => buildTemplateContext(selectedStudent, currentUserName),
    [currentUserName, selectedStudent],
  );

  const defaultValues = useMemo(() => {
    if (!activeTemplate) {
      return {};
    }

    return buildInitialFormValues(activeTemplate, templateContext);
  }, [activeTemplate, templateContext]);

  useEffect(() => {
    setDraftValues(defaultValues);
    setListInputs({});
    setFeedback("");
  }, [defaultValues]);

  function parseListValue(value: string) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function addListItem(fieldId: string, rawValue: string) {
    const nextItem = rawValue.trim();
    if (!nextItem) {
      return;
    }

    setDraftValues((current) => {
      const currentItems = parseListValue(current[fieldId] ?? "");
      if (currentItems.includes(nextItem)) {
        return current;
      }

      return {
        ...current,
        [fieldId]: [...currentItems, nextItem].join("\n"),
      };
    });

    setListInputs((current) => ({
      ...current,
      [fieldId]: "",
    }));
  }

  function removeListItem(fieldId: string, item: string) {
    setDraftValues((current) => ({
      ...current,
      [fieldId]: parseListValue(current[fieldId] ?? "")
        .filter((entry) => entry !== item)
        .join("\n"),
    }));
  }

  function addChecklistCustomOption(fieldId: string, rawValue: string) {
    const nextItem = rawValue.trim();
    if (!nextItem) {
      return;
    }

    setDraftValues((current) => {
      const currentItems = parseChecklistValue(current[fieldId] ?? "");
      if (currentItems.includes(nextItem)) {
        return current;
      }

      return {
        ...current,
        [fieldId]: [...currentItems, nextItem].join("\n"),
      };
    });

    setListInputs((current) => ({
      ...current,
      [fieldId]: "",
    }));
  }

  function removeChecklistCustomOption(fieldId: string, item: string) {
    setDraftValues((current) => ({
      ...current,
      [fieldId]: parseChecklistValue(current[fieldId] ?? "")
        .filter((entry) => entry !== item)
        .join("\n"),
    }));
  }

  async function handleDownloadPdf() {
    if (!activeTemplate) {
      return;
    }

    try {
      setIsDownloading(true);
      setFeedback("");

      const response = await fetch(`/api/pdf/formlar/${activeTemplate.slug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          studentId,
          values: draftValues,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "PDF olusturulamadi.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const popup = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = `${activeTemplate.slug}.pdf`;
        anchor.click();
      }

      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "PDF olusturulamadi.");
    } finally {
      setIsDownloading(false);
    }
  }

  function resetTemplateDefaults() {
    setDraftValues(defaultValues);
    setFeedback("");
  }

  if (students.length === 0) {
    return (
      <Card>
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--panel-text-soft)]">
            Formlar
          </div>
          <h1 className="text-3xl font-semibold text-[color:var(--panel-text)]">
            Form kütüphanesi henüz hazır değil
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[color:var(--panel-text-muted)]">
            PDF formu üretmek için önce erişiminiz olan en az bir öğrenci kaydı bulunmalı.
          </p>
          <Link href="/panel/ogrenciler">
            <Button>Öğrencileri Gör</Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <div className="grid gap-6">
      <Card className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Field label="Öğrenci">
          <select
            className={inputClassName()}
            value={studentId}
            onChange={(event) => setStudentId(event.target.value)}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
                {student.classroom ? ` / ${student.classroom}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">
            Seçili öğrenci
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-3 text-[color:var(--panel-text)]">
              <GraduationCap className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xl font-semibold text-[color:var(--panel-text)]">
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </div>
              <div className="mt-1 text-sm text-[color:var(--panel-text-muted)]">
                {selectedStudent?.schoolName || "Okul belirtilmedi"} · Sınıf:{" "}
                {selectedStudent?.classroom || "-"} · No: {selectedStudent?.schoolNumber || "-"}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {mode === "library" ? (
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 min-[1600px]:grid-cols-6">
          {FORM_TEMPLATES.map((template) => (
            <Link
              key={template.slug}
              href={`/panel/formlar/${template.slug}?studentId=${studentId}`}
              className="group block"
            >
              <Card
                padding="none"
                className="flex aspect-square flex-col items-center justify-center p-4 text-center gap-3 bg-[color:var(--panel-bg-soft)] transition hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)]"
              >
                <div className="rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-3 text-[color:var(--panel-text)] transition group-hover:scale-105">
                  <FileStack className="size-5" />
                </div>
                <div className="space-y-1.5 min-w-0 w-full">
                  <h2 className="text-[13px] font-semibold leading-snug text-[color:var(--panel-text)] line-clamp-2 px-1">
                    {template.title}
                  </h2>
                  <span className="inline-block rounded-full border border-[color:var(--panel-border)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[color:var(--panel-text-soft)]">
                    {template.category}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {activeTemplate && mode === "editor" ? (
        <Card variant="interactive" padding="lg" className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl space-y-2">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--panel-text-soft)]">
                Form Düzenleyici
              </div>
              <Link
                href={`/panel/formlar?studentId=${studentId}`}
                className="inline-flex items-center gap-2 text-sm text-[color:var(--panel-text-soft)] transition hover:text-[color:var(--panel-text)]"
              >
                Form listesine dön
              </Link>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[color:var(--panel-text)]">
                {activeTemplate.title}
              </h2>
              <p className="text-sm leading-7 text-[color:var(--panel-text-muted)]">
                {activeTemplate.intro || activeTemplate.description}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="ghost" onClick={resetTemplateDefaults}>
                <RotateCcw className="mr-2 size-4" />
                Varsayilanlari Yükle
              </Button>
              <Button disabled={isDownloading} onClick={handleDownloadPdf}>
                <FileDown className="mr-2 size-4" />
                {isDownloading ? "PDF Hazirlaniyor..." : "PDF Çıktısı Al"}
              </Button>
            </div>
          </div>

          <div className="grid gap-6">
            {activeTemplate.sections.map((section) => (
              <div
                key={section.id}
                className="rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]/78 p-5"
              >
                <div className="space-y-2">
                  <div className="text-xl font-semibold text-[color:var(--panel-text)]">{section.title}</div>
                  {section.description ? (
                    <div className="text-sm text-[color:var(--panel-text-muted)]">{section.description}</div>
                  ) : null}
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {section.fields.map((field) => (
                    <Field
                      key={field.id}
                      label={field.label}
                      className={
                        field.layout === "full" ||
                        field.type === "textarea" ||
                        field.type === "checklist" ||
                        field.type === "list"
                          ? "md:col-span-2"
                          : undefined
                      }
                    >
                      {field.type === "textarea" ? (
                        <textarea
                          className={`${inputClassName()} min-h-32`}
                          rows={field.rows ?? 4}
                          placeholder={field.placeholder}
                          value={draftValues[field.id] ?? ""}
                          onChange={(event) =>
                            setDraftValues((current) => ({
                              ...current,
                              [field.id]: event.target.value,
                            }))
                          }
                        />
                      ) : field.type === "select" ? (
                        <select
                          className={inputClassName()}
                          value={draftValues[field.id] ?? ""}
                          onChange={(event) =>
                            setDraftValues((current) => ({
                              ...current,
                              [field.id]: event.target.value,
                            }))
                          }
                        >
                          <option value="">Seçiniz</option>
                          {(field.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "checklist" ? (
                        <div className="space-y-4">
                          {field.allowCustomOptions ? (
                            <input
                              type="text"
                              className={inputClassName()}
                              placeholder={field.customEntryPlaceholder ?? "Yazin ve Enter'a basin."}
                              value={listInputs[field.id] ?? ""}
                              onChange={(event) =>
                                setListInputs((current) => ({
                                  ...current,
                                  [field.id]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key !== "Enter") {
                                  return;
                                }

                                event.preventDefault();
                                addChecklistCustomOption(field.id, listInputs[field.id] ?? "");
                              }}
                            />
                          ) : null}
                          <div
                            className={`rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/72 p-4 ${checklistGridClass(field)}`}
                          >
                            {checklistOptionsWithCustomValues(field, draftValues[field.id] ?? "").map((option) => {
                              const isChecked = parseChecklistValue(draftValues[field.id] ?? "").includes(
                                option.value,
                              );

                              return (
                                <label
                                  key={option.value}
                                  className="flex items-start gap-3 rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-3 py-3 text-sm text-[color:var(--panel-text)] transition hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)]"
                                  >
                                    <input
                                      type="checkbox"
                                    className="mt-0.5 size-4 rounded border-white/15 bg-transparent text-white"
                                    checked={isChecked}
                                    onChange={(event) =>
                                      setDraftValues((current) => ({
                                        ...current,
                                        [field.id]: updateChecklistValue(
                                          current[field.id] ?? "",
                                          option.value,
                                          event.target.checked,
                                        ),
                                      }))
                                    }
                                    />
                                    <span className="leading-6">{option.label}</span>
                                    {option.isCustom ? (
                                      <button
                                        type="button"
                                        className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[color:var(--panel-text-soft)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
                                        onClick={(event) => {
                                          event.preventDefault();
                                          removeChecklistCustomOption(field.id, option.value);
                                        }}
                                        aria-label={`${option.label} secenegini sil`}
                                      >
                                        <X className="size-3.5" />
                                      </button>
                                    ) : null}
                                  </label>
                              );
                            })}
                          </div>
                          <div className="text-xs text-[color:var(--panel-text-soft)]">
                            Seçilenler: {parseChecklistValue(draftValues[field.id] ?? "").length}
                          </div>
                        </div>
                      ) : field.type === "list" ? (
                        <div className="space-y-4">
                          <input
                            type="text"
                            className={inputClassName()}
                            placeholder={field.placeholder}
                            value={listInputs[field.id] ?? ""}
                            onChange={(event) =>
                              setListInputs((current) => ({
                                ...current,
                                [field.id]: event.target.value,
                              }))
                            }
                            onKeyDown={(event) => {
                              if (event.key !== "Enter") {
                                return;
                              }

                              event.preventDefault();
                              addListItem(field.id, listInputs[field.id] ?? "");
                            }}
                          />
                          <div className="rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/72 p-4">
                            {parseListValue(draftValues[field.id] ?? "").length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {parseListValue(draftValues[field.id] ?? "").map((item) => (
                                  <div
                                    key={`${field.id}-${item}`}
                                    className="inline-flex items-center gap-2 rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-3 py-2 text-sm text-[color:var(--panel-text)]"
                                  >
                                    <span>{item}</span>
                                    <button
                                      type="button"
                                      className="inline-flex size-5 items-center justify-center rounded-full text-[color:var(--panel-text-soft)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
                                      onClick={() => removeListItem(field.id, item)}
                                      aria-label={`${item} maddesini sil`}
                                    >
                                      <X className="size-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-sm text-[color:var(--panel-text-soft)]">
                                Henüz eklenmiş bir madde yok.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <input
                          type={field.type}
                          className={inputClassName()}
                          placeholder={field.placeholder}
                          value={draftValues[field.id] ?? ""}
                          onChange={(event) =>
                            setDraftValues((current) => ({
                              ...current,
                              [field.id]: event.target.value,
                            }))
                          }
                        />
                      )}
                    </Field>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {feedback ? <div className="text-sm text-rose-300">{feedback}</div> : null}
        </Card>
      ) : null}
    </div>
  );
}
