"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileImage, Plus, Receipt, ScanLine, X } from "lucide-react";

import { deleteGeneralExpenseAction, saveGeneralExpenseAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { confirmModal } from "@/components/ui/confirm-modal";
import { Field, inputClassName } from "@/components/ui/field";
import { SectionHeading } from "@/components/ui/section-heading";
import type { GeneralExpenseInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type GeneralExpenseCategory = "rent" | "utilities" | "office_supplies" | "maintenance" | "other";
type GeneralExpenseStatus = "planned" | "paid";
type PaymentMethod = "bank_transfer" | "cash" | "card" | "other";

type GeneralExpense = {
  id: string;
  title: string;
  vendorName: string | null;
  category: GeneralExpenseCategory;
  status: GeneralExpenseStatus;
  period: string;
  amount: number;
  paymentDate: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  hasReceipt: boolean;
  createdBy: { name: string };
};

const CATEGORY_LABELS: Record<GeneralExpenseCategory, string> = {
  rent: "Kira",
  utilities: "Fatura",
  office_supplies: "Ofis Malzemesi",
  maintenance: "Bakım / Onarım",
  other: "Diğer",
};

const STATUS_TONE: Record<GeneralExpenseStatus, "warning" | "success"> = {
  planned: "warning",
  paid: "success",
};

const STATUS_LABELS: Record<GeneralExpenseStatus, string> = {
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

function emptyForm(period: string): GeneralExpenseInput {
  return {
    title: "",
    vendorName: "",
    category: "other",
    status: "planned",
    period,
    amount: 0,
    paymentDate: "",
    paymentMethod: undefined,
    uploadedFileName: undefined,
    uploadedMimeType: undefined,
    uploadedBase64: undefined,
    removeReceipt: false,
    ocrRawText: undefined,
    notes: "",
  };
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Dosya okunamadı."));
    reader.readAsDataURL(file);
  });
}

export function GeneralExpenseBoard({
  period,
  expenses,
}: {
  period: { key: string; label: string };
  expenses: GeneralExpense[];
}) {
  const router = useRouter();
  const { showToast } = useActionFeedback();
  const [isPending, startTransition] = useTransition();
  const [isScanning, setIsScanning] = useState(false);
  const [form, setForm] = useState<GeneralExpenseInput>(() => emptyForm(period.key));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingHadReceipt, setEditingHadReceipt] = useState(false);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setEditingHadReceipt(false);
    setPreviewDataUrl(null);
  }

  function startEditing(expense: GeneralExpense) {
    setEditingId(expense.id);
    setEditingHadReceipt(expense.hasReceipt);
    setPreviewDataUrl(null);
    setForm({
      title: expense.title,
      vendorName: expense.vendorName ?? "",
      category: expense.category,
      status: expense.status,
      period: expense.period,
      amount: expense.amount,
      paymentDate: expense.paymentDate?.slice(0, 10) ?? "",
      paymentMethod: expense.paymentMethod ?? undefined,
      uploadedFileName: undefined,
      uploadedMimeType: undefined,
      uploadedBase64: undefined,
      removeReceipt: false,
      ocrRawText: undefined,
      notes: expense.notes ?? "",
    });
  }

  async function handleFileSelected(file: File | undefined | null) {
    if (!file) return;

    let base64: string;
    try {
      base64 = await readFileAsBase64(file);
    } catch {
      showToast({ title: "Dosya okunamadı", message: "Lütfen başka bir görsel deneyin.", tone: "error" });
      return;
    }

    setPreviewDataUrl(`data:${file.type};base64,${base64}`);
    setForm((current) => ({
      ...current,
      uploadedBase64: base64,
      uploadedFileName: file.name,
      uploadedMimeType: file.type || "application/octet-stream",
      removeReceipt: false,
    }));

    setIsScanning(true);
    try {
      const response = await fetch("/api/finans/genel-giderler/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base64, fileName: file.name, mimeType: file.type }),
      });
      const payload = await response.json();

      if (!response.ok || !payload.success) {
        showToast({
          title: "Fiş taranamadı",
          message: payload?.error?.message ?? "Bilgileri elle girebilirsiniz.",
          tone: "info",
        });
        return;
      }

      const ocr = payload.data as {
        rawText: string;
        amount: number | null;
        date: string | null;
        vendorName: string | null;
      };

      setForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : ocr.vendorName ?? current.title,
        vendorName: current.vendorName?.trim() ? current.vendorName : ocr.vendorName ?? current.vendorName,
        amount: current.amount > 0 ? current.amount : ocr.amount ?? current.amount,
        paymentDate: current.paymentDate?.trim() ? current.paymentDate : ocr.date ?? current.paymentDate,
        ocrRawText: ocr.rawText,
      }));

      showToast({
        title: "Fiş tarandı",
        message: "Alanları kontrol edip kaydedin; tutar/tarih otomatik doldurulmuş olabilir.",
        tone: "success",
      });
    } catch {
      showToast({
        title: "OCR servisine ulaşılamadı",
        message: "Bilgileri elle girebilirsiniz.",
        tone: "info",
      });
    } finally {
      setIsScanning(false);
    }
  }

  function removeSelectedReceipt() {
    setPreviewDataUrl(null);
    setForm((current) => ({
      ...current,
      uploadedBase64: undefined,
      uploadedFileName: undefined,
      uploadedMimeType: undefined,
      ocrRawText: undefined,
      removeReceipt: editingHadReceipt ? true : current.removeReceipt,
    }));
  }

  function submit() {
    startTransition(async () => {
      const result = await saveGeneralExpenseAction({ ...form, id: editingId ?? undefined });
      if (result.success) {
        showToast({
          title: editingId ? "Gider güncellendi" : "Gider kaydedildi",
          message: result.message,
          tone: "success",
        });
        resetForm();
        router.refresh();
      } else {
        showToast({ title: "İşlem tamamlanamadı", message: result.message, tone: "error" });
      }
    });
  }

  function remove(expense: GeneralExpense) {
    startTransition(async () => {
      const confirmed = await confirmModal({
        title: "Gider kaydını sil",
        message: `${expense.title} için ${money(expense.amount)} tutarındaki kayıt silinsin mi?`,
        variant: "danger",
        confirmText: "Sil",
        cancelText: "Vazgeç",
      });
      if (!confirmed) return;

      const result = await deleteGeneralExpenseAction({ id: expense.id });
      if (result.success) {
        showToast({ title: "Gider silindi", message: result.message, tone: "success" });
        if (editingId === expense.id) resetForm();
        router.refresh();
      } else {
        showToast({ title: "Silme başarısız", message: result.message, tone: "error" });
      }
    });
  }

  const canSave = form.title.trim().length >= 2 && form.amount > 0;
  const existingReceiptUrl = editingId && editingHadReceipt ? `/api/finans/genel-giderler/${editingId}/receipt` : null;

  return (
    <div className="grid gap-5">
      {/* Dönem seçimi + özet */}
      <Card padding="md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              Genel İşletme Giderleri
            </div>
            <div className="mt-1 text-lg font-semibold text-[color:var(--panel-text)]">
              {period.label}
            </div>
          </div>
          <input
            type="month"
            className={cn(inputClassName(), "w-40")}
            value={period.key}
            onChange={(event) => router.push(`/panel/finans/genel-giderler?period=${event.target.value}`)}
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
          title="Genel işletme gideri ekle"
          description="Kira, fatura, ofis malzemesi veya bakım-onarım giderini fiş görseliyle birlikte kaydedin."
        />

        {/* Fiş yakalama: kamera veya dosya, ikisi de mevcut */}
        <div className="mt-4 rounded-[var(--panel-radius-md)] border border-dashed border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => cameraInputRef.current?.click()}>
              <Camera className="size-4" />
              Kamera ile Çek
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
              <FileImage className="size-4" />
              Dosyadan Yükle
            </Button>
            {isScanning ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-[color:var(--panel-text-soft)]">
                <ScanLine className="size-4 animate-pulse" />
                Fiş taranıyor...
              </span>
            ) : null}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                void handleFileSelected(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(event) => {
                void handleFileSelected(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>

          {previewDataUrl || existingReceiptUrl ? (
            <div className="mt-3 flex items-center gap-3">
              {previewDataUrl && form.uploadedMimeType?.startsWith("image/") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewDataUrl}
                  alt="Seçilen fiş önizlemesi"
                  className="h-16 w-16 rounded-[var(--panel-radius-sm)] border border-[color:var(--panel-border)] object-cover"
                />
              ) : existingReceiptUrl ? (
                <a
                  href={existingReceiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-16 w-16 items-center justify-center rounded-[var(--panel-radius-sm)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text-soft)]"
                >
                  <Receipt className="size-6" />
                </a>
              ) : null}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-[color:var(--panel-text)]">
                  {form.uploadedFileName ?? "Kayıtlı fiş görseli"}
                </div>
                <button
                  type="button"
                  className="mt-1 text-xs font-medium text-[color:var(--panel-danger-text)] underline-offset-2 hover:underline"
                  onClick={removeSelectedReceipt}
                >
                  <X className="mr-1 inline size-3" />
                  Fişi kaldır
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-xs text-[color:var(--panel-text-soft)]">
              Fiş fotoğrafı yüklerseniz tutar, tarih ve satıcı adı otomatik doldurulmaya çalışılır; kaydetmeden önce
              kontrol edin.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Gider başlığı">
            <input
              className={inputClassName()}
              placeholder="Örn. Ofis kirası - Temmuz"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>

          <Field label="Satıcı / firma" hint="Opsiyonel">
            <input
              className={inputClassName()}
              value={form.vendorName ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, vendorName: event.target.value }))}
            />
          </Field>

          <Field label="Gider türü">
            <select
              className={inputClassName()}
              value={form.category}
              onChange={(event) =>
                setForm((current) => ({ ...current, category: event.target.value as GeneralExpenseCategory }))
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
                setForm((current) => ({ ...current, status: event.target.value as GeneralExpenseStatus }))
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
          <Button disabled={isPending || !canSave} onClick={submit}>
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
          title={`${period.label} genel işletme giderleri`}
          description={`${expenses.length} kayıt`}
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)]">
                <th className="pb-3 pr-2">Gider</th>
                <th className="pb-3 px-2">Tür</th>
                <th className="pb-3 px-2 text-right">Tutar</th>
                <th className="pb-3 px-2">Durum</th>
                <th className="pb-3 px-2">Fiş</th>
                <th className="pb-3 pl-2 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[color:var(--panel-border)]/60">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[color:var(--panel-text-muted)]">
                    Bu dönem için henüz gider kaydı yok.
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-[color:var(--panel-bg-hover)]/40 transition-colors">
                    <td className="py-3 pr-2">
                      <div className="font-medium text-[color:var(--panel-text)]">{expense.title}</div>
                      {expense.vendorName ? (
                        <div className="text-xs text-[color:var(--panel-text-soft)]">{expense.vendorName}</div>
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
                    <td className="py-3 px-2">
                      {expense.hasReceipt ? (
                        <a
                          href={`/api/finans/genel-giderler/${expense.id}/receipt`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[color:var(--panel-info-text)] underline-offset-2 hover:underline"
                        >
                          <Receipt className="size-3.5" />
                          Görüntüle
                        </a>
                      ) : (
                        <span className="text-xs text-[color:var(--panel-text-soft)]">—</span>
                      )}
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
