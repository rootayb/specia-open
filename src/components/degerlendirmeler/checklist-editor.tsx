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
  Check,
  Search,
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

type ChecklistRow = {
  id: string;
  olcut: string;
  evet: boolean;
  hayir: boolean;
  aciklama: string;
  isHeader?: boolean;
};

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

function parseChecklistRows(data: unknown): ChecklistRow[] {
  if (!Array.isArray(data)) return [];

  return data.map((value, idx) => {
    const row = value && typeof value === "object" ? (value as Partial<ChecklistRow>) : {};
    return {
      id: typeof row.id === "string" && row.id ? row.id : `row-${idx}`,
      olcut: typeof row.olcut === "string" ? row.olcut : "",
      evet: Boolean(row.evet),
      hayir: Boolean(row.hayir),
      aciklama: typeof row.aciklama === "string" ? row.aciklama : "",
      isHeader: Boolean(row.isHeader),
    };
  });
}

function createEmptyRow(): ChecklistRow {
  return {
    id: Math.random().toString(36).substring(2, 9),
    olcut: "",
    evet: false,
    hayir: false,
    aciklama: "",
  };
}

export function ChecklistEditor({
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

  const [title, setTitle] = useState(document.title || "Kontrol Listesi");
  const [kazanim, setKazanim] = useState(document.kazanim || "");
  const [evaluationType] = useState(document.evaluationType || "Kontrol Listesi");
  const [evaluatorName, setEvaluatorName] = useState(document.evaluatorName || "");

  const initialDateStr = document.evaluationDate
    ? new Date(document.evaluationDate).toISOString().split("T")[0]
    : "";
  const [evaluationDate, setEvaluationDate] = useState(initialDateStr || "");

  const [rows, setRows] = useState<ChecklistRow[]>(() => {
    const parsed = parseChecklistRows(document.data);
    return parsed.length > 0 ? parsed : [];
  });

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

  // Toggle Yes/Evet
  const handleToggleYes = (rowIndex: number) => {
    if (isParent) return;
    setRows((prev) =>
      prev.map((row, idx) => {
        if (idx === rowIndex) {
          const nextYes = !row.evet;
          return {
            ...row,
            evet: nextYes,
            hayir: nextYes ? false : row.hayir,
          };
        }
        return row;
      })
    );
  };

  // Toggle No/Hayır
  const handleToggleNo = (rowIndex: number) => {
    if (isParent) return;
    setRows((prev) =>
      prev.map((row, idx) => {
        if (idx === rowIndex) {
          const nextNo = !row.hayir;
          return {
            ...row,
            hayir: nextNo,
            evet: nextNo ? false : row.evet,
          };
        }
        return row;
      })
    );
  };

  // Edit cell text
  const handleCellChange = (rowIndex: number, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      if (copy[rowIndex]) {
        copy[rowIndex] = { ...copy[rowIndex]!, olcut: value };
      }
      return copy;
    });
  };

  // Edit description text
  const handleAciklamaChange = (rowIndex: number, value: string) => {
    setRows((prev) => {
      const copy = [...prev];
      if (copy[rowIndex]) {
        copy[rowIndex] = { ...copy[rowIndex]!, aciklama: value };
      }
      return copy;
    });
  };

  // Add row
  const handleAddRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  // Remove row
  const handleRemoveRow = (index: number) => {
    if (rows.length <= 1) {
      alert("En az bir satır bulunmalıdır.");
      return;
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  // BEP Goal Adders
  const handleAppendSubGoal = (label: string, parentOutcome: string) => {
    setRows((prev) => {
      const isFirstRowEmpty =
        prev.length === 1 && !prev[0].olcut.trim() && !prev[0].isHeader;
      const baseList = isFirstRowEmpty ? [] : prev;

      const headerIndex = baseList.findIndex((r) => r.isHeader && r.olcut === parentOutcome);

      const newSubGoalRow: ChecklistRow = {
        id: Math.random().toString(36).substring(2, 9),
        olcut: label,
        evet: false,
        hayir: false,
        aciklama: "",
        isHeader: false,
      };

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
        const newHeaderRow: ChecklistRow = {
          id: `header-${Math.random().toString(36).substring(2, 9)}`,
          olcut: parentOutcome,
          evet: false,
          hayir: false,
          aciklama: "",
          isHeader: true,
        };
        return [...baseList, newHeaderRow, newSubGoalRow];
      }
    });
  };



  // Save
  const handleSave = () => {
    startTransition(async () => {
      const payload = {
        id: document.id,
        studentId: document.studentId,
        title,
        type: "kontrol",
        kazanim,
        evaluationType,
        evaluationDate: evaluationDate || null,
        evaluatorName,
        data: rows,
      };

      const result = await saveEvaluationAction(payload);
      showResult(result, {
        successTitle: "Kontrol listesi kaydedildi",
        errorTitle: "Hata oluştu",
      });

      if (result.success) {
        if (!document.id && result.id) {
          router.push(`/panel/degerlendirmeler/kontrol-listesi/${result.id}`);
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
              {document.id ? "Kontrol Listesini Düzenle" : "Yeni Kontrol Listesi"}
            </h1>
            <p className="text-xs text-neutral-400">
              {document.student.firstName} {document.student.lastName} için Kontrol Listesi
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
                  title="PDF İndir"
                >
                  <PdfIcon className="h-5 w-5" />
                  <span>PDF İndir</span>
                </Button>
              </a>
              <a href={`/api/docx/degerlendirmeler/${document.id}`}>
                <Button
                  variant="secondary"
                  className="h-10 px-4 flex items-center gap-2 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 hover:text-blue-300 transition-colors"
                  title="Word İndir"
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
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Kontrol Listesi Başlığı</label>
          <input
            type="text"
            readOnly={isParent}
            disabled={isParent}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Başlık girin (Örn: Sözlü Sunum Becerisine Yönelik...)"
            className={inputClassName()}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-neutral-400 mb-1.5">Tarih</label>
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
                  Öğrencinin BEP belgesindeki hedefleri otomatik veya manuel olarak kontrol listesine aktarın.
                </p>
              </div>
            </div>
            <div className="text-neutral-400">
              {showBepPanel ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </div>
          </button>

          {/* Panel Content */}
          {showBepPanel && (
            <div className="border-t border-white/5 p-4 space-y-4">
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
                                            <div className="font-semibold text-white">{row.learningOutcome}</div>
                                            {components.length > 0 && (
                                              <div className="pl-3 border-l border-white/5 space-y-2 mt-2 text-neutral-400">
                                                {components.map((comp, idx) => {
                                                  const isCompAdded = rows.some((r) => r.olcut === comp.label);

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
                                                          onClick={() => handleAppendSubGoal(comp.label, row.learningOutcome)}
                                                          className="text-[10px] text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/20 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold hover:underline transition-all active:scale-95 inline-flex items-center shrink-0 cursor-pointer"
                                                        >
                                                          + Ekle
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
                                                    if (!rows.some((r) => r.olcut === c.label)) {
                                                      handleAppendSubGoal(c.label, row.learningOutcome);
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

      {/* Grid Table */}
      <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/30 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse text-left text-xs text-[color:var(--panel-text)]">
            <thead>
              {/* Top info row spanning Evet/Hayır columns */}
              <tr className="bg-[color:var(--panel-bg-soft)] border-b border-[color:var(--panel-border)] text-xs text-[color:var(--panel-text-soft)]">
                <th colSpan={isParent ? 3 : 4} className="p-3 font-semibold border-r border-[color:var(--panel-border)]">
                  Öğrencinin Adı Soyadı: <span className="text-white font-bold">{document.student.firstName} {document.student.lastName}</span>
                </th>
                <th colSpan={2} className="p-3 text-right font-semibold">
                  Tarih: <span className="text-white font-bold">
                    {evaluationDate
                      ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(evaluationDate))
                      : "-"}
                  </span>
                </th>
              </tr>
              {/* Header row */}
              <tr className="bg-[color:var(--panel-bg-soft)]/60 border-b border-[color:var(--panel-border)] text-center font-bold text-[11px] text-[color:var(--panel-text-soft)]">
                {!isParent && <th className="p-2 w-10 border-r border-[color:var(--panel-border)]"></th>}
                <th className="p-2 w-12 border-r border-[color:var(--panel-border)]">Sıra</th>
                <th className="p-2 border-r border-[color:var(--panel-border)] text-left">Ölçütler</th>
                <th className="p-2 w-24 border-r border-[color:var(--panel-border)] text-emerald-400">Evet</th>
                <th className="p-2 w-24 border-r border-[color:var(--panel-border)] text-rose-400">Hayır</th>
                <th className="p-2 text-left">Açıklama</th>
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
                        className={`border-b border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]/40 hover:bg-[color:var(--panel-bg-hover)]/50 transition-all duration-150 ${
                          draggedIndex === rowIndex ? "opacity-30 bg-white/[0.05]" : ""
                        }`}
                      >
                        {!isParent && (
                          <td className="p-2 text-center border-r border-[color:var(--panel-border)]">
                            <div className="flex items-center justify-center gap-1">
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
                        <td colSpan={5} className="p-3 font-bold text-white text-sm">
                          <textarea
                            value={row.olcut}
                            readOnly={isParent}
                            disabled={isParent}
                            onChange={(e) => handleCellChange(rowIndex, e.target.value)}
                            placeholder="Ana Kazanım Başlığı..."
                            rows={1}
                            className="w-full bg-transparent outline-none resize-none p-1 font-bold text-white border border-transparent focus:border-[color:var(--panel-border)] focus:bg-black/10 rounded-lg placeholder-neutral-500 transition"
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
                      className={`border-b border-[color:var(--panel-border)]/50 hover:bg-[color:var(--panel-bg-hover)]/30 transition-all duration-150 ${
                        draggedIndex === rowIndex ? "opacity-30 bg-white/[0.05]" : ""
                      }`}
                    >
                      {/* Actions column */}
                      {!isParent && (
                        <td className="p-2 text-center border-r border-[color:var(--panel-border)]">
                          <div className="flex items-center justify-center gap-1">
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
                      <td className="p-2 text-center text-[color:var(--panel-text-muted)] font-semibold border-r border-[color:var(--panel-border)]">
                        {visualIndex}
                      </td>
                      {/* Ölçüt text */}
                      <td className="p-2 border-r border-[color:var(--panel-border)]">
                        <textarea
                          value={row.olcut}
                          readOnly={isParent}
                          disabled={isParent}
                          onChange={(e) => handleCellChange(rowIndex, e.target.value)}
                          placeholder="Maddeleri buraya yazın..."
                          rows={1}
                          className="w-full bg-transparent outline-none resize-none p-1 text-[color:var(--panel-text)] border border-transparent focus:border-[color:var(--panel-border)] focus:bg-black/10 rounded-lg placeholder-neutral-600 transition"
                        />
                      </td>
                      {/* Evet checkbox */}
                      <td className="p-2 text-center border-r border-[color:var(--panel-border)]">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            disabled={isParent}
                            onClick={() => handleToggleYes(rowIndex)}
                            className={`size-7 rounded-lg flex items-center justify-center font-bold transition-all border ${
                              row.evet
                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                : "bg-white/[0.02] text-neutral-600 border-[color:var(--panel-border)] hover:border-white/10"
                            }`}
                          >
                            {row.evet ? <Check className="size-4" /> : ""}
                          </button>
                        </div>
                      </td>
                      {/* Hayır checkbox */}
                      <td className="p-2 text-center border-r border-[color:var(--panel-border)]">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            disabled={isParent}
                            onClick={() => handleToggleNo(rowIndex)}
                            className={`size-7 rounded-lg flex items-center justify-center font-bold transition-all border ${
                              row.hayir
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.15)]"
                                : "bg-white/[0.02] text-neutral-600 border-[color:var(--panel-border)] hover:border-white/10"
                            }`}
                          >
                            {row.hayir ? <Check className="size-4" /> : ""}
                          </button>
                        </div>
                      </td>
                      {/* Açıklama column */}
                      <td className="p-2">
                        <textarea
                          value={row.aciklama || ""}
                          readOnly={isParent}
                          disabled={isParent}
                          onChange={(e) => handleAciklamaChange(rowIndex, e.target.value)}
                          placeholder="Açıklama yazın..."
                          rows={1}
                          className="w-full bg-transparent outline-none resize-none p-1 text-[color:var(--panel-text)] border border-transparent focus:border-[color:var(--panel-border)] focus:bg-black/10 rounded-lg placeholder-neutral-600 transition"
                        />
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        {/* Add Row */}
        {!isParent && (
          <div className="p-4 border-t border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]/20 flex justify-start">
            <Button
              onClick={handleAddRow}
              variant="secondary"
              className="h-9 text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni Ölçüt Ekle
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
