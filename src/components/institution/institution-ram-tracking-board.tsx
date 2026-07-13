"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteInstitutionRamTrackingAction,
  saveInstitutionRamTrackingAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";
import type { InstitutionRamTrackingInput } from "@/lib/schemas";

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string | null;
};

type RamRecord = {
  id: string;
  title: string;
  reportNumber: string | null;
  supportCategory: string | null;
  reportDate: Date;
  validUntil: Date | null;
  weeklyIndividualHours: number;
  weeklyGroupHours: number;
  monthlyIndividualHours: number | null;
  monthlyGroupHours: number | null;
  monthlyMakeupHours: number;
  reviewDate: Date | null;
  notes: string | null;
  status: "active" | "review_due" | "expired" | "archived";
  createdAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  } | null;
};

const statusLabels: Record<RamRecord["status"], string> = {
  active: "Aktif",
  review_due: "Takip zamani",
  expired: "Süresi doldu",
  archived: "Arşiv",
};

const emptyForm = (): InstitutionRamTrackingInput => ({
  studentId: "",
  title: "",
  reportNumber: "",
  supportCategory: "",
  reportDate: new Date().toISOString().slice(0, 10),
  validUntil: "",
  weeklyIndividualHours: 0,
  weeklyGroupHours: 0,
  monthlyIndividualHours: undefined,
  monthlyGroupHours: undefined,
  monthlyMakeupHours: 0,
  reviewDate: "",
  notes: "",
  status: "active",
});

function formatDate(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
}

function SummaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-neutral-300">
      {children}
    </span>
  );
}

