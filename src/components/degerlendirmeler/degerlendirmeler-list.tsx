"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  BookOpen,
  Copy,
  X,
} from "lucide-react";
import { deleteEvaluationAction, duplicateEvaluationAction } from "@/app/degerlendirmeler-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";
import { StatCard } from "@/components/dashboard/stat-card";

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

type EvaluationDoc = {
  id: string;
  studentId: string;
  title: string;
  type: string;
  evaluationDate: string | Date | null;
  createdAt: string | Date;
  student: {
    firstName: string;
    lastName: string;
    schoolName: string | null;
    schoolNumber: string | null;
  };
  owner: {
    name: string | null;
    email: string;
  };
};

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function DegerlendirmelerList({
  documents,
  userRole,
}: {
  documents: EvaluationDoc[];
  userRole: string;
}) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const isParent = userRole === "parent";

  // Unique list of students from the documents
  const studentOptions = useMemo(() => {
    const map = new Map<string, EvaluationDoc["student"] & { id: string }>();
    documents.forEach((doc) => {
      if (!map.has(doc.studentId)) {
        map.set(doc.studentId, { ...doc.student, id: doc.studentId });
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr")
    );
  }, [documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const studentName = `${doc.student.firstName} ${doc.student.lastName}`.toLowerCase();
      const matchesSearch =
        doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        studentName.includes(searchTerm.toLowerCase());
      
      const matchesStudent =
        selectedStudentId === "all" || doc.studentId === selectedStudentId;
      
      const matchesType =
        selectedType === "all" || doc.type === selectedType;

      return matchesSearch && matchesStudent && matchesType;
    });
  }, [documents, searchTerm, selectedStudentId, selectedType]);

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`"${title}" isimli değerlendirmeyi silmek istediğinizden emin misiniz?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteEvaluationAction({ id });
      showResult(result, {
        successTitle: "Değerlendirme silindi",
        errorTitle: "Silme işlemi başarısız",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  const handleDuplicate = (id: string, title: string) => {
    startTransition(async () => {
      const result = await duplicateEvaluationAction({ id });
      showResult(result, {
        successTitle: "Değerlendirme kopyalandı",
        errorTitle: "Kopyalama başarısız",
        successMessage: `"${title}" kopyalandı.`,
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  const getTypeName = (type: string) => {
    if (type === "obt") return "Ölçüt Bağımlı Ölçü Aracı (ÖBT)";
    if (type === "kontrol") return "Kontrol Listesi";
    if (type === "beceri") return "Beceri Analizi";
    return "Değerlendirme";
  };

  const getEditHref = (doc: EvaluationDoc) => {
    if (doc.type === "kontrol") return `/panel/degerlendirmeler/kontrol-listesi/${doc.id}`;
    if (doc.type === "beceri") return `/panel/degerlendirmeler/beceri-analizi/${doc.id}`;
    return `/panel/degerlendirmeler/ogretim-sonu/${doc.id}`;
  };

  return (
    <div className="grid gap-6">
      {/* Header Summary */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <StatCard size="sm" label="Toplam Değerlendirme" value={filteredDocs.length} />
        <StatCard size="sm" label="ÖBT Sayısı" value={filteredDocs.filter((d) => d.type === "obt").length} />
        <StatCard
          size="sm"
          label="Kontrol Listesi Sayısı"
          value={filteredDocs.filter((d) => d.type === "kontrol").length}
        />
        <StatCard
          size="sm"
          label="Beceri Analizi Sayısı"
          value={filteredDocs.filter((d) => d.type === "beceri").length}
        />
      </div>

      {/* Toolbar & Filters */}
      <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(180px,240px)_minmax(180px,240px)_auto]">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Arama (Öğrenci adı veya başlık)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-white/20 focus:bg-black/40"
            />
          </div>

          {/* Student Filter */}
          <div>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className={`${inputClassName()} h-11 text-sm cursor-pointer bg-neutral-900`}
            >
              <option value="all">Tüm Öğrenciler</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`${inputClassName()} h-11 text-sm cursor-pointer bg-neutral-900`}
            >
              <option value="all">Tüm Değerlendirme Türleri</option>
              <option value="obt">Ölçüt Bağımlı Ölçü Aracı (ÖBT)</option>
              <option value="kontrol">Kontrol Listesi</option>
              <option value="beceri">Beceri Analizi</option>
            </select>
          </div>

          {/* Clear Filters & Actions */}
          <div className="flex items-center gap-2">
            {(searchTerm || selectedStudentId !== "all" || selectedType !== "all") && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedStudentId("all");
                  setSelectedType("all");
                }}
                className="h-11 flex items-center justify-center gap-2 border border-white/10"
              >
                <X className="h-4 w-4" />
                Temizle
              </Button>
            )}

            {!isParent && (
              <Link href="/panel/degerlendirmeler/ogretim-sonu/yeni" className="w-full md:w-auto">
                <Button className="h-11 w-full md:w-auto flex items-center justify-center gap-2 whitespace-nowrap">
                  <Plus className="h-4 w-4" />
                  Yeni Değerlendirme
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* List Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02] p-1">
        {filteredDocs.length === 0 ? (
          <div className="rounded-2xl px-4 py-16 text-center text-sm text-neutral-500">
            <BookOpen className="mx-auto h-10 w-10 text-neutral-600 mb-3" />
            Değerlendirme belgesi bulunamadı.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-white/10 text-sm text-left">
            <thead>
              <tr className="text-neutral-400 border-b border-white/10 text-xs font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Öğrenci</th>
                <th className="px-5 py-3.5">Tür</th>
                <th className="px-5 py-3.5">Başlık</th>
                <th className="px-5 py-3.5">Tarih</th>
                <th className="px-5 py-3.5">Ekleyen</th>
                <th className="px-5 py-3.5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-white/[0.01] transition-colors">
                  <td className="px-5 py-4 font-semibold text-white whitespace-nowrap">
                    {doc.student.firstName} {doc.student.lastName}
                  </td>
                  <td className="px-5 py-4 text-indigo-300 font-medium">
                    {getTypeName(doc.type)}
                  </td>
                  <td className="px-5 py-4 text-neutral-300 font-medium max-w-xs truncate">
                    {doc.title}
                  </td>
                  <td className="px-5 py-4 text-neutral-400">
                    {doc.evaluationDate ? formatDateTime(doc.evaluationDate) : "-"}
                  </td>
                  <td className="px-5 py-4 text-neutral-400">
                    {doc.owner.name || doc.owner.email}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <Link href={getEditHref(doc)}>
                        <Button size="sm" variant="secondary" className="text-xs h-9">
                          {isParent ? "Görüntüle" : "Düzenle"}
                        </Button>
                      </Link>

                      <a href={`/api/pdf/degerlendirmeler/${doc.id}`} target="_blank" rel="noreferrer">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl flex items-center justify-center p-0 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 hover:text-red-300 transition-colors"
                          title="PDF İndir"
                        >
                          <PdfIcon className="h-5 w-5" />
                        </Button>
                      </a>

                      <a href={`/api/docx/degerlendirmeler/${doc.id}`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9 rounded-xl flex items-center justify-center p-0 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 hover:text-blue-300 transition-colors"
                          title="Word (DOCX) İndir"
                        >
                          <DocxIcon className="h-5 w-5" />
                        </Button>
                      </a>

                      {!isParent && (
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => handleDuplicate(doc.id, doc.title)}
                          className="h-9 w-9 rounded-xl flex items-center justify-center p-0 border border-white/10 text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
                          title="Kopyala"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}

                      {!isParent && (
                        <Button
                          size="icon"
                          variant="danger"
                          disabled={isPending}
                          onClick={() => handleDelete(doc.id, doc.title)}
                          className="!h-9 !w-9 rounded-xl flex items-center justify-center p-0 shrink-0"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
