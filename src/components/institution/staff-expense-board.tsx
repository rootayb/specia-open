"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { deleteStaffExpenseAction, saveStaffExpenseAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmModal } from "@/components/ui/confirm-modal";
import { Field, inputClassName } from "@/components/ui/field";
import { SectionHeading } from "@/components/ui/section-heading";
import type { StaffExpenseInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type StaffExpenseCategory = "salary" | "bonus" | "per_session_fee" | "sgk_tax" | "other";
type StaffExpenseStatus = "planned" | "paid";
type PaymentMethod = "bank_transfer" | "cash" | "card" | "other";

type StaffExpense = {
  id: string;
  staffUserId: string | null;
  staffName: string;
  staffRole: string | null;
  category: StaffExpenseCategory;
  status: StaffExpenseStatus;
  period: string;
  amount: number;
  paymentDate: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  createdBy: { name: string };
};

type StaffOption = {
  id: string;
  name: string;
  branch: string | null;
};

const CATEGORY_LABELS: Record<StaffExpenseCategory, string> = {
  salary: "Maaş",
  bonus: "Prim",
  per_session_fee: "Seans Başı Ücret",
  sgk_tax: "SGK / Vergi",
  other: "Diğer",
};

const STATUS_TONE: Record<StaffExpenseStatus, "warning" | "success"> = {
  planned: "warning",
  paid: "success",
};

const STATUS_LABELS: Record<StaffExpenseStatus, string> = {
  planned: "Planlandı",
  paid: "Ödendi",
};

const METHOD_LABELS: Record<PaymentMethod, string> = {
  bank_transfer: "Banka havalesi",
  cash: "Nakit",
  card: "Kart",
  other: "Diğer",
};

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(period: string): StaffExpenseInput {
  return {
    staffUserId: "",
    staffName: "",
    staffRole: "",
    category: "salary",
    status: "planned",
    period,
    amount: 0,
    paymentDate: "",
    paymentMethod: undefined,
    notes: "",
  };
}

export function StaffExpenseBoard({
  period,
  expenses,
  staffOptions,
}: {
  period: { key: string; label: string };
  expenses: StaffExpense[];
  staffOptions: StaffOption[];
}) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<StaffExpenseInput>(() => emptyForm(period.key));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [useFreeText, setUseFreeText] = useState(false);

  const totals = useMemo(() => {
    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const paid = expenses
      .filter((item) => item.status === "paid")
      .reduce((sum, item) => sum + item.amount, 0);
    return { total, paid, pending: total - paid };
  }, [expenses]);

  function resetForm() {
    setForm(emptyForm(period.key));
    setEditingId(null);
    setUseFreeText(false);
  }

  function startEditing(expense: StaffExpense) {
    setEditingId(expense.id);
    setUseFreeText(!expense.staffUserId);
    setForm({
      staffUserId: expense.staffUserId ?? "",
      staffName: expense.staffName,
      staffRole: expense.staffRole ?? "",
      category: expense.category,
      status: expense.status,
      period: expense.period,
      amount: expense.amount,
      paymentDate: expense.paymentDate?.slice(0, 10) ?? "",
      paymentMethod: expense.paymentMethod ?? undefined,
      notes: expense.notes ?? "",
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await saveStaffExpenseAction({ ...form, id: editingId ?? undefined });
      showResult(result, {
        successTitle: editingId ? "Gider güncellendi" : "Gider kaydedildi",
        errorTitle: "İşlem tamamlanamadı",
      });
      if (result.success) {
        resetForm();
        router.refresh();
      }
    });
  }

  function remove(expense: StaffExpense) {
    startTransition(async () => {
      const confirmed = await confirmModal({
        title: "Gider kaydını sil",
        message: `${expense.staffName} için ${money(expense.amount)} tutarındaki kayıt silinsin mi?`,
        variant: "danger",
        confirmText: "Sil",
        cancelText: "Vazgeç",
      });
      if (!confirmed) return;

      const result = await deleteStaffExpenseAction({ id: expense.id });
      showResult(result, { successTitle: "Gider silindi", errorTitle: "Silme başarısız" });
      if (result.success) {
        if (editingId === expense.id) resetForm();
        router.refresh();
      }
    });
  }

  const canSave = useFreeText ? (form.staffName?.trim().length ?? 0) >= 2 : Boolean(form.staffUserId);

  return (
    <div className="grid gap-5">
      {/* Dönem seçimi + özet */}
      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              Personel Giderleri
            </div>
            <div className="mt-1 text-lg font-semibold text-[color:var(--panel-text)]">
              {period.label}
            </div>
          </div>
          <input
            type="month"
            className={cn(inputClassName(), "w-40")}
            value={period.key}
            onChange={(event) => router.push(`/panel/finans/giderler?period=${event.target.value}`)}
          />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3 py-2.5 text-center">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">Toplam</div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--panel-text)]">{money(totals.total)}</div>
          </div>
          <div className="rounded-[var(--panel-radius-md)] border border-[color:var(--panel-success-border)] bg-[color:var(--panel-success-bg)] px-3 py-2.5 text-center">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--panel-success-text)]">Ödenen</div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--panel-success-text)]">{money(totals.paid)}</div>
          </div>
          <div className="rounded-[var(--panel-radius-md)] border border-[color:var(--panel-warning-border)] bg-[color:var(--panel-warning-bg)] px-3 py-2.5 text-center">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--panel-warning-text)]">Bekleyen</div>
            <div className="mt-1 text-sm font-semibold text-[color:var(--panel-warning-text)]">{money(totals.pending)}</div>
          </div>
        </div>
      </Card>

      {/* Gider ekle/düzenle formu */}
      <Card padding="lg">
        <SectionHeading
          eyebrow={editingId ? "Düzenle" : "Yeni kayıt"}
          title="Personel gideri ekle"
          description="Öğretmen/personel maaş, prim veya seans başı ücretini bu döneme kaydedin."
        />

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Personel" hint={useFreeText ? undefined : "Kurum üyeleri listesinden seçin"}>
            {useFreeText ? (
              <input
                className={inputClassName()}
                placeholder="Ad soyad"
                value={form.staffName}
                onChange={(event) => setForm((current) => ({ ...current, staffName: event.target.value }))}
              />
            ) : (
              <select
                className={inputClassName()}
                value={form.staffUserId ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, staffUserId: event.target.value }))}
              >
                <option value="">Personel seçin</option>
                {staffOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                    {option.branch ? ` · ${option.branch}` : ""}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              className="mt-1.5 text-xs font-medium text-[color:var(--panel-text-soft)] underline-offset-2 hover:underline"
              onClick={() => setUseFreeText((current) => !current)}
            >
              {useFreeText ? "Kurum üyelerinden seç" : "Hesabı olmayan personel gir"}
            </button>
          </Field>

          <Field label="Görev / branş" hint="Opsiyonel">
            <input
              className={inputClassName()}
              value={form.staffRole ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, staffRole: event.target.value }))}
            />
          </Field>

          <Field label="Gider türü">
            <select
              className={inputClassName()}
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value as StaffExpenseCategory }))
              }
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tutar">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClassName()}
              value={form.amount}
              onChange={(event) => setForm((current) => ({ ...current, amount: Number(event.target.value) }))}
            />
          </Field>

          <Field label="Durum">
            <select
              className={inputClassName()}
              value={form.status}
              onChange={(event) =>
                setForm((current) => ({ ...current, status: event.target.value as StaffExpenseStatus }))
              }
            >
              <option value="planned">Planlandı</option>
              <option value="paid">Ödendi</option>
            </select>
          </Field>

          {form.status === "paid" && (
            <>
              <Field label="Ödeme tarihi">
                <input
                  type="date"
                  className={inputClassName()}
                  value={form.paymentDate || today()}
                  onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))}
                />
              </Field>
              <Field label="Ödeme yöntemi">
                <select
                  className={inputClassName()}
                  value={form.paymentMethod ?? "bank_transfer"}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))
                  }
                >
                  {Object.entries(METHOD_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          )}

          <Field label="Not" hint="Opsiyonel" className="sm:col-span-2">
            <textarea
              rows={2}
              className={inputClassName()}
              value={form.notes ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-4 flex gap-2">
          <Button disabled={isPending || !canSave || form.amount <= 0} onClick={submit}>
            <Plus className="size-4" />
            {editingId ? "Güncelle" : "Kaydet"}
          </Button>
          {editingId ? (
            <Button variant="ghost" disabled={isPending} onClick={resetForm}>
              Vazgeç
            </Button>
          ) : null}
        </div>
      </Card>

      {/* Dönem gider listesi */}
      <Card variant="subtle" padding="lg">
        <SectionHeading
          eyebrow="Kayıtlar"
          title={`${period.label} personel giderleri`}
          description={`${expenses.length} kayıt`}
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)]">
                <th className="pb-3 pr-2">Personel</th>
                <th className="pb-3 px-2">Tür</th>
                <th className="pb-3 px-2 text-right">Tutar</th>
                <th className="pb-3 px-2">Durum</th>
                <th className="pb-3 pl-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--panel-border)]/60">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[color:var(--panel-text-muted)]">
                    Bu dönem için henüz gider kaydı yok.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-[color:var(--panel-bg-hover)]/40 transition-colors">
                    <td className="py-3 pr-2">
                      <div className="font-medium text-[color:var(--panel-text)]">{expense.staffName}</div>
                      {expense.staffRole ? (
                        <div className="text-xs text-[color:var(--panel-text-soft)]">{expense.staffRole}</div>
                      ) : null}
                    </td>
                    <td className="py-3 px-2 text-[color:var(--panel-text-muted)]">
                      {CATEGORY_LABELS[expense.category]}
                    </td>
                    <td className="py-3 px-2 text-right font-semibold text-[color:var(--panel-text)]">
                      {money(expense.amount)}
                    </td>
                    <td className="py-3 px-2">
                      <Badge tone={STATUS_TONE[expense.status]}>{STATUS_LABELS[expense.status]}</Badge>
                    </td>
                    <td className="py-3 pl-2 text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="ghost" onClick={() => startEditing(expense)}>
                          Düzenle
                        </Button>
                        <Button size="sm" variant="danger" disabled={isPending} onClick={() => remove(expense)}>
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
