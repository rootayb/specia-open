"use client";

import { useState, useTransition } from "react";
import type { UserRole } from "@/lib/prisma-shim";
import { useRouter } from "next/navigation";

import { updateUserRoleAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";

export function UserRoleForm({
  userId,
  currentRole,
  disabled,
}: {
  userId: string;
  currentRole: UserRole;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>(currentRole);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <select
          className={inputClassName()}
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
          disabled={disabled || isPending}
        >
          <option value="teacher">Öğretmen</option>
          <option value="parent">Veli</option>
          <option value="institution">Kurum Yoneticisi</option>
          <option value="admin">Admin</option>
        </select>
        <Button
          variant="secondary"
          disabled={disabled || isPending || role === currentRole}
          onClick={() => {
            startTransition(async () => {
              const result = await updateUserRoleAction({ userId, role });
              setMessage(result.message);
              showResult(result, {
                successTitle: "Kullanıcı rolu guncellendi",
                errorTitle: "Kullanıcı rolu guncellenemedi",
              });
              if (result.success) {
                router.refresh();
              }
            });
          }}
        >
          {isPending ? "Kaydediliyor..." : "Güncelle"}
        </Button>
      </div>
      {message ? <div className="text-xs text-neutral-400">{message}</div> : null}
    </div>
  );
}
