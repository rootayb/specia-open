"use client";

import { useSyncExternalStore } from "react";
import { FlaskConical, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/**
 * Davranış Değerlendirmesi (UDA/ABC) modülü için tek kaynaklı bilimsel
 * kullanım uyarısı metni. Web (dashboard + veri girişi ekranı) ve iOS'ta
 * (BehaviorEvaluationView) birebir aynı metin gösterilir — sorumluluk
 * sistemin değil, davranışı yorumlayan uzman/öğretmene ait olduğu açıkça
 * belirtilir.
 */
export const BEHAVIOR_EVALUATION_DISCLAIMER_TITLE = "Bilimsel Kullanım Uyarısı";
export const BEHAVIOR_EVALUATION_DISCLAIMER_TEXT =
  "Bu modülde görüntülenen davranış işlevi analizi ve raporlar, öğretmen tarafından girilen gözlem verilerine dayanarak sistem tarafından otomatik olarak yorumlanır. Bu analiz klinik bir tanı, kesin bir değerlendirme veya profesyonel bir görüş yerine geçmez. Araç yalnızca öğretmenin/uzmanın öğrenci davranışını sistematik olarak izlemesine ve raporlamasına yardımcı olmak amacıyla sunulur; nihai değerlendirme, yorum ve karar sorumluluğu tamamen ilgili öğretmen, uzman ve kuruma aittir.";
export const BEHAVIOR_EVALUATION_DISCLAIMER_CONFIRM_LABEL = "Anladım, Onaylıyorum";

const STORAGE_KEY = "specia-behavior-evaluation-disclaimer-v1";
const STORAGE_EVENT = "specia-behavior-evaluation-disclaimer-change";

function subscribe(onStoreChange: () => void) {
  function handleChange(event: Event) {
    if (event instanceof StorageEvent && event.key && event.key !== STORAGE_KEY) {
      return;
    }
    onStoreChange();
  }

  window.addEventListener("storage", handleChange);
  window.addEventListener(STORAGE_EVENT, handleChange);
  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(STORAGE_EVENT, handleChange);
  };
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "accepted";
}

export function useBehaviorEvaluationDisclaimerAccepted() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export function acceptBehaviorEvaluationDisclaimer() {
  window.localStorage.setItem(STORAGE_KEY, "accepted");
  window.dispatchEvent(new Event(STORAGE_EVENT));
}

/**
 * Çocuklarını (dashboard, veri girişi ekranı) yalnızca kullanıcı uyarıyı
 * onayladıktan sonra render eder; onaylanmadıysa engelleyici bir kart
 * gösterilir ve altındaki içerik hiç mount edilmez.
 */
export function BehaviorEvaluationDisclaimerGate({ children }: { children: React.ReactNode }) {
  const accepted = useBehaviorEvaluationDisclaimerAccepted();

  if (!accepted) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card padding="lg" className="max-w-lg space-y-5 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] text-[color:var(--panel-text-soft)]">
            <FlaskConical className="size-6" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-[color:var(--panel-text)]">
              {BEHAVIOR_EVALUATION_DISCLAIMER_TITLE}
            </h2>
            <p className="text-sm leading-6 text-[color:var(--panel-text-muted)]">
              {BEHAVIOR_EVALUATION_DISCLAIMER_TEXT}
            </p>
          </div>
          <Button onClick={acceptBehaviorEvaluationDisclaimer} className="mx-auto flex items-center gap-2">
            <ShieldCheck className="size-4" />
            {BEHAVIOR_EVALUATION_DISCLAIMER_CONFIRM_LABEL}
          </Button>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
