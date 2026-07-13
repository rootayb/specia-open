"use client";

import { Share2 } from "lucide-react";

interface ShareButtonProps {
  title: string;
}

export function ShareButton({ title }: ShareButtonProps) {
  const handleShare = () => {
    if (typeof window === "undefined") return;

    if (navigator.share) {
      navigator.share({
        title,
        url: window.location.href,
      }).catch((err) => console.log("Sharing cancelled or failed:", err));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link panoya kopyalandı!");
    }
  };

  return (
    <button
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition cursor-pointer"
    >
      <Share2 className="size-3.5" />
      Paylaş
    </button>
  );
}
