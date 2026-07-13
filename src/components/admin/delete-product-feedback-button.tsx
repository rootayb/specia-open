"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteProductFeedbackAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { restoreTurkishText } from "@/lib/turkish";

export function DeleteProductFeedbackButton({
  feedbackId,
  userLabel,
  documentTitle,
}: {
  feedbackId: string;
  userLabel: string;
  documentTitle: string;
}) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        type="button"
        variant="ghost"
        disabled={isPending}
        className="h-9 rounded-full border border-white/10 bg-white/[0.04] px-3 text-neutral-200 hover:bg-white/[0.08] hover:text-white"
        onClick={() => {
          const confirmed = window.confirm(
            `${userLabel} kullanicisina ait geri bildirim silinecek.\n\nBu islem yorum kaydini kaldirir.\n\nDevam etmek istiyor musunuz?`,
          );

          if (!confirmed) {
            return;
          }

          startTransition(async () => {
            const result = await deleteProductFeedbackAction({ id: feedbackId });
            setMessage(result.message);
            showToast({
              title: result.success ? "Geri bildirim silindi" : "Silme tamamlanmadi",
              message: result.message,
              tone: result.success ? "success" : "error",
            });

            if (result.success) {
              router.refresh();
            }
          });
        }}
        aria-label={`${documentTitle} geri bildirimini sil`}
        title="Geri bildirimi sil"
      >
        <Trash2 className="mr-2 size-4" />
        {isPending ? "Siliniyor..." : "Sil"}
      </Button>
      {message ? <div className="text-xs text-neutral-500">{restoreTurkishText(message)}</div> : null}
    </div>
  );
}
