"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const COOKIE_NOTICE_KEY = "specia-cookie-notice-v1";
const COOKIE_NOTICE_EVENT = "specia-cookie-notice-change";

function subscribe(onStoreChange: () => void) {
  function handleChange(event: Event) {
    if (event instanceof StorageEvent && event.key && event.key !== COOKIE_NOTICE_KEY) {
      return;
    }

    onStoreChange();
  }

  window.addEventListener("storage", handleChange);
  window.addEventListener(COOKIE_NOTICE_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(COOKIE_NOTICE_EVENT, handleChange);
  };
}

function getSnapshot() {
  return !window.localStorage.getItem(COOKIE_NOTICE_KEY);
}

export function CookieBanner() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, () => false);

  function handleAcknowledge() {
    window.localStorage.setItem(COOKIE_NOTICE_KEY, "accepted");
    window.dispatchEvent(new Event(COOKIE_NOTICE_EVENT));
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--panel-border)] bg-[color:var(--panel-bg-elevated)] shadow-[0_-8px_30px_-22px_rgba(0,0,0,0.6)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-sm leading-6 text-[color:var(--panel-text-muted)]">
          Bu site yalnızca oturumu sürdürmek ve giriş güvenliği için zorunlu çerezleri kullanır.{" "}
          <Link
            href="/cerez-politikasi"
            className="font-medium text-[color:var(--panel-text)] underline underline-offset-4"
          >
            Çerez Politikası
          </Link>
        </p>
        <Button size="sm" className="shrink-0 sm:min-w-32" onClick={handleAcknowledge}>
          Anladım
        </Button>
      </div>
    </div>
  );
}
