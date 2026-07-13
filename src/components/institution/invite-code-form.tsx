"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createInviteCodeAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import type { InviteCodeCreateInput } from "@/lib/schemas";

const initialForm: InviteCodeCreateInput = {
  role: "teacher",
  email: "",
  studentId: "",
  expiresInDays: 7,
};

export function InviteCodeForm({
  students,
}: {
  students: Array<{ id: string; firstName: string; lastName: string }>;
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
          Davet Kodu
        </div>
        <div className="mt-2 text-lg font-semibold text-white">Öğretmen veya veli davet et</div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Rol">
          <select
            className={inputClassName()}
            value={form.role}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                role: event.target.value as InviteCodeCreateInput["role"],
                studentId: "",
              }))
            }
          >
            <option value="teacher">Öğretmen</option>
            <option value="parent">Veli</option>
          </select>
        </Field>
        <Field label="E-posta (opsiyonel)">
          <input
            className={inputClassName()}
            type="email"
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </Field>
        <Field label="Geçerlilik (gün)">
          <input
            className={inputClassName()}
            type="number"
            min={1}
            max={30}
            value={form.expiresInDays}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                expiresInDays: Number(event.target.value) || 7,
              }))
            }
          />
        </Field>
        {form.role === "parent" ? (
          <Field
            label="Öğrenci"
            hint={
              students.length === 0
                ? "Önce kuruma öğrenci ekleyin."
                : "Veli daveti seçilen öğrenciye otomatik bağlanır."
            }
          >
            <select
              className={inputClassName()}
              value={form.studentId}
              onChange={(event) =>
                setForm((current) => ({ ...current, studentId: event.target.value }))
              }
            >
              <option value="">Öğrenci seçin</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field
            label="Rol bilgisi"
            hint="Öğretmen davetleri kuruma bağlanır; öğrenci seçimi gerekmez."
          >
            <div className={`${inputClassName()} flex items-center bg-white/[0.02] text-neutral-400`}>
              Kurum öğretmeni daveti oluşturulacak
            </div>
          </Field>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await createInviteCodeAction(form);
              setMessage(result.message);
              showResult(result, {
                successTitle: "Davet kodu olusturuldu",
                errorTitle: "Davet kodu olusturulamadi",
              });
              if (result.success) {
                setForm(initialForm);
                router.refresh();
              }
            });
          }}
        >
          {isPending ? "Oluşturuluyor..." : "Davet Kodu Oluştur"}
        </Button>
        {message ? <div className="text-sm text-neutral-400">{message}</div> : null}
      </div>
    </div>
  );
}
