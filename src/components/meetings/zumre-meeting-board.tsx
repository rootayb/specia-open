"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ClipboardList,
  FileDown,
  FileText,
  ListChecks,
  Plus,
  Trash2,
  Users,
} from "lucide-react";

import {
  deleteZumreMeetingDocumentAction,
  saveZumreMeetingDocumentAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { WorkspaceCardGrid, WorkspacePanel } from "@/components/ui/workspace-switcher";
import {
  buildZumreComplianceChecklist,
  buildZumreMeetingTitle,
  DEFAULT_ZUMRE_AGENDA_ITEMS,
  formatZumreDate,
  getZumreMeetingTypeLabel,
  splitZumreParticipants,
  ZUMRE_MEETING_TYPE_OPTIONS,
} from "@/lib/zumre-meeting";

type ZumreAgendaItemForm = {
  id?: string;
  sortOrder: number;
  title: string;
  discussionText: string;
  decisionText: string;
};

type ZumreMeetingForm = {
  id: string;
  status: "draft" | "completed";
  documentType: "zumre" | "sok";
  title: string;
  educationYear: string;
  termLabel: string;
  meetingNo: string;
  meetingDate: string;
  meetingTime: string;
  location: string;
  city: string;
  district: string;
  schoolName: string;
  zumreName: string;
  gradeLevel: string;
  meetingType: string;
  chairpersonName: string;
  recorderName: string;
  principalName: string;
  principalTitle: string;
  participants: string;
  announcementDate: string;
  complianceNotes: string;
  agendaItems: ZumreAgendaItemForm[];
};

type ZumreDocumentRecord = {
  id: string;
  status: "draft" | "completed";
  documentType: string;
  title: string;
  educationYear: string;
  termLabel: string;
  meetingNo: string;
  meetingDate: Date;
  meetingTime: string;
  location: string;
  city: string | null;
  district: string | null;
  schoolName: string;
  zumreName: string;
  gradeLevel: string | null;
  meetingType: string;
  chairpersonName: string;
  recorderName: string | null;
  principalName: string;
  principalTitle: string | null;
  participants: string;
  announcementDate: Date | null;
  complianceNotes: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  agendaItems: Array<{
    id: string;
    sortOrder: number;
    title: string;
    discussionText: string | null;
    decisionText: string | null;
  }>;
};

type InstitutionDefaults = {
  schoolName?: string | null;
  city?: string | null;
  district?: string | null;
  principalName?: string | null;
  principalTitle?: string | null;
};

type WorkspaceId = "kunye" | "participants" | "agenda" | "decisions" | "output";

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function currentEducationYear() {
  const now = new Date();
  const startYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

function agendaDefaults(): ZumreAgendaItemForm[] {
  return DEFAULT_ZUMRE_AGENDA_ITEMS.map((item, index) => ({
    sortOrder: index,
    title: item.title,
    discussionText: item.discussionText,
    decisionText: item.decisionText,
  }));
}

function buildEmptyForm(
  defaults?: InstitutionDefaults | null,
  documentType: "zumre" | "sok" = "zumre",
): ZumreMeetingForm {
  const educationYear = currentEducationYear();
  const schoolName = defaults?.schoolName ?? "";
  const isSok = documentType === "sok";
  const zumreName = isSok ? "8/A" : "Özel Eğitim";
  const termLabel = "I. Dönem";

  return {
    id: "",
    status: "draft",
    documentType,
    title: buildZumreMeetingTitle({ educationYear, schoolName, zumreName, termLabel, documentType }),
    educationYear,
    termLabel,
    meetingNo: "1",
    meetingDate: todayInput(),
    meetingTime: "14:00",
    location: "Öğretmenler odası",
    city: defaults?.city ?? "",
    district: defaults?.district ?? "",
    schoolName,
    zumreName,
    gradeLevel: "",
    meetingType: "year_start",
    chairpersonName: "",
    recorderName: "",
    principalName: defaults?.principalName ?? "",
    principalTitle: defaults?.principalTitle ?? "Okul Müdürü",
    participants: "",
    announcementDate: "",
    complianceNotes: "",
    agendaItems: agendaDefaults(),
  };
}

function formatDateInput(value?: Date | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function buildFormFromRecord(document: ZumreDocumentRecord): ZumreMeetingForm {
  return {
    id: document.id,
    status: document.status,
    documentType: document.documentType === "sok" ? "sok" : "zumre",
    title: document.title,
    educationYear: document.educationYear,
    termLabel: document.termLabel,
    meetingNo: document.meetingNo,
    meetingDate: formatDateInput(document.meetingDate),
    meetingTime: document.meetingTime,
    location: document.location,
    city: document.city ?? "",
    district: document.district ?? "",
    schoolName: document.schoolName,
    zumreName: document.zumreName,
    gradeLevel: document.gradeLevel ?? "",
    meetingType: document.meetingType,
    chairpersonName: document.chairpersonName,
    recorderName: document.recorderName ?? "",
    principalName: document.principalName,
    principalTitle: document.principalTitle ?? "",
    participants: document.participants,
    announcementDate: formatDateInput(document.announcementDate),
    complianceNotes: document.complianceNotes ?? "",
    agendaItems: document.agendaItems.map((item) => ({
      id: item.id,
      sortOrder: item.sortOrder,
      title: item.title,
      discussionText: item.discussionText ?? "",
      decisionText: item.decisionText ?? "",
    })),
  };
}

function buildSubmission(form: ZumreMeetingForm) {
  return {
    ...form,
    title:
      form.title.trim() ||
      buildZumreMeetingTitle({
        educationYear: form.educationYear,
        schoolName: form.schoolName,
        zumreName: form.zumreName,
        termLabel: form.termLabel,
        documentType: form.documentType,
      }),
    agendaItems: form.agendaItems
      .filter((item) => item.title.trim().length > 0)
      .map((item, index) => ({ ...item, sortOrder: index })),
  };
}

export function ZumreMeetingBoard({
  documents,
  institutionDefaults,
  documentType = "zumre",
}: {
  documents: ZumreDocumentRecord[];
  institutionDefaults?: InstitutionDefaults | null;
  documentType?: "zumre" | "sok";
}) {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceId>("kunye");
  const [form, setForm] = useState<ZumreMeetingForm>(() => buildEmptyForm(institutionDefaults, documentType));
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const participantCount = splitZumreParticipants(form.participants).length;
  const decisionCount = form.agendaItems.filter((item) => item.decisionText.trim()).length;
  const complianceItems = useMemo(
    () => {
      const selectedMeetingDate = form.meetingDate ? new Date(form.meetingDate) : new Date();
      return buildZumreComplianceChecklist({
        meetingType: form.meetingType,
        meetingDate: Number.isNaN(selectedMeetingDate.getTime()) ? new Date() : selectedMeetingDate,
        announcementDate: form.announcementDate ? new Date(form.announcementDate) : null,
      });
    },
    [form.announcementDate, form.meetingDate, form.meetingType],
  );

  const workspaceCards = [
    {
      id: "kunye",
      icon: FileText,
      title: "Künye",
      description: "Okul, dönem, tarih ve toplantı türü bilgilerini doldurun.",
      value: form.meetingDate || "Tarih yok",
    },
    {
      id: "participants",
      icon: Users,
      title: "Katılımcılar",
      description: "Başkan, yazman, müdür ve öğretmen listesini düzenleyin.",
      value: `${participantCount} katılımcı`,
    },
    {
      id: "agenda",
      icon: ClipboardList,
      title: "Gündem",
      description: "Yönetmeliğe uygun gündem taslağını özelleştirin.",
      value: `${form.agendaItems.length} madde`,
    },
    {
      id: "decisions",
      icon: ListChecks,
      title: "Kararlar",
      description: "Görüşme metni ve alınan kararları girin.",
      value: `${decisionCount} karar`,
    },
    {
      id: "output",
      icon: FileDown,
      title: "Çıktı",
      description: "Taslağı kaydedin, PDF veya DOCX çıktısı alın.",
      value: form.id ? "Çıktı hazır" : "Önce kaydet",
    },
  ];

  const resetForm = () => {
    setForm(buildEmptyForm(institutionDefaults, documentType));
    setFeedback("");
    setWorkspace("kunye");
  };

  const saveDocument = (status: "draft" | "completed" = form.status) => {
    startTransition(async () => {
      const result = await saveZumreMeetingDocumentAction(buildSubmission({ ...form, status }));
      setFeedback(result.message);
      showResult(result, {
        successTitle: form.id ? "Zümre tutanağı güncellendi" : "Zümre tutanağı kaydedildi",
        errorTitle: "Zümre tutanağı kaydedilemedi",
      });
      if (result.success) {
        setForm((current) => ({ ...current, id: result.id ?? current.id, status }));
        router.refresh();
      }
    });
  };

  const updateAgendaItem = (
    index: number,
    patch: Partial<ZumreAgendaItemForm>,
  ) => {
    setForm((current) => ({
      ...current,
      agendaItems: current.agendaItems.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  return (
    <div className="grid gap-6">
      <WorkspaceCardGrid
        items={workspaceCards}
        activeId={workspace}
        onChange={(id) => setWorkspace(id as WorkspaceId)}
        className="2xl:grid-cols-5"
        compact
      />

      {workspace === "kunye" ? (
        <WorkspacePanel
          eyebrow="Künye"
          title="Toplantı üst bilgisini hazırlayın"
          description="Bu bilgiler PDF ve DOCX çıktının ilk sayfasında resmi künye olarak görünür."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tutanak başlığı" className="md:col-span-2">
              <input
                className={inputClassName()}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </Field>
            <Field label="Eğitim öğretim yılı">
              <input
                className={inputClassName()}
                value={form.educationYear}
                onChange={(event) =>
                  setForm((current) => ({ ...current, educationYear: event.target.value }))
                }
              />
            </Field>
            <Field label="Dönem">
              <select
                className={inputClassName()}
                value={form.termLabel}
                onChange={(event) => setForm((current) => ({ ...current, termLabel: event.target.value }))}
              >
                <option>I. Dönem</option>
                <option>II. Dönem</option>
                <option>Ders Yılı Sonu</option>
                <option>Ara Toplantı</option>
              </select>
            </Field>
            <Field label="Toplantı no">
              <input
                className={inputClassName()}
                value={form.meetingNo}
                onChange={(event) => setForm((current) => ({ ...current, meetingNo: event.target.value }))}
              />
            </Field>
            <Field label="Toplantı türü">
              <select
                className={inputClassName()}
                value={form.meetingType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, meetingType: event.target.value }))
                }
              >
                {ZUMRE_MEETING_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Toplantı tarihi">
              <input
                type="date"
                className={inputClassName()}
                value={form.meetingDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, meetingDate: event.target.value }))
                }
              />
            </Field>
            <Field label="Toplantı saati">
              <input
                type="time"
                className={inputClassName()}
                value={form.meetingTime}
                onChange={(event) =>
                  setForm((current) => ({ ...current, meetingTime: event.target.value }))
                }
              />
            </Field>
            <Field label="Toplantı yeri">
              <input
                className={inputClassName()}
                value={form.location}
                onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
              />
            </Field>
            <Field label="Duyuru tarihi" hint="Zorunlu durumlar dışında en az 5 gün önce duyurulmalıdır.">
              <input
                type="date"
                className={inputClassName()}
                value={form.announcementDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, announcementDate: event.target.value }))
                }
              />
            </Field>
            <Field label="Okul adı">
              <input
                className={inputClassName()}
                value={form.schoolName}
                onChange={(event) => setForm((current) => ({ ...current, schoolName: event.target.value }))}
              />
            </Field>
            <Field label={documentType === "sok" ? "Şube adı" : "Zümre adı"}>
              <input
                className={inputClassName()}
                value={form.zumreName}
                onChange={(event) => setForm((current) => ({ ...current, zumreName: event.target.value }))}
              />
            </Field>
            <Field label="İl">
              <input
                className={inputClassName()}
                value={form.city}
                onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
              />
            </Field>
            <Field label="İlçe">
              <input
                className={inputClassName()}
                value={form.district}
                onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))}
              />
            </Field>
            <Field label="Kademe / Tür" className="md:col-span-2">
              <input
                className={inputClassName()}
                value={form.gradeLevel}
                onChange={(event) =>
                  setForm((current) => ({ ...current, gradeLevel: event.target.value }))
                }
                placeholder="İlkokul / Özel eğitim sınıfı / Ortaöğretim alan zümresi"
              />
            </Field>
          </div>
        </WorkspacePanel>
      ) : null}

      {workspace === "participants" ? (
        <WorkspacePanel
          eyebrow="Katılımcılar"
          title="İmza ve görev bilgilerini girin"
          description="Katılımcıları satır satır veya virgülle ayırarak yazabilirsiniz."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={documentType === "sok" ? "Kurul başkanı" : "Zümre başkanı"}>
              <input
                className={inputClassName()}
                value={form.chairpersonName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, chairpersonName: event.target.value }))
                }
              />
            </Field>
            <Field label="Yazman">
              <input
                className={inputClassName()}
                value={form.recorderName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, recorderName: event.target.value }))
                }
              />
            </Field>
            <Field label="Müdür / Onaylayan">
              <input
                className={inputClassName()}
                value={form.principalName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, principalName: event.target.value }))
                }
              />
            </Field>
            <Field label="Onaylayan unvanı">
              <input
                className={inputClassName()}
                value={form.principalTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, principalTitle: event.target.value }))
                }
              />
            </Field>
            <Field label="Katılımcılar" className="md:col-span-2">
              <textarea
                className={`${inputClassName()} min-h-36`}
                value={form.participants}
                onChange={(event) =>
                  setForm((current) => ({ ...current, participants: event.target.value }))
                }
                placeholder="Ad Soyad&#10;Ad Soyad"
              />
            </Field>
          </div>
        </WorkspacePanel>
      ) : null}

      {workspace === "agenda" ? (
        <WorkspacePanel
          eyebrow="Gündem"
          title="Yönetmelik uyumlu gündem taslağını düzenleyin"
          actions={
            <Button
              variant="ghost"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  agendaItems: [
                    ...current.agendaItems,
                    {
                      sortOrder: current.agendaItems.length,
                      title: "",
                      discussionText: "",
                      decisionText: "",
                    },
                  ],
                }))
              }
            >
              <Plus className="size-4" />
              Madde ekle
            </Button>
          }
        >
          <div className="grid gap-3">
            {form.agendaItems.map((item, index) => (
              <div key={`${item.id ?? "new"}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="grid gap-3 md:grid-cols-[80px_1fr_auto] md:items-end">
                  <Field label="Sıra">
                    <input className={inputClassName()} value={index + 1} readOnly />
                  </Field>
                  <Field label="Gündem başlığı">
                    <input
                      className={inputClassName()}
                      value={item.title}
                      onChange={(event) => updateAgendaItem(index, { title: event.target.value })}
                    />
                  </Field>
                  <Button
                    variant="danger"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        agendaItems:
                          current.agendaItems.length > 1
                            ? current.agendaItems.filter((_, itemIndex) => itemIndex !== index)
                            : current.agendaItems,
                      }))
                    }
                    aria-label="Gündem maddesini sil"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      ) : null}

      {workspace === "decisions" ? (
        <WorkspacePanel
          eyebrow="Kararlar"
          title="Görüşme ve karar metinlerini tamamlayın"
          description="Her gündem maddesi çıktı belgesinde önce görüşme, sonra alınan karar olarak yer alır."
        >
          <div className="grid gap-5">
            {form.agendaItems.map((item, index) => (
              <div key={`${item.id ?? "decision"}-${index}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm font-semibold text-white">
                  {index + 1}. {item.title || "Başlıksız gündem maddesi"}
                </div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Görüşme metni" className="md:col-span-2">
                    <textarea
                      className={`${inputClassName()} min-h-28`}
                      value={item.discussionText}
                      onChange={(event) =>
                        updateAgendaItem(index, { discussionText: event.target.value })
                      }
                    />
                  </Field>
                  <Field label="Alınan karar" className="md:col-span-2">
                    <textarea
                      className={`${inputClassName()} min-h-24`}
                      value={item.decisionText}
                      onChange={(event) => updateAgendaItem(index, { decisionText: event.target.value })}
                    />
                  </Field>
                </div>
              </div>
            ))}
          </div>
        </WorkspacePanel>
      ) : null}

      {workspace === "output" ? (
        <WorkspacePanel
          eyebrow="Çıktı"
          title="Taslağı kaydedin ve resmi çıktıyı alın"
          description="PDF çıktısı evrak doğrulama arşivine kaydedilir; DOCX düzenlenebilir Word çıktısıdır."
        >
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <CheckCircle2 className="size-4" />
                Yönetmelik kontrolü
              </div>
              <div className="mt-3 grid gap-2">
                {complianceItems.map((item) => (
                  <div key={item} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm leading-6 text-neutral-300">
                    {item}
                  </div>
                ))}
              </div>
              <Field label="Ek uyumluluk / zorunlu durum notu" className="mt-4">
                <textarea
                  className={`${inputClassName()} min-h-24`}
                  value={form.complianceNotes}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, complianceNotes: event.target.value }))
                  }
                />
              </Field>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-semibold text-white">Çıktı işlemleri</div>
              <div className="mt-3 grid gap-3">
                <Button disabled={isPending} onClick={() => saveDocument("draft")}>
                  {isPending ? "Kaydediliyor..." : "Taslak kaydet"}
                </Button>
                <Button disabled={isPending} variant="secondary" onClick={() => saveDocument("completed")}>
                  Tamamlandı işaretle
                </Button>
                {form.id ? (
                  <>
                    <Link href={`/api/pdf/zumre/${form.id}`} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[color:var(--panel-text)] px-4 py-2.5 text-sm font-semibold text-[#09090b] transition hover:bg-white">
                      <FileDown className="size-4" />
                      PDF al
                    </Link>
                    <Link href={`/api/docx/zumre/${form.id}`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[color:var(--panel-border)] px-4 py-2.5 text-sm font-semibold text-[color:var(--panel-text-muted)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]">
                      <FileDown className="size-4" />
                      DOCX al
                    </Link>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm leading-6 text-neutral-500">
                    Çıktı almak için önce taslağı kaydedin.
                  </div>
                )}
              </div>
              {feedback ? <div className="mt-3 text-sm text-neutral-400">{feedback}</div> : null}
            </div>
          </div>
        </WorkspacePanel>
      ) : null}

      <WorkspacePanel
        eyebrow="Kayıtlar"
        title={documentType === "sok" ? "ŞÖK tutanakları" : "Zümre tutanakları"}
        actions={<Button variant="ghost" onClick={resetForm}>Yeni tutanak</Button>}
      >
        <div className="grid gap-3">
          {documents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-neutral-500">
              {documentType === "sok" ? "Henüz ŞÖK tutanağı yok." : "Henüz zümre tutanağı yok."}
            </div>
          ) : (
            documents.map((document) => (
              <div key={document.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{document.title}</div>
                    <div className="mt-1 text-sm text-neutral-500">
                      {formatZumreDate(new Date(document.meetingDate))} /{" "}
                      {getZumreMeetingTypeLabel(document.meetingType)} / {document.status === "draft" ? "Taslak" : "Tamamlandı"}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setForm(buildFormFromRecord(document));
                        setWorkspace("kunye");
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="danger"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await deleteZumreMeetingDocumentAction({ id: document.id });
                          showResult(result, {
                            successTitle: "Zümre tutanağı silindi",
                            errorTitle: "Zümre tutanağı silinemedi",
                          });
                          if (result.success) {
                            if (form.id === document.id) resetForm();
                            router.refresh();
                          }
                        })
                      }
                    >
                      Sil
                    </Button>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-neutral-400 md:grid-cols-3">
                  <div>{documentType === "sok" ? "Şube" : "Zümre"}: {document.zumreName}</div>
                  <div>Katılımcı: {splitZumreParticipants(document.participants).length}</div>
                  <div>Gündem: {document.agendaItems.length}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </WorkspacePanel>
    </div>
  );
}
