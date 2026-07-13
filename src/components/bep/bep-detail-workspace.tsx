"use client";

import { useMemo, useState } from "react";
import { FileDown } from "lucide-react";

import { BepEditor } from "@/components/bep/bep-editor";
import { DeleteBepDocumentButton } from "@/components/bep/delete-bep-document-button";
import { BepCompletionFeedbackPrompt } from "@/components/feedback/bep-completion-feedback-prompt";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { CurriculumCourseOption } from "@/lib/curriculum";
import type { BepDocumentInput } from "@/lib/schemas";

type Props = {
  documentId: string;
  documentTitle: string;
  studentName: string;
  defaultValues: BepDocumentInput;
  curriculumOptions: CurriculumCourseOption[];
  canDelete: boolean;
  canEdit: boolean;
  initialShowFeedbackPrompt: boolean;
};

function statusLabel(status: BepDocumentInput["status"]) {
  return status === "completed" ? "Tamamlandı" : "Taslak";
}

function formatOptionalDate(value?: string) {
  if (!value) {
    return "Belirlenmedi";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("tr-TR");
}

export function BepDetailWorkspace({
  documentId,
  documentTitle,
  studentName,
  defaultValues,
  curriculumOptions,
  canDelete,
  canEdit,
  initialShowFeedbackPrompt,
}: Props) {
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(initialShowFeedbackPrompt);
  const [lastSavedStatus, setLastSavedStatus] = useState<BepDocumentInput["status"]>(
    defaultValues.status,
  );
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Yerel sürüm: PDF önizleme kaldırıldı; bağlantı PDF'i doğrudan indirir.
  const pdfUrl = `/api/pdf/${documentId}`;
  const scopeStats = useMemo(
    () => [
      {
        label: "Performans",
        value: defaultValues.performanceEntries.length,
        helper: "satır",
      },
      {
        label: "Hedef",
        value: defaultValues.planRows.length,
        helper: "plan satırı",
      },
      {
        label: "Hizmet",
        value: defaultValues.supportServiceEntries.length,
        helper: "destek kaydı",
      },
      {
        label: "Kurul",
        value:
          defaultValues.committeeMembers.length + defaultValues.subjectTeachers.length,
        helper: "katılımcı",
      },
    ],
    [
      defaultValues.committeeMembers.length,
      defaultValues.performanceEntries.length,
      defaultValues.planRows.length,
      defaultValues.subjectTeachers.length,
      defaultValues.supportServiceEntries.length,
    ],
  );

  return (
    <>
      <div className="grid gap-6">
        <div className="grid gap-4">
          <Card variant="subtle" padding="sm" className="h-full">
            <SectionHeading
              eyebrow="Belge Özeti"
              title={documentTitle}
              description={
                canEdit
                  ? `${studentName} için hazırlanan çalışma alanı, temel belge durumu ve ana aksiyonlar burada toplanır.`
                  : `${studentName} için hazırlanan belgeyi, PDF çıktısını ve temel plan özetini buradan görüntüleyin.`
              }
            />

            <div className="mt-5 grid gap-4 min-[1450px]:grid-cols-[minmax(0,1fr)_240px] min-[1450px]:items-start">
              <div className="grid gap-5">
                <div className="grid gap-3 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/50 p-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                      Öğrenci
                    </div>
                    <div className="mt-1 text-base font-semibold text-[color:var(--panel-text)]">
                      {studentName}
                    </div>
                  </div>
                  <div className="grid gap-2 text-sm text-[color:var(--panel-text-muted)]">
                    <div>Durum: {statusLabel(lastSavedStatus)}</div>
                    <div>
                      Kaydetme:{" "}
                      {lastSavedAt
                        ? lastSavedAt.toLocaleString("tr-TR")
                        : "Henüz bu oturumda kaydedilmedi"}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-[color:var(--panel-border)] pt-5 md:grid-cols-2">
                  <div className="grid gap-1">
                    <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                      Dönem
                    </div>
                    <div className="text-base font-semibold text-[color:var(--panel-text)]">
                      {defaultValues.startDate || defaultValues.endDate
                        ? `${formatOptionalDate(defaultValues.startDate)} - ${formatOptionalDate(defaultValues.endDate)}`
                        : "Tarih aralığı belirlenmedi"}
                    </div>
                    <div className="text-sm text-[color:var(--panel-text-muted)]">
                      Belgenin aktif çalışma takvimi
                    </div>
                  </div>
                  <div className="grid gap-1">
                    <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                      Sonraki toplantı
                    </div>
                    <div className="text-base font-semibold text-[color:var(--panel-text)]">
                      {formatOptionalDate(defaultValues.nextMeetingDate)}
                    </div>
                    <div className="text-sm text-[color:var(--panel-text-muted)]">
                      Aile ve kurul süreci için planlanan kontrol tarihi
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 border-t border-[color:var(--panel-border)] pt-5 md:grid-cols-2 xl:grid-cols-4">
                  {scopeStats.map((stat) => (
                    <div key={stat.label} className="grid gap-1">
                      <div className="text-xs uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                        {stat.label}
                      </div>
                      <div className="text-2xl font-semibold tracking-tight text-[color:var(--panel-text)]">
                        {stat.value}
                      </div>
                      <div className="text-sm text-[color:var(--panel-text-muted)]">
                        {stat.helper}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-2">
                <a href={pdfUrl} download>
                  <Button className="w-full">
                    <FileDown className="size-4" />
                    PDF’yi İndir
                  </Button>
                </a>
                {canDelete ? (
                  <DeleteBepDocumentButton documentId={documentId} documentTitle={documentTitle} />
                ) : null}
              </div>
            </div>
          </Card>
        </div>

        <div className="min-w-0">
          <BepEditor
            defaultValues={defaultValues}
            studentName={studentName}
            documentId={documentId}
            curriculumOptions={curriculumOptions}
            canEdit={canEdit}
            onSaveSuccess={({ status }) => {
              setLastSavedStatus(status);
              setLastSavedAt(new Date());
              if (canEdit && status === "completed") {
                setShowFeedbackPrompt(true);
              }
            }}
          />
        </div>
      </div>

      {showFeedbackPrompt ? (
        <BepCompletionFeedbackPrompt
          documentId={documentId}
          documentTitle={documentTitle}
          studentName={studentName}
          onClose={() => setShowFeedbackPrompt(false)}
        />
      ) : null}
    </>
  );
}



