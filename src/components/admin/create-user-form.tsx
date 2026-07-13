"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@/lib/prisma-shim";
import { useRouter } from "next/navigation";

import { createUserByAdminAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "teacher" as UserRole,
  institutionId: "",
};

export function CreateUserForm({
  institutions,
}: {
  institutions: Array<{ id: string; name: string; slug: string }>;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <div className="grid gap-4 rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
      <div>
        <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
          Yeni Kullanici
        </div>
        <div className="mt-2 text-lg font-semibold text-white">Admin panelinden hesap oluştur</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Ad Soyad">
          <input
            className={inputClassName()}
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="Ad Soyad"
          />
        </Field>
        <Field label="E-posta">
          <input
            className={inputClassName()}
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="örnek@okul.k12.tr"
          />
        </Field>
        <Field label="Gecici Şifre">
          <input
            className={inputClassName()}
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="En az 6 karakter"
          />
        </Field>
        <Field label="Rol">
          <select
            className={inputClassName()}
            value={form.role}
            onChange={(event) =>
              setForm((current) => ({ ...current, role: event.target.value as UserRole }))
            }
          >
            <option value="teacher">Öğretmen</option>
            <option value="parent">Veli</option>
            <option value="institution">Kurum Yoneticisi</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
        <Field label="Kurum">
          <select
            className={inputClassName()}
            value={form.institutionId}
            onChange={(event) =>
              setForm((current) => ({ ...current, institutionId: event.target.value }))
            }
          >
            <option value="">Kurum seçin</option>
            {institutions.map((institution) => (
              <option key={institution.id} value={institution.id}>
                {institution.name} ({institution.slug})
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await createUserByAdminAction(form);
              setMessage(result.message);
              showResult(result, {
                successTitle: "Kullanıcı olusturuldu",
                errorTitle: "Kullanıcı olusturulamadi",
              });
              if (result.success) {
                setForm(initialForm);
                router.refresh();
              }
            });
          }}
        >
          {isPending ? "Olusturuluyor..." : "Kullanıcı Oluştur"}
        </Button>
        {message ? <div className="text-sm text-neutral-400">{message}</div> : null}
      </div>
    </div>
  );
}
