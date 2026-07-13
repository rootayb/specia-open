"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteInstitutionInvoicePaymentAction,
  saveInstitutionInvoicePaymentAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";
import type { InstitutionInvoicePaymentInput } from "@/lib/schemas";

type Payment = {
  id: string;
  paymentDate: string;
  amount: number;
  method: "bank_transfer" | "cash" | "card" | "other";
  kind: "collection" | "refund";
  reference: string | null;
  notes: string | null;
  createdBy: { name: string };
};

type Invoice = {
  id: string;
  invoiceNumber: string;
  customerName: string;
  status: string;
  total: number;
  payments: Payment[];
};

const methodLabels: Record<Payment["method"], string> = {
  bank_transfer: "Banka havalesi",
  cash: "Nakit",
  card: "Kart",
  other: "Diğer",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

export function InvoicePaymentBoard({ invoices }: { invoices: Invoice[] }) {
  const router = useRouter();
  const payableInvoices = invoices.filter(
    (invoice) => invoice.status !== "draft" && invoice.status !== "cancelled",
  );
  const [form, setForm] = useState<InstitutionInvoicePaymentInput>({
    invoiceId: payableInvoices[0]?.id ?? "",
    paymentDate: today(),
    amount: 0,
    method: "bank_transfer",
    kind: "collection",
    reference: "",
    notes: "",
  });
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const selectedInvoice = invoices.find((invoice) => invoice.id === form.invoiceId) ?? null;
  const collected = selectedInvoice?.payments.reduce(
    (sum, payment) => sum + (payment.kind === "refund" ? -payment.amount : payment.amount),
    0,
  ) ?? 0;
  const remaining = Math.max((selectedInvoice?.total ?? 0) - collected, 0);

  return (
    <Card>
      <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
        Tahsilat Yönetimi
      </div>
      <div className="mt-2 text-2xl font-semibold text-white">Ödeme ve iade hareketleri</div>
      <p className="mt-2 text-sm leading-6 text-neutral-400">
        Faturalara parçalı tahsilat, tam ödeme veya iade kaydı ekleyin. Net bakiye fatura durumuna
        otomatik yansır.
      </p>

      <div className="mt-6 grid gap-6 2xl:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Fatura" className="md:col-span-2">
              <select
                className={inputClassName()}
                value={form.invoiceId}
                onChange={(event) =>
                  setForm((current) => ({ ...current, invoiceId: event.target.value }))
                }
              >
                <option value="">Fatura seçin</option>
                {payableInvoices.map((invoice) => (
                  <option key={invoice.id} value={invoice.id}>
                    {invoice.invoiceNumber} · {invoice.customerName} · {money(invoice.total)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hareket tipi">
              <select
                className={inputClassName()}
                value={form.kind}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    kind: event.target.value as Payment["kind"],
                  }))
                }
              >
                <option value="collection">Tahsilat</option>
                <option value="refund">İade</option>
              </select>
            </Field>
            <Field label="Yöntem">
              <select
                className={inputClassName()}
                value={form.method}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    method: event.target.value as Payment["method"],
                  }))
                }
              >
                {Object.entries(methodLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tarih">
              <input
                type="date"
                className={inputClassName()}
                value={form.paymentDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, paymentDate: event.target.value }))
                }
              />
            </Field>
            <Field label="Tutar">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClassName()}
                value={form.amount}
                onChange={(event) =>
                  setForm((current) => ({ ...current, amount: Number(event.target.value) }))
                }
              />
            </Field>
            <Field label="Banka / işlem referansı" className="md:col-span-2">
              <input
                className={inputClassName()}
                value={form.reference ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reference: event.target.value }))
                }
              />
            </Field>
            <Field label="Not" className="md:col-span-2">
              <textarea
                rows={3}
                className={inputClassName()}
                value={form.notes ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, notes: event.target.value }))
                }
              />
            </Field>
          </div>

          {selectedInvoice ? (
            <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-black/20 p-3 text-center">
              <div>
                <div className="text-xs text-neutral-500">Fatura</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {money(selectedInvoice.total)}
                </div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Net tahsilat</div>
                <div className="mt-1 text-sm font-semibold text-emerald-300">{money(collected)}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500">Kalan</div>
                <div className="mt-1 text-sm font-semibold text-amber-300">{money(remaining)}</div>
              </div>
            </div>
          ) : null}

          <Button
            className="mt-4"
            disabled={isPending || !form.invoiceId || form.amount <= 0}
            onClick={() => {
              startTransition(async () => {
                const result = await saveInstitutionInvoicePaymentAction(form);
                showResult(result, {
                  successTitle: "Ödeme hareketi kaydedildi",
                  errorTitle: "Ödeme kaydedilemedi",
                });
                if (result.success) {
                  setForm((current) => ({ ...current, amount: 0, reference: "", notes: "" }));
                  router.refresh();
                }
              });
            }}
          >
            {isPending ? "Kaydediliyor..." : form.kind === "refund" ? "İade kaydet" : "Tahsilat kaydet"}
          </Button>
        </div>

        <div className="grid content-start gap-3">
          {invoices.flatMap((invoice) =>
            invoice.payments.map((payment) => (
              <div key={payment.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">
                      {invoice.invoiceNumber} · {payment.kind === "refund" ? "İade" : "Tahsilat"}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {dateLabel(payment.paymentDate)} · {methodLabels[payment.method]} ·{" "}
                      {payment.createdBy.name}
                    </div>
                    {payment.reference ? (
                      <div className="mt-2 text-sm text-neutral-300">Ref: {payment.reference}</div>
                    ) : null}
                  </div>
                  <div className={payment.kind === "refund" ? "text-rose-300" : "text-emerald-300"}>
                    {payment.kind === "refund" ? "-" : "+"}
                    {money(payment.amount)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs text-neutral-500">{payment.notes ?? "Not yok"}</div>
                  <Button
                    size="sm"
                    variant="danger"
                    disabled={isPending}
                    onClick={async () => {
                      const confirmed = await confirmModal({
                        title: "Ödeme hareketini sil",
                        message: "Fatura bakiyesi yeniden hesaplanacaktır.",
                        variant: "danger",
                        confirmText: "Sil",
                        cancelText: "Vazgeç",
                      });
                      if (!confirmed) return;
                      startTransition(async () => {
                        const result = await deleteInstitutionInvoicePaymentAction({
                          id: payment.id,
                        });
                        showResult(result, {
                          successTitle: "Hareket silindi",
                          errorTitle: "Hareket silinemedi",
                        });
                        if (result.success) router.refresh();
                      });
                    }}
                  >
                    Sil
                  </Button>
                </div>
              </div>
            )),
          )}
          {invoices.every((invoice) => invoice.payments.length === 0) ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-neutral-500">
              Henüz tahsilat veya iade hareketi kaydedilmedi.
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
