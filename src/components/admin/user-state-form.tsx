"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { deleteUserByAdminAction, updateUserStateAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";

export function UserStateForm({
  userId,
  isActive,
  initialSuspendedUntil,
  disabled,
}: {
  userId: string;
  isActive: boolean;
  initialSuspendedUntil?: string | null;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [suspendedUntil, setSuspendedUntil] = useState("");
  const [currentState, setCurrentState] = useState(isActive);
  const [currentSuspendedUntil, setCurrentSuspendedUntil] = useState<string | null>(initialSuspendedUntil ?? null);
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <div className="grid gap-3">
      {/* Askıya alma tarih seçicisi - sadece kullanıcı aktifken gösterilir */}
      {currentState && (
        <div className="grid gap-1.5">
          <label className="text-xs font-semibold text-neutral-400">
            Askıya Alma Bitiş Tarihi (Opsiyonel)
          </label>
          <input
            type="datetime-local"
            value={suspendedUntil}
            onChange={(e) => setSuspendedUntil(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none transition focus:border-white/20 focus:ring-2 focus:ring-white/[0.06]"
          />
          <span className="text-[11px] text-neutral-600 leading-normal">
            Boş bırakılırsa hesap süresiz olarak pasife alınır.
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          disabled={disabled || isPending}
          onClick={() => {
            startTransition(async () => {
              const targetSuspendedUntil = !currentState ? null : (suspendedUntil ? new Date(suspendedUntil).toISOString() : null);
              const result = await updateUserStateAction({
                userId,
                isActive: !currentState,
                suspendedUntil: targetSuspendedUntil,
              });
              setMessage(result.message);
              showResult(result, {
                successTitle: currentState ? "Kullanıcı pasife alındı" : "Kullanıcı aktif edildi",
                errorTitle: "Kullanıcı durumu güncellenemedi",
              });
              if (result.success) {
                setCurrentState((value) => !value);
                setCurrentSuspendedUntil(targetSuspendedUntil);
                setSuspendedUntil("");
                router.refresh();
              }
            });
          }}
        >
          {isPending ? "Kaydediliyor..." : currentState ? "Pasife Al / Askıya Al" : "Aktif Et"}
        </Button>
        <Button
          variant="danger"
          disabled={disabled || isPending}
          onClick={() => {
            if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) {
              return;
            }

            startTransition(async () => {
              const result = await deleteUserByAdminAction({ userId });
              setMessage(result.message);
              showResult(result, {
                successTitle: "Kullanıcı silindi",
                errorTitle: "Kullanıcı silinemedi",
              });
              if (result.success) {
                router.refresh();
              }
            });
          }}
        >
          Sil
        </Button>
      </div>
      <div className="text-xs text-neutral-500 flex flex-wrap gap-1 items-center">
        <span>Durum:</span>
        <span className={currentState ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
          {currentState ? "Aktif" : "Pasif"}
        </span>
        {!currentState && currentSuspendedUntil && (
          <span className="text-amber-400 font-medium">
            ({new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(currentSuspendedUntil))} tarihine kadar askıda)
          </span>
        )}
      </div>
      {message ? <div className="text-xs text-neutral-400">{message}</div> : null}
    </div>
  );
}
