"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { ChecklistEditor } from "@/components/degerlendirmeler/checklist-editor";
import { ObtEditor } from "@/components/degerlendirmeler/obt-editor";
import { BeceriAnaliziEditor } from "@/components/degerlendirmeler/beceri-analizi-editor";
import type { SkillTemplateSummary } from "@/lib/skill-analysis";

type StudentData = {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
  classroom: string | null;
  schoolNumber: string | null;
};

export function YeniDegerlendirmeForm({
  student,
  defaultType = "obt",
  bepDocuments = [],
  defaultEvaluatorName = "",
  skillTemplates = [],
}: {
  student: StudentData;
  defaultType?: string;
  bepDocuments?: any[];
  defaultEvaluatorName?: string;
  skillTemplates?: SkillTemplateSummary[];
}) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [isPending, startTransition] = useTransition();

  const [showEditor, setShowEditor] = useState(false);
  const [tempDoc, setTempDoc] = useState<any>(null);

  const [title, setTitle] = useState(defaultType === "kontrol" ? "Sözlü Sunum Becerisine Yönelik Kontrol Listesi" : "Ölçüt Bağımlı Ölçü Aracı");
  const [type, setType] = useState(defaultType);
  const [evaluationType, setEvaluationType] = useState(defaultType === "kontrol" ? "Kontrol Listesi" : "ÖBT");
  const [evaluationDate, setEvaluationDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [evaluatorName, setEvaluatorName] = useState(defaultEvaluatorName);

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (newType === "kontrol") {
      setTitle("Sözlü Sunum Becerisine Yönelik Kontrol Listesi");
      setEvaluationType("Kontrol Listesi");
    } else if (newType === "beceri") {
      setTitle("Beceri Analizi Veri Kayıt Formu");
      setEvaluationType("Beceri Analizi");
    } else {
      setTitle("Ölçüt Bağımlı Ölçü Aracı");
      setEvaluationType("ÖBT");
    }
  };

  const createEmptyRow = () => {
    return {
      id: Math.random().toString(36).substring(2, 9),
      bildirim: "",
      olcut: "",
      yonerge: "",
      bd1: "",
      bd2: "",
      bd3: "",
      dersler: Array.from({ length: 5 }, () => ({
        tarih: "",
        b: false,
        i: false,
        m: false,
        f: false,
      })),
    };
  };

  const createEmptyChecklistRow = () => {
    return {
      id: Math.random().toString(36).substring(2, 9),
      olcut: "",
      evet: false,
      hayir: false,
      aciklama: "",
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert("Lütfen bir başlık girin.");
      return;
    }

    // Beceri Analizi nesne tabanlı veri tutar; diğerleri satır dizisiyle başlar.
    const initialData: unknown = type === "beceri" ? {} : [];

    const docData = {
      studentId: student.id,
      title: title.trim(),
      type,
      kazanim: null,
      evaluationType: evaluationType.trim() || null,
      evaluationDate: evaluationDate || null,
      evaluatorName: evaluatorName.trim() || null,
      data: initialData,
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        schoolName: student.schoolName,
        schoolNumber: student.schoolNumber,
      },
    };

    setTempDoc(docData);
    setShowEditor(true);
  };

  if (showEditor && tempDoc) {
    if (type === "kontrol") {
      return (
        <ChecklistEditor
          document={tempDoc}
          bepDocuments={bepDocuments}
        />
      );
    } else if (type === "beceri") {
      return <BeceriAnaliziEditor document={tempDoc} templates={skillTemplates} />;
    } else {
      return (
        <ObtEditor
          document={tempDoc}
          bepDocuments={bepDocuments}
        />
      );
    }
  }

  return (
    <Card padding="lg">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/panel/degerlendirmeler/ogretim-sonu/yeni">
          <Button size="icon" variant="ghost" className="h-9 w-9 rounded-xl" title="Öğrenci Seçimine Dön">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-lg font-bold text-[color:var(--panel-text)]">Değerlendirme Detayları</h2>
          <p className="text-xs text-[color:var(--panel-text-muted)]">
            {student.firstName} {student.lastName} için yeni değerlendirme belgesi
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="block text-xs font-semibold text-[color:var(--panel-text-muted)] mb-1.5">
            Öğrenci
          </label>
          <input
            type="text"
            readOnly
            disabled
            value={`${student.firstName} ${student.lastName} ${
              student.classroom ? `(${student.classroom})` : ""
            }`}
            className={`${inputClassName()} opacity-70 cursor-not-allowed`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[color:var(--panel-text-muted)] mb-1.5">
            Değerlendirme Türü
          </label>
          <select
            value={type}
            onChange={(e) => handleTypeChange(e.target.value)}
            className={`${inputClassName()} cursor-pointer`}
          >
            <option value="obt">Ölçüt Bağımlı Ölçü Aracı (ÖBT)</option>
            <option value="kontrol">Kontrol Listesi</option>
            <option value="beceri">Beceri Analizi</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[color:var(--panel-text-muted)] mb-1.5">
            Değerlendirme Tarihi
          </label>
          <input
            type="date"
            value={evaluationDate}
            onChange={(e) => setEvaluationDate(e.target.value)}
            className={inputClassName()}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[color:var(--panel-text-muted)] mb-1.5">
            Değerlendirme Aracı Adı (Sütun Bilgisi)
          </label>
          <input
            type="text"
            value={evaluationType}
            onChange={(e) => setEvaluationType(e.target.value)}
            placeholder="Örn: ÖBT"
            className={inputClassName()}
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-[color:var(--panel-text-muted)] mb-1.5">
            Rapor Başlığı
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Değerlendirme Rapor Başlığı"
            className={inputClassName()}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[color:var(--panel-text-muted)] mb-1.5">
            Değerlendirmeyi Yapan
          </label>
          <input
            type="text"
            value={evaluatorName}
            onChange={(e) => setEvaluatorName(e.target.value)}
            placeholder="Değerlendirmeyi yapan kişi..."
            className={inputClassName()}
          />
        </div>



        <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 mt-4 border-t border-[color:var(--panel-border)] pt-5">
          <Link href="/panel/degerlendirmeler/ogretim-sonu">
            <Button variant="ghost" className="h-11 px-5">
              İptal
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={isPending}
            className="h-11 px-6 flex items-center gap-2"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Oluştur ve Düzenle
          </Button>
        </div>
      </form>
    </Card>
  );
}
