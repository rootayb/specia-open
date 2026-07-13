"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, Trash2, Edit } from "lucide-react";

import { deleteInstitutionInvoiceAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";

type InvoiceRecord = {
  id: string;
  invoiceNumber: string;
  customerType: "individual" | "corporate";
  status: "draft" | "approved" | "issued" | "paid" | "cancelled" | "refunded";
  issueDate: string;
  dueDate?: string | null;
  customerName: string;
  customerTitle?: string | null;
  customerIdentityNo?: string | null;
  customerTaxOffice?: string | null;
  customerTaxNumber?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  billingAddress?: string | null;
  serviceTitle: string;
  serviceDescription?: string | null;
  servicePeriod?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  notes?: string | null;
  createdBy: {
    name: string;
    email: string;
  };
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "-";
  }
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

function SummaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-neutral-300">
      {children}
    </span>
  );
}

function invoiceStatusLabel(status: InvoiceRecord["status"]) {
  switch (status) {
    case "draft":
      return "Taslak";
    case "approved":
      return "Onaylandı";
    case "issued":
      return "Düzenlendi";
    case "paid":
      return "Ödendi";
    case "cancelled":
      return "İptal";
    case "refunded":
      return "İade";
  }
}

export function InvoiceList({ invoices }: { invoices: InvoiceRecord[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const [recordsOpen, setRecordsOpen] = useState(true);

  const recordsSummary = [
    `${invoices.length} Kayıt`,
    invoices[0]?.invoiceNumber ? `Son Fatura: ${invoices[0].invoiceNumber}` : "Fatura yok",
  ];

  return (
    <DisclosureCard
      eyebrow="Fatura Arşivi"
      title="Kayıtlı Faturalar"
      description="Sistemde kayıtlı olan kurumsal ve bireysel tüm faturaları listeleyin, PDF çıktılarını alın veya silin."
      open={recordsOpen}
      onOpenChange={setRecordsOpen}
      defaultOpen
      summary={recordsSummary.map((item) => (
        <SummaryPill key={item}>{item}</SummaryPill>
      ))}
    >
      {invoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500 text-center">
          Henüz kayıtlı fatura bulunmuyor. “Yeni Fatura Kes” butonuna basarak ilk faturayı oluşturabilirsiniz.
        </div>
      ) : (
        <div className="grid gap-3">
          {invoices.map((invoice) => {
            const invoiceSubtotal = invoice.quantity * invoice.unitPrice;
            const invoiceTax = invoiceSubtotal * (invoice.taxRate / 100);
            const total = invoiceSubtotal + invoiceTax;

            return (
              <DisclosureCard
                key={invoice.id}
                title={`${invoice.invoiceNumber} · ${invoice.customerName}`}
                description={invoice.serviceTitle}
                summary={[
                  <SummaryPill key="type">
                    {invoice.customerType === "individual" ? "Bireysel" : "Kurumsal"}
                  </SummaryPill>,
                  <SummaryPill key="date">{formatDate(invoice.issueDate)}</SummaryPill>,
                  <SummaryPill key="status">
                    {invoiceStatusLabel(invoice.status)}
                  </SummaryPill>,
                  <SummaryPill key="amount">{formatMoney(total)}</SummaryPill>,
                ]}
                className="rounded-[var(--panel-radius-card)]"
              >
                <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
                  <Field label="Alıcı">
                    <input className={inputClassName()} readOnly value={invoice.customerName} />
                  </Field>
                  <Field label="Hazırlayan">
                    <input className={inputClassName()} readOnly value={invoice.createdBy.name} />
                  </Field>
                  <Field label="Fatura Tarihi">
                    <input className={inputClassName()} readOnly value={formatDate(invoice.issueDate)} />
                  </Field>
                  <Field label="Vade Tarihi">
                    <input className={inputClassName()} readOnly value={formatDate(invoice.dueDate)} />
                  </Field>
                  <Field label="Hizmet Dönemi">
                    <input className={inputClassName()} readOnly value={invoice.servicePeriod ?? "-"} />
                  </Field>
                  <Field label="Ara Toplam">
                    <input className={inputClassName()} readOnly value={formatMoney(invoiceSubtotal)} />
                  </Field>
                  <Field label="KDV">
                    <input className={inputClassName()} readOnly value={formatMoney(invoiceTax)} />
                  </Field>
                  <Field label="Genel Toplam">
                    <input className={inputClassName()} readOnly value={formatMoney(total)} />
                  </Field>
                  <Field label="Fatura Adresi" className="md:col-span-2">
                    <textarea className={inputClassName()} rows={3} readOnly value={invoice.billingAddress ?? "-"} />
                  </Field>
                  <Field label="Hizmet Açıklaması" className="md:col-span-2">
                    <textarea
                      className={inputClassName()}
                      rows={3}
                      readOnly
                      value={invoice.serviceDescription ?? "-"}
                    />
                  </Field>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    onClick={() => router.push(`/panel/finans/duzenle/${invoice.id}`)}
                  >
                    <Edit className="size-4 mr-1.5" />
                    Faturayı Düzenle
                  </Button>
                  <Link href={`/api/pdf/invoice/${invoice.id}`} target="_blank">
                    <Button variant="outline">
                      <FileText className="size-4 mr-1.5" />
                      PDF
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
                    onClick={() => {
                      (async () => {
                        const confirmed = await confirmModal({
                          title: "Faturayı Kalıcı Olarak Sil",
                          message: `"${invoice.invoiceNumber}" numaralı faturayı sistemden kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                          variant: "danger",
                          doubleConfirm: true,
                          confirmText: "Kalıcı Olarak Sil",
                          cancelText: "Vazgeç",
                        });

                        if (!confirmed) return;

                        startTransition(async () => {
                          const result = await deleteInstitutionInvoiceAction({ id: invoice.id });
                          showResult(result, {
                            successTitle: "Fatura silindi",
                            errorTitle: "İşlem tamamlanamadı",
                          });
                          if (result.success) {
                            router.refresh();
                          }
                        });
                      })();
                    }}
                  >
                    <Trash2 className="size-4 mr-1.5" />
                    Kayıtlı Faturayı Sil
                  </Button>
                </div>
              </DisclosureCard>
            );
          })}
        </div>
      )}
    </DisclosureCard>
  );
}
