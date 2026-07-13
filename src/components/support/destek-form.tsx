"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupportTicketAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { Card } from "@/components/ui/card";

export function DestekForm() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    startTransition(async () => {
      const result = await createSupportTicketAction({
        subject,
        message,
      });

      showResult(result, {
        successTitle: "Destek Talebi Gönderildi",
        errorTitle: "Hata",
      });

      if (result.success) {
        setSubject("");
        setMessage("");
        router.refresh();
      }
    });
  };

  return (
    <Card padding="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-[color:var(--panel-text)]">
            Yeni Destek Talebi
          </h2>
          <p className="text-xs text-[color:var(--panel-text-muted)] mt-1">
            Sorularınızı, önerilerinizi veya karşılaştığınız sorunları bize iletin.
          </p>
        </div>

        <Field label="Konu *">
          <input
            className={inputClassName()}
            type="text"
            required
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Destek talebinizin konusunu kısaca yazın"
            disabled={isPending}
          />
        </Field>

        <Field label="Mesajınız *">
          <textarea
            className={inputClassName()}
            required
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Sorununuzu veya talebinizi detaylıca açıklayın..."
            disabled={isPending}
          />
        </Field>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending || !subject.trim() || !message.trim()}>
            {isPending ? "Gönderiliyor..." : "Destek Talebini Gönder"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
