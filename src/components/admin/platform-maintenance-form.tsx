"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock3, Power, RotateCcw, Save, ServerCog, ShieldAlert } from "lucide-react";

import { savePlatformMaintenanceSettingsAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";

type Props = {
  maintenanceEnabled: boolean;
  maintenanceEndsAt?: string | null;
  maintenanceMessage?: string | null;
  isActive: boolean;
  source: "database" | "environment" | "scheduled_window";
};

type FormState = {
  maintenanceEnabled: boolean;
  maintenanceEndDate: string;
  maintenanceEndTime: string;
  maintenanceMessage: string;
};

function toDatetimeLocalValue(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const adjusted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return adjusted.toISOString().slice(0, 16);
}

function splitDatetimeLocalValue(value?: string | null) {
  const localValue = toDatetimeLocalValue(value);
  const [date = "", time = ""] = localValue.split("T");
  return { date, time };
}

function combineDateAndTime(date: string, time: string) {
  if (!date || !time) {
    return "";
  }
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) {
    return "";
  }

  return new Date(year, month - 1, day, hour, minute).toISOString();
}

function defaultMaintenanceEndParts() {
  return splitDatetimeLocalValue(new Date(Date.now() + 60 * 60 * 1000).toISOString());
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sourceLabel(source: Props["source"]) {
  if (source === "environment") {
    return "Ortam değişkeni";
  }
  if (source === "scheduled_window") {
    return "Planlı bakım";
  }
  return "Admin paneli";
}

export function PlatformMaintenanceForm({
  maintenanceEnabled,
  maintenanceEndsAt,
  maintenanceMessage,
  isActive,
  source,
}: Props) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const initialEnd = splitDatetimeLocalValue(maintenanceEndsAt);
  const [form, setForm] = useState<FormState>({
    maintenanceEnabled,
    maintenanceEndDate: initialEnd.date,
    maintenanceEndTime: initialEnd.time,
    maintenanceMessage: maintenanceMessage ?? "",
  });

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--panel-text-soft)]">
              Genel durum
            </div>
            {isActive ? (
              <ShieldAlert className="size-4 text-amber-400" />
            ) : (
              <CheckCircle2 className="size-4 text-emerald-400" />
            )}
          </div>
          <div className="mt-3 text-2xl font-semibold text-[color:var(--panel-text)]">
            {isActive ? "Bakımda" : "Canlı"}
          </div>
          <div className="mt-1 text-sm text-[color:var(--panel-text-muted)]">
            {isActive ? "Kullanıcı erişimi geçici olarak sınırlandırıldı." : "Platform normal şekilde erişilebilir."}
          </div>
        </div>

        <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--panel-text-soft)]">
              Planlanan bitiş
            </div>
            <Clock3 className="size-4 text-[color:var(--panel-text-soft)]" />
          </div>
          <div className="mt-3 text-lg font-semibold text-[color:var(--panel-text)]">
            {formatDateTime(maintenanceEndsAt)}
          </div>
          <div className="mt-1 text-sm text-[color:var(--panel-text-muted)]">
            Bakım açıkken kullanıcıya bu tarih gösterilir.
          </div>
        </div>

        <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--panel-text-soft)]">
              Kontrol kaynağı
            </div>
            <ServerCog className="size-4 text-[color:var(--panel-text-soft)]" />
          </div>
          <div className="mt-3 text-lg font-semibold text-[color:var(--panel-text)]">
            {sourceLabel(source)}
          </div>
          <div className="mt-1 text-sm text-[color:var(--panel-text-muted)]">
            {source === "environment"
              ? "Bakım durumu ortam ayarıyla kilitlenmiş."
              : source === "scheduled_window"
                ? "Aktif planlı bakım penceresi üzerinden yönetiliyor."
                : "Bu ekran üzerinden yönetiliyor."}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">
              <Power className="size-4" />
              Bakım kontrolü
            </div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--panel-text)]">
              Platform erişimini yönetin
            </div>
            <p className="mt-2 text-sm leading-6 text-[color:var(--panel-text-muted)]">
              Bakım modu açıkken admin dışındaki kullanıcılar bakım ekranına yönlendirilir.
              Kısa ve anlaşılır bir mesaj girerek kullanıcıları bilgilendirin.
            </p>
          </div>

          <label
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-[var(--panel-radius-card)] border px-4 py-3 text-sm transition",
              form.maintenanceEnabled
                ? "border-amber-400/30 bg-amber-400/10 text-amber-100"
                : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text-muted)]",
            )}
          >
            <input
              type="checkbox"
              checked={form.maintenanceEnabled}
              onChange={(event) =>
                setForm((current) => {
                  const shouldFillDefault =
                    event.target.checked && (!current.maintenanceEndDate || !current.maintenanceEndTime);
                  const defaultEnd = shouldFillDefault ? defaultMaintenanceEndParts() : null;

                  return {
                    ...current,
                    maintenanceEnabled: event.target.checked,
                    maintenanceEndDate: defaultEnd?.date ?? current.maintenanceEndDate,
                    maintenanceEndTime: defaultEnd?.time ?? current.maintenanceEndTime,
                  };
                })
              }
              className="sr-only"
            />
            <span
              className={cn(
                "relative h-6 w-11 rounded-full transition",
                form.maintenanceEnabled ? "bg-amber-400" : "bg-white/15",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 size-4 rounded-full bg-white shadow-sm transition",
                  form.maintenanceEnabled ? "left-6" : "left-1",
                )}
              />
            </span>
            <span className="font-semibold">
              {form.maintenanceEnabled ? "Bakım modu açık" : "Bakım modu kapalı"}
            </span>
          </label>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_2fr]">
          <Field label="Bitiş tarihi" hint="Bakım modu açıldığında otomatik doldurulur.">
            <input
              type="date"
              className={inputClassName()}
              value={form.maintenanceEndDate}
              disabled={!form.maintenanceEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maintenanceEndDate: event.target.value,
                }))
              }
            />
          </Field>

          <Field label="Bitiş saati" hint="Geri sayım bu saate göre çalışır.">
            <input
              type="time"
              className={inputClassName()}
              value={form.maintenanceEndTime}
              disabled={!form.maintenanceEnabled}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maintenanceEndTime: event.target.value,
                }))
              }
            />
          </Field>

          <Field
            label="Kısa mesaj"
            hint="Bakım sayfasında kullanıcılara gösterilecek açıklama."
          >
            <input
              className={inputClassName()}
              value={form.maintenanceMessage}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  maintenanceMessage: event.target.value,
                }))
              }
              placeholder="Altyapı iyileştirmesi ve veri optimizasyonu yapılıyor."
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await savePlatformMaintenanceSettingsAction({
                  maintenanceEnabled: form.maintenanceEnabled,
                  maintenanceEndsAt: combineDateAndTime(form.maintenanceEndDate, form.maintenanceEndTime),
                  maintenanceMessage: form.maintenanceMessage,
                });
                setMessage(result.message);
                showResult(result, {
                  successTitle: "Bakım ayarları kaydedildi",
                  errorTitle: "Bakım ayarları kaydedilemedi",
                });
                if (result.success) {
                  router.refresh();
                }
              });
            }}
            className="min-w-[220px]"
          >
            <Save className="size-4" />
            {isPending ? "Kaydediliyor..." : "Bakım ayarlarını kaydet"}
          </Button>
          <Button
            variant="secondary"
            disabled={isPending}
            onClick={() =>
              setForm({
                maintenanceEnabled: false,
                maintenanceEndDate: "",
                maintenanceEndTime: "",
                maintenanceMessage: "",
              })
            }
          >
            <RotateCcw className="size-4" />
            Formu temizle
          </Button>
        </div>

        {message ? (
          <div className="mt-5 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-4 py-3 text-sm text-[color:var(--panel-text-muted)]">
            {message}
          </div>
        ) : null}
      </div>
    </div>
  );
}
