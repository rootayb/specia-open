"use client";

import { useState, useTransition } from "react";
import type {
  CoordinationActionStatus,
  CoordinationMeetingStatus,
  CoordinationMeetingType,
} from "@/lib/prisma-shim";
import { CheckSquare, FileText, History } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteCoordinationMeetingAction,
  saveCoordinationMeetingAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { WorkspaceCardGrid } from "@/components/ui/workspace-switcher";

const meetingTypeLabels: Record<CoordinationMeetingType, string> = {
  parent_meeting: "Veli Görüşmesi",
  ram_meeting: "RAM Toplantısı",
  coordination: "Koordinasyon Toplantısı",
  other: "Diger",
};

const meetingStatusLabels: Record<CoordinationMeetingStatus, string> = {
  planned: "Planlandi",
  completed: "Tamamlandi",
  cancelled: "Iptal",
};

const actionStatusLabels: Record<CoordinationActionStatus, string> = {
  open: "Acik",
  completed: "Tamamlandi",
  cancelled: "Iptal",
};

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string | null;
};

type MeetingRecord = {
  id: string;
  title: string;
  meetingType: CoordinationMeetingType;
  status: CoordinationMeetingStatus;
  scheduledAt: Date;
  location: string | null;
  participants: string | null;
  summary: string | null;
  decisions: string | null;
  followUpPlan: string | null;
  nextMeetingAt: Date | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  } | null;
  actionItems: {
    id: string;
    sortOrder: number;
    title: string;
    ownerLabel: string | null;
    dueDate: Date | null;
    status: CoordinationActionStatus;
    notes: string | null;
  }[];
};

type ActionItemForm = {
  id?: string;
  sortOrder: number;
  title: string;
  ownerLabel: string;
  dueDate: string;
  status: CoordinationActionStatus;
  notes: string;
};

type MeetingForm = {
  id: string;
  studentId: string;
  title: string;
  meetingType: CoordinationMeetingType;
  status: CoordinationMeetingStatus;
  scheduledAt: string;
  location: string;
  participants: string;
  summary: string;
  decisions: string;
  followUpPlan: string;
  nextMeetingAt: string;
  actionItems: ActionItemForm[];
};