export function InstitutionRamTrackingBoard({
  students,
  records,
  totalCount,
  expiringSoonCount,
  expiredCount,
}: {
  students: StudentOption[];
  records: RamRecord[];
  totalCount: number;
  expiringSoonCount: number;
  expiredCount: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<InstitutionRamTrackingInput>(emptyForm());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  function resetForm() {
    setForm(emptyForm());
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-neutral-500">Toplam kayıt</div>
          <div className="mt-3 text-4xl font-semibold text-white">{totalCount}</div>
          <div className="mt-2 text-sm text-neutral-400">Kurumdaki RAM geçmişi</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-500">Yaklasan süre</div>
          <div className="mt-3 text-4xl font-semibold text-white">{expiringSoonCount}</div>
          <div className="mt-2 text-sm text-neutral-400">30 gun içinde yenilenecek</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-500">Süresi dolan</div>
          <div className="mt-3 text-4xl font-semibold text-white">{expiredCount}</div>
          <div className="mt-2 text-sm text-neutral-400">Yeniden ele alinacak kayıt</div>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
            Yeni Kayıt
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">RAM raporu ve süre bilgisi</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Ogrenciye bağlı rapor tarihlerini ve destek suresini buradan takip edin.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Öğrenci">
              <select
                className={inputClassName()}
                value={form.studentId ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, studentId: event.target.value }))
                }
              >
                <option value="">Öğrenci seçin</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                    {student.classroom ? ` / ${student.classroom}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Durum">
              <select
                className={inputClassName()}
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    status: event.target.value as InstitutionRamTrackingInput["status"],
                  }))
                }
              >
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kayıt basligi" className="md:col-span-2">
              <input
                className={inputClassName()}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Örnek: 2026 RAM raporu"
              />
            </Field>

            <Field label="Rapor numarasi">
              <input
                className={inputClassName()}
                value={form.reportNumber ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reportNumber: event.target.value }))
                }
              />
            </Field>

            <Field label="Destek alani">
              <input
                className={inputClassName()}
                value={form.supportCategory ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, supportCategory: event.target.value }))
                }
                placeholder="Bireysel, grup, dil-konusma..."
              />
            </Field>

            <Field label="Rapor tarihi">
              <input
                type="date"
                className={inputClassName()}
                value={form.reportDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reportDate: event.target.value }))
                }
              />
            </Field>

            <Field label="Geçerlilik tarihi">
              <input
                type="date"
                className={inputClassName()}
                value={form.validUntil ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, validUntil: event.target.value }))
                }
              />
            </Field>

            <Field label="Haftalık bireysel saat">
              <input
                type="number"
                min="0"
                className={inputClassName()}
                value={form.weeklyIndividualHours}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weeklyIndividualHours: Number(event.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Haftalık grup saat">
              <input
                type="number"
                min="0"
                className={inputClassName()}
                value={form.weeklyGroupHours}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    weeklyGroupHours: Number(event.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Aylik bireysel ders limiti">
              <input
                type="number"
                min="0"
                className={inputClassName()}
                value={form.monthlyIndividualHours ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthlyIndividualHours: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  }))
                }
                placeholder="Bos ise haftalık x 4"
              />
            </Field>

            <Field label="Aylik grup ders limiti">
              <input
                type="number"
                min="0"
                className={inputClassName()}
                value={form.monthlyGroupHours ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthlyGroupHours: event.target.value
                      ? Number(event.target.value)
                      : undefined,
                  }))
                }
                placeholder="Bos ise haftalık x 4"
              />
            </Field>

            <Field label="Aylik telafi ders limiti" className="md:col-span-2">
              <input
                type="number"
                min="0"
                className={inputClassName()}
                value={form.monthlyMakeupHours}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthlyMakeupHours: Number(event.target.value),
                  }))
                }
              />
            </Field>

            <Field label="Bir sonraki takip tarihi" className="md:col-span-2">
              <input
                type="date"
                className={inputClassName()}
                value={form.reviewDate ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reviewDate: event.target.value }))
                }
              />
            </Field>

            <Field label="Notlar" className="md:col-span-2">
              <textarea
                rows={5}
                className={inputClassName()}
                value={form.notes ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await saveInstitutionRamTrackingAction(form);
                  setMessage(result.message);
                  showResult(result, {
                    successTitle: form.id ? "RAM kaydı guncellendi" : "RAM kaydı eklendi",
                    errorTitle: form.id ? "RAM kaydı guncellenemedi" : "RAM kaydı eklenemedi",
                  });
                  if (result.success) {
                    resetForm();
                    router.refresh();
                  }
                });
              }}
            >
              {isPending ? "Kaydediliyor..." : form.id ? "Kaydı Güncelle" : "Kaydı Ekle"}
            </Button>
            {form.id ? (
              <Button variant="ghost" onClick={resetForm}>
                Vazgec
              </Button>
            ) : null}
          </div>

          {message ? <div className="mt-3 text-sm text-neutral-400">{message}</div> : null}
        </Card>

        <Card>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
            Kayitlar
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">Mevcut RAM takibi</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Kayitlari tek tek acip tarihleri, saatleri ve notlari duzenleyebilirsiniz.
          </p>

          <div className="mt-6 grid gap-3">
            {records.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
                Henüz RAM takibi eklenmedi.
              </div>
            ) : (
              records.map((record) => (
                <DisclosureCard
                  key={record.id}
                  title={record.title}
                  description={
                    record.student
                      ? `${record.student.firstName} ${record.student.lastName}`
                      : "Öğrenci bağlantısı olmadan kaydedildi."
                  }
                  summary={[
                    <SummaryPill key="status">{statusLabels[record.status]}</SummaryPill>,
                    <SummaryPill key="date">{formatDate(record.reportDate)}</SummaryPill>,
                    <SummaryPill key="hours">
                      {record.weeklyIndividualHours + record.weeklyGroupHours} saat
                    </SummaryPill>,
                  ]}
                  className="rounded-[var(--panel-radius-card)]"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Rapor numarasi</div>
                      <div className="mt-1">{record.reportNumber || "-"}</div>
                    </div>
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Destek alani</div>
                      <div className="mt-1">{record.supportCategory || "-"}</div>
                    </div>
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Geçerlilik</div>
                      <div className="mt-1">{formatDate(record.validUntil)}</div>
                    </div>
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Bir sonraki takip</div>
                      <div className="mt-1">{formatDate(record.reviewDate)}</div>
                    </div>
                    <div className="text-sm text-neutral-300 md:col-span-2">
                      <div className="font-semibold text-white">Aylik hak limitleri</div>
                      <div className="mt-1">
                        Bireysel {record.monthlyIndividualHours ?? record.weeklyIndividualHours * 4},
                        grup {record.monthlyGroupHours ?? record.weeklyGroupHours * 4}, telafi{" "}
                        {record.monthlyMakeupHours}
                      </div>
                    </div>
                  </div>

                  {record.notes ? (
                    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-neutral-300">
                      {record.notes}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          id: record.id,
                          studentId: record.student?.id ?? "",
                          title: record.title,
                          reportNumber: record.reportNumber ?? "",
                          supportCategory: record.supportCategory ?? "",
                          reportDate: new Date(record.reportDate).toISOString().slice(0, 10),
                          validUntil: record.validUntil
                            ? new Date(record.validUntil).toISOString().slice(0, 10)
                            : "",
                          weeklyIndividualHours: record.weeklyIndividualHours,
                          weeklyGroupHours: record.weeklyGroupHours,
                          monthlyIndividualHours: record.monthlyIndividualHours ?? undefined,
                          monthlyGroupHours: record.monthlyGroupHours ?? undefined,
                          monthlyMakeupHours: record.monthlyMakeupHours,
                          reviewDate: record.reviewDate
                            ? new Date(record.reviewDate).toISOString().slice(0, 10)
                            : "",
                          notes: record.notes ?? "",
                          status: record.status,
                        })
                      }
                    >
                      Düzenle
                    </Button>
                    <Button
                      variant="danger"
                      disabled={isPending}
                      onClick={() => {
                        (async () => {
                          const confirmed = await confirmModal({
                            title: "RAM Kaydını Sil",
                            message: `"${record.title}" isimli RAM takip kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                            variant: "danger",
                            confirmText: "Kalıcı Olarak Sil",
                            cancelText: "Vazgeç",
                          });

                          if (!confirmed) return;

                          startTransition(async () => {
                            const result = await deleteInstitutionRamTrackingAction({ id: record.id });
                            setMessage(result.message);
                            showResult(result, {
                              successTitle: "RAM kaydı silindi",
                              errorTitle: "RAM kaydı silinemedi",
                            });
                            if (result.success) {
                              if (form.id === record.id) {
                                resetForm();
                              }
                              router.refresh();
                            }
                          });
                        })();
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                </DisclosureCard>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
