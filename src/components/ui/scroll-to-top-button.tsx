"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <button
      type="button"
      aria-label="Sayfanın başına dön"
      onClick={scrollToTop}
      className={cn(
        "fixed right-6 bottom-24 z-[80] flex size-11 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-elevated)] text-[color:var(--panel-text-muted)] shadow-[var(--panel-shadow)] backdrop-blur-xl transition-all duration-300 hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)] sm:bottom-28 sm:size-12",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0",
      )}
    >
      <ArrowUp className="size-4 sm:size-5" />
    </button>
  );
}
