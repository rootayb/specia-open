"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertAppVersionInfoAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

type AppPlatform = "ios" | "android";

type Props = {
  platform: AppPlatform;
  initial: {
    currentVersion: string;
    minRequiredVersion: string;
    forceUpdate: boolean;
    message: string | null;
    appStoreUrl: string | null;
  };
};

export function AppVersionInfoForm({ platform, initial }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const [form, setForm] = useState({
    currentVersion: initial.currentVersion,
    minRequiredVersion: initial.minRequiredVersion,
    forceUpdate: initial.forceUpdate,
    message: initial.message ?? "",
    appStoreUrl: initial.appStoreUrl ?? "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await upsertAppVersionInfoAction({ platform, ...form });
      showResult(result, {
        successTitle: "Mobil Sürüm Bilgisi Güncellendi",
        errorTitle: "Güncellenemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Güncel sürüm" hint="Mağazadaki en son sürüm (örn. 1.0.2)">
          <input
            type="text"
            className={inputClassName()}
            value={form.currentVersion}
            onChange={(e) => setForm((c) => ({ ...c, currentVersion: e.target.value }))}
            placeholder="1.0.2"
            required
          />
        </Field>

        <Field label="Minimum sürüm" hint="Bu sürümün altı zorunlu güncelleme ister">
          <input
            type="text"
            className={inputClassName()}
            value={form.minRequiredVersion}
            onChange={(e) => setForm((c) => ({ ...c, minRequiredVersion: e.target.value }))}
            placeholder="1.0.0"
            required
          />
        </Field>
      </div>

      <Field label="Mağaza bağlantısı" hint="İsteğe bağlı; boşsa uygulama içi varsayılan kullanılır">
        <input
          type="text"
          className={inputClassName()}
          value={form.appStoreUrl}
          onChange={(e) => setForm((c) => ({ ...c, appStoreUrl: e.target.value }))}
          placeholder={platform === "ios" ? "https://apps.apple.com/app/specia" : "https://play.google.com/store/apps/details?id=..."}
        />
      </Field>

      <Field label="Güncelleme mesajı" hint="Kullanıcıya gösterilecek açıklama (isteğe bağlı)">
        <textarea
          className={`${inputClassName()} min-h-20 py-2 resize-none`}
          value={form.message}
          onChange={(e) => setForm((c) => ({ ...c, message: e.target.value }))}
          placeholder="Yeni özellikler ve performans iyileştirmeleri içerir."
        />
      </Field>

      <label className="flex items-center gap-3 rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] hover:bg-[color:var(--panel-bg-hover)] px-4 py-3 text-sm text-[color:var(--panel-text)] cursor-pointer select-none transition-colors duration-200">
        <input
          type="checkbox"
          checked={form.forceUpdate}
          onChange={(e) => setForm((c) => ({ ...c, forceUpdate: e.target.checked }))}
        />
        <div>
          <div className="font-semibold text-[color:var(--panel-text)]">Zorunlu güncelleme</div>
          <div className="text-xs text-[color:var(--panel-text-soft)] mt-0.5">
            Açıksa, minimum sürümün altındaki kullanıcılar güncelleme ekranını geçemez.
          </div>
        </div>
      </label>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Kaydediliyor..." : "Sürüm Bilgisini Kaydet"}
      </Button>
    </form>
  );
}
