"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  calculateEntitlementClaimAction,
  deleteFinancialTariffAction,
  saveFinancialTariffAction,
  updateEntitlementClaimStatusAction,
  updateMebSubmissionStatusAction,
} from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";
import type { FinancialTariffInput } from "@/lib/schemas";

type EducationType = "individual" | "group" | "makeup";
type ClaimStatus =
  | "preliminary"
  | "meb_verified"
  | "reconciled"
  | "discrepancy"
  | "ready_to_invoice"
  | "invoiced";

type MebSubmissionStatus =
  | "not_submitted"
  | "submitted"
  | "approved"
  | "rejected"
  | "missing_documents"
  | "resubmitted";

type Tariff = {
  id: string;
  educationType: EducationType;
  startDate: string;
  endDate: string | null;
  amount: number;
  monthlyAmount: number | null;
  monthlyHours: number | null;
  taxRate: number;
  officialBasis: string;
  isActive: boolean;
};

type ClaimLine = {
  id: string;
  educationType: EducationType;
  scheduledCount: number;
  verifiedCount: number;
  eligibleCount: number;
  rejectedCount: number;
  ramMonthlyLimit: number;
  unitPrice: number;
  totalAmount: number;
  discrepancyReason: string | null;
  student: {
    firstName: string;
    lastName: string;
    classroom: string | null;
  };
  tariff: {
    officialBasis: string;
  };
};

type Claim = {
  id: string;
  period: string;
  status: ClaimStatus;
  calculatedAmount: number;
  mebAcceptedAmount: number;
  discrepancyAmount: number;
  calculatedAt: string;
  mebSubmissionStatus: MebSubmissionStatus;
  mebSubmittedAt: string | null;
  mebApprovedAt: string | null;
  mebRejectedAt: string | null;
  mebRejectionReason: string | null;
  missingDocumentReason: string | null;
  mebResubmittedAt: string | null;
  lines: ClaimLine[];
};

const educationLabels: Record<EducationType, string> = {
  individual: "Bireysel",
  group: "Grup",
  makeup: "Telafi",
};

const claimStatusLabels: Record<ClaimStatus, string> = {
  preliminary: "Ön hesaplama",
  meb_verified: "MEB doğrulandı",
  reconciled: "Mutabık",
  discrepancy: "Fark var",
  ready_to_invoice: "Faturaya hazır",
  invoiced: "Faturalandı",
};

const mebSubmissionStatusLabels: Record<MebSubmissionStatus, string> = {
  not_submitted: "Gönderilmedi",
  submitted: "MEM'e Gönderildi",
  approved: "MEM Onayladı",
  rejected: "MEM Reddetti",
  missing_documents: "Eksik Evrak",
  resubmitted: "Yeniden Gönderildi",
};

const mebSubmissionStatusTones: Record<
  MebSubmissionStatus,
  "neutral" | "info" | "success" | "danger" | "warning"
