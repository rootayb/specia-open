"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteIssuedPdfDocumentAction } from "@/app/actions";
import { confirmModal } from "@/components/ui/confirm-modal";
import { useActionFeedback } from "@/components/ui/action-toast";

interface DeleteReportButtonProps {
  id: string;
  title: string;
}

export function DeleteReportButton({ id, title }: DeleteReportButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const handleDelete = async () => {
    const confirmed = await confirmModal({
      title: "Raporu Arşivden Sil",
      message: `"${title}" raporunu arşivden kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      variant: "danger",
      doubleConfirm: true,
      confirmText: "Kalıcı Olarak Sil",
      cancelText: "Vazgeç",
    });

    if (!confirmed) return;

    startTransition(async () => {
      const result = await deleteIssuedPdfDocumentAction({ id });
      showResult(result, {
        successTitle: "Rapor silindi",
        errorTitle: "Rapor silinemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      title="Raporu Sil"
      className="inline-flex size-9 items-center justify-center rounded-lg border border-red-500/10 bg-red-500/5 text-red-400 transition hover:bg-red-500/15 disabled:opacity-50 cursor-pointer"
    >
      <Trash2 className="size-4" />
    </button>
  );
}
