"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveInstitutionAction } from "@/app/actions";
import { DeleteInstitutionButton } from "@/components/admin/delete-institution-button";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import type { InstitutionSaveInput } from "@/lib/schemas";
import { INSTITUTION_TYPE_LABELS } from "@/lib/institution-features";

type InstitutionSummary = {
  id: string;
  name: string;
  slug: string;
  type: "rehabilitation_center" | "public_special_education_practice_school";
  _count: {
    users: number;
    students: number;
    documents: number;
  };
};

const emptyForm: InstitutionSaveInput = {
  name: "",
  slug: "",
  type: "rehabilitation_center",
};

export function InstitutionManagementBoard({
  institutions,
}: {
  institutions: InstitutionSummary[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<InstitutionSaveInput>(emptyForm);
  const [message, setMessage] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | InstitutionSummary["type"]>("all");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  function resetForm() {
    setForm(emptyForm);
    setMessage("");
  }

  return (
    <div className="grid gap-6 2xl:grid-cols-[0.95fr_1.05fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
              Kurum Formu
            </div>
            <div className="mt-2 text-xl font-semibold text-white">
              {form.id ? "Kurumu düzenle" : "Yeni kurum ekle"}
            </div>
          </div>
          {form.id ? (
            <Button variant="ghost" disabled={isPending} onClick={resetForm}>
              Yeni kurum
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="Kurum adı">
            <input
              className={inputClassName()}
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            />
          </Field>

          <Field label="Kurum kısa adı">
            <input
              className={inputClassName()}
              value={form.slug}
              onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))}
              placeholder="örnek-kurum"
            />
          </Field>
          <Field label="Kurum tipi">
            <select
              className={inputClassName()}
              value={form.type}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  type: event.target.value as InstitutionSummary["type"],
                }))
              }
            >
              <option value="rehabilitation_center">
                {INSTITUTION_TYPE_LABELS.rehabilitation_center}
              </option>
              <option value="public_special_education_practice_school">
                {INSTITUTION_TYPE_LABELS.public_special_education_practice_school}
              </option>
            </select>
          </Field>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                const result = await saveInstitutionAction(form);
                setMessage(result.message);
                showResult(result, {
                  successTitle: form.id ? "Kurum guncellendi" : "Kurum eklendi",
                  errorTitle: form.id ? "Kurum guncellenemedi" : "Kurum eklenemedi",
                });
                if (result.success) {
                  resetForm();
                  router.refresh();
                }
              });
            }}
          >
            {isPending ? "Kaydediliyor..." : form.id ? "Kurumu Kaydet" : "Kurumu Ekle"}
          </Button>
          {form.id ? (
            <Button variant="ghost" disabled={isPending} onClick={resetForm}>
              Vazgec
            </Button>
          ) : null}
        </div>

        {message ? <div className="mt-3 text-sm text-neutral-400">{message}</div> : null}
      </div>

      <div>
        <select
          className={inputClassName()}
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
        >
          <option value="all">Tüm kurum tipleri</option>
          <option value="rehabilitation_center">
            {INSTITUTION_TYPE_LABELS.rehabilitation_center}
          </option>
          <option value="public_special_education_practice_school">
            {INSTITUTION_TYPE_LABELS.public_special_education_practice_school}
          </option>
        </select>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {institutions
            .filter((institution) => typeFilter === "all" || institution.type === typeFilter)
            .map((institution) => (
              <div
                key={institution.id}
                className="rounded-3xl border border-white/10 bg-white/[0.03] px-4 py-4"
              >
                <div className="flex h-full flex-col justify-between gap-4">
                  <div>
                    <div className="font-semibold text-white">{institution.name}</div>
                    <div className="mt-1 text-sm text-neutral-500">{institution.slug}</div>
                    <div className="mt-2 inline-flex rounded-full border border-white/10 px-2.5 py-1 text-xs text-neutral-300">
                      {INSTITUTION_TYPE_LABELS[institution.type]}
                    </div>
                    <div className="mt-3 text-sm text-neutral-400">
                      {institution._count.users} üye - {institution._count.students} öğrenci -{" "}
                      {institution._count.documents} BEP
                    </div>
                    <div className="mt-3 text-xs leading-5 text-neutral-500">
                      Duzenlemek için formu doldurun. Silme islemi kuruma bağlı tum kayitlari
                      birlikte temizler.
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => {
                        setForm({
                          id: institution.id,
                          name: institution.name,
                          slug: institution.slug,
                          type: institution.type,
                        });
                        setMessage("");
                      }}
                    >
                      Düzenle
                    </Button>

                    <DeleteInstitutionButton
                      institutionId={institution.id}
                      institutionName={institution.name}
                    />
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
