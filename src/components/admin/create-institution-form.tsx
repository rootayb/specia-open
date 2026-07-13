"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createInstitutionAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

const initialForm = {
  name: "",
  slug: "",
  type: "rehabilitation_center" as const,
};

export function CreateInstitutionForm() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <div className="grid gap-4 rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Yeni Kurum
        </div>
        <div className="mt-2 text-lg font-semibold text-white">Kurum oluştur ve paneli ayir</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Kurum Adı">
          <input
            className={inputClassName()}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </Field>
        <Field label="Kurum Kısa Adı">
          <input
            className={inputClassName()}
            value={form.slug}
            onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
            placeholder="örnek-kurum"
          />
        </Field>
        <Field label="Kurum Tipi">
          <select
            className={inputClassName()}
            value={form.type}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                type: event.target.value as typeof current.type,
              }))
            }
          >
            <option value="rehabilitation_center">Özel Eğitim ve Rehabilitasyon Merkezi</option>
            <option value="public_special_education_practice_school">Özel Eğitim Uygulama Okulu</option>
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await createInstitutionAction(form);
              setMessage(result.message);
              showResult(result, {
                successTitle: "Kurum olusturuldu",
                errorTitle: "Kurum olusturulamadi",
              });
              if (result.success) {
                setForm(initialForm);
                router.refresh();
              }
            });
          }}
        >
          {isPending ? "Olusturuluyor..." : "Kurumu Oluştur"}
        </Button>
        {message ? <div className="text-sm text-neutral-400">{message}</div> : null}
      </div>
    </div>
  );
}
