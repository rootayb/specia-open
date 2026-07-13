"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createMaintenanceWindowAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

type Props = {
  onSuccess?: () => void;
};

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

function toDateAndTimeParts(value: Date) {
  const pad = (number: number) => String(number).padStart(2, "0");
  return {
    date: `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`,
    time: `${pad(value.getHours())}:${pad(value.getMinutes())}`,
  };
}

function defaultEndFromStart(date: string, time: string) {
  const startsAt = combineDateAndTime(date, time);
  if (!startsAt) {
    return null;
  }

  return toDateAndTimeParts(new Date(new Date(startsAt).getTime() + 60 * 60 * 1000));
}

export function MaintenanceWindowForm({ onSuccess }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const [form, setForm] = useState({
    title: "",
    description: "",
    startsDate: "",
    startsTime: "",
    endsDate: "",
    endsTime: "",
    autoActivate: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await createMaintenanceWindowAction({
        title: form.title,
        description: form.description,
        startsAt: combineDateAndTime(form.startsDate, form.startsTime),
        endsAt: combineDateAndTime(form.endsDate, form.endsTime),
        autoActivate: form.autoActivate,
      });
      showResult(result, {
        successTitle: "Bakım Penceresi Oluşturuldu",
        errorTitle: "Bakım Penceresi Oluşturulamadı",
      });
      if (result.success) {
        setForm({
          title: "",
          description: "",
          startsDate: "",
          startsTime: "",
          endsDate: "",
          endsTime: "",
          autoActivate: false,
        });
        if (onSuccess) {
          onSuccess();
        }
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <Field label="Başlık" hint="Planlanan bakım çalışmasının kısa tanımı">
        <input
          type="text"
          className={inputClassName()}
          value={form.title}
          onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
          placeholder="Veritabanı Güncellemesi ve Yedekleme"
          required
        />
      </Field>

      <Field label="Açıklama" hint="Bakım detayları (isteğe bağlı)">
        <textarea
          className={`${inputClassName()} min-h-20 py-2 resize-none`}
          value={form.description}
          onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
          placeholder="Bu bakım penceresinde veritabanı sürümü güncellenecektir."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Başlangıç tarihi" hint="Bakımın başlayacağı günü seçin.">
          <input
            type="date"
            className={inputClassName()}
            value={form.startsDate}
            onChange={(e) =>
              setForm((current) => {
                const startsDate = e.target.value;
                const defaultEnd =
                  startsDate && current.startsTime && (!current.endsDate || !current.endsTime)
                    ? defaultEndFromStart(startsDate, current.startsTime)
                    : null;

                return {
                  ...current,
                  startsDate,
                  endsDate: defaultEnd?.date ?? (current.endsDate || startsDate),
                  endsTime: defaultEnd?.time ?? current.endsTime,
                };
              })
            }
            required
          />
        </Field>

        <Field label="Başlangıç saati" hint="Örn. 22:30">
          <input
            type="time"
            className={inputClassName()}
            value={form.startsTime}
            onChange={(e) =>
              setForm((current) => {
                const startsTime = e.target.value;
                const defaultEnd =
                  current.startsDate && startsTime && (!current.endsDate || !current.endsTime)
                    ? defaultEndFromStart(current.startsDate, startsTime)
                    : null;

                return {
                  ...current,
                  startsTime,
                  endsDate: defaultEnd?.date ?? (current.endsDate || current.startsDate),
                  endsTime: defaultEnd?.time ?? current.endsTime,
                };
              })
            }
            required
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Bitiş tarihi" hint="Bakımın tamamlanacağı günü seçin.">
          <input
            type="date"
            className={inputClassName()}
            value={form.endsDate}
            onChange={(e) => setForm((c) => ({ ...c, endsDate: e.target.value }))}
            required
          />
        </Field>

        <Field label="Bitiş saati" hint="Örn. 23:30">
          <input
            type="time"
            className={inputClassName()}
            value={form.endsTime}
            onChange={(e) => setForm((c) => ({ ...c, endsTime: e.target.value }))}
            required
          />
        </Field>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] px-4 py-3 text-sm text-neutral-200 cursor-pointer select-none transition-colors duration-200">
        <input
          type="checkbox"
          checked={form.autoActivate}
          onChange={(e) => setForm((c) => ({ ...c, autoActivate: e.target.checked }))}
        />
        <div>
          <div className="font-semibold text-white">Otomatik Aktivasyon</div>
          <div className="text-xs text-neutral-400 mt-0.5">Süreç başladığında sistemi otomatik olarak bakım moduna al.</div>
        </div>
      </label>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Kaydediliyor..." : "Bakım Penceresi Planla"}
      </Button>
    </form>
  );
}
