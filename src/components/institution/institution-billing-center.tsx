"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText } from "lucide-react";

import {
  deleteInstitutionInvoiceAction,
  saveInstitutionInvoiceAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";
import type { InstitutionInvoiceInput, InstitutionSettingsInput } from "@/lib/schemas";

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

const initialInvoiceForm: InstitutionInvoiceInput = {
  customerType: "individual",
  status: "issued",
  issueDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  customerName: "",
  customerTitle: "",
  customerIdentityNo: "",
  customerTaxOffice: "",
  customerTaxNumber: "",
  customerEmail: "",
  customerPhone: "",
  billingAddress: "",
  serviceTitle: "",
  serviceDescription: "",
  servicePeriod: "",
  quantity: 1,
  unitPrice: 0,
  taxRate: 20,
  notes: "",
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

function normalizeInvoiceForm(invoice: InvoiceRecord): InstitutionInvoiceInput {
  return {
    id: invoice.id,
    customerType: invoice.customerType,
    status: invoice.status,
    issueDate: invoice.issueDate.slice(0, 10),
    dueDate: invoice.dueDate ? invoice.dueDate.slice(0, 10) : "",
    customerName: invoice.customerName,
    customerTitle: invoice.customerTitle ?? "",
    customerIdentityNo: invoice.customerIdentityNo ?? "",
    customerTaxOffice: invoice.customerTaxOffice ?? "",
    customerTaxNumber: invoice.customerTaxNumber ?? "",
    customerEmail: invoice.customerEmail ?? "",
    customerPhone: invoice.customerPhone ?? "",
    billingAddress: invoice.billingAddress ?? "",
    serviceTitle: invoice.serviceTitle,
    serviceDescription: invoice.serviceDescription ?? "",
    servicePeriod: invoice.servicePeriod ?? "",
    quantity: invoice.quantity,
    unitPrice: invoice.unitPrice,
    taxRate: invoice.taxRate,
    notes: invoice.notes ?? "",
  };
}

function SummaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-neutral-300">
      {children}
    </span>
  );
}

