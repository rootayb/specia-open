"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";

import { saveFamilyEducationResponseAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import type { FamilyEducationResponseInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type ResponseStatus = "done" | "partial" | "not_done";

const STATUS_OPTIONS: Array<{ value: ResponseStatus; label: string }> = [
  { value: "done", label: "Yaptık" },
  { value: "partial", label: "Kısmen yaptık" },
  { value: "not_done", label: "Yapamadık" },
];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Görsel okunamadı."));
    reader.readAsDataURL(file);
  });
}

export function FamilyEducationResponseForm({ planId }: { planId: string }) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [status, setStatus] = useState<ResponseStatus>("done");
  const [content, setContent] = useState("");
  const [image, setImage] = useState<{ name: string; mimeType: string; base64: string } | null>(
    null,
  );

  async function onPickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      showResult(
        { success: false, message: "Görsel en fazla 8 MB olabilir." },
        { errorTitle: "Görsel eklenemedi" },
      );
      return;
    }
    try {
      const base64 = await readFileAsBase64(file);
      setImage({ name: file.name, mimeType: file.type, base64 });
    } catch {
      showResult(
        { success: false, message: "Görsel okunamadı." },
        { errorTitle: "Görsel eklenemedi" },
      );
    }
  }

  function submit() {
    const payload: FamilyEducationResponseInput = {
      planId,
      status,
      content: content.trim() || undefined,
      uploadedFileName: image?.name,
      uploadedMimeType: image?.mimeType,
      uploadedBase64: image?.base64,
    };

    startTransition(async () => {
      const result = await saveFamilyEducationResponseAction(payload);
      showResult(result, { successTitle: "Yanıtınız kaydedildi", errorTitle: "Kaydedilemedi" });
      if (result.success) {
        setContent("");
        setImage(null);
        setStatus("done");
        router.refresh();
      }
    });
  }

  return (
    <div className="grid gap-3 rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
        Geri dönüş ekle
      </div>

      {/* Durum seçimi */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStatus(option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition",
              status === option.value
                ? "border-[color:var(--panel-border-strong)] bg-[color:var(--panel-bg-hover)] font-medium text-[color:var(--panel-text)]"
                : "border-[color:var(--panel-border)] text-[color:var(--panel-text-soft)] hover:text-[color:var(--panel-text)]",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <Field label="Açıklama" hint="Hangi etkinlikleri yaptınız, neleri yapamadınız?">
        <textarea
          className={`${inputClassName()} min-h-20`}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Örn. Sayı sayma etkinliğini birlikte yaptık, boyama çalışmasını tamamlayamadık…"
        />
      </Field>

      {/* Görsel ekleme */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={onPickImage}
        />
        <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()}>
          <ImagePlus className="size-4" />
          Görsel ekle
        </Button>
        {image && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-2.5 py-1 text-xs text-[color:var(--panel-text-muted)]">
            {image.name}
            <button
              type="button"
              onClick={() => setImage(null)}
              className="text-[color:var(--panel-text-soft)] hover:text-[color:var(--panel-text)]"
              aria-label="Görseli kaldır"
            >
              <X className="size-3.5" />
            </button>
          </span>
        )}
      </div>

      <div>
        <Button disabled={isPending} onClick={submit}>
          {isPending ? "Gönderiliyor…" : "Gönder"}
        </Button>
      </div>
    </div>
  );
}
