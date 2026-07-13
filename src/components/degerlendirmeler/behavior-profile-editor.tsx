"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, ShieldAlert, Award } from "lucide-react";
import { saveStudentBehaviorAction, deleteStudentBehaviorAction } from "@/app/abc-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";

type Behavior = {
  id: string;
  name: string;
  trackingType: string;
};

type BehaviorProfileEditorProps = {
  studentId: string;
  studentName: string;
  initialBehaviors: Behavior[];
};

export function BehaviorProfileEditor({
  studentId,
  studentName,
  initialBehaviors
}: BehaviorProfileEditorProps) {
  const [behaviors, setBehaviors] = useState<Behavior[]>(initialBehaviors);
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  // Form states
  const [name, setName] = useState("");
  const [trackingType, setTrackingType] = useState<"duration" | "frequency">("frequency");

  const handleAddBehavior = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    startTransition(async () => {
      const result = await saveStudentBehaviorAction({
        studentId,
        name: name.trim(),
        trackingType
      });

      showResult(result, {
        successTitle: "Davranış Tanımlandı",
        errorTitle: "Hata"
      });

      if (result.success && result.id) {
        setBehaviors([
          ...behaviors,
          { id: result.id, name: name.trim(), trackingType }
        ]);
        setName("");
      }
    });
  };

  const handleDeleteBehavior = (id: string, behaviorName: string) => {
    if (!confirm(`'${behaviorName}' davranış tanımını silmek istediğinize emin misiniz? Bu işlem geçmişteki tüm ABC gözlem kayıtlarını da silecektir.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteStudentBehaviorAction({ id });

      showResult(result, {
        successTitle: "Davranış Silindi",
        errorTitle: "Hata"
      });

      if (result.success) {
        setBehaviors(behaviors.filter(b => b.id !== id));
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_380px] items-start">
      {/* Defined Behaviors List */}
      <Card padding="md" className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-[color:var(--panel-text)]">
            Tanımlı Hedef Davranışlar
          </h3>
          <p className="text-xs text-[color:var(--panel-text-muted)] mt-1">
            {studentName} için sınıf içinde izlenen aktif problem davranışlar. En yoğun 3 davranış mobil veri giriş arayüzünde görünür.
          </p>
        </div>

        {behaviors.length === 0 ? (
          <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] p-8 text-center text-sm text-[color:var(--panel-text-soft)]">
            Henüz tanımlanmış bir hedef davranış bulunmuyor. Sağdaki formu kullanarak ekleyin.
          </div>
        ) : (
          <div className="grid gap-3">
            {behaviors.map((behavior, idx) => (
              <div
                key={behavior.id}
                className="flex items-center justify-between gap-4 p-4 rounded-[var(--panel-radius-lg)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] transition hover:border-[color:var(--panel-border-strong)]"
              >
                <div className="flex items-center gap-3">
                  {idx < 3 ? (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20" title="Mobil Veri Girişinde Aktif">
                      {idx + 1}
                    </span>
                  ) : (
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[color:var(--panel-bg-elevated)] text-[color:var(--panel-text-soft)] text-xs font-bold border border-[color:var(--panel-border)]">
                      {idx + 1}
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--panel-text)]">
                      {behavior.name}
                    </div>
                    <div className="text-xs text-[color:var(--panel-text-soft)] mt-0.5">
                      Ölçüm Türü: {behavior.trackingType === "duration" ? "Süre (Kronometre)" : "Sıklık (Çetele Sayacı)"}
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteBehavior(behavior.id, behavior.name)}
                  disabled={isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {behaviors.length > 3 && (
          <div className="flex gap-2 p-3 rounded-xl bg-[color:var(--panel-warning-bg)] border border-[color:var(--panel-warning-border)] text-[color:var(--panel-warning-text)] text-xs">
            <ShieldAlert className="size-4 shrink-0" />
            <span>Mobil veri giriş ekranında sadece ilk 3 davranış görüntülenebilir. Gerekirse davranışları silip yeniden ekleyerek sıralamayı ayarlayabilirsiniz.</span>
          </div>
        )}
      </Card>

      {/* Add Behavior Form */}
      <Card padding="md">
        <h3 className="text-base font-semibold text-[color:var(--panel-text)] mb-4">
          Yeni Davranış Ekle
        </h3>
        <form onSubmit={handleAddBehavior} className="space-y-4">
          <Field
            label="Davranış Adı"
            hint="Örn: Çığlık Atma, Kendine Zarar Verme, Sınıftan Kaçma"
          >
            <input
              type="text"
              required
              className={inputClassName()}
              placeholder="Davranış ismini girin..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
            />
          </Field>

          <Field
            label="Gözlem Ölçüm Yöntemi"
            hint="Sürekli süren davranışlar için Süre, anlık gerçekleşen vuruşlar için Sıklık seçin."
          >
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTrackingType("frequency")}
                className={`flex flex-col gap-1 items-start text-left p-3 rounded-[var(--panel-radius-lg)] border text-xs transition ${
                  trackingType === "frequency"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] text-[color:var(--panel-text-soft)] hover:bg-[color:var(--panel-bg-hover)]"
                }`}
                disabled={isPending}
              >
                <span className="font-semibold text-sm">Sıklık (+1)</span>
                <span>Çetele sayacı. Her gerçekleştiğinde tıkla.</span>
              </button>
              <button
                type="button"
                onClick={() => setTrackingType("duration")}
                className={`flex flex-col gap-1 items-start text-left p-3 rounded-[var(--panel-radius-lg)] border text-xs transition ${
                  trackingType === "duration"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] text-[color:var(--panel-text-soft)] hover:bg-[color:var(--panel-bg-hover)]"
                }`}
                disabled={isPending}
              >
                <span className="font-semibold text-sm">Süre (sn)</span>
                <span>Kronometre. Basılı tut ve bitince bırak.</span>
              </button>
            </div>
          </Field>

          <Button
            type="submit"
            className="w-full flex justify-center items-center gap-2"
            disabled={isPending || !name.trim()}
          >
            <Plus className="size-4" />
            Davranış Profiline Ekle
          </Button>
        </form>
      </Card>
    </div>
  );
}
