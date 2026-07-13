"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteBepDocumentAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { restoreTurkishText } from "@/lib/turkish";
import { confirmModal } from "@/components/ui/confirm-modal";

export function DeleteBepDocumentButton({
  documentId,
  documentTitle,
}: {
  documentId: string;
  documentTitle: string;
}) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="grid gap-2">
      <Button
        variant="danger"
        disabled={isPending}
        onClick={() => {
          (async () => {
            const confirmed = await confirmModal({
              title: "BEP Kaydını Sil",
              message: `"${documentTitle}" belgesi silinecek. Bu işlem bu BEP içindeki hedefleri, karar satırlarını ve kurul bilgilerini tamamen kaldırır. Devam etmek istiyor musunuz?`,
              variant: "danger",
              confirmText: "Kalıcı Olarak Sil",
              cancelText: "Vazgeç",
            });

            if (!confirmed) return;

            startTransition(async () => {
              const result = await deleteBepDocumentAction({ id: documentId });
              setMessage(result.message);
              showToast({
                title: result.success ? "BEP kaydı silindi" : "Silme tamamlanmadi",
                message: result.message,
                tone: result.success ? "success" : "error",
              });

              if (result.success) {
                router.push("/panel/bep");
                router.refresh();
              }
            });
          })();
        }}
      >
        {isPending ? "Siliniyor..." : "BEP Kaydını Sil"}
      </Button>
      {message ? <div className="text-xs text-neutral-400">{restoreTurkishText(message)}</div> : null}
    </div>
  );
}
