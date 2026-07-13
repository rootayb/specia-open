"use client";

import { useState, useTransition } from "react";

import { createInstitutionApplicationAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import type { InstitutionApplicationInput } from "@/lib/schemas";

const initialForm: InstitutionApplicationInput = {
  institutionName: "",
  institutionType: "rehabilitation_center",
  contactName: "",
  email: "",
  phone: "",
  message: "",
};

export function InstitutionApplicationForm() {
  const [form, setForm] = useState<InstitutionApplicationInput>(initialForm);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <div className="border border-white/14 bg-white/[0.045] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:p-7">
      <div className="flex items-end justify-between gap-4 border-b border-white/12 pb-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/42">
            Başvuru
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white sm:text-3xl">
            Kurum bilgileri
          </h2>
        </div>
        <div className="hidden text-right text-xs font-medium text-white/42 sm:block">
          2 dakika
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Field label="Kurum Adı *">
          <input
            className={inputClassName()}
            placeholder="Kurum adı"
            value={form.institutionName}
            onChange={(event) =>
              setForm((current) => ({ ...current, institutionName: event.target.value }))
            }
          />
        </Field>
        <Field label="Kurum Tipi *">
          <select
            className={inputClassName()}
            value={form.institutionType}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                institutionType: event.target.value as InstitutionApplicationInput["institutionType"],
              }))
            }
          >
            <option value="rehabilitation_center">Özel Eğitim ve Rehabilitasyon Merkezi</option>
            <option value="public_special_education_practice_school">Özel Eğitim Uygulama Okulu</option>
          </select>
        </Field>
        <Field label="Yetkili Adı Soyadı *">
          <input
            className={inputClassName()}
            placeholder="Ad Soyad"
            value={form.contactName}
            onChange={(event) =>
              setForm((current) => ({ ...current, contactName: event.target.value }))
            }
          />
        </Field>
        <Field label="E-posta *">
          <input
            className={inputClassName()}
            type="email"
            placeholder="kurum@örnek.com"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </Field>
        <Field label="Telefon">
          <input
            className={inputClassName()}
            placeholder="05XX XXX XX XX"
            value={form.phone ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
          />
        </Field>
        <Field label="Mesaj" className="sm:col-span-2">
          <textarea
            className={inputClassName()}
            rows={4}
            placeholder="Kısa not"
            value={form.message ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, message: event.target.value }))
            }
          />
        </Field>
      </div>

      <div className="mt-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Button
          className="h-12 w-full sm:min-w-[190px] sm:w-auto"
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await createInstitutionApplicationAction(form);
              setMessage(result.message);
              showResult(result, {
                successTitle: "Başvuru gönderildi",
                errorTitle: "Başvuru gönderilemedi",
              });
              if (result.success) {
                setForm(initialForm);
              }
            });
          }}
        >
          {isPending ? "Gönderiliyor..." : "Başvuru Gönder"}
        </Button>
        {message ? (
          <div className="text-sm text-white/54 sm:max-w-xl">{message}</div>
        ) : null}
      </div>
    </div>
  );
}
