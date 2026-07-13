"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteInstitutionAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";

export function DeleteInstitutionButton({
  institutionId,
  institutionName,
}: {
  institutionId: string;
  institutionName: string;
}) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="danger"
        disabled={isPending}
        onClick={() => {
          const confirmed = window.confirm(
            `${institutionName} silinecek.\n\nBu islem kuruma bağlı kullanicilari, öğrencileri, belgeleri, planlari ve diger tum kayıtları birlikte kaldirir.\n\nDevam etmek istiyor musunuz?`,
          );

          if (!confirmed) {
            return;
          }

          startTransition(async () => {
            const result = await deleteInstitutionAction({ id: institutionId });
            setMessage(result.message);
            showToast({
              title: result.success ? "Kurum silindi" : "Silme tamamlanmadi",
              message: result.message,
              tone: result.success ? "success" : "error",
            });
            if (result.success) {
              router.refresh();
            }
          });
        }}
      >
        {isPending ? "Siliniyor..." : "Kurumu Sil"}
      </Button>
      {message ? <div className="text-xs text-neutral-500">{message}</div> : null}
    </div>
  );
}
