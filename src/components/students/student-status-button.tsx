"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setStudentActiveAction } from "@/app/actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { confirmModal } from "@/components/ui/confirm-modal";
import { restoreTurkishText } from "@/lib/turkish";

export function StudentStatusButton({
  studentId,
  studentName,
  isActive,
  compact = false,
  onStopPropagation = false,
}: {
  studentId: string;
  studentName: string;
  isActive: boolean;
  compact?: boolean;
  onStopPropagation?: boolean;
}) {
  const router = useRouter();
  const { showToast } = useActionToast();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  async function changeStatus() {
    if (isActive) {
      const confirmed = await confirmModal({
        title: "Öğrenciyi Pasif Yap",
        message: `"${studentName}" yeni planlama ve seans seçimlerinden çıkarılacak. BEP, belge ve geçmiş seans kayıtları korunacaktır.`,
        confirmText: "Pasif Yap",
        cancelText: "Vazgeç",
      });

      if (!confirmed) {
        return;
      }
    }

    startTransition(async () => {
      const result = await setStudentActiveAction({
        id: studentId,
        isActive: !isActive,
      });
      setMessage(result.message);
      showToast({
        title: result.success
          ? isActive
            ? "Öğrenci pasife alındı"
            : "Öğrenci yeniden aktif"
          : "Durum değiştirilemedi",
        message: result.message,
        tone: result.success ? "success" : "error",
      });

      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-2">
      <Button
        variant={isActive ? "ghost" : "secondary"}
        size={compact ? "sm" : undefined}
        disabled={isPending}
        onClick={(event) => {
          if (onStopPropagation) {
            event.preventDefault();
            event.stopPropagation();
          }
          void changeStatus();
        }}
      >
        {isPending
          ? "Güncelleniyor..."
          : isActive
            ? "Öğrenciyi Pasif Yap"
            : "Öğrenciyi Aktif Yap"}
      </Button>
      {message ? <div className="text-xs text-neutral-400">{restoreTurkishText(message)}</div> : null}
    </div>
  );
}