type WorkspaceId = "meeting" | "actions" | "history";

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateTimeInput(value?: Date | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function buildEmptyActionItem(sortOrder = 0): ActionItemForm {
  return {
    sortOrder,
    title: "",
    ownerLabel: "",
    dueDate: "",
    status: "open",
    notes: "",
  };
}

function buildEmptyMeetingForm(): MeetingForm {
  return {
    id: "",
    studentId: "",
    title: "",
    meetingType: "parent_meeting",
    status: "planned",
    scheduledAt: formatDateTimeInput(new Date()),
    location: "",
    participants: "",
    summary: "",
    decisions: "",
    followUpPlan: "",
    nextMeetingAt: "",
    actionItems: [buildEmptyActionItem(0)],
  };
}

function buildMeetingForm(meeting: MeetingRecord): MeetingForm {
  return {
    id: meeting.id,
    studentId: meeting.student?.id ?? "",
    title: meeting.title,
    meetingType: meeting.meetingType,
    status: meeting.status,
    scheduledAt: formatDateTimeInput(meeting.scheduledAt),
    location: meeting.location ?? "",
    participants: meeting.participants ?? "",
    summary: meeting.summary ?? "",
    decisions: meeting.decisions ?? "",
    followUpPlan: meeting.followUpPlan ?? "",
    nextMeetingAt: formatDateTimeInput(meeting.nextMeetingAt),
    actionItems:
      meeting.actionItems.length > 0
        ? meeting.actionItems.map((item) => ({
            id: item.id,
            sortOrder: item.sortOrder,
            title: item.title,
            ownerLabel: item.ownerLabel ?? "",
            dueDate: item.dueDate ? item.dueDate.toISOString().slice(0, 10) : "",
            status: item.status,
            notes: item.notes ?? "",
          }))
        : [buildEmptyActionItem(0)],
  };
}

export function CoordinationMeetingBoard({
  students,
  meetings,
  canManage = true,
}: {
  students: StudentOption[];
  meetings: MeetingRecord[];
  canManage?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<MeetingForm>(buildEmptyMeetingForm());
  const [feedback, setFeedback] = useState("");
  const [workspace, setWorkspace] = useState<WorkspaceId>(canManage ? "history" : "history");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const resetForm = () => {
    setForm(buildEmptyMeetingForm());
    setFeedback("");
  };

  const saveMeeting = () => {
    startTransition(async () => {
      const result = await saveCoordinationMeetingAction({
        ...form,
        studentId: form.studentId || undefined,
        actionItems: form.actionItems
          .filter((item) => item.title.trim().length > 0)
          .map((item, index) => ({
            ...item,
            sortOrder: index,
          })),
      });

      setFeedback(result.message);
      showResult(result, {
        successTitle: form.id ? "Toplantı guncellendi" : "Toplantı kaydedildi",
        errorTitle: form.id ? "Toplantı guncellenemedi" : "Toplantı kaydedilemedi",
      });
      if (result.success) {
        resetForm();
        router.refresh();
      }
    });
  };

  const workspaceCards: {
    id: WorkspaceId;
    icon: typeof FileText;
    title: string;
    description: string;
    value: string;
  }[] = [];

  if (canManage) {
    workspaceCards.push(
      {
        id: "meeting",
        icon: FileText,
        title: "Toplantı Bilgileri",
        description: "Toplantı konusu, tarih, katilimcilar ve temel notlari duzenleyin.",
        value: form.id ? "Duzenlenen kayıt acik" : "Yeni toplantı hazir",
      },
      {
        id: "actions",
        icon: CheckSquare,
        title: "Takip Maddeleri",
        description: "Toplantı sonrası yapilacaklari tek tek planlayin.",
        value: `${form.actionItems.filter((item) => item.title.trim().length > 0).length} madde`,
      },
    );
  }

  workspaceCards.push({
    id: "history",
    icon: History,
    title: "Kayıtlar",
    description: "Geçmiş görüşmeleri inceleyin, duzenleyin ve süreci takip edin.",
    value: `${meetings.length} toplantı`,
  });

  return (
    <div className="grid gap-6">
      <WorkspaceCardGrid
        items={workspaceCards}
        activeId={workspace}
        onChange={(nextWorkspace) => setWorkspace(nextWorkspace as WorkspaceId)}
        className={canManage ? "2xl:grid-cols-3" : "2xl:grid-cols-1"}
      />

      {canManage && (workspace === "meeting" || workspace === "actions") ? (
        <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {workspace === "meeting" ? "Toplantı Bilgileri" : "Takip Maddeleri"}
          </div>
          <div className="mt-2 text-lg font-semibold text-white">
            {workspace === "meeting"
              ? "Toplantı akışını netlestirin"
              : "Toplantı sonrası yapilacaklari planlayin"}
          </div>

          {workspace === "meeting" ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Toplantı basligi" className="md:col-span-2">
              <input
                className={inputClassName()}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Or. RAM değerlendirme toplantısı"
              />
            </Field>
            <Field label="Öğrenci">
              <select
                className={inputClassName()}
                value={form.studentId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, studentId: event.target.value }))
                }
              >
                <option value="">Öğrenci seçin (opsiyonel)</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                    {student.classroom ? ` / ${student.classroom}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Toplantı tipi">
              <select
                className={inputClassName()}
                value={form.meetingType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    meetingType: event.target.value as CoordinationMeetingType,
                  }))
                }
              >
                {Object.entries(meetingTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Toplantı tarihi">
              <input
                type="datetime-local"
                className={inputClassName()}
                value={form.scheduledAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, scheduledAt: event.target.value }))
                }
              />
            </Field>
            <Field label="Durum">
              <select
                className={inputClassName()}
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as CoordinationMeetingStatus,
                  }))
                }
              >
                {Object.entries(meetingStatusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Konum / Kanal" className="md:col-span-2">
              <input
                className={inputClassName()}
                value={form.location}
                onChange={(event) =>
                  setForm((current) => ({ ...current, location: event.target.value }))
                }
                placeholder="Okul gorusme odasi / Online / RAM"
              />
            </Field>
            <Field label="Katilimcilar" className="md:col-span-2">
              <textarea
                className={`${inputClassName()} min-h-20`}
                value={form.participants}
                onChange={(event) =>
                  setForm((current) => ({ ...current, participants: event.target.value }))
                }
                placeholder="Öğretmen, veli, rehberlik, RAM uzmani..."
              />
            </Field>
            <Field label="Görüşme özeti" className="md:col-span-2">
              <textarea
                className={`${inputClassName()} min-h-24`}
                value={form.summary}
                onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))}
                placeholder="Ele alinan basliklar, öğrenci durumu, paylasilan bilgiler"
              />
            </Field>
            <Field label="Alinan kararlar" className="md:col-span-2">
              <textarea
                className={`${inputClassName()} min-h-24`}
                value={form.decisions}
                onChange={(event) =>
                  setForm((current) => ({ ...current, decisions: event.target.value }))
                }
                placeholder="Kararlar, yonlendirmeler, uzerinde uzlasilan adimlar"
              />
            </Field>
            <Field label="Takip plani" className="md:col-span-2">
              <textarea
                className={`${inputClassName()} min-h-24`}
                value={form.followUpPlan}
                onChange={(event) =>
                  setForm((current) => ({ ...current, followUpPlan: event.target.value }))
                }
                placeholder="Bir sonraki görüşmeye kadar yapilacaklar"
              />
            </Field>
            <Field label="Sonraki toplantı tarihi" className="md:col-span-2">
              <input
                type="datetime-local"
                className={inputClassName()}
                value={form.nextMeetingAt}
                onChange={(event) =>
                  setForm((current) => ({ ...current, nextMeetingAt: event.target.value }))
                }
              />
            </Field>
          </div>
          ) : null}

          {workspace === "actions" ? (
          <div className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Takip Maddeleri
                </div>
                <div className="mt-1 text-sm text-neutral-400">
                  Toplantı sonrası sorumluluk ve karar maddeleri
                </div>
              </div>
              <Button
                variant="ghost"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    actionItems: [
                      ...current.actionItems,
                      buildEmptyActionItem(current.actionItems.length),
                    ],
                  }))
                }
              >
                Madde Ekle
              </Button>
            </div>

            <div className="mt-4 grid gap-4">
              {form.actionItems.map((item, index) => (
                <div
                  key={`${item.id ?? "new"}-${index}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Takip maddesi" className="md:col-span-2">
                      <input
                        className={inputClassName()}
                        value={item.title}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            actionItems: current.actionItems.map((actionItem, actionIndex) =>
                              actionIndex === index
                                ? { ...actionItem, title: event.target.value }
                                : actionItem,
                            ),
                          }))
                        }
                        placeholder="Or. RAM raporu eklenecek"
                      />
                    </Field>
                    <Field label="Sorumlu">
                      <input
                        className={inputClassName()}
                        value={item.ownerLabel}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            actionItems: current.actionItems.map((actionItem, actionIndex) =>
                              actionIndex === index
                                ? { ...actionItem, ownerLabel: event.target.value }
                                : actionItem,
                            ),
                          }))
                        }
                        placeholder="Veli / Ogretmen / Rehberlik"
                      />
                    </Field>
                    <Field label="Hedef tarih">
                      <input
                        type="date"
                        className={inputClassName()}
                        value={item.dueDate}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            actionItems: current.actionItems.map((actionItem, actionIndex) =>
                              actionIndex === index
                                ? { ...actionItem, dueDate: event.target.value }
                                : actionItem,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Durum">
                      <select
                        className={inputClassName()}
                        value={item.status}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            actionItems: current.actionItems.map((actionItem, actionIndex) =>
                              actionIndex === index
                                ? {
                                    ...actionItem,
                                    status: event.target.value as CoordinationActionStatus,
                                  }
                                : actionItem,
                            ),
                          }))
                        }
                      >
                        {Object.entries(actionStatusLabels).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Not" className="md:col-span-2">
                      <textarea
                        className={`${inputClassName()} min-h-20`}
                        value={item.notes}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            actionItems: current.actionItems.map((actionItem, actionIndex) =>
                              actionIndex === index
                                ? { ...actionItem, notes: event.target.value }
                                : actionItem,
                            ),
                          }))
                        }
                        placeholder="Ek not veya ilerleme bilgisi"
                      />
                    </Field>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <Button
                      variant="danger"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          actionItems:
                            current.actionItems.length > 1
                              ? current.actionItems.filter((_, actionIndex) => actionIndex !== index)
                              : [buildEmptyActionItem(0)],
                        }))
                      }
                    >
                      Maddeyi Kaldir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button disabled={isPending} onClick={saveMeeting}>
              {isPending ? "Kaydediliyor..." : form.id ? "Toplantıyı Güncelle" : "Toplantıyı Kaydet"}
            </Button>
            {form.id ? (
              <Button variant="ghost" onClick={resetForm}>
                Vazgec
              </Button>
            ) : null}
            {feedback ? <div className="text-sm text-neutral-400">{feedback}</div> : null}
          </div>
        </div>
      ) : null}

      {workspace === "history" ? (
      <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
          {canManage ? "Geçmiş Toplantılar" : "Toplantı Kayıtları"}
        </div>
        <div className="mt-2 text-lg font-semibold text-white">Görüşmeleri tek listede takip edin</div>
        <div className="mt-2 text-sm text-neutral-400">
          Ihtiyaciniz olan kaydı acip ayrintilari inceleyebilir veya duzenleyebilirsiniz.
        </div>
        <div className="mt-4 grid gap-4">
          {meetings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
              Henüz toplanti kaydı yok.
            </div>
          ) : (
            meetings.map((meeting) => (
              <div
                key={meeting.id}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{meeting.title}</div>
                    <div className="mt-1 text-sm text-neutral-500">
                      {meetingTypeLabels[meeting.meetingType]} / {formatDateTime(meeting.scheduledAt)}
                    </div>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setWorkspace("meeting");
                          setForm(buildMeetingForm(meeting));
                        }}
                      >
                        Düzenle
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteCoordinationMeetingAction({ id: meeting.id });
                            setFeedback(result.message);
                            showResult(result, {
                              successTitle: "Toplantı silindi",
                              errorTitle: "Toplantı silinemedi",
                            });
                            if (result.success) {
                              if (form.id === meeting.id) {
                                resetForm();
                              }
                              router.refresh();
                            }
                          })
                        }
                      >
                        Sil
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 grid gap-2 text-sm text-neutral-400 md:grid-cols-2">
                  <div>Durum: {meetingStatusLabels[meeting.status]}</div>
                  <div>Olusturan: {meeting.createdBy.name}</div>
                  <div>
                    Öğrenci:{" "}
                    {meeting.student
                      ? `${meeting.student.firstName} ${meeting.student.lastName}${
                          meeting.student.classroom ? ` / ${meeting.student.classroom}` : ""
                        }`
                      : "Genel kayıt"}
                  </div>
                  <div>Konum: {meeting.location ?? "-"}</div>
                  <div className="md:col-span-2">
                    Sonraki toplantı:{" "}
                    {meeting.nextMeetingAt ? formatDateTime(meeting.nextMeetingAt) : "-"}
                  </div>
                </div>

                {meeting.participants ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-neutral-300">
                    <div className="mb-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Katilimcilar
                    </div>
                    {meeting.participants}
                  </div>
                ) : null}

                {meeting.summary ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-neutral-300">
                    <div className="mb-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Görüşme Özeti
                    </div>
                    {meeting.summary}
                  </div>
                ) : null}

                {meeting.decisions ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-neutral-300">
                    <div className="mb-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Alinan Kararlar
                    </div>
                    {meeting.decisions}
                  </div>
                ) : null}

                {meeting.followUpPlan ? (
                  <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-neutral-300">
                    <div className="mb-1 text-xs uppercase tracking-[0.18em] text-neutral-500">
                      Takip Plani
                    </div>
                    {meeting.followUpPlan}
                  </div>
                ) : null}

                <div className="mt-4">
                  <div className="mb-2 text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Takip Maddeleri
                  </div>
                  {meeting.actionItems.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-neutral-500">
                      Bu toplantı için kayitli takip maddesi yok.
                    </div>
                  ) : (
                    <div className="grid gap-3">
                      {meeting.actionItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="font-medium text-white">{item.title}</div>
                            <div className="text-xs uppercase tracking-[0.18em] text-neutral-400">
                              {actionStatusLabels[item.status]}
                            </div>
                          </div>
                          <div className="mt-2 grid gap-2 text-sm text-neutral-400 md:grid-cols-2">
                            <div>Sorumlu: {item.ownerLabel ?? "-"}</div>
                            <div>
                              Hedef tarih:{" "}
                              {item.dueDate
                                ? new Intl.DateTimeFormat("tr-TR", {
                                    dateStyle: "medium",
                                  }).format(new Date(item.dueDate))
                                : "-"}
                            </div>
                          </div>
                          {item.notes ? (
                            <div className="mt-2 text-sm text-neutral-300">{item.notes}</div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      ) : null}
    </div>
  );
}
