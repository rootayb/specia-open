"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";

import { saveInstitutionInvoiceAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import type { InstitutionInvoiceInput, InstitutionSettingsInput } from "@/lib/schemas";

function formatMoney(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

export function InvoiceForm({
  settings,
  initialValues,
}: {
  settings: InstitutionSettingsInput;
  initialValues: InstitutionInvoiceInput;
}) {
  const router = useRouter();
  const [form, setForm] = useState<InstitutionInvoiceInput>(initialValues);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const subtotal = Number(form.quantity) * Number(form.unitPrice);
  const taxTotal = subtotal * (Number(form.taxRate) / 100);
  const grandTotal = subtotal + taxTotal;

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveInstitutionInvoiceAction(form);
      setMessage(result.message);
      showResult(result, {
        successTitle: form.id ? "Fatura güncellendi" : "Fatura oluşturuldu",
        errorTitle: form.id ? "Fatura güncellenemedi" : "Fatura oluşturulamadı",
      });
      if (result.success) {
        router.push("/panel/finans");
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-6">
      {/* Header card */}
      <Card variant="interactive" padding="lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => router.push("/panel/finans")}
            >
              <ArrowLeft className="size-5" />
            </Button>
            <div>
              <h1 className="text-xl font-semibold text-white">
                {form.id ? "Faturayı Düzenle" : "Yeni Fatura Oluştur"}
              </h1>
              <p className="text-xs text-[color:var(--panel-text-muted)] mt-1">
                Fatura detaylarını ve vergi hesaplamalarını girerek faturayı kaydedin.
              </p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => router.push("/panel/finans")}
            >
              İptal
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleSave}
            >
              <Save className="size-4 mr-1.5" />
              {isPending ? "Kaydediliyor..." : "Faturayı Kaydet"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Kurum Bilgileri Header */}
      <Card variant="subtle" padding="md" className="bg-white/[0.01] border border-white/5">
        <div className="flex flex-col sm:flex-row justify-between gap-4 text-xs text-[color:var(--panel-text-soft)]">
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
      </Card>

      {/* Main form columns */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* SOL SÜTUN */}
        <div className="space-y-6">
          <Card variant="subtle" padding="md" className="space-y-4">
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
                      status: event.target.value as InstitutionInvoiceInput["status"],
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
          </Card>

          <Card variant="subtle" padding="md" className="space-y-4">
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
                        : { ...current, customerTaxNumber: event.target.value }
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
          </Card>
        </div>

        {/* SAĞ SÜTUN */}
        <div className="space-y-6">
          <Card variant="subtle" padding="md" className="space-y-4">
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
          </Card>

          <Card variant="subtle" padding="md" className="space-y-4">
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
          </Card>

          <Card variant="subtle" padding="md" className="space-y-4">
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
          </Card>
        </div>
      </div>

      {/* Hesaplamalar & Gönder */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
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
            onClick={() => router.push("/panel/finans")}
          >
            İptal
          </Button>
          <Button
            type="button"
            disabled={isPending}
            onClick={handleSave}
          >
            <Save className="size-4 mr-1.5" />
            {isPending ? "Kaydediliyor..." : form.id ? "Değişiklikleri Kaydet" : "Faturayı Oluştur"}
          </Button>
        </div>
      </div>

      {message && <div className="text-sm text-neutral-400 text-center sm:text-left">{message}</div>}
    </div>
  );
}
