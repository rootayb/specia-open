"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Upload, Trash2 } from "lucide-react";

import { bulkImportStudentsAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { WorkspacePanel } from "@/components/ui/workspace-switcher";
import { emptyStudentValues } from "@/lib/defaults";
import type { StudentInput } from "@/lib/schemas";

type ParsedStudentRows = {
  rows: StudentInput[];
  issues: string[];
};

function looksLikeHeader(cells: string[]) {
  const joined = cells.join(" ").toLocaleLowerCase("tr-TR");
  return (
    joined.includes("ad") ||
    joined.includes("soyad") ||
    joined.includes("okul") ||
    joined.includes("sınıf") ||
    joined.includes("kademe")
  );
}

function splitStudentLine(line: string) {
  if (line.includes("\t")) {
    return line.split("\t");
  }

  if (line.includes(";")) {
    return line.split(";");
  }

  if (line.includes(",")) {
    return line.split(",");
  }

  return [line];
}

function buildStudentRow(cells: string[]) {
  const normalizedCells = cells.map((cell) => cell.trim());
  const hasValue = normalizedCells.some((cell) => cell.length > 0);
  if (!hasValue) {
    return null;
  }

  const nonCommentCells = normalizedCells.filter(Boolean);

  let firstName = "";
  let lastName = "";
  let classroom = "";
  let schoolName = "";
  let schoolNumber = "";
  let kademe = "";

  if (nonCommentCells.length === 1) {
    const parts = nonCommentCells[0].split(/\s+/).filter(Boolean);
    if (parts.length < 2) {
      return null;
    }

    firstName = parts.slice(0, -1).join(" ");
    lastName = parts.at(-1) ?? "";
  } else {
    firstName = normalizedCells[0] ?? "";
    lastName = normalizedCells[1] ?? "";
    classroom = normalizedCells[2] ?? "";
    schoolName = normalizedCells[3] ?? "";
    schoolNumber = normalizedCells[4] ?? "";
    kademe = normalizedCells[5] ?? "";
  }

  if (!firstName || !lastName) {
    return null;
  }

  return {
    ...emptyStudentValues(),
    firstName,
    lastName,
    classroom,
    schoolName,
    schoolNumber,
    kademe,
  } satisfies StudentInput;
}

function parseStudentRows(value: string): ParsedStudentRows {
  const rows: StudentInput[] = [];
  const issues: string[] = [];

  value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line, index) => {
      const cells = splitStudentLine(line).map((cell) => cell.trim());

      if (index === 0 && looksLikeHeader(cells)) {
        return;
      }

      const row = buildStudentRow(cells);
      if (!row) {
        issues.push(`${index + 1}. satır okunamadı.`);
        return;
      }

      rows.push(row);
    });

  return { rows, issues };
}

const sampleRows = `Mert Çakır
Elif Demir
Ayşe Kaya`;

