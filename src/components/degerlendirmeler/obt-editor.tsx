"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  GripVertical,
} from "lucide-react";
import { saveEvaluationAction } from "@/app/degerlendirmeler-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";
import { parseProcessComponentSchedules } from "@/lib/process-component-schedules";

const PdfIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <rect x="7" y="11" width="10" height="6" rx="1.5" fill="#ef4444" stroke="#ef4444" strokeWidth="1" />
    <text
      x="12"
      y="14.2"
      fill="#ffffff"
      fontSize="4"
      fontWeight="900"
      textAnchor="middle"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="-0.03em"
      dominantBaseline="central"
      stroke="none"
    >
      PDF
    </text>
  </svg>
);

const DocxIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <rect x="7" y="11" width="10" height="6" rx="1.5" fill="#2563eb" stroke="#2563eb" strokeWidth="1" />
    <text
      x="12"
      y="14.2"
      fill="#ffffff"
      fontSize="3.5"
      fontWeight="900"
      textAnchor="middle"
      fontFamily="system-ui, -apple-system, sans-serif"
      letterSpacing="-0.03em"
      dominantBaseline="central"
      stroke="none"
    >
      DOCX
    </text>
  </svg>
);

type StudentData = {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
  schoolNumber: string | null;
};

type EvaluationDoc = {
  id?: string;
  studentId: string;
  title: string;
  type: string;
  kazanim: string | null;
  evaluationType: string | null;
  evaluationDate: string | Date | null;
  evaluatorName?: string | null;
  data: unknown;
  student: StudentData;
};

type LessonData = {
  tarih: string;
  b: boolean;
  i: boolean;
  m: boolean;
  f: boolean;
};

type ObtRow = {
  id: string;
  bildirim: string;
  olcut: string;
  yonerge: string;
  bd1: string;
  bd2: string;
  bd3: string;
  dersler: LessonData[];
  isHeader?: boolean;
};

type ObtTextField = "bildirim" | "olcut" | "yonerge" | "bd1" | "bd2" | "bd3";

type StoredObtRow = Partial<Omit<ObtRow, "dersler">> & {
  dersler?: Array<Partial<LessonData>>;
  isHeader?: boolean;
};

function parseRows(data: unknown): ObtRow[] {
  if (!Array.isArray(data)) return [];

  return data.map((value, rowIndex) => {
    const row =
      value && typeof value === "object" ? (value as StoredObtRow) : {};

    return {
      id: typeof row.id === "string" && row.id ? row.id : `row-${rowIndex}`,
      bildirim: typeof row.bildirim === "string" ? row.bildirim : "",
      olcut: typeof row.olcut === "string" ? row.olcut : "",
      yonerge: typeof row.yonerge === "string" ? row.yonerge : "",
      bd1: typeof row.bd1 === "string" ? row.bd1 : "",
      bd2: typeof row.bd2 === "string" ? row.bd2 : "",
      bd3: typeof row.bd3 === "string" ? row.bd3 : "",
      dersler: Array.isArray(row.dersler)
        ? row.dersler.map((lesson) => ({
            tarih: typeof lesson.tarih === "string" ? lesson.tarih : "",
            b: Boolean(lesson.b),
            i: Boolean(lesson.i),
            m: Boolean(lesson.m),
            f: Boolean(lesson.f),
          }))
        : Array.from({ length: 5 }, () => ({
            tarih: "",
            b: false,
            i: false,
            m: false,
            f: false,
          })),
      isHeader: Boolean(row.isHeader),
    };
  });
}

function createEmptyRow(lessonCount: number = 5): ObtRow {
  return {
    id: Math.random().toString(36).substring(2, 9),
    bildirim: "",
    olcut: "",
    yonerge: "",
    bd1: "",
    bd2: "",
    bd3: "",
    dersler: Array.from({ length: lessonCount }, () => ({
      tarih: "",
      b: false,
      i: false,
      m: false,
      f: false,
    })),
  };
}

export type BepPlanRowData = {
  id: string;
  courseName: string;
  learningArea: string;
  learningOutcome: string;
  processComponents: unknown;
  criterion: string | null;
};

export type BepDocumentData = {
  id: string;
  title: string;
  planRows: BepPlanRowData[];
};

