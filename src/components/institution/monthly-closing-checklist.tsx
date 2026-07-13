import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import type { MonthlyClosingChecklist } from "@/lib/data";

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value);
}

const educationLabels: Record<"individual" | "group" | "makeup", string> = {
  individual: "Bireysel",
  group: "Grup",
  makeup: "Telafi",
};

type PreflightItem = {
  label: string;
  ok: boolean;
  detail: string;
};

/**
 * Aylık kapanış sihirbazı: hak ediş hesaplanmadan/faturalandırılmadan önce
 * giderilmesi gereken eksikleri özetler ve mevcut hesapla/fatura/MEM gönderim
 * adımlarına sırayla yönlendirir. Bu adımların kendi mantığını tekrarlamaz.
 */
export function MonthlyClosingChecklist({ checklist }: { checklist: MonthlyClosingChecklist }) {
  const preflightItems: PreflightItem[] = [
    {
      label: "Eksik yoklama",
      ok: checklist.missingAttendanceCount === 0,
      detail:
        checklist.missingAttendanceCount === 0
          ? "Geçmiş tüm dersler için yoklama işlenmiş."
          : `${checklist.missingAttendanceCount} ders için yoklama sonucu girilmemiş.`,
    },
    {
      label: "Öğretmen ataması",
      ok: checklist.unassignedTeacherCount === 0,
      detail:
        checklist.unassignedTeacherCount === 0
          ? "Tüm derslerde öğretmen ataması yapılmış."
          : `${checklist.unassignedTeacherCount} ders için öğretmen atanmamış.`,
    },
    {
      label: "RAM rapor süresi",
      ok: checklist.ramExpiringCount === 0,
      detail:
        checklist.ramExpiringCount === 0
          ? "Ders alan öğrencilerin RAM raporları bu dönemi kapsıyor."
          : `${checklist.ramExpiringCount} öğrencinin RAM raporu bu dönemde geçersiz veya süresi dolmuş.`,
    },
    {
      label: "Tarife tanımı",
      ok: checklist.missingTariffEducationTypes.length === 0,
      detail:
        checklist.missingTariffEducationTypes.length === 0
          ? "Kullanılan tüm eğitim türleri için tarife tanımlı."
          : `Tarifesi eksik: ${checklist.missingTariffEducationTypes.map((type) => educationLabels[type]).join(", ")}.`,
    },
  ];

  const allPreflightOk = preflightItems.every((item) => item.ok);

  const steps = [
    {
      label: "1. Hak ediş hesapla",
      done: Boolean(checklist.existingClaim),
      detail: checklist.existingClaim
        ? `${checklist.period.label} için hesaplandı: ${money(checklist.existingClaim.calculatedAmount)}`
        : "Bu dönem için henüz hesaplama yapılmadı.",
      href: "#tarife-hesapla",
    },
    {
      label: "2. Taslak fatura oluştur",
      done: checklist.draftInvoiceCount > 0,
      detail:
        checklist.draftInvoiceCount > 0
          ? `${checklist.draftInvoiceCount} taslak/kesilmiş fatura mevcut.`
          : "Bu dönem için henüz taslak fatura oluşturulmadı.",
      href: "#taslak-fatura",
    },
    {
      label: "3. MEM'e gönder",
      done: checklist.existingClaim?.mebSubmissionStatus === "submitted" ||
        checklist.existingClaim?.mebSubmissionStatus === "approved",
      detail: checklist.existingClaim
        ? `Gönderim durumu: ${
            checklist.existingClaim.mebSubmissionStatus === "not_submitted"
              ? "Gönderilmedi"
              : checklist.existingClaim.mebSubmissionStatus
          }`
        : "Önce hak ediş hesaplanmalıdır.",
      href: "#tarife-hesapla",
    },
  ];

  return (
    <Card padding="lg">
      <SectionHeading
        eyebrow="Aylık Kapanış"
        title={`${checklist.period.label} kapanış kontrol listesi`}
        description="Hak ediş hesaplamadan önce giderilmesi gereken eksikleri kontrol edin, ardından adımları sırayla tamamlayın."
      />

      <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {preflightItems.map((item) => (
          <div
            key={item.label}
            className="flex items-start gap-3 rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3.5 py-3"
          >
            <Badge tone={item.ok ? "success" : "warning"}>{item.ok ? "Tamam" : "Kontrol et"}</Badge>
            <div className="min-w-0">
              <div className="text-sm font-medium text-[color:var(--panel-text)]">{item.label}</div>
              <div className="mt-0.5 text-xs text-[color:var(--panel-text-muted)]">{item.detail}</div>
            </div>
          </div>
        ))}
      </div>

      {!allPreflightOk && (
        <div className="mt-3 rounded-[var(--panel-radius-md)] border border-[color:var(--panel-warning-border)] bg-[color:var(--panel-warning-bg)] px-3.5 py-2.5 text-xs text-[color:var(--panel-warning-text)]">
          Yukarıdaki eksikler hak ediş hesaplamasını etkileyebilir; hesaplamadan önce gözden geçirin.
        </div>
      )}

      <div className="mt-6 grid gap-2.5">
        {steps.map((step) => (
          <a
            key={step.label}
            href={step.href}
            className="flex items-center justify-between gap-3 rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] px-3.5 py-3 text-sm transition hover:bg-[color:var(--panel-bg-hover)]"
          >
            <div className="min-w-0">
              <div className="font-medium text-[color:var(--panel-text)]">{step.label}</div>
              <div className="mt-0.5 text-xs text-[color:var(--panel-text-muted)]">{step.detail}</div>
            </div>
            <Badge tone={step.done ? "success" : "neutral"}>{step.done ? "Tamamlandı" : "Bekliyor"}</Badge>
          </a>
        ))}
      </div>
    </Card>
  );
}
