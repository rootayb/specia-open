"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

import { saveInstitutionSettingsAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import type { InstitutionSettingsInput } from "@/lib/schemas";
import { restoreTurkishText } from "@/lib/turkish";

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

export function InstitutionSettingsForm({
  initialValues,
  mode = "all",
  showIntro = true,
}: {
  initialValues: InstitutionSettingsInput;
  mode?: "all" | "general" | "management" | "billing" | "notes";
  showIntro?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [form, setForm] = useState<InstitutionSettingsInput>(initialValues);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const [localPreview, setLocalPreview] = useState<string | null>(
    initialValues.logoMimeType ? "/api/institution/logo" : null
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        showToast({
          title: "Geçersiz dosya türü",
          message: "Lütfen bir resim dosyası seçin (PNG, JPG, JPEG, WEBP).",
          tone: "error",
        });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        showToast({
          title: "Dosya çok büyük",
          message: "Logo boyutu en fazla 2MB olabilir.",
          tone: "error",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        setForm((current) => ({
          ...current,
          logoBase64: base64,
          logoMimeType: file.type,
          logoFileName: file.name,
          removeLogo: false,
        }));
        setLocalPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setForm((current) => ({
      ...current,
      logoBase64: "",
      logoMimeType: "",
      logoFileName: "",
      removeLogo: true,
    }));
    setLocalPreview(null);
  };

  const generalSummary = [
    getValue(form.schoolName) ?? "Okul adı bekleniyor",
    [getValue(form.district), getValue(form.city)].filter(Boolean).join(" / ") || "Konum eklenmedi",
    getValue(form.phone) ?? "Telefon yok",
    getValue(form.email) ?? "E-posta yok",
  ];

  const managementSummary = [
    [getValue(form.principalName), getValue(form.principalTitle)].filter(Boolean).join(" - ") ||
      "Müdür bilgisi girilmedi",
    [getValue(form.defaultManagerName), getValue(form.defaultManagerTitle)]
      .filter(Boolean)
      .join(" - ") || "Koordinatör bilgisi girilmedi",
  ];

  const billingSummary = [
    getValue(form.legalName) ?? "Resmi unvan yok",
    [getValue(form.taxOffice), getValue(form.taxNumber)].filter(Boolean).join(" / ") ||
      "Vergi bilgisi eksik",
    getValue(form.invoicePrefix) ? `Önek: ${getValue(form.invoicePrefix)}` : "Fatura öneki yok",
    getValue(form.iban) ? "IBAN tanımlı" : "IBAN yok",
  ];

  const notesSummary = [
    getValue(form.notes) ? "İç not mevcut" : "İç not yok",
  ];
  const showGeneral = mode === "all" || mode === "general";
  const showManagement = mode === "all" || mode === "management";
  const showBilling = mode === "all" || mode === "billing";
  const showNotes = mode === "all" || mode === "notes";

  return (
    <div className="grid gap-4">
      {showIntro ? (
        <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] px-5 py-5">
          <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Genel
          </div>
          <div className="mt-2 text-lg font-semibold text-white">Kurum bilgisini düzenleyin</div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-400">
            İhtiyacınız olan alanı açıp güncelleyebilirsiniz.
          </p>
        </div>
      ) : null}

      {showGeneral ? (
        <DisclosureCard
          eyebrow="01"
          title="Genel bilgiler"
          description="Kurum adı, iletişim ve adres bilgisini güncelleyin."
          defaultOpen
          summary={generalSummary.map((item) => (
            <SummaryPill key={item}>{item}</SummaryPill>
          ))}
        >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Okul Adı">
            <input
              className={inputClassName()}
              value={form.schoolName ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, schoolName: event.target.value }))
              }
            />
          </Field>
          <Field label="İlçe">
            <input
              className={inputClassName()}
              value={form.district ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, district: event.target.value }))}
            />
          </Field>
          <Field label="Şehir">
            <input
              className={inputClassName()}
              value={form.city ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
            />
          </Field>
          <Field label="Telefon">
            <input
              className={inputClassName()}
              value={form.phone ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
            />
          </Field>
          <Field label="Kurum E-postası">
            <input
              className={inputClassName()}
              type="email"
              value={form.email ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            />
          </Field>
          <div className="hidden md:block" />
          <Field label="Adres" className="md:col-span-2">
            <textarea
              className={inputClassName()}
              rows={4}
              value={form.address ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, address: event.target.value }))
              }
            />
          </Field>
        </div>
        </DisclosureCard>
      ) : null}

      {showGeneral ? (
        <DisclosureCard
          eyebrow="02"
          title="Kurum logosu"
          description="Resmi PDF çıktılarında kullanılacak kurum logosunu yükleyin veya güncelleyin."
          defaultOpen
          summary={[localPreview ? "Logo Yüklü" : "Logo Yok"].map((item) => (
            <SummaryPill key={item}>{item}</SummaryPill>
          ))}
        >
          <div className="grid gap-6 md:grid-cols-[120px_1fr] items-start">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-28 w-28 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
                {localPreview ? (
                  <Image
                    src={localPreview}
                    alt="Kurum Logosu"
                    width={112}
                    height={112}
                    unoptimized
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-[11px] text-neutral-500 uppercase tracking-wider text-center p-2">
                    Logo Yok
                  </span>
                )}
              </div>
              {localPreview ? (
                <Button
                  variant="ghost"
                  type="button"
                  className="h-7 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2 rounded-lg"
                  onClick={handleRemoveLogo}
                >
                  Logoyu Kaldır
                </Button>
              ) : null}
            </div>

            <div className="space-y-4">
              <Field label="Logo Seçin">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  className={inputClassName()}
                  onChange={handleFileChange}
                />
              </Field>
              <p className="text-[11px] leading-5 text-neutral-500">
                • Desteklenen formatlar: PNG, JPG, JPEG, WEBP.<br />
                • Maksimum dosya boyutu: 2MB.<br />
                • Yüklenen logo, indirilen PDF raporlarının üst başlık alanında otomatik olarak gösterilir.
              </p>
            </div>
          </div>
        </DisclosureCard>
      ) : null}

      {showManagement ? (
        <DisclosureCard
          eyebrow="03"
          title="Yönetim ve imza"
          description="Müdür ve koordinatör bilgilerini düzenleyin."
          defaultOpen
          summary={managementSummary.map((item) => (
            <SummaryPill key={item}>{item}</SummaryPill>
          ))}
        >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Müdür Adı">
            <input
              className={inputClassName()}
              value={form.principalName ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, principalName: event.target.value }))
              }
            />
          </Field>
          <Field label="Müdür Unvanı">
            <input
              className={inputClassName()}
              value={form.principalTitle ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, principalTitle: event.target.value }))
              }
            />
          </Field>
          <Field label="Varsayılan Koordinatör">
            <input
              className={inputClassName()}
              value={form.defaultManagerName ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultManagerName: event.target.value }))
              }
            />
          </Field>
          <Field label="Koordinatör Unvanı">
            <input
              className={inputClassName()}
              value={form.defaultManagerTitle ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, defaultManagerTitle: event.target.value }))
              }
            />
          </Field>
        </div>
        </DisclosureCard>
      ) : null}

      {showBilling ? (
        <DisclosureCard
          eyebrow="04"
          title="Fatura ve resmi bilgiler"
          description="Resmi unvan, vergi ve banka bilgilerini düzenleyin."
          defaultOpen
          summary={billingSummary.map((item) => (
            <SummaryPill key={item}>{item}</SummaryPill>
          ))}
        >
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Resmi / Ticari Unvan">
            <input
              className={inputClassName()}
              value={form.legalName ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
            />
          </Field>
          <Field label="Fatura Önek Kodu" hint="Örn. SPC, KRM, ABC">
            <input
              className={inputClassName()}
              value={form.invoicePrefix ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, invoicePrefix: event.target.value }))
              }
            />
          </Field>
          <Field label="Vergi Dairesi">
            <input
              className={inputClassName()}
              value={form.taxOffice ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, taxOffice: event.target.value }))}
            />
          </Field>
          <Field label="Vergi Numarası">
            <input
              className={inputClassName()}
              value={form.taxNumber ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, taxNumber: event.target.value }))}
            />
          </Field>
          <Field label="MERSİS Numarası">
            <input
              className={inputClassName()}
              value={form.mersisNumber ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, mersisNumber: event.target.value }))
              }
            />
          </Field>
          <Field label="IBAN">
            <input
              className={inputClassName()}
              value={form.iban ?? ""}
              onChange={(event) => setForm((current) => ({ ...current, iban: event.target.value }))}
            />
          </Field>
        </div>
        </DisclosureCard>
      ) : null}

      {showNotes ? (
        <DisclosureCard
          eyebrow="05"
          title="Notlar"
          description="Kurumla ilgili kısa notları burada tutun."
          defaultOpen
          summary={notesSummary.map((item) => (
            <SummaryPill key={item}>{item}</SummaryPill>
          ))}
        >
        <Field label="Notlar">
          <textarea
            className={inputClassName()}
            rows={5}
            value={form.notes ?? ""}
            onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
          />
        </Field>
        </DisclosureCard>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] px-5 py-4">
        <Button
          disabled={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await saveInstitutionSettingsAction(form);
              setMessage(result.message);
              showToast({
                title: result.success ? "Genel bilgiler guncellendi" : "Guncelleme tamamlanmadi",
                message: result.message,
                tone: result.success ? "success" : "error",
              });
              if (result.success) {
                setLocalPreview(
                  form.removeLogo
                    ? null
                    : form.logoMimeType
                      ? `/api/institution/logo?t=${Date.now()}`
                      : localPreview
                );
                setForm((current) => ({
                  ...current,
                  logoBase64: "",
                  removeLogo: false,
                }));
                router.refresh();
              }
            });
          }}
        >
          {isPending ? "Kaydediliyor..." : "Ayarları Kaydet"}
        </Button>
        {message ? <div className="text-sm text-neutral-400">{restoreTurkishText(message)}</div> : null}
      </div>
    </div>
  );
}
