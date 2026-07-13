"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { updateUserInstitutionAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";

type InstitutionOption = {
  id: string;
  name: string;
};

export function UserInstitutionForm({
  userId,
  currentInstitutionId,
  institutions,
  disabled,
}: {
  userId: string;
  currentInstitutionId: string | null;
  institutions: InstitutionOption[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [selectedInstId, setSelectedInstId] = useState<string>(currentInstitutionId ?? "");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const handleUpdate = () => {
    startTransition(async () => {
      const targetInstitutionId = selectedInstId === "" ? null : selectedInstId;
      const result = await updateUserInstitutionAction({
        userId,
        institutionId: targetInstitutionId,
      });
      setMessage(result.message);
      showResult(result, {
        successTitle: "Kullanıcı kurumu güncellendi",
        errorTitle: "Kullanıcı kurumu güncellenemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  const hasChanged = (currentInstitutionId ?? "") !== selectedInstId;

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <select
          className={inputClassName()}
          value={selectedInstId}
          onChange={(event) => setSelectedInstId(event.target.value)}
          disabled={disabled || isPending}
        >
          <option value="">Bağımsız (Kurum Yok)</option>
          {institutions.map((inst) => (
            <option key={inst.id} value={inst.id}>
              {inst.name}
            </option>
          ))}
        </select>
        <Button
          variant="secondary"
          disabled={disabled || isPending || !hasChanged}
          onClick={handleUpdate}
        >
          {isPending ? "..." : "Güncelle"}
        </Button>
      </div>
      {message ? <div className="text-xs text-neutral-400">{message}</div> : null}
    </div>
  );
}