export function BulkStudentImportBoard() {
  const { showToast } = useActionToast();
  const [sourceText, setSourceText] = useState("");
  const [studentRows, setStudentRows] = useState<StudentInput[]>([]);
  const [issues, setIssues] = useState<string[]>([]);
  
  const [sharedClassroom, setSharedClassroom] = useState("");
  const [sharedSchoolName, setSharedSchoolName] = useState("");
  const [sharedKademe, setSharedKademe] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isDragging, setIsDragging] = useState(false);

  const mergedRows = useMemo(
    () =>
      studentRows.map((row) => ({
        ...row,
        classroom: row.classroom || sharedClassroom,
        schoolName: row.schoolName || sharedSchoolName,
        kademe: row.kademe || sharedKademe,
      })),
    [studentRows, sharedClassroom, sharedSchoolName, sharedKademe],
  );

  const handleExcelUpload = async (file: File) => {
    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        const text = await file.text();
        setSourceText(text);
        const parsed = parseStudentRows(text);
        setStudentRows(parsed.rows);
        setIssues(parsed.issues);
      } else {
        const { readSheet } = await import("read-excel-file/browser");
        const rows = await readSheet(file);
        const text = rows
          .map((row) =>
            row
              .map((cell) => (cell instanceof Date ? cell.toISOString() : String(cell ?? "")))
              .join("\t"),
          )
          .join("\n");
        setSourceText(text);
        const parsed = parseStudentRows(text);
        setStudentRows(parsed.rows);
        setIssues(parsed.issues);
      }

      showToast({
        title: "Dosya başarıyla yüklendi",
        message: `${file.name} içeriği listeye aktarıldı.`,
        tone: "success",
      });
    } catch (error) {
      console.error("Excel import failed:", error);
      showToast({
        title: "Yükleme başarısız",
        message: "Dosya formatı okunamadı. Lütfen geçerli bir Excel veya CSV dosyası seçin.",
        tone: "error",
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      await handleExcelUpload(file);
    }
  };

  const deleteRow = (index: number) => {
    const updated = [...studentRows];
    updated.splice(index, 1);
    setStudentRows(updated);

    // Sync back to text
    const text = updated
      .map((row) => {
        const parts = [
          row.firstName,
          row.lastName,
          row.classroom,
          row.schoolName,
          row.schoolNumber,
          row.kademe,
        ].filter(Boolean);
        return parts.join("\t");
      })
      .join("\n");
    setSourceText(text);
  };

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-400">
              Toplu Öğrenci Ekleme
            </div>
            <h1 className="text-3xl font-semibold text-white">Excel veya metin listesiyle öğrenci ekleyin</h1>
            <p className="text-sm text-neutral-400">
              Her satıra bir öğrenci gelecek şekilde ad soyad yazabilir ya da Excel / CSV dosyanızı sürükleyip bırakabilirsiniz. 
              Sınıf, okul ve kademe gibi ortak bilgiler eksikse otomatik olarak uygulanır.
            </p>
          </div>

          <Link href="/panel/ogrenciler">
            <Button variant="ghost">
              <ArrowLeft className="size-4" />
              Öğrencilere dön
            </Button>
          </Link>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <WorkspacePanel
          eyebrow="Giriş Yöntemleri"
          title="İsim listesini yapıştırın veya dosya sürükleyin"
          description="Excel veya CSV dosyanızdaki sütunlar sırasıyla Ad, Soyad, Sınıf, Okul, No ve Kademe şeklinde olmalıdır."
        >
          <div className="grid gap-5">
            {/* Drag & Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center transition ${
                isDragging
                  ? "border-[color:var(--panel-border-strong)] bg-[color:var(--panel-bg-hover)]"
                  : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]"
              }`}
            >
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) await handleExcelUpload(file);
                  e.target.value = "";
                }}
                className="hidden"
                id="excel-file-upload"
              />
              <FileSpreadsheet className="mx-auto size-10 text-[color:var(--panel-text-soft)]" />
              <div className="mt-4 flex flex-col items-center gap-1.5 text-sm text-[color:var(--panel-text)]">
                <span className="font-semibold">Dosyayı buraya sürükleyin</span>
                <span className="text-xs text-[color:var(--panel-text-muted)]">veya bilgisayarınızdan seçin</span>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => document.getElementById("excel-file-upload")?.click()}
              >
                Dosya Seç
              </Button>
            </div>

            <Field label="Toplu öğrenci listesi (CSV formatı)">
              <textarea
                value={sourceText}
                onChange={(event) => {
                  const val = event.target.value;
                  setSourceText(val);
                  const parsed = parseStudentRows(val);
                  setStudentRows(parsed.rows);
                  setIssues(parsed.issues);
                }}
                className={`${inputClassName()} min-h-[220px]`}
                placeholder={`Örnek:
Mert Çakır
Elif Demir
Ayşe Kaya

Veya sütunlu Excel/CSV içeriği:
Ad;Soyad;Sınıf;Okul;Numara;Kademe`}
              />
            </Field>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSourceText(sampleRows);
                  const parsed = parseStudentRows(sampleRows);
                  setStudentRows(parsed.rows);
                  setIssues(parsed.issues);
                }}
              >
                Örnek listeyi doldur
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSourceText("");
                  setStudentRows([]);
                  setIssues([]);
                }}
              >
                Temizle
              </Button>
            </div>

            <div className="border-t border-[color:var(--panel-border)] pt-4">
              <h3 className="text-sm font-semibold text-[color:var(--panel-text)] mb-3">
                Varsayılan Ortak Değerler
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Sınıf (Tümü)">
                  <input
                    value={sharedClassroom}
                    onChange={(event) => setSharedClassroom(event.target.value)}
                    className={inputClassName()}
                    placeholder="Örnek: 5-A"
                  />
                </Field>
                <Field label="Okul (Tümü)">
                  <input
                    value={sharedSchoolName}
                    onChange={(event) => setSharedSchoolName(event.target.value)}
                    className={inputClassName()}
                    placeholder="Örnek: Atatürk Ortaokulu"
                  />
                </Field>
                <Field label="Kademe (Tümü)">
                  <input
                    value={sharedKademe}
                    onChange={(event) => setSharedKademe(event.target.value)}
                    className={inputClassName()}
                    placeholder="Örnek: 2. Kademe"
                  />
                </Field>
              </div>
            </div>

            {issues.length > 0 ? (
              <div className="rounded-[var(--panel-radius-card)] border border-amber-400/20 bg-amber-500/[0.08] px-4 py-3 text-sm text-amber-100">
                {issues.join(" ")}
              </div>
            ) : null}

            {feedback ? (
              <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-200">
                {feedback}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                disabled={isPending || mergedRows.length === 0}
                onClick={() => {
                  setFeedback("");
                  startTransition(async () => {
                    const result = await bulkImportStudentsAction({ rows: mergedRows });
                    setFeedback(result.message);
                    showToast({
                      title: result.success ? "Toplu ekleme tamamlandı" : "Toplu ekleme durdu",
                      message: result.message,
                      tone: result.success ? "success" : "error",
                    });

                    if (result.success) {
                      setSourceText("");
                      setStudentRows([]);
                      setIssues([]);
                      setSharedClassroom("");
                      setSharedSchoolName("");
                      setSharedKademe("");
                    }
                  });
                }}
              >
                <Upload className="size-4" />
                {isPending ? "Ekleniyor..." : "Toplu öğrenci ekle"}
              </Button>
            </div>
          </div>
        </WorkspacePanel>

        <div className="grid gap-6">
          <WorkspacePanel
            eyebrow="Önizleme"
            title={`Eklenmeye hazır satırlar (${mergedRows.length})`}
            description="Öğrencilerin son halini aşağıdan inceleyebilir, istemediklerinizi listeden çıkarabilirsiniz."
          >
            <div className="grid gap-3">
              <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] overflow-hidden">
                <div className="flex items-center gap-2 border-b border-[color:var(--panel-border)] px-4 py-3 text-sm font-semibold text-[color:var(--panel-text)]">
                  <FileSpreadsheet className="size-4" />
                  Öğrenci Listesi Önizleme
                </div>
                <div className="max-h-[500px] overflow-y-auto divide-y divide-[color:var(--panel-border)]">
                  {mergedRows.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-[color:var(--panel-text-muted)]">
                      Henüz okunabilen satır yok.
                    </div>
                  ) : (
                    mergedRows.map((row, index) => (
                      <div
                        key={`${row.firstName}-${row.lastName}-${index}`}
                        className="flex items-center justify-between gap-4 px-4 py-3 text-sm text-[color:var(--panel-text)] hover:bg-[color:var(--panel-bg-hover)]"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[color:var(--panel-text)]">
                            {row.firstName} {row.lastName}
                          </div>
                          <div className="mt-1 text-xs text-[color:var(--panel-text-muted)] flex flex-wrap gap-2">
                            <span>Sınıf: {row.classroom || "-"}</span>
                            <span>·</span>
                            <span>Okul: {row.schoolName || "-"}</span>
                            <span>·</span>
                            <span>No: {row.schoolNumber || "-"}</span>
                            <span>·</span>
                            <span>Kademe: {row.kademe || "-"}</span>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 text-[color:var(--panel-danger-text)] hover:bg-[color:var(--panel-danger-bg)] hover:text-white"
                          onClick={() => deleteRow(index)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </WorkspacePanel>
        </div>
      </div>
    </div>
  );
}
