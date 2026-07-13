"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ThumbsDown, ThumbsUp, X } from "lucide-react";

import { saveProductFeedbackAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";

type BepCompletionFeedbackPromptProps = {
  documentId: string;
  documentTitle: string;
  studentName: string;
  onClose?: () => void;
};

export function BepCompletionFeedbackPrompt({
  documentId,
  documentTitle,
  studentName,
  onClose,
}: BepCompletionFeedbackPromptProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);
  const [selection, setSelection] = useState<"like" | "dislike" | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const question = useMemo(
    () => `${studentName} için BEP kaydini tamamladiniz. Specia deneyimini nasil buldunuz?`,
    [studentName],
  );

  const closePrompt = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
      return;
    }

    router.replace(`/panel/bep/${documentId}`);
    router.refresh();
  };

  const submitFeedback = (value: "like" | "dislike", nextReason?: string) => {
    setMessage("");

    startTransition(async () => {
      const result = await saveProductFeedbackAction({
        documentId,
        source: "bep_completed",
        value,
        reason: nextReason?.trim() || "",
      });

      if (!result.success) {
        setMessage(result.message);
        showResult(result, {
          successTitle: "Geri bildirim kaydedildi",
          errorTitle: "Geri bildirim kaydedilemedi",
        });
        return;
      }

      showResult(result, {
        successTitle: "Geri bildirim kaydedildi",
        errorTitle: "Geri bildirim kaydedilemedi",
      });
      closePrompt();
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-md rounded-[30px] border border-white/10 bg-neutral-950 p-6 shadow-[0_30px_120px_-45px_rgba(0,0,0,0.9)]">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
              Geri Bildirim
            </div>
            <h2 className="text-2xl font-semibold text-white">Kısa bir değerlendirme</h2>
            <p className="text-sm leading-7 text-neutral-300">{question}</p>
            <p className="text-xs text-neutral-500">{documentTitle}</p>
          </div>
          <button
            type="button"
            className="rounded-full border border-white/10 p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
            onClick={closePrompt}
            aria-label="Kapat"
          >
            <X className="size-4" />
          </button>
        </div>

        {selection !== "dislike" ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isPending}
              onClick={() => submitFeedback("like")}
              className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 text-left transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-60"
            >
              <ThumbsUp className="size-5 text-white" />
              <div className="mt-4 text-lg font-semibold text-white">Begendim</div>
              <div className="mt-1 text-sm leading-6 text-neutral-400">
                Isimi rahatlatti ve kullanimi iyi hissettirdi.
              </div>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={() => setSelection("dislike")}
              className="rounded-3xl border border-white/10 bg-white/[0.04] px-5 py-5 text-left transition hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-60"
            >
              <ThumbsDown className="size-5 text-white" />
              <div className="mt-4 text-lg font-semibold text-white">Gelistirilmeli</div>
              <div className="mt-1 text-sm leading-6 text-neutral-400">
                Eksik veya zor gelen tarafi kisa notla iletebilirim.
              </div>
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
              <div className="text-sm font-semibold text-white">Neyi gelistirmemizi istersiniz?</div>
              <p className="mt-1 text-sm leading-6 text-neutral-400">
                Isterseniz kisaca yazin. Yazmak istemiyorsaniz bos birakip gonderebilirsiniz.
              </p>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ornegin: PDF alani, hiz, kullanim akışı veya eksik bir ihtiyac..."
                className={`${inputClassName()} mt-4 min-h-28`}
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button disabled={isPending} onClick={() => submitFeedback("dislike", reason)}>
                {isPending ? "Kaydediliyor..." : "Gonder"}
              </Button>
              <Button
                variant="secondary"
                disabled={isPending}
                onClick={() => submitFeedback("dislike")}
              >
                Yazmadan gonder
              </Button>
              <Button
                variant="ghost"
                disabled={isPending}
                onClick={() => {
                  setSelection(null);
                  setReason("");
                  setMessage("");
                }}
              >
                Geri don
              </Button>
            </div>
          </div>
        )}

        {message ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-neutral-200">
            {message}
          </div>
        ) : null}

        <div className="mt-5 text-xs text-neutral-500">Bu pencereyi kapatip daha sonra devam edebilirsiniz.</div>
      </div>
    </div>
  );
}
