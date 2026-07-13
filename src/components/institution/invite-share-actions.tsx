"use client";

import { useState } from "react";
import { Copy, MessageCircleMore, QrCode } from "lucide-react";

import { Button } from "@/components/ui/button";

export function InviteShareActions({
  registrationUrl,
  inviteCode,
}: {
  registrationUrl: string;
  inviteCode: string;
}) {
  const [feedback, setFeedback] = useState("");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setFeedback("Kayıt bağlantısı kopyalandı.");
    } catch {
      setFeedback("Bağlantı kopyalanamadı.");
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `Specia davet bağlantısı: ${registrationUrl}`,
  )}`;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={handleCopy}>
          <Copy className="mr-2 size-4" />
          Kayıt bağlantısını kopyala
        </Button>
        <a href={registrationUrl} target="_blank" rel="noreferrer">
          <Button variant="ghost">
            <QrCode className="mr-2 size-4" />
            QR ile kayıt
          </Button>
        </a>
        <a href={whatsappUrl} target="_blank" rel="noreferrer">
          <Button variant="ghost">
            <MessageCircleMore className="mr-2 size-4" />
            WhatsApp ile paylaş
          </Button>
        </a>
      </div>
      <div className="text-xs text-neutral-500">
        Kod: {inviteCode}
        {feedback ? ` · ${feedback}` : ""}
      </div>
    </div>
  );
}