function getValue(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
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

export function InstitutionBillingCenter({
  settings,
  invoices,
}: {
  settings: InstitutionSettingsInput;
  invoices: InvoiceRecord[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<InstitutionInvoiceInput>(initialInvoiceForm);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const [composeOpen, setComposeOpen] = useState(true);
  const [recordsOpen, setRecordsOpen] = useState(invoices.length > 0);
  const subtotal = Number(form.quantity) * Number(form.unitPrice);
  const taxTotal = subtotal * (Number(form.taxRate) / 100);
  const grandTotal = subtotal + taxTotal;

  const resetForm = () => {
    setForm({
      ...initialInvoiceForm,
      issueDate: new Date().toISOString().slice(0, 10),
    });
  };

  const composeSummary = [
    getValue(form.customerName) ?? "Alıcı seçilmedi",
    getValue(form.serviceTitle) ?? "Hizmet başlığı yok",
    `${formatMoney(grandTotal)} toplam`,
    form.id ? "Düzenleme modunda" : "Yeni kayıt",
  ];

  const recordsSummary = [
    `${invoices.length} kayıt`,
    invoices[0]?.invoiceNumber ? `Son kayıt: ${invoices[0].invoiceNumber}` : "Kayıt bekleniyor",
  ];

  return (
    <div className="grid gap-4">
      <DisclosureCard
        eyebrow="Fatura"
        title={form.id ? "Faturayı Düzenle" : "Yeni Fatura Kes"}
        description="Fatura bilgilerini girerek kolayca fatura oluşturun."
        open={composeOpen}
        onOpenChange={setComposeOpen}
        defaultOpen
        summary={composeSummary.map((item) => (
          <SummaryPill key={item}>{item}</SummaryPill>
        ))}
      >
        <div className="grid gap-6">
          {/* Kurum Bilgileri Header */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-4 text-sm text-neutral-400">
            <div>
              <span className="font-semibold text-neutral-300">Kurum Unvanı:</span> {settings.legalName || settings.schoolName || "-"}
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              <div>
                <span className="font-semibold text-neutral-300">Vergi Dairesi:</span> {settings.taxOffice || "-"}
              </div>
              <div>
                <span className="font-semibold text-neutral-300">Vergi No:</span> {settings.taxNumber || "-"}
              </div>
            </div>
          </div>

          {/* Form grid - Two Columns on desktop */}
          <div className="grid gap-6 lg:grid-cols-2">
            
            {/* SOL SÜTUN: Belge ve Alıcı Bilgileri */}
            <div className="space-y-6">
              
              {/* Belge Akışı */}
              <div className="rounded-[var(--panel-radius-card)] border border-white/5 bg-white/[0.01] p-5 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Belge Detayları
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Fatura Tipi">
                    <select
                      className={inputClassName()}
                      value={form.customerType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          customerType: event.target.value as "individual" | "corporate",
                        }))
                      }
                    >
                      <option value="individual">Bireysel</option>
                      <option value="corporate">Kurumsal</option>
                    </select>
                  </Field>
                  <Field label="Durum">
                    <select
                      className={inputClassName()}
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value as InvoiceRecord["status"],
                        }))
                      }
                    >
                      <option value="issued">Düzenlendi</option>
                      <option value="draft">Taslak</option>
                      <option value="approved">Onaylandı</option>
                      <option value="paid">Ödendi</option>
                      <option value="cancelled">İptal</option>
                      <option value="refunded">İade</option>
                    </select>
                  </Field>
                  <Field label="Fatura Tarihi">
                    <input
                      className={inputClassName()}
                      type="date"
                      value={form.issueDate}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, issueDate: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Vade Tarihi">
                    <input
                      className={inputClassName()}
                      type="date"
                      value={form.dueDate ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, dueDate: event.target.value }))
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* Alıcı Bilgileri */}
              <div className="rounded-[var(--panel-radius-card)] border border-white/5 bg-white/[0.01] p-5 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Müşteri / Alıcı Bilgileri
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Müşteri / Alıcı">
                    <input
                      className={inputClassName()}
                      placeholder="Ad Soyad veya Kurum Adı"
                      value={form.customerName}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, customerName: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Unvan / Firma">
                    <input
                      className={inputClassName()}
                      placeholder="Resmi unvanı (isteğe bağlı)"
                      value={form.customerTitle ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, customerTitle: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label={form.customerType === "individual" ? "T.C. Kimlik No" : "Vergi Numarası"}>
                    <input
                      className={inputClassName()}
                      placeholder={form.customerType === "individual" ? "11 haneli TC No" : "10 haneli Vergi No"}
                      value={
                        form.customerType === "individual"
                          ? form.customerIdentityNo ?? ""
                          : form.customerTaxNumber ?? ""
                      }
                      onChange={(event) =>
                        setForm((current) =>
                          form.customerType === "individual"
                            ? { ...current, customerIdentityNo: event.target.value }
                            : { ...current, customerTaxNumber: event.target.value },
                        )
                      }
                    />
                  </Field>
                  <Field label="Vergi Dairesi">
                    <input
                      className={inputClassName()}
                      placeholder="İlgili Vergi Dairesi"
                      value={form.customerTaxOffice ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, customerTaxOffice: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="E-posta">
                    <input
                      className={inputClassName()}
                      type="email"
                      placeholder="örnek@alan.com"
                      value={form.customerEmail ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, customerEmail: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Telefon">
                    <input
                      className={inputClassName()}
                      placeholder="0555 555 5555"
                      value={form.customerPhone ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, customerPhone: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Fatura Adresi" className="sm:col-span-2">
                    <textarea
                      className={inputClassName()}
                      rows={3}
                      placeholder="Detaylı fatura adresi"
                      value={form.billingAddress ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, billingAddress: event.target.value }))
                      }
                    />
                  </Field>
                </div>
              </div>

            </div>

            {/* SAĞ SÜTUN: Hizmet, Tutar ve Notlar */}
            <div className="space-y-6">

              {/* Hizmet Bilgileri */}
              <div className="rounded-[var(--panel-radius-card)] border border-white/5 bg-white/[0.01] p-5 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Hizmet Bilgileri
                </div>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Hizmet Başlığı">
                      <input
                        className={inputClassName()}
                        placeholder="Örn. Özel Eğitim Desteği"
                        value={form.serviceTitle}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, serviceTitle: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Hizmet Dönemi">
                      <input
                        className={inputClassName()}
                        placeholder="Örn. Mart 2026"
                        value={form.servicePeriod ?? ""}
                        onChange={(event) =>
                          setForm((current) => ({ ...current, servicePeriod: event.target.value }))
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Hizmet Açıklaması">
                    <textarea
                      className={inputClassName()}
                      rows={2}
                      placeholder="Sunulan hizmete dair detaylar"
                      value={form.serviceDescription ?? ""}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, serviceDescription: event.target.value }))
                      }
                    />
                  </Field>
                </div>
              </div>

              {/* Tutar ve Fiyatlandırma */}
              <div className="rounded-[var(--panel-radius-card)] border border-white/5 bg-white/[0.01] p-5 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Tutar ve Hesaplamalar
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Miktar">
                    <input
                      className={inputClassName()}
                      type="number"
                      min="1"
                      step="0.01"
                      value={form.quantity}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, quantity: Number(event.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="Birim Tutar (TL)">
                    <input
                      className={inputClassName()}
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.unitPrice}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, unitPrice: Number(event.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="KDV Oranı (%)">
                    <input
                      className={inputClassName()}
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={form.taxRate}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, taxRate: Number(event.target.value) }))
                      }
                    />
                  </Field>
                  <Field label="Ara Toplam">
                    <input
                      className={inputClassName()}
                      value={formatMoney(subtotal)}
                      readOnly
                      disabled
                    />
                  </Field>
                </div>
              </div>

              {/* Ek Notlar */}
              <div className="rounded-[var(--panel-radius-card)] border border-white/5 bg-white/[0.01] p-5 space-y-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  Ek Notlar ve Açıklamalar
                </div>
                <Field label="Notlar">
                  <textarea
                    className={inputClassName()}
                    rows={2}
                    placeholder="Faturaya eklenecek özel notlar veya açıklamalar"
                    value={form.notes ?? ""}
                    onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  />
                </Field>
              </div>

            </div>

          </div>

          {/* Toplam Tutarlar ve Gönderim Butonları */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 mt-4">
            <div className="grid gap-2 text-sm text-neutral-400 w-full sm:w-auto">
              <div className="flex justify-between sm:justify-start gap-4">
                <span>Ara toplam:</span>
                <span className="font-medium text-neutral-200">{formatMoney(subtotal)}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4">
                <span>KDV:</span>
                <span className="font-medium text-neutral-200">{formatMoney(taxTotal)}</span>
              </div>
              <div className="flex justify-between sm:justify-start gap-4 text-base font-semibold text-white border-t border-white/10 pt-2 mt-1">
                <span>Genel toplam:</span>
                <span>{formatMoney(grandTotal)}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 w-full sm:w-auto justify-end">
              <Button
                type="button"
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  resetForm();
                  setMessage("");
                }}
              >
                Formu Temizle
              </Button>
              <Button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await saveInstitutionInvoiceAction(form);
                    setMessage(result.message);
                    showResult(result, {
                      successTitle: form.id ? "Fatura güncellendi" : "Fatura kaydedildi",
                      errorTitle: form.id ? "Fatura güncellenemedi" : "Fatura kaydedilemedi",
                    });
                    if (result.success) {
                      resetForm();
                      router.refresh();
                    }
                  });
                }}
              >
                {isPending ? "Kaydediliyor..." : form.id ? "Faturayı Güncelle" : "Fatura Oluştur"}
              </Button>
            </div>
          </div>

          {message ? <div className="text-sm text-neutral-400 text-center sm:text-left">{message}</div> : null}
        </div>
      </DisclosureCard>

      <DisclosureCard
        eyebrow="Arşiv"
        title="Kayıtlı faturalar"
        description="Oluşturulan faturaları tek tek açıp inceleyin, düzenleyin veya PDF alın."
        open={recordsOpen}
        onOpenChange={setRecordsOpen}
        summary={recordsSummary.map((item) => (
          <SummaryPill key={item}>{item}</SummaryPill>
        ))}
      >
        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
            Henüz kayıtlı fatura yok.
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
                      onClick={() => {
                        setForm(normalizeInvoiceForm(invoice));
                        setComposeOpen(true);
                        setMessage(`${invoice.invoiceNumber} düzenleme için forma yüklendi.`);
                      }}
                    >
                      Düzenle
                    </Button>
                    <Link href={`/api/pdf/invoice/${invoice.id}`} target="_blank">
                      <Button variant="outline">
                        <FileText className="mr-2 size-4" />
                        PDF
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      disabled={isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
                            setMessage(result.message);
                            showResult(result, {
                              successTitle: "Fatura silindi",
                              errorTitle: "İşlem tamamlanamadı",
                            });
                            if (result.success) {
                              if (form.id === invoice.id) {
                                resetForm();
                              }
                              router.refresh();
                            }
                          });
                        })();
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                </DisclosureCard>
              );
            })}
          </div>
        )}
      </DisclosureCard>
    </div>
  );
}
