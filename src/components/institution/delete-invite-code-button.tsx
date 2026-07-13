"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteInviteCodeAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";

export function DeleteInviteCodeButton({ inviteId }: { inviteId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        variant="danger"
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            const result = await deleteInviteCodeAction({ id: inviteId });
            setMessage(result.message);
            showResult(result, {
              successTitle: "Davet kodu silindi",
              errorTitle: "Davet kodu silinemedi",
            });
            if (result.success) {
              router.refresh();
            }
          });
        }}
      >
        {isPending ? "Siliniyor..." : "Sil"}
      </Button>
      {message ? <div className="text-xs text-neutral-500">{message}</div> : null}
    </div>
  );
}
