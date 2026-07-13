"use client";

import { useState, useTransition } from "react";
import { X, Check, Clipboard } from "lucide-react";
import { labelAbcLogAction } from "@/app/abc-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { ANTECEDENTS, CONSEQUENCES } from "@/lib/abc-engine";

type AbcLog = {
  id: string;
  studentId: string;
  behavior: {
    name: string;
  };
  timestamp: Date | string;
  durationSeconds: number;
  frequency: number;
  lessonName: string | null;
  subTopic: string | null;
  classSize: number | null;
  antecedentTag: string | null;
  consequenceTag: string | null;
  teacherNotes: string | null;
};

type AbcLabelingModalProps = {
  log: AbcLog;
  onClose: () => void;
  onSuccess: () => void;
};

export function AbcLabelingModal({ log, onClose, onSuccess }: AbcLabelingModalProps) {
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  // Selected tags state
  const [selectedAntecedent, setSelectedAntecedent] = useState(log.antecedentTag || "");
  const [selectedConsequence, setSelectedConsequence] = useState(log.consequenceTag || "");
  const [notes, setNotes] = useState(log.teacherNotes || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAntecedent || !selectedConsequence) return;

    const antecedentObj = ANTECEDENTS.find(a => a.tag === selectedAntecedent);
    const consequenceObj = CONSEQUENCES.find(c => c.tag === selectedConsequence);

    if (!antecedentObj || !consequenceObj) return;

    startTransition(async () => {
      const result = await labelAbcLogAction({
        id: log.id,
        antecedentTag: selectedAntecedent,
        antecedentDisplay: antecedentObj.displayName,
        consequenceTag: selectedConsequence,
        consequenceDisplay: consequenceObj.displayName,
        teacherNotes: notes.trim() || null
      });

      showResult(result, {
        successTitle: "Kayıt Yorumlandı",
        errorTitle: "Hata"
      });

      if (result.success) {
        onSuccess();
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]">
      <div className="relative w-full max-w-[700px] max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-neutral-950 p-6 shadow-2xl text-white flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Clipboard className="size-5 text-emerald-400" />
              ABC Bağlamsal Yorumlama (Gün Sonu)
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Gözlem anındaki tetikleyici (A) ve sonrasındaki tepkiyi (C) kodlayarak davranış işlevini analiz edin.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-white/10 hover:text-white"
            disabled={isPending}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs text-neutral-300">
          <div>
            <div className="text-neutral-500 font-medium uppercase tracking-wider text-[9px]">Gözlenen Davranış</div>
            <div className="text-sm font-semibold text-white mt-0.5">{log.behavior.name}</div>
          </div>
          <div>
            <div className="text-neutral-500 font-medium uppercase tracking-wider text-[9px]">Tarih & Saat</div>
            <div className="text-sm text-white mt-0.5">
              {new Date(log.timestamp).toLocaleString("tr-TR", {
                dateStyle: "medium",
                timeStyle: "short"
              })}
            </div>
          </div>
          {log.lessonName && (
            <div>
              <div className="text-neutral-500 font-medium uppercase tracking-wider text-[9px]">Ders / Konu</div>
              <div className="text-sm text-white mt-0.5">
                {log.lessonName} {log.subTopic ? `(${log.subTopic})` : ""}
              </div>
            </div>
          )}
          <div>
            <div className="text-neutral-500 font-medium uppercase tracking-wider text-[9px]">Süreç Metrikleri</div>
            <div className="text-sm text-white mt-0.5">
              {log.durationSeconds > 0 ? `Süre: ${log.durationSeconds} sn` : `Sıklık: ${log.frequency} adet`}
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 flex-1">
          {/* Antecedent Select */}
          <Field
            label="1. Davranış Öncesi / Tetikleyici (Antecedent - A)"
            hint="Davranışın ortaya çıkmasından hemen önceki durum veya tetikleyici nedir?"
          >
            <div className="grid gap-2 mt-2">
              {ANTECEDENTS.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setSelectedAntecedent(item.tag)}
                  className={`flex items-start gap-3 p-3 text-left rounded-xl border text-xs transition ${
                    selectedAntecedent === item.tag
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 font-medium"
                      : "border-white/5 bg-white/[0.01] text-neutral-300 hover:bg-white/[0.04]"
                  }`}
                  disabled={isPending}
                >
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border mt-0.5 ${
                    selectedAntecedent === item.tag ? "border-emerald-500 bg-emerald-500 text-white" : "border-white/20"
                  }`}>
                    {selectedAntecedent === item.tag && <Check className="size-2.5 stroke-[4px]" />}
                  </span>
                  <span>{item.displayName}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Consequence Select */}
          <Field
            label="2. Davranış Sonrası / Tepki (Consequence - C)"
            hint="Davranış gerçekleştiğinde ortama veya öğrenciye verilen tepki ne oldu?"
          >
            <div className="grid gap-2 mt-2">
              {CONSEQUENCES.map((item) => (
                <button
                  key={item.tag}
                  type="button"
                  onClick={() => setSelectedConsequence(item.tag)}
                  className={`flex items-start gap-3 p-3 text-left rounded-xl border text-xs transition ${
                    selectedConsequence === item.tag
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-300 font-medium"
                      : "border-white/5 bg-white/[0.01] text-neutral-300 hover:bg-white/[0.04]"
                  }`}
                  disabled={isPending}
                >
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded-full border mt-0.5 ${
                    selectedConsequence === item.tag ? "border-emerald-500 bg-emerald-500 text-white" : "border-white/20"
                  }`}>
                    {selectedConsequence === item.tag && <Check className="size-2.5 stroke-[4px]" />}
                  </span>
                  <span>{item.displayName}</span>
                </button>
              ))}
            </div>
          </Field>

          {/* Notes */}
          <Field
            label="3. Ek Gözlem Notları"
            hint="Olay anına dair diğer gözlemlerinizi veya detayları not alın."
          >
            <textarea
              className={inputClassName()}
              rows={3}
              placeholder="Öğrencinin anlık ruh hali, ortamdaki diğer kişiler vb. detaylar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isPending}
              maxLength={1000}
            />
          </Field>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 border-t border-white/10 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isPending || !selectedAntecedent || !selectedConsequence}
              className="flex items-center gap-2"
            >
              Analiz Et ve Kaydet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
