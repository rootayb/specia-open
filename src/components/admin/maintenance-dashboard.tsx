"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { quickPlatformMaintenanceAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PlatformMaintenanceForm } from "./platform-maintenance-form";
import { ShieldAlert, Zap, Clock, Ban } from "lucide-react";

type Props = {
  maintenanceEnabled: boolean;
  maintenanceEndsAt?: string | null;
  maintenanceMessage?: string | null;
  isActive: boolean;
  source: "database" | "environment" | "scheduled_window";
};

export function MaintenanceDashboard({
  maintenanceEnabled,
  maintenanceEndsAt,
  maintenanceMessage,
  isActive,
  source,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const handleQuickMaintenance = (enable: boolean, hours = 1) => {
    const confirmMsg = enable
      ? `Sistemi acil olarak ${hours} saatliğine bakıma almak istediğinizden emin misiniz?`
      : "Sistem bakım modunu kapatmak istediğinizden emin misiniz?";

    if (confirm(confirmMsg)) {
      startTransition(async () => {
        const result = await quickPlatformMaintenanceAction(enable, hours);
        showResult(result, {
          successTitle: enable ? "Acil Bakım Başlatıldı" : "Bakım Modu Kapatıldı",
          errorTitle: "İşlem Başarısız",
        });
        if (result.success) {
          router.refresh();
        }
      });
    }
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Actions Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-white">
              <Zap className="size-5 text-amber-400" />
              Acil Durum Aksiyonları
            </div>
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              Planlama yapmadan, anlık ve hızlı bir şekilde sistemi bakım moduna alabilir veya yayına açabilirsiniz.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-4">
            {!isActive ? (
              <>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleQuickMaintenance(true, 1)}
                  className="inline-flex items-center gap-1.5"
                >
                  <Clock className="size-4" />
                  1 Saat Acil Bakım
                </Button>
                <Button
                  variant="secondary"
                  disabled={isPending}
                  onClick={() => handleQuickMaintenance(true, 3)}
                  className="inline-flex items-center gap-1.5"
                >
                  <Clock className="size-4" />
                  3 Saat Acil Bakım
                </Button>
              </>
            ) : (
              <Button
                variant="danger"
                disabled={isPending}
                onClick={() => handleQuickMaintenance(false)}
                className="inline-flex items-center gap-1.5 bg-rose-500 hover:bg-rose-600 text-white"
              >
                <Ban className="size-4" />
                Bakım Modunu Kapat (Yayına Al)
              </Button>
            )}
          </div>
        </Card>

        {/* Current State Indicator Card */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldAlert className="size-5 text-neutral-400" />
              Platform Erişim Durumu
            </div>
            <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
              Çalışma alanları ve mobil uygulamalar için genel erişilebilirlik durumu.
            </p>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className={`size-3 rounded-full ${isActive ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)] animate-pulse" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"}`} />
            <span className="font-semibold text-white text-lg">
              {isActive ? "Sistem Bakım Modunda" : "Sistem Aktif (Canlı)"}
            </span>
          </div>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="mb-5">
          <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">
            Bakım ayarları
          </div>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--panel-text)]">
            Erişim durumunu ve kullanıcı bilgilendirmesini düzenleyin
          </h2>
          <p className="mt-2 text-sm leading-6 text-[color:var(--panel-text-muted)]">
            Bakım modunu açıp kapatın, planlanan bitiş zamanını belirleyin ve bakım ekranında gösterilecek kısa mesajı yönetin.
          </p>
        </div>
        <PlatformMaintenanceForm
          maintenanceEnabled={maintenanceEnabled}
          maintenanceEndsAt={maintenanceEndsAt}
          maintenanceMessage={maintenanceMessage}
          isActive={isActive}
          source={source}
        />
      </Card>
    </div>
  );
}
