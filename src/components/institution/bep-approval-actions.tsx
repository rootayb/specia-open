"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { approveBepAction, rejectBepAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";

type Props = {
  documentId: string;
  approvalStatus: "approved" | "pending" | "rejected";
  approvedByName?: string | null;
  approvedAt?: Date | null;
  rejectedByName?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  canManage: boolean;
};

function formatDate(value?: Date | null) {
  if (!value) {
    return null;
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function BepApprovalActions({
  documentId,
  approvalStatus,
  approvedByName,
  approvedAt,
  rejectedByName,
  rejectedAt,
  rejectionReason,
  canManage,
}: Props) {
  const router = useRouter();
  const [feedback, setFeedback] = useState("");
  const [reason, setReason] = useState(rejectionReason ?? "");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const metaText =
    approvalStatus === "approved"
      ? approvedByName || formatDate(approvedAt)
      : approvalStatus === "rejected"
        ? rejectedByName || formatDate(rejectedAt)
        : "Kurum onayi bekleniyor";

  return (
    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
            Onay Akisi
          </div>
          <div className="mt-1 text-sm text-neutral-200">
            {approvalStatus === "approved"
              ? "Onaylandi"
              : approvalStatus === "rejected"
                ? "Revizyon istendi"
                : "Kurum onayi bekleniyor"}
          </div>
          {metaText ? <div className="mt-1 text-xs text-neutral-500">{metaText}</div> : null}
        </div>
      </div>

      {approvalStatus === "rejected" && rejectionReason ? (
        <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-neutral-300">
          Ret gerekcesi: {rejectionReason}
        </div>
      ) : null}

      {canManage && approvalStatus !== "approved" ? (
        <>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ret gerekcesi yazin"
            className="min-h-24 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white outline-none placeholder:text-neutral-500"
          />
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await approveBepAction({ documentId });
                  setFeedback(result.message);
                  showResult(result, {
                    successTitle: "BEP onaylandi",
                    errorTitle: "BEP onaylanamadi",
                  });
                  if (result.success) {
                    router.refresh();
                  }
                });
              }}
            >
              {isPending ? "Isleniyor..." : "Onayla"}
            </Button>
            <Button
              variant="danger"
              disabled={isPending || reason.trim().length < 3}
              onClick={() => {
                startTransition(async () => {
                  const result = await rejectBepAction({
                    documentId,
                    rejectionReason: reason,
                  });
                  setFeedback(result.message);
                  showResult(result, {
                    successTitle: "BEP revizyona gönderildi",
                    errorTitle: "BEP revizyona gönderilemedi",
                  });
                  if (result.success) {
                    router.refresh();
                  }
                });
              }}
            >
              Revizyona Gonder
            </Button>
          </div>
        </>
      ) : null}

      {feedback ? <div className="text-sm text-neutral-400">{feedback}</div> : null}
    </div>
  );
}
