"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deletePlatformStatusIncidentAction,
  deletePlatformStatusIncidentUpdateAction,
  savePlatformStatusIncidentAction,
  savePlatformStatusIncidentUpdateAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import type { PlatformStatusIncidentRecord } from "@/lib/data";

type IncidentStatus = "investigating" | "identified" | "monitoring" | "resolved";

type IncidentFormState = {
  id?: string;
  title: string;
  summary: string;
  serviceLabel: string;
  status: IncidentStatus;
  isActive: boolean;
  startedAt: string;
  resolvedAt: string;
};

type UpdateFormState = {
  id?: string;
  incidentId: string;
  status: IncidentStatus;
  message: string;
};

const statusLabels: Record<IncidentStatus, string> = {
  investigating: "İnceleniyor",
  identified: "Tespit edildi",
  monitoring: "İzleniyor",
  resolved: "Çözüldü",
};

const initialIncidentForm: IncidentFormState = {
  title: "",
  summary: "",
  serviceLabel: "",
  status: "investigating",
  isActive: true,
  startedAt: "",
  resolvedAt: "",
};

function toDatetimeLocalValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function formatDateTime(value?: string | Date | null) {
  if (!value) {
    return "-";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function PlatformStatusIncidentBoard({
  incidents,
}: {
  incidents: PlatformStatusIncidentRecord[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const [incidentForm, setIncidentForm] = useState<IncidentFormState>(initialIncidentForm);
  const [updateForm, setUpdateForm] = useState<UpdateFormState>({
    incidentId: incidents[0]?.id ?? "",
    status: incidents[0]?.status ?? "investigating",
    message: "",
  });

  const activeCount = useMemo(
    () => incidents.filter((incident) => incident.isActive).length,
    [incidents],
  );

  function resetIncidentForm() {
    setIncidentForm(initialIncidentForm);
  }

  function resetUpdateForm() {
    setUpdateForm({
      incidentId: incidents[0]?.id ?? "",
      status: incidents[0]?.status ?? "investigating",
      message: "",
    });
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="text-sm text-neutral-500">Toplam incident</div>
          <div className="mt-2 text-2xl font-semibold text-white">{incidents.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="text-sm text-neutral-500">Aktif</div>
          <div className="mt-2 text-2xl font-semibold text-white">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="text-sm text-neutral-500">Çözülmüş</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {incidents.filter((incident) => incident.status === "resolved").length}
          </div>
        </div>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
                Incident editörü
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {incidentForm.id ? "Incident kaydını düzenle" : "Yeni incident oluştur"}
              </div>
            </div>
            {incidentForm.id ? (
              <Button variant="ghost" onClick={resetIncidentForm} disabled={isPending}>
                Yeni incident
              </Button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Başlık">
              <input
                className={inputClassName()}
                value={incidentForm.title}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </Field>
            <Field label="Kısa özet">
              <textarea
                className={`${inputClassName()} min-h-24`}
                value={incidentForm.summary}
                onChange={(event) =>
                  setIncidentForm((current) => ({ ...current, summary: event.target.value }))
                }
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Etkilenen servis">
                <input
                  className={inputClassName()}
                  value={incidentForm.serviceLabel}
                  onChange={(event) =>
                    setIncidentForm((current) => ({
                      ...current,
                      serviceLabel: event.target.value,
                    }))
                  }
                  placeholder="Oturum, Veritabanı, API Gateway"
                />
              </Field>
              <Field label="Durum">
                <select
                  className={inputClassName()}
                  value={incidentForm.status}
                  onChange={(event) =>
                    setIncidentForm((current) => ({
                      ...current,
                      status: event.target.value as IncidentStatus,
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
              <Field label="Başlangıç zamanı">
                <input
                  type="datetime-local"
                  className={inputClassName()}
                  value={incidentForm.startedAt}
                  onChange={(event) =>
                    setIncidentForm((current) => ({
                      ...current,
                      startedAt: event.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Çözüm zamanı">
                <input
                  type="datetime-local"
                  className={inputClassName()}
                  value={incidentForm.resolvedAt}
                  onChange={(event) =>
                    setIncidentForm((current) => ({
                      ...current,
                      resolvedAt: event.target.value,
                    }))
                  }
                />
              </Field>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={incidentForm.isActive}
                onChange={(event) =>
                  setIncidentForm((current) => ({
                    ...current,
                    isActive: event.target.checked,
                  }))
                }
              />
              Public sayfada aktif incident olarak göster
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await savePlatformStatusIncidentAction(incidentForm);
                    setMessage(result.message);
                    showResult(result, {
                      successTitle: incidentForm.id
                        ? "Incident güncellendi"
                        : "Incident oluşturuldu",
                      errorTitle: incidentForm.id
                        ? "Incident güncellenemedi"
                        : "Incident oluşturulamadı",
                    });
                    if (result.success) {
                      resetIncidentForm();
                      router.refresh();
                    }
                  });
                }}
              >
                {isPending
                  ? "Kaydediliyor..."
                  : incidentForm.id
                    ? "Incident Güncelle"
                    : "Incident Oluştur"}
              </Button>
              {incidentForm.id ? (
                <Button
                  variant="danger"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await deletePlatformStatusIncidentAction({
                        id: incidentForm.id!,
                      });
                      setMessage(result.message);
                      showResult(result, {
                        successTitle: "Incident silindi",
                        errorTitle: "Incident silinemedi",
                      });
                      if (result.success) {
                        resetIncidentForm();
                        router.refresh();
                      }
                    });
                  }}
                >
                  Incident Sil
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
                Durum güncellemesi
              </div>
              <div className="mt-2 text-xl font-semibold text-white">
                {updateForm.id
                  ? "Incident güncellemesini düzenle"
                  : "Incident güncellemesi ekle"}
              </div>
            </div>
            {updateForm.id ? (
              <Button variant="ghost" disabled={isPending} onClick={resetUpdateForm}>
                Yeni güncelleme
              </Button>
            ) : null}
          </div>

          <div className="mt-5 grid gap-4">
            <Field label="Incident">
              <select
                className={inputClassName()}
                value={updateForm.incidentId}
                disabled={!!updateForm.id}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    incidentId: event.target.value,
                  }))
                }
              >
                <option value="">Incident seçin</option>
                {incidents.map((incident) => (
                  <option key={incident.id} value={incident.id}>
                    {incident.title}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Güncelleme durumu">
              <select
                className={inputClassName()}
                value={updateForm.status}
                onChange={(event) =>
                  setUpdateForm((current) => ({
                    ...current,
                    status: event.target.value as IncidentStatus,
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
            <Field label="Güncelleme metni">
              <textarea
                className={`${inputClassName()} min-h-32`}
                value={updateForm.message}
                onChange={(event) =>
                  setUpdateForm((current) => ({ ...current, message: event.target.value }))
                }
                placeholder="Yapılan düzeltme, izlenen adım veya çözüm notu"
              />
            </Field>
            <Button
              disabled={isPending || !updateForm.incidentId}
              onClick={() => {
                startTransition(async () => {
                  const result = await savePlatformStatusIncidentUpdateAction(updateForm);
                  setMessage(result.message);
                  showResult(result, {
                    successTitle: updateForm.id
                      ? "Durum güncellemesi kaydedildi"
                      : "Durum güncellemesi eklendi",
                    errorTitle: updateForm.id
                      ? "Durum güncellemesi kaydedilemedi"
                      : "Durum güncellemesi eklenemedi",
                  });
                  if (result.success) {
                    resetUpdateForm();
                    router.refresh();
                  }
                });
              }}
            >
              {isPending
                ? "Kaydediliyor..."
                : updateForm.id
                  ? "Güncellemeyi Kaydet"
                  : "Güncelleme Ekle"}
            </Button>
            {updateForm.id ? (
              <Button
                variant="danger"
                disabled={isPending}
                onClick={() => {
                  if (!window.confirm("Bu güncelleme silinsin mi?")) {
                    return;
                  }

                  startTransition(async () => {
                    const result = await deletePlatformStatusIncidentUpdateAction({
                      id: updateForm.id!,
                    });
                    setMessage(result.message);
                    showResult(result, {
                      successTitle: "Durum güncellemesi silindi",
                      errorTitle: "Durum güncellemesi silinemedi",
                    });
                    if (result.success) {
                      resetUpdateForm();
                      router.refresh();
                    }
                  });
                }}
              >
                Güncellemeyi Sil
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {message ? <div className="text-sm text-neutral-400">{message}</div> : null}

      <div className="grid gap-4">
        {incidents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
            Henüz incident kaydı yok.
          </div>
        ) : (
          incidents.map((incident) => (
            <div
              key={incident.id}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">{incident.title}</div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300">
                      {statusLabels[incident.status]}
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300">
                      {incident.isActive ? "Aktif" : "Geçmiş"}
                    </div>
                  </div>
                  {incident.summary ? (
                    <div className="text-sm text-neutral-300">{incident.summary}</div>
                  ) : null}
                  <div className="text-xs text-neutral-500">
                    Başlangıç: {formatDateTime(incident.startedAt)} · Çözüm: {formatDateTime(incident.resolvedAt)}
                  </div>
                  {incident.updates.length > 0 ? (
                    <div className="grid gap-3">
                      {incident.updates.map((update) => (
                        <div
                          key={update.id}
                          className="rounded-2xl border border-white/10 bg-black/20 p-4"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="text-xs uppercase tracking-[0.22em] text-neutral-500">
                                  Güncelleme
                                </div>
                                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300">
                                  {statusLabels[update.status]}
                                </div>
                              </div>
                              <div className="text-sm text-neutral-200">{update.message}</div>
                              <div className="text-xs text-neutral-500">
                                {formatDateTime(update.createdAt)}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="ghost"
                                disabled={isPending}
                                onClick={() =>
                                  setUpdateForm({
                                    id: update.id,
                                    incidentId: incident.id,
                                    status: update.status,
                                    message: update.message,
                                  })
                                }
                              >
                                Düzenle
                              </Button>
                              <Button
                                variant="danger"
                                disabled={isPending}
                                onClick={() => {
                                  if (!window.confirm("Bu güncelleme silinsin mi?")) {
                                    return;
                                  }

                                  startTransition(async () => {
                                    const result =
                                      await deletePlatformStatusIncidentUpdateAction({
                                        id: update.id,
                                      });
                                    setMessage(result.message);
                                    showResult(result, {
                                      successTitle: "Durum güncellemesi silindi",
                                      errorTitle: "Durum güncellemesi silinemedi",
                                    });
                                    if (result.success) {
                                      if (updateForm.id === update.id) {
                                        resetUpdateForm();
                                      }
                                      router.refresh();
                                    }
                                  });
                                }}
                              >
                                Sil
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:min-w-[180px]">
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => {
                      setIncidentForm({
                        id: incident.id,
                        title: incident.title,
                        summary: incident.summary ?? "",
                        serviceLabel: incident.serviceLabel ?? "",
                        status: incident.status,
                        isActive: incident.isActive,
                        startedAt: toDatetimeLocalValue(incident.startedAt),
                        resolvedAt: toDatetimeLocalValue(incident.resolvedAt),
                      });
                      setUpdateForm((current) => ({
                        ...current,
                        incidentId: incident.id,
                        status: incident.status,
                      }));
                    }}
                  >
                    Düzenle
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isPending}
                    onClick={() =>
                      setUpdateForm((current) => ({
                        ...current,
                        incidentId: incident.id,
                        status: incident.status,
                      }))
                    }
                  >
                    Güncelleme hedefi yap
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