export function ObtEditor({
  document,
  isParent = false,
  bepDocuments = [],
}: {
  document: EvaluationDoc;
  isParent?: boolean;
  bepDocuments?: BepDocumentData[];
}) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [isPending, startTransition] = useTransition();

  const [showBepPanel, setShowBepPanel] = useState(false);
  const [selectedBepId, setSelectedBepId] = useState<string>("");
  const [bepSearch, setBepSearch] = useState<string>("");
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isParent) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index.toString());
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isParent) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    setRows((prev) => {
      const list = [...prev];
      const temp = list[draggedIndex];
      if (temp) {
        list.splice(draggedIndex, 1);
        list.splice(index, 0, temp);
      }
      return list;
    });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  useEffect(() => {
    if (bepDocuments && bepDocuments.length === 1 && bepDocuments[0]) {
      setSelectedBepId(bepDocuments[0].id);
    }
  }, [bepDocuments]);

  // Core metadata state
  const [title, setTitle] = useState(document.title || "Ölçüt Bağımlı Ölçü Aracı");
  const [kazanim, setKazanim] = useState(document.kazanim || "");
  const [evaluationType] = useState(document.evaluationType || "ÖBT");
  const [evaluatorName, setEvaluatorName] = useState(document.evaluatorName || "");
  
  // Format initial evaluation date
  const initialDateStr = document.evaluationDate
    ? new Date(document.evaluationDate).toISOString().split("T")[0]
    : "";
  const [evaluationDate, setEvaluationDate] = useState(initialDateStr || "");

  // Tabular grid data state
  const [rows, setRows] = useState<ObtRow[]>(() => {
    const parsedRows = parseRows(document.data);
    return parsedRows.length > 0 ? parsedRows : [];
  });

  // Derive current lesson count
  const lessonCount = rows[0]?.dersler?.length || 5;

  const handleLessonCountChange = (newCount: number) => {
    if (isParent) return;
    if (newCount < 1 || newCount > 10) return;

    setRows((prev) =>
      prev.map((row) => {
        const currentDersler = [...row.dersler];
        let newDersler: LessonData[];

        if (newCount > currentDersler.length) {
          newDersler = [
            ...currentDersler,
            ...Array.from({ length: newCount - currentDersler.length }, () => ({
              tarih: "",
              b: false,
              i: false,
              m: false,
              f: false,
            })),
          ];
        } else {
          newDersler = currentDersler.slice(0, newCount);
        }

        return { ...row, dersler: newDersler };
      })
    );
  };

  // Derive lesson dates from first row to display in header
  const getLessonDate = (lessonIndex: number) => {
    return rows[0]?.dersler[lessonIndex]?.tarih || "";
  };

  // Update dates for all rows when a lesson date header changes
  const handleLessonDateChange = (lessonIndex: number, dateValue: string) => {
    setRows((prev) =>
      prev.map((row) => {
        const newDersler = [...row.dersler];
        if (newDersler[lessonIndex]) {
          newDersler[lessonIndex] = {
            ...newDersler[lessonIndex]!,
            tarih: dateValue,
          };
        }
        return { ...row, dersler: newDersler };
      })
    );
  };

  // Handle cell edit
  const handleCellChange = (rowIndex: number, field: ObtTextField, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      if (copy[rowIndex]) {
        copy[rowIndex] = { ...copy[rowIndex]!, [field]: value };
      }
      return copy;
    });
  };

  // Handle lesson checkbox/toggle
  const handleDersToggle = (
    rowIndex: number,
    lessonIndex: number,
    subField: "b" | "i" | "m" | "f"
  ) => {
    if (isParent) return;
    setRows((prev) => {
      const copy = [...prev];
      const row = copy[rowIndex];
      if (row && row.dersler[lessonIndex]) {
        const ders = { ...row.dersler[lessonIndex]! };
        ders[subField] = !ders[subField];
        
        const newDersler = [...row.dersler];
        newDersler[lessonIndex] = ders;
        copy[rowIndex] = { ...row, dersler: newDersler };
      }
      return copy;
    });
  };

  const addGoalToRows = (label: string, criterion: string | null) => {
    const newRow: ObtRow = {
      id: Math.random().toString(36).substring(2, 9),
      bildirim: label,
      olcut: criterion || "4/5",
      yonerge: "",
      bd1: "",
      bd2: "",
      bd3: "",
      dersler: Array.from({ length: lessonCount }, () => ({
        tarih: "",
        b: false,
        i: false,
        m: false,
        f: false,
      })),
      isHeader: false,
    };

    for (let i = 0; i < lessonCount; i++) {
      if (newRow.dersler[i]) {
        newRow.dersler[i]!.tarih = getLessonDate(i);
      }
    }
    return newRow;
  };

  const handleAppendSubGoal = (label: string, criterion: string | null, parentOutcome: string) => {
    setRows((prev) => {
      const isFirstRowEmpty =
        prev.length === 1 &&
        !prev[0].bildirim.trim() &&
        !prev[0].yonerge.trim() &&
        !prev[0].bd1 &&
        !prev[0].bd2 &&
        !prev[0].bd3 &&
        !prev[0].isHeader;

      const baseList = isFirstRowEmpty ? [] : prev;

      const headerIndex = baseList.findIndex((r) => r.isHeader && r.bildirim === parentOutcome);
      const newSubGoalRow = addGoalToRows(label, criterion);

      if (headerIndex !== -1) {
        // Header already exists. Find the next header index after headerIndex
        let insertIndex = -1;
        for (let i = headerIndex + 1; i < baseList.length; i++) {
          if (baseList[i].isHeader) {
            insertIndex = i;
            break;
          }
        }

        const list = [...baseList];
        if (insertIndex !== -1) {
          list.splice(insertIndex, 0, newSubGoalRow);
        } else {
          list.push(newSubGoalRow);
        }
        return list;
      } else {
        // Header doesn't exist. Add new header and new sub-goal row at the end
        const newHeaderRow: ObtRow = {
          id: `header-${Math.random().toString(36).substring(2, 9)}`,
          bildirim: parentOutcome,
          olcut: "",
          yonerge: "",
          bd1: "",
          bd2: "",
          bd3: "",
          dersler: Array.from({ length: lessonCount }, () => ({
            tarih: "",
            b: false,
            i: false,
            m: false,
            f: false,
          })),
          isHeader: true,
        };

        for (let i = 0; i < lessonCount; i++) {
          if (newHeaderRow.dersler[i]) {
            newHeaderRow.dersler[i]!.tarih = getLessonDate(i);
          }
        }
        return [...baseList, newHeaderRow, newSubGoalRow];
      }
    });
  };



  // Add row
  const handleAddRow = () => {
    // Preserve current dates when adding a row
    const newRow = createEmptyRow(lessonCount);
    for (let i = 0; i < lessonCount; i++) {
      if (newRow.dersler[i]) {
        newRow.dersler[i]!.tarih = getLessonDate(i);
      }
    }
    setRows((prev) => [...prev, newRow]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      alert("En az bir satır bulunmalıdır.");
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // Save document
  const handleSave = () => {
    startTransition(async () => {
      const payload = {
        id: document.id,
        studentId: document.studentId,
        title,
        type: "obt",
        kazanim,
        evaluationType,
        evaluationDate: evaluationDate || null,
        evaluatorName,
        data: rows,
      };

      const result = await saveEvaluationAction(payload);
      showResult(result, {
        successTitle: "Değerlendirme kaydedildi",
        errorTitle: "Hata oluştu",
      });

      if (result.success) {
        if (!document.id && result.id) {
          router.push(`/panel/degerlendirmeler/ogretim-sonu/${result.id}`);
        } else {
          router.refresh();
        }
      }
    });
  };

  return (
    <div className="grid gap-6">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/panel/degerlendirmeler/ogretim-sonu">
            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl" title="Değerlendirmelere Geri Dön">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-white">
              {document.id ? "Değerlendirme Düzenle" : "Yeni Değerlendirme"}
            </h1>
            <p className="text-xs text-neutral-400">
              {document.student.firstName} {document.student.lastName} için ÖBT Tablosu
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isParent && (
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="h-10 px-4 flex items-center gap-2"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Kaydet
            </Button>
          )}

          {document.id && (
            <>
              <a href={`/api/pdf/degerlendirmeler/${document.id}`} target="_blank" rel="noreferrer">
                <Button
                  variant="secondary"
                  className="h-10 px-4 flex items-center gap-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:text-red-300 transition-colors"
                  title="PDF Çıktısı Al"
                >
                  <PdfIcon className="h-5 w-5" />
                  <span>PDF İndir</span>
                </Button>
              </a>
              <a href={`/api/docx/degerlendirmeler/${document.id}`}>
                <Button
                  variant="secondary"
                  className="h-10 px-4 flex items-center gap-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 hover:text-blue-300 transition-colors"
                  title="Word Çıktısı Al"
                >
                  <DocxIcon className="h-5 w-5" />
                  <span>Word İndir</span>
                </Button>
              </a>
            </>
          )}
        </div>
      </div>

      {/* Metadata Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Öğrenci</label>
          <input
            type="text"
            readOnly
            disabled
            value={`${document.student.firstName} ${document.student.lastName}`}
            className={`${inputClassName()} opacity-70 cursor-not-allowed`}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Rapor Başlığı</label>
          <input
            type="text"
            readOnly={isParent}
            disabled={isParent}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık girin..."
            className={inputClassName()}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Değerlendirme Tarihi</label>
          <input
            type="date"
            readOnly={isParent}
            disabled={isParent}
            value={evaluationDate}
            onChange={(e) => setEvaluationDate(e.target.value)}
            className={inputClassName()}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Değerlendirmeyi Yapan</label>
          <input
            type="text"
            readOnly={isParent}
            disabled={isParent}
            value={evaluatorName}
            onChange={(e) => setEvaluatorName(e.target.value)}
            placeholder="Değerlendirmeyi yapan kişi..."
            className={inputClassName()}
          />
        </div>
      </div>

      {/* BEP Entegrasyonu */}
      {!isParent && bepDocuments && bepDocuments.length > 0 && (
        <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.01] overflow-hidden">
          {/* Header */}
          <button
            type="button"
            onClick={() => setShowBepPanel(!showBepPanel)}
            className="w-full flex items-center justify-between p-4 text-left transition hover:bg-emerald-500/[0.03]"
          >
            <div className="flex items-center gap-2.5 text-emerald-400">
              <Sparkles className="size-4 shrink-0" />
              <div>
                <h3 className="text-sm font-semibold leading-none text-white">
                  Öğrencinin BEP Amaçlarını Kullan
                </h3>
                <p className="mt-1 text-[11px] text-neutral-400">
                  Öğrencinin BEP belgesindeki hedefleri otomatik veya manuel olarak tabloya aktarın.
                </p>
              </div>
            </div>
            <div className="text-neutral-400">
              {showBepPanel ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </div>
          </button>

          {/* Panel Content */}
          {showBepPanel && (
            <div className="border-t border-white/5 p-4 space-y-4">
              {/* Select active BEP */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                <div className="flex-1 max-w-md">
                  <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                    Aktarılacak BEP Belgesi
                  </label>
                  <select
                    value={selectedBepId}
                    onChange={(e) => setSelectedBepId(e.target.value)}
                    className={`${inputClassName()} h-9 min-h-[36px] py-1.5 text-xs cursor-pointer bg-neutral-900`}
                  >
                    <option value="">-- BEP Seçin --</option>
                    {bepDocuments.map((bep) => (
                      <option key={bep.id} value={bep.id}>
                        {bep.title}
                      </option>
                    ))}
                  </select>
                </div>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        if (confirm("Tüm değerlendirme satırları ve kazanım bilgisi temizlenecektir. Devam etmek istiyor musunuz?")) {
                          setRows([]);
                          setKazanim("");
                        }
                      }}
                      className="text-xs bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 h-9 px-3"
                    >
                      <Trash2 className="size-3.5 mr-1" />
                      Tümünü Temizle
                    </Button>
              </div>

              {/* Goals list */}
              {selectedBepId ? (
                (() => {
                  const bep = bepDocuments.find((b) => b.id === selectedBepId);
                  if (!bep || bep.planRows.length === 0) {
                    return (
                      <div className="text-xs text-neutral-500 p-4 text-center">
                        Bu BEP belgesinde kayıtlı amaç bulunmamaktadır.
                      </div>
                    );
                  }

                  const filteredRows = bep.planRows.filter((row) => {
                    const matchesOutcome = row.learningOutcome.toLowerCase().includes(bepSearch.toLowerCase());
                    const components = parseProcessComponentSchedules(row.processComponents);
                    const matchesComponent = components.some(c => c.label.toLowerCase().includes(bepSearch.toLowerCase()));
                    const matchesCourse = row.courseName.toLowerCase().includes(bepSearch.toLowerCase());
                    return matchesOutcome || matchesComponent || matchesCourse;
                  });

                  // Group by course
                  const grouped: Record<string, BepPlanRowData[]> = {};
                  filteredRows.forEach((row) => {
                    if (!grouped[row.courseName]) {
                      grouped[row.courseName] = [];
                    }
                    grouped[row.courseName].push(row);
                  });

                  return (
                    <div className="space-y-4">
                      {/* Search Bar */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-500" />
                        <input
                          type="text"
                          placeholder="BEP amaçlarında veya alt amaçlarda arayın..."
                          value={bepSearch}
                          onChange={(e) => setBepSearch(e.target.value)}
                          className="h-9 w-full rounded-xl border border-white/5 bg-black/20 pl-9 pr-3 text-xs text-white placeholder-neutral-500 outline-none focus:border-white/10 focus:bg-black/30 transition-all"
                        />
                      </div>

                      {filteredRows.length === 0 ? (
                        <div className="text-xs text-neutral-500 p-6 text-center bg-white/[0.01] rounded-xl border border-white/5">
                          Aranan kritere uygun amaç bulunamadı.
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin">
                          {Object.entries(grouped).map(([courseName, rowsList]) => {
                            const isExpanded = !!expandedCourses[courseName];
                            return (
                              <div key={courseName} className="space-y-2">
                                <button
                                  type="button"
                                  onClick={() => setExpandedCourses((prev) => ({ ...prev, [courseName]: !isExpanded }))}
                                  className="w-full flex items-center justify-between text-left text-xs font-bold text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 px-3 py-2.5 rounded-xl border border-emerald-500/10 transition-all cursor-pointer select-none"
                                >
                                  <span>{courseName} ({rowsList.length} Amaç)</span>
                                  {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                                </button>

                                {isExpanded && (
                                  <div className="grid gap-2 pl-2 mt-2 border-l border-emerald-500/10 transition-all duration-300">
                                    {rowsList.map((row) => {
                                      const components = parseProcessComponentSchedules(row.processComponents);

                                      return (
                                        <div
                                          key={row.id}
                                          className="p-3 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.02] flex flex-col md:flex-row md:items-start justify-between gap-3 text-xs transition-colors"
                                        >
                                          <div className="flex-1 space-y-1.5">
                                            <div className="font-semibold text-white">
                                              {row.learningOutcome}
                                              {row.criterion && (
                                                <span className="ml-2 px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-neutral-400 font-normal">
                                                  Ölçüt: {row.criterion}
                                                </span>
                                              )}
                                            </div>

                                            {/* Subgoals (process components) */}
                                            {components.length > 0 && (
                                              <div className="pl-3 border-l border-white/5 space-y-2 mt-2 text-neutral-400">
                                                {components.map((comp, idx) => {
                                                  const isCompAdded = rows.some((r) => r.bildirim === comp.label);

                                                  return (
                                                    <div key={idx} className="flex items-center justify-between gap-2">
                                                      <span className="leading-relaxed">• {comp.label}</span>
                                                      {isCompAdded ? (
                                                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium inline-flex items-center gap-0.5 cursor-default shrink-0">
                                                          <Check className="size-2.5" />
                                                          Eklendi
                                                        </span>
                                                      ) : (
                                                        <button
                                                          type="button"
                                                          onClick={() => handleAppendSubGoal(comp.label, row.criterion, row.learningOutcome)}
                                                          className="text-[10px] text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold hover:underline transition-all active:scale-95 inline-flex items-center shrink-0 cursor-pointer"
                                                        >
                                                          + Satır Ekle
                                                        </button>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>

                                          <div className="flex shrink-0 gap-1.5 items-start self-end md:self-start">
                                            {components.length > 0 && (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => {
                                                  components.forEach((c) => {
                                                    if (!rows.some((r) => r.bildirim === c.label)) {
                                                      handleAppendSubGoal(c.label, row.criterion, row.learningOutcome);
                                                    }
                                                  });
                                                }}
                                                className="h-7 text-[10px] px-2 text-neutral-400 hover:text-white cursor-pointer"
                                              >
                                                Tüm Alt Basamakları Ekle
                                              </Button>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs text-neutral-500 py-6 text-center">
                  Yukarıdan bir BEP belgesi seçerek amaçları görüntüleyebilirsiniz.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lesson Dates Panel */}
      {!isParent && (
        <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-4 grid gap-4 sm:grid-cols-[160px_1fr] items-end">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 mb-1.5">
              Ders Sayısı
            </label>
            <select
              value={lessonCount}
              onChange={(e) => handleLessonCountChange(Number(e.target.value))}
              className={`${inputClassName()} h-9 min-h-[36px] py-1.5 text-xs cursor-pointer`}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} Ders
                </option>
              ))}
            </select>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {Array.from({ length: lessonCount }).map((_, i) => (
              <div key={i}>
                <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                  {i + 1}. Ders Tarihi
                </label>
                <input
                  type="date"
                  value={getLessonDate(i)}
                  onChange={(e) => handleLessonDateChange(i, e.target.value)}
                  className="h-9 w-full rounded-xl border border-white/10 bg-black/20 px-3 text-xs text-white outline-none focus:border-white/20"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grid Table Container */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs text-white">
            <thead>
              {/* Level 1 Headers */}
              <tr className="bg-white/[0.03] border-b border-white/10 text-center font-bold">
                <th colSpan={isParent ? 3 : 4} className="p-3 border-r border-white/10">
                  Genel Bilgiler
                </th>
                <th colSpan={3} className="p-3 border-r border-white/10 text-emerald-400">
                  Öğretim Öncesi Değerlendirme
                </th>
                <th colSpan={lessonCount * 4} className="p-3 text-indigo-400">
                  Öğretim Sürecini Değerlendirme
                </th>
              </tr>
              {/* Level 2 Headers */}
              <tr className="bg-white/[0.02] border-b border-white/10 text-center font-semibold text-[11px]">
                {!isParent && <th className="p-2 w-10 border-r border-white/10"></th>}
                <th className="p-2 w-12 border-r border-white/10">Sıra</th>
                <th className="p-2 min-w-[200px] border-r border-white/10 text-left">Bildirimler</th>
                <th className="p-2 w-16 border-r border-white/10">Ölçüt</th>
                <th className="p-2 min-w-[200px] border-r border-white/10 text-left">Sorular/Yönergeler</th>
                
                <th className="p-2 w-16 border-r border-white/5 text-emerald-500/80">BD 1</th>
                <th className="p-2 w-16 border-r border-white/5 text-emerald-500/80">BD 2</th>
                <th className="p-2 w-16 border-r border-white/10 text-emerald-500/80">BD 3</th>
                
                {Array.from({ length: lessonCount }).map((_, i) => (
                  <th key={i} colSpan={4} className={`p-2 border-r border-white/10 ${i % 2 === 0 ? "bg-white/[0.01]" : ""}`}>
                    <div>{i + 1}. Ders</div>
                    <div className="text-[9px] font-normal text-neutral-400">
                      {getLessonDate(i)
                        ? new Intl.DateTimeFormat("tr-TR", { month: "short", day: "numeric" }).format(
                            new Date(getLessonDate(i))
                          )
                        : "Tarih Yok"}
                    </div>
                  </th>
                ))}
              </tr>
              {/* Level 3 subheaders (B, I, M, F repeated) */}
              <tr className="bg-white/[0.01] border-b border-white/10 text-center text-[10px] text-neutral-400 font-medium">
                {!isParent && <th className="p-1 border-r border-white/10"></th>}
                <th className="p-1 border-r border-white/10"></th>
                <th className="p-1 border-r border-white/10"></th>
                <th className="p-1 border-r border-white/10"></th>
                <th className="p-1 border-r border-white/10"></th>
                
                <th className="p-1 border-r border-white/5">(+ / -)</th>
                <th className="p-1 border-r border-white/5">(+ / -)</th>
                <th className="p-1 border-r border-white/10">(+ / -)</th>
                
                {Array.from({ length: lessonCount }).map((_, i) => (
                  <tr key={i} className="contents">
                    <th className="p-1 font-semibold text-neutral-300">B</th>
                    <th className="p-1 font-semibold text-neutral-300">İ</th>
                    <th className="p-1 font-semibold text-neutral-300">M</th>
                    <th className="p-1 border-r border-white/10 font-semibold text-neutral-300">F</th>
                  </tr>
                ))}
              </tr>
            </thead>
            <tbody>
              {(() => {
                let visualIndex = 0;
                return rows.map((row, rowIndex) => {
                  if (row.isHeader) {
                    return (
                      <tr
                        key={row.id}
                        draggable={!isParent}
                        onDragStart={(e) => handleDragStart(e, rowIndex)}
                        onDragOver={(e) => handleDragOver(e, rowIndex)}
                        onDragEnd={handleDragEnd}
                        className={`border-b border-white/10 bg-white/[0.03] hover:bg-white/[0.04] transition-all duration-150 ${
                          draggedIndex === rowIndex ? "opacity-30 bg-white/[0.05]" : ""
                        }`}
                      >
                        {!isParent && (
                          <td className="p-2 text-center border-r border-white/10">
                            <div className="flex items-center justify-center gap-1.5">
                              <span
                                className="cursor-grab text-neutral-500 hover:text-neutral-300 transition active:cursor-grabbing"
                                title="Sürükle ve Taşı"
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveRow(rowIndex)}
                                className="text-neutral-500 hover:text-red-400 transition"
                                title="Başlık Sil"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        )}
                        <td colSpan={7 + lessonCount * 4} className="p-3 font-bold text-white text-sm">
                          <textarea
                            value={row.bildirim}
                            readOnly={isParent}
                            disabled={isParent}
                            onChange={(e) => handleCellChange(rowIndex, "bildirim", e.target.value)}
                            placeholder="Ana Kazanım Başlığı..."
                            rows={1}
                            className="w-full bg-transparent outline-none resize-none p-1 font-bold text-white border border-transparent focus:border-white/10 focus:bg-black/10 rounded-lg placeholder-neutral-500 transition"
                          />
                        </td>
                      </tr>
                    );
                  }

                  visualIndex++;
                  return (
                    <tr
                      key={row.id}
                      draggable={!isParent}
                      onDragStart={(e) => handleDragStart(e, rowIndex)}
                      onDragOver={(e) => handleDragOver(e, rowIndex)}
                      onDragEnd={handleDragEnd}
                      className={`border-b border-white/5 hover:bg-white/[0.01] transition-all duration-150 ${
                        draggedIndex === rowIndex ? "opacity-30 bg-white/[0.05]" : ""
                      }`}
                    >
                      {/* Actions column */}
                      {!isParent && (
                        <td className="p-2 text-center border-r border-white/10">
                          <div className="flex items-center justify-center gap-1.5">
                            <span
                              className="cursor-grab text-neutral-500 hover:text-neutral-300 transition active:cursor-grabbing"
                              title="Sürükle ve Taşı"
                            >
                              <GripVertical className="h-4 w-4" />
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(rowIndex)}
                              className="text-neutral-500 hover:text-red-400 transition"
                              title="Satır Sil"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      )}
                      {/* Index */}
                      <td className="p-2 text-center text-neutral-400 font-semibold border-r border-white/10">
                        {visualIndex}
                      </td>
                      {/* Bildirim */}
                      <td className="p-2 border-r border-white/10">
                        <textarea
                          value={row.bildirim}
                          readOnly={isParent}
                          disabled={isParent}
                          onChange={(e) => handleCellChange(rowIndex, "bildirim", e.target.value)}
                          placeholder="Bildirim girin..."
                          rows={2}
                          className="w-full bg-transparent outline-none resize-none p-1 text-white border border-transparent focus:border-white/10 focus:bg-black/10 rounded-lg placeholder-neutral-600 transition"
                        />
                      </td>
                      {/* Ölçüt */}
                      <td className="p-2 text-center border-r border-white/10">
                        <input
                          type="text"
                          value={row.olcut}
                          readOnly={isParent}
                          disabled={isParent}
                          onChange={(e) => handleCellChange(rowIndex, "olcut", e.target.value)}
                          placeholder="Örn: 4/5"
                          className="w-full bg-transparent text-center outline-none p-1 text-white border border-transparent focus:border-white/10 focus:bg-black/10 rounded-lg placeholder-neutral-600 transition"
                        />
                      </td>
                      {/* Yönerge */}
                      <td className="p-2 border-r border-white/10">
                        <textarea
                          value={row.yonerge}
                          readOnly={isParent}
                          disabled={isParent}
                          onChange={(e) => handleCellChange(rowIndex, "yonerge", e.target.value)}
                          placeholder="Yönerge/soru girin..."
                          rows={2}
                          className="w-full bg-transparent outline-none resize-none p-1 text-white border border-transparent focus:border-white/10 focus:bg-black/10 rounded-lg placeholder-neutral-600 transition"
                        />
                      </td>

                      {/* BD 1 */}
                      <td className="p-1 text-center border-r border-white/5">
                        <select
                          value={row.bd1}
                          disabled={isParent}
                          onChange={(e) => handleCellChange(rowIndex, "bd1", e.target.value)}
                          className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white outline-none cursor-pointer focus:border-white/20"
                        >
                          <option value="">Boş</option>
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                      </td>
                      {/* BD 2 */}
                      <td className="p-1 text-center border-r border-white/5">
                        <select
                          value={row.bd2}
                          disabled={isParent}
                          onChange={(e) => handleCellChange(rowIndex, "bd2", e.target.value)}
                          className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white outline-none cursor-pointer focus:border-white/20"
                        >
                          <option value="">Boş</option>
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                      </td>
                      {/* BD 3 */}
                      <td className="p-1 text-center border-r border-white/10">
                        <select
                          value={row.bd3}
                          disabled={isParent}
                          onChange={(e) => handleCellChange(rowIndex, "bd3", e.target.value)}
                          className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-xs text-white outline-none cursor-pointer focus:border-white/20"
                        >
                          <option value="">Boş</option>
                          <option value="+">+</option>
                          <option value="-">-</option>
                        </select>
                      </td>

                      {/* Lessons B, I, M, F checkboxes */}
                      {Array.from({ length: lessonCount }).map((_, lessonIndex) => {
                        const ders = row.dersler[lessonIndex] || { b: false, i: false, m: false, f: false };
                        return (
                          <tr key={lessonIndex} className="contents">
                            {/* B */}
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                disabled={isParent}
                                onClick={() => handleDersToggle(rowIndex, lessonIndex, "b")}
                                className={`size-6 rounded-md flex items-center justify-center font-bold transition-all border ${
                                  ders.b
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                    : "bg-white/[0.02] text-neutral-600 border-white/5 hover:border-white/10"
                                }`}
                              >
                                {ders.b ? "✓" : ""}
                              </button>
                            </td>
                            {/* I */}
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                disabled={isParent}
                                onClick={() => handleDersToggle(rowIndex, lessonIndex, "i")}
                                className={`size-6 rounded-md flex items-center justify-center font-bold transition-all border ${
                                  ders.i
                                    ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.15)]"
                                    : "bg-white/[0.02] text-neutral-600 border-white/5 hover:border-white/10"
                                }`}
                              >
                                {ders.i ? "✓" : ""}
                              </button>
                            </td>
                            {/* M */}
                            <td className="p-1 text-center">
                              <button
                                type="button"
                                disabled={isParent}
                                onClick={() => handleDersToggle(rowIndex, lessonIndex, "m")}
                                className={`size-6 rounded-md flex items-center justify-center font-bold transition-all border ${
                                  ders.m
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
                                    : "bg-white/[0.02] text-neutral-600 border-white/5 hover:border-white/10"
                                }`}
                              >
                                {ders.m ? "✓" : ""}
                              </button>
                            </td>
                            {/* F */}
                            <td className="p-1 text-center border-r border-white/10">
                              <button
                                type="button"
                                disabled={isParent}
                                onClick={() => handleDersToggle(rowIndex, lessonIndex, "f")}
                                className={`size-6 rounded-md flex items-center justify-center font-bold transition-all border ${
                                  ders.f
                                    ? "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                                    : "bg-white/[0.02] text-neutral-600 border-white/5 hover:border-white/10"
                                }`}
                              >
                                {ders.f ? "✓" : ""}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Add Row Button Row */}
        {!isParent && (
          <div className="p-4 border-t border-white/10 bg-white/[0.01] flex justify-start">
            <Button
              onClick={handleAddRow}
              variant="secondary"
              className="h-9 text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni Satır Ekle
            </Button>
          </div>
        )}
      </div>

      {/* Legend Card */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.01] p-4 text-xs text-neutral-400 flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <span className="font-semibold text-neutral-300">BD:</span> Başlama Düzeyi (+ / -)
        </div>
        <div>
          <span className="font-semibold text-emerald-400">B:</span> Bağımsız (Yardımsız)
        </div>
        <div>
          <span className="font-semibold text-indigo-400">İ:</span> İşaret İpucu
        </div>
        <div>
          <span className="font-semibold text-amber-400">M:</span> Model Olma
        </div>
        <div>
          <span className="font-semibold text-rose-400">F:</span> Fiziksel Yardım
        </div>
      </div>
    </div>
  );
}