> = {
  not_submitted: "neutral",
  submitted: "info",
  approved: "success",
  rejected: "danger",
  missing_documents: "warning",
  resubmitted: "info",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function emptyTariff(): FinancialTariffInput {
  return {
    educationType: "individual",
    startDate: today(),
    endDate: "",
    amount: 0,
    monthlyAmount: undefined,
    monthlyHours: undefined,
    taxRate: 0,
    officialBasis: "",
    isActive: true,
  };
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function dateLabel(value: string | null) {
  if (!value) return "Süresiz";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

function eventDateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

export function FinancialComplianceBoard({
  period,
  tariffs,
  claims,
}: {
  period: string;
  tariffs: Tariff[];
  claims: Claim[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FinancialTariffInput>(emptyTariff);
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const [reasonDrafts, setReasonDrafts] = useState<Record<string, string>>({});

  const updateMebSubmission = (claimId: string, status: MebSubmissionStatus) => {
    const reason = reasonDrafts[claimId]?.trim();
    if ((status === "rejected" || status === "missing_documents") && !reason) {
      showResult(
        {
          success: false,
          message:
            status === "rejected" ? "Red nedeni belirtilmelidir." : "Eksik evrak nedeni belirtilmelidir.",
        },
        { errorTitle: "Neden gerekli" },
      );
      return;
    }

    startTransition(async () => {
      const result = await updateMebSubmissionStatusAction({
        id: claimId,
        mebSubmissionStatus: status,
        reason,
      });
      showResult(result, {
        successTitle: "MEM durumu güncellendi",
        errorTitle: "Güncellenemedi",
      });
      if (result.success) {
        setReasonDrafts((current) => ({ ...current, [claimId]: "" }));
        router.refresh();
      }
    });
  };

  const saveTariff = () => {
    startTransition(async () => {
      const result = await saveFinancialTariffAction(form);
      showResult(result, {
        successTitle: "Tarife kaydedildi",
        errorTitle: "Tarife kaydedilemedi",
      });
      if (result.success) {
        setForm(emptyTariff());
        router.refresh();
      }
    });
  };

  const calculateClaim = () => {
    startTransition(async () => {
      const result = await calculateEntitlementClaimAction({ period });
      showResult(result, {
        successTitle: "Hak ediş hesaplandı",
        errorTitle: "Hesaplama tamamlanamadı",
      });
      if (result.success) router.refresh();
    });
  };

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Finansal Uyumluluk
            </div>
            <div className="mt-2 text-2xl font-semibold text-white">
              Tarife ve resmi hak ediş hesaplama
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
              Tarihsel tarifeleri yönetin; RAM limitleri, devam doğrulaması ve telafi dayanaklarıyla
              aylık uygun seansları hesaplayın.
            </p>
          </div>
          <Button disabled={isPending || tariffs.length === 0} onClick={calculateClaim}>
            {isPending ? "Hesaplanıyor..." : `${period} dönemini hesapla`}
          </Button>
        </div>
      </Card>

      <div className="grid gap-6 2xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="text-lg font-semibold text-white">
            {form.id ? "Tarifeyi düzenle" : "Yeni tarife"}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Eğitim tipi">
              <select
                className={inputClassName()}
                value={form.educationType}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    educationType: event.target.value as EducationType,
                  }))
                }
              >
                {Object.entries(educationLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Aylık tutar" hint="Opsiyonel; birim seans tutarını buradan türetebilirsiniz">
              <input
                type="number"
                min="0"
                step="0.01"
                className={inputClassName()}
                value={form.monthlyAmount ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthlyAmount: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
                placeholder="Örn. 7748"
              />
            </Field>
            <Field label="Aylık saat" hint="Bireysel için 8, grup için 4 (mevzuat)">
              <input
                type="number"
                min="1"
                step="1"
                className={inputClassName()}
                value={form.monthlyHours ?? ""}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    monthlyHours: event.target.value ? Number(event.target.value) : undefined,
                  }))
                }
                placeholder="Örn. 8"
              />
            </Field>
            <Field
              label="Birim seans tutarı"
              hint={
                form.monthlyAmount && form.monthlyHours
                  ? `${form.monthlyAmount} / ${form.monthlyHours} = ${(form.monthlyAmount / form.monthlyHours).toFixed(2)} TL — hesaplamak için "Türet" butonunu kullanın`
                  : "Hak ediş hesaplamasında kullanılan gerçek tutar budur"
              }
            >
              <div className="flex gap-2">
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
                <Button
                  type="button"
                  variant="ghost"
                  disabled={!form.monthlyAmount || !form.monthlyHours}
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      amount:
                        current.monthlyAmount && current.monthlyHours
                          ? Math.round((current.monthlyAmount / current.monthlyHours) * 100) / 100
                          : current.amount,
                    }))
                  }
                >
                  Türet
                </Button>
              </div>
            </Field>
            <Field label="Başlangıç">
              <input
                type="date"
                className={inputClassName()}
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, startDate: event.target.value }))
                }
              />
            </Field>
            <Field label="Bitiş">
              <input
                type="date"
                className={inputClassName()}
                value={form.endDate ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, endDate: event.target.value }))
                }
              />
            </Field>
            <Field label="KDV (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                className={inputClassName()}
                value={form.taxRate}
                onChange={(event) =>
                  setForm((current) => ({ ...current, taxRate: Number(event.target.value) }))
                }
              />
            </Field>
            <Field label="Durum">
              <select
                className={inputClassName()}
                value={form.isActive ? "active" : "passive"}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    isActive: event.target.value === "active",
                  }))
                }
              >
                <option value="active">Aktif</option>
                <option value="passive">Pasif</option>
              </select>
            </Field>
            <Field label="Resmi dayanak" className="md:col-span-2">
              <textarea
                rows={3}
                className={inputClassName()}
                value={form.officialBasis}
                onChange={(event) =>
                  setForm((current) => ({ ...current, officialBasis: event.target.value }))
                }
                placeholder="Tebliğ, genelge veya kurum kararının tarih ve sayısı"
              />
            </Field>
          </div>
          <div className="mt-4 flex gap-3">
            <Button disabled={isPending} onClick={saveTariff}>
              {form.id ? "Tarifeyi güncelle" : "Tarife ekle"}
            </Button>
            {form.id ? (
              <Button variant="ghost" onClick={() => setForm(emptyTariff())}>
                Vazgeç
              </Button>
            ) : null}
          </div>
        </Card>

        <Card>
          <div className="text-lg font-semibold text-white">Tarife geçmişi</div>
          <div className="mt-4 grid gap-3">
            {tariffs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-neutral-500">
                Hesaplama yapabilmek için en az bir tarife ekleyin.
              </div>
            ) : (
              tariffs.map((tariff) => (
                <div key={tariff.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">
                        {educationLabels[tariff.educationType]} · {money(tariff.amount)} / seans
                      </div>
                      {tariff.monthlyAmount && tariff.monthlyHours ? (
                        <div className="mt-0.5 text-xs text-neutral-500">
                          {money(tariff.monthlyAmount)} aylık / {tariff.monthlyHours} saat üzerinden
                        </div>
                      ) : null}
                      <div className="mt-1 text-xs text-neutral-500">
                        {dateLabel(tariff.startDate)} - {dateLabel(tariff.endDate)} · KDV %{tariff.taxRate}
                      </div>
                      <div className="mt-2 text-sm text-neutral-300">{tariff.officialBasis}</div>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-300">
                      {tariff.isActive ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          id: tariff.id,
                          educationType: tariff.educationType,
                          startDate: tariff.startDate.slice(0, 10),
                          endDate: tariff.endDate?.slice(0, 10) ?? "",
                          amount: tariff.amount,
                          monthlyAmount: tariff.monthlyAmount ?? undefined,
                          monthlyHours: tariff.monthlyHours ?? undefined,
                          taxRate: tariff.taxRate,
                          officialBasis: tariff.officialBasis,
                          isActive: tariff.isActive,
                        })
                      }
                    >
                      Düzenle
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={isPending}
                      onClick={async () => {
                        const confirmed = await confirmModal({
                          title: "Tarifeyi sil",
                          message: "Bu tarife hak ediş satırlarında kullanıldıysa silinemez.",
                          variant: "danger",
                          confirmText: "Sil",
                          cancelText: "Vazgeç",
                        });
                        if (!confirmed) return;
                        startTransition(async () => {
                          const result = await deleteFinancialTariffAction({ id: tariff.id });
                          showResult(result, {
                            successTitle: "Tarife silindi",
                            errorTitle: "Tarife silinemedi",
                          });
                          if (result.success) router.refresh();
                        });
                      }}
                    >
                      Sil
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <Card>
        <div className="text-lg font-semibold text-white">Hesaplanan hak edişler</div>
        <div className="mt-4 grid gap-3">
          {claims.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-8 text-sm text-neutral-500">
              Henüz resmi uyumluluk hesabı çalıştırılmadı.
            </div>
          ) : (
            claims.map((claim) => (
              <DisclosureCard
                key={claim.id}
                title={`${claim.period} · ${money(claim.calculatedAmount)}`}
                description={`${claim.lines.length} öğrenci/hizmet satırı`}
                summary={[
                  <span key="status" className="text-xs text-neutral-300">
                    {claimStatusLabels[claim.status]}
                  </span>,
                  <Badge key="meb-status" tone={mebSubmissionStatusTones[claim.mebSubmissionStatus]}>
                    {mebSubmissionStatusLabels[claim.mebSubmissionStatus]}
                  </Badge>,
                  <span key="date" className="text-xs text-neutral-400">
                    {dateLabel(claim.calculatedAt)}
                  </span>,
                ]}
              >
                <div className="mb-4 max-w-xs">
                  <Field label="Hak ediş durumu">
                    <select
                      className={inputClassName()}
                      value={claim.status}
                      disabled={isPending}
                      onChange={(event) => {
                        const status = event.target.value as ClaimStatus;
                        startTransition(async () => {
                          const result = await updateEntitlementClaimStatusAction({
                            id: claim.id,
                            status,
                          });
                          showResult(result, {
                            successTitle: "Durum güncellendi",
                            errorTitle: "Durum güncellenemedi",
                          });
                          if (result.success) router.refresh();
                        });
                      }}
                    >
                      {Object.entries(claimStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="font-semibold text-white">MEM Onay Süreci</div>
                    <Badge tone={mebSubmissionStatusTones[claim.mebSubmissionStatus]}>
                      {mebSubmissionStatusLabels[claim.mebSubmissionStatus]}
                    </Badge>
                  </div>

                  <div className="mt-3 grid gap-1.5 text-xs text-neutral-400 sm:grid-cols-2">
                    <div>Gönderim: {eventDateLabel(claim.mebSubmittedAt)}</div>
                    <div>Onay: {eventDateLabel(claim.mebApprovedAt)}</div>
                    <div>Red: {eventDateLabel(claim.mebRejectedAt)}</div>
                    <div>Yeniden gönderim: {eventDateLabel(claim.mebResubmittedAt)}</div>
                  </div>

                  {claim.mebRejectionReason ? (
                    <div className="mt-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">
                      Red nedeni: {claim.mebRejectionReason}
                    </div>
                  ) : null}
                  {claim.missingDocumentReason ? (
                    <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                      Eksik evrak: {claim.missingDocumentReason}
                    </div>
                  ) : null}

                  {(claim.mebSubmissionStatus === "not_submitted" ||
                    claim.mebSubmissionStatus === "rejected" ||
                    claim.mebSubmissionStatus === "missing_documents") && (
                    <div className="mt-3">
                      <Field label="Red / eksik evrak nedeni" hint="Yalnızca ilgili işlemler için gereklidir">
                        <input
                          className={inputClassName()}
                          value={reasonDrafts[claim.id] ?? ""}
                          onChange={(event) =>
                            setReasonDrafts((current) => ({ ...current, [claim.id]: event.target.value }))
                          }
                        />
                      </Field>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    {claim.mebSubmissionStatus === "not_submitted" && (
                      <Button size="sm" disabled={isPending} onClick={() => updateMebSubmission(claim.id, "submitted")}>
                        MEM&apos;e Gönder
                      </Button>
                    )}
                    {claim.mebSubmissionStatus === "submitted" && (
                      <>
                        <Button size="sm" disabled={isPending} onClick={() => updateMebSubmission(claim.id, "approved")}>
                          Onaylandı
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={isPending}
                          onClick={() => updateMebSubmission(claim.id, "rejected")}
                        >
                          Reddedildi
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isPending}
                          onClick={() => updateMebSubmission(claim.id, "missing_documents")}
                        >
                          Eksik Evrak
                        </Button>
                      </>
                    )}
                    {(claim.mebSubmissionStatus === "rejected" ||
                      claim.mebSubmissionStatus === "missing_documents") && (
                      <Button size="sm" disabled={isPending} onClick={() => updateMebSubmission(claim.id, "resubmitted")}>
                        Yeniden Gönder
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid gap-3">
                  {claim.lines.map((line) => (
                    <div key={line.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap justify-between gap-3">
                        <div>
                          <div className="font-medium text-white">
                            {line.student.firstName} {line.student.lastName} ·{" "}
                            {educationLabels[line.educationType]}
                          </div>
                          <div className="mt-1 text-xs text-neutral-500">
                            {line.student.classroom ?? "Sınıf yok"} · {line.tariff.officialBasis}
                          </div>
                        </div>
                        <div className="font-semibold text-white">{money(line.totalAmount)}</div>
                      </div>
                      <div className="mt-3 grid gap-2 text-sm text-neutral-400 sm:grid-cols-5">
                        <div>Planlanan: {line.scheduledCount}</div>
                        <div>Doğrulanan: {line.verifiedCount}</div>
                        <div>Uygun: {line.eligibleCount}</div>
                        <div>Reddedilen: {line.rejectedCount}</div>
                        <div>Aylık limit: {line.ramMonthlyLimit}</div>
                      </div>
                      {line.discrepancyReason ? (
                        <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
                          {line.discrepancyReason}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </DisclosureCard>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
