"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteInstitutionTransportPlanAction,
  saveInstitutionTransportPlanAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";
import type { InstitutionTransportPlanInput } from "@/lib/schemas";

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string | null;
};

type TransportRecord = {
  id: string;
  title: string;
  serviceType: string;
  routeName: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  daysLabel: string | null;
  timeLabel: string | null;
  vehicleLabel: string | null;
  companionName: string | null;
  companionPhone: string | null;
  reviewDate: Date | null;
  notes: string | null;
  status: "active" | "paused" | "completed";
  createdAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  } | null;
};

const statusLabels: Record<TransportRecord["status"], string> = {
  active: "Aktif",
  paused: "Beklemede",
  completed: "Tamamlandi",
};

const emptyForm = (): InstitutionTransportPlanInput => ({
  studentId: "",
  title: "",
  serviceType: "",
  routeName: "",
  pickupAddress: "",
  dropoffAddress: "",
  daysLabel: "",
  timeLabel: "",
  vehicleLabel: "",
  companionName: "",
  companionPhone: "",
  reviewDate: "",
  notes: "",
  status: "active",
});

function SummaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-neutral-300">
      {children}
    </span>
  );
}

export function InstitutionTransportBoard({
  students,
  records,
  totalCount,
  activeCount,
  pausedCount,
  reviewDueCount,
}: {
  students: StudentOption[];
  records: TransportRecord[];
  totalCount: number;
  activeCount: number;
  pausedCount: number;
  reviewDueCount: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<InstitutionTransportPlanInput>(emptyForm());
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  function resetForm() {
    setForm(emptyForm());
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <div className="text-sm text-neutral-500">Toplam plan</div>
          <div className="mt-3 text-4xl font-semibold text-white">{totalCount}</div>
          <div className="mt-2 text-sm text-neutral-400">Taşıma ve servis kayıtları</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-500">Aktif kullanim</div>
          <div className="mt-3 text-4xl font-semibold text-white">{activeCount}</div>
          <div className="mt-2 text-sm text-neutral-400">Devam eden planlar</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-500">Bekleyen plan</div>
          <div className="mt-3 text-4xl font-semibold text-white">{pausedCount}</div>
          <div className="mt-2 text-sm text-neutral-400">Tekrar ele alinacak kayıtlar</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-500">Yaklasan takip</div>
          <div className="mt-3 text-4xl font-semibold text-white">{reviewDueCount}</div>
          <div className="mt-2 text-sm text-neutral-400">30 gun içinde gozden gecirilecek</div>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
            Yeni Plan
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">Taşıma ve servis düzeni</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Ogrenciye bağlı servis akisini, saatleri ve eslik bilgisini burada tutun.
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
                    status: event.target.value as InstitutionTransportPlanInput["status"],
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

            <Field label="Plan basligi" className="md:col-span-2">
              <input
                className={inputClassName()}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Örnek: Sabah servis plani"
              />
            </Field>

            <Field label="Hizmet tipi">
              <input
                className={inputClassName()}
                value={form.serviceType}
                onChange={(event) =>
                  setForm((current) => ({ ...current, serviceType: event.target.value }))
                }
                placeholder="Servis, refakat, kurum araci..."
              />
            </Field>

            <Field label="Hat / guzergah">
              <input
                className={inputClassName()}
                value={form.routeName ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, routeName: event.target.value }))
                }
              />
            </Field>

            <Field label="Gunler">
              <input
                className={inputClassName()}
                value={form.daysLabel ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, daysLabel: event.target.value }))
                }
                placeholder="Pzt-Cuma"
              />
            </Field>

            <Field label="Saat">
              <input
                className={inputClassName()}
                value={form.timeLabel ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, timeLabel: event.target.value }))
                }
                placeholder="07:45 / 16:10"
              />
            </Field>

            <Field label="Arac / servis bilgisi">
              <input
                className={inputClassName()}
                value={form.vehicleLabel ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, vehicleLabel: event.target.value }))
                }
              />
            </Field>

            <Field label="Eşlik eden kisi">
              <input
                className={inputClassName()}
                value={form.companionName ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, companionName: event.target.value }))
                }
              />
            </Field>

            <Field label="Telefon">
              <input
                className={inputClassName()}
                value={form.companionPhone ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, companionPhone: event.target.value }))
                }
              />
            </Field>

            <Field label="Takip tarihi">
              <input
                type="date"
                className={inputClassName()}
                value={form.reviewDate ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reviewDate: event.target.value }))
                }
              />
            </Field>

            <Field label="Alis noktasi" className="md:col-span-2">
              <textarea
                rows={3}
                className={inputClassName()}
                value={form.pickupAddress ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, pickupAddress: event.target.value }))
                }
              />
            </Field>

            <Field label="Birakis noktasi" className="md:col-span-2">
              <textarea
                rows={3}
                className={inputClassName()}
                value={form.dropoffAddress ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, dropoffAddress: event.target.value }))
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
                  const result = await saveInstitutionTransportPlanAction(form);
                  setMessage(result.message);
                  showResult(result, {
                    successTitle: form.id ? "Plan guncellendi" : "Plan eklendi",
                    errorTitle: form.id ? "Plan guncellenemedi" : "Plan eklenemedi",
                  });
                  if (result.success) {
                    resetForm();
                    router.refresh();
                  }
                });
              }}
            >
              {isPending ? "Kaydediliyor..." : form.id ? "Plani Güncelle" : "Plan Ekle"}
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
            Planlar
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">Kayitli taşıma düzeni</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Hat, saat ve kisi bilgisini acip ihtiyac oldugunda guncelleyebilirsiniz.
          </p>

          <div className="mt-6 grid gap-3">
            {records.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
                Henüz taşıma veya servis plani eklenmedi.
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
                    <SummaryPill key="type">{record.serviceType}</SummaryPill>,
                    <SummaryPill key="status">{statusLabels[record.status]}</SummaryPill>,
                    <SummaryPill key="time">{record.timeLabel || "Saat eklenmedi"}</SummaryPill>,
                    <SummaryPill key="review">
                      Takip: {record.reviewDate ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(record.reviewDate)) : "-"}
                    </SummaryPill>,
                  ]}
                  className="rounded-[var(--panel-radius-card)]"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Guzergah</div>
                      <div className="mt-1">{record.routeName || "-"}</div>
                    </div>
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Gunler</div>
                      <div className="mt-1">{record.daysLabel || "-"}</div>
                    </div>
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Servis bilgisi</div>
                      <div className="mt-1">{record.vehicleLabel || "-"}</div>
                    </div>
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Eşlik eden kisi</div>
                      <div className="mt-1">
                        {record.companionName || "-"}
                        {record.companionPhone ? ` / ${record.companionPhone}` : ""}
                      </div>
                    </div>
                    <div className="text-sm text-neutral-300">
                      <div className="font-semibold text-white">Takip tarihi</div>
                      <div className="mt-1">
                        {record.reviewDate
                          ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(
                              new Date(record.reviewDate),
                            )
                          : "-"}
                      </div>
                    </div>
                  </div>

                  {record.pickupAddress || record.dropoffAddress ? (
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-neutral-300">
                        <div className="font-semibold text-white">Alis noktasi</div>
                        <div className="mt-2 whitespace-pre-line">{record.pickupAddress || "-"}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm text-neutral-300">
                        <div className="font-semibold text-white">Birakis noktasi</div>
                        <div className="mt-2 whitespace-pre-line">{record.dropoffAddress || "-"}</div>
                      </div>
                    </div>
                  ) : null}

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
                          serviceType: record.serviceType,
                          routeName: record.routeName ?? "",
                          pickupAddress: record.pickupAddress ?? "",
                          dropoffAddress: record.dropoffAddress ?? "",
                          daysLabel: record.daysLabel ?? "",
                          timeLabel: record.timeLabel ?? "",
                          vehicleLabel: record.vehicleLabel ?? "",
                          companionName: record.companionName ?? "",
                          companionPhone: record.companionPhone ?? "",
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
                            title: "Taşıma Servis Planını Sil",
                            message: `"${record.title}" isimli taşıma servis planını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                            variant: "danger",
                            confirmText: "Kalıcı Olarak Sil",
                            cancelText: "Vazgeç",
                          });

                          if (!confirmed) return;

                          startTransition(async () => {
                            const result = await deleteInstitutionTransportPlanAction({ id: record.id });
                            setMessage(result.message);
                            showResult(result, {
                              successTitle: "Plan silindi",
                              errorTitle: "Plan silinemedi",
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
