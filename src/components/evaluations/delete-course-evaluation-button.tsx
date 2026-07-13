"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteCourseEvaluationAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { restoreTurkishText } from "@/lib/turkish";
import { confirmModal } from "@/components/ui/confirm-modal";

export function DeleteCourseEvaluationButton({
  documentId,
  title,
  redirectTo = "/panel/degerlendirmeler/kaba",
  className,
}: {
  documentId: string;
  title: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-2">
      <Button
        variant="danger"
        className={className}
        disabled={isPending}
        onClick={() => {
          (async () => {
            const confirmed = await confirmModal({
              title: "Değerlendirme Belgesini Sil",
              message: `"${title}" belgesi silinecek. Bu işlem kaba değerlendirme satırlarını ve bu belgeye ait işaretlemeleri tamamen kaldırır. Devam etmek istiyor musunuz?`,
              variant: "danger",
              confirmText: "Kalıcı Olarak Sil",
              cancelText: "Vazgeç",
            });

            if (!confirmed) return;

            startTransition(async () => {
              const result = await deleteCourseEvaluationAction({ id: documentId });
              setMessage(result.message);
              showToast({
                title: result.success ? "Kaba değerlendirme silindi" : "Silme tamamlanmadi",
                message: result.message,
                tone: result.success ? "success" : "error",
              });

              if (result.success) {
                router.push(redirectTo);
                router.refresh();
              }
            });
          })();
        }}
      >
        <Trash2 className="mr-2 size-4" />
        {isPending ? "Siliniyor..." : "Sil"}
      </Button>
      {message ? <div className="text-xs text-neutral-400">{restoreTurkishText(message)}</div> : null}
    </div>
  );
}
