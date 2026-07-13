"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isInternalNavigationTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  const anchor = target.closest("a");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return false;
  }

  if (
    anchor.target === "_blank" ||
    anchor.hasAttribute("download") ||
    anchor.getAttribute("rel")?.includes("external")
  ) {
    return false;
  }

  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#")) {
    return false;
  }

  const nextUrl = new URL(anchor.href, window.location.href);
  if (nextUrl.origin !== window.location.origin) {
    return false;
  }

  const currentUrl = new URL(window.location.href);
  return (
    nextUrl.pathname !== currentUrl.pathname ||
    nextUrl.search !== currentUrl.search ||
    nextUrl.hash !== currentUrl.hash
  );
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function clearHideTimeout() {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
    }

    function showProgress() {
      clearHideTimeout();
      setIsVisible(true);
    }

    function handleClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      if (isInternalNavigationTarget(event.target)) {
        showProgress();
      }
    }

    document.addEventListener("click", handleClick, true);

    return () => {
      clearHideTimeout();
      document.removeEventListener("click", handleClick, true);
    };
  }, []);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }

    hideTimeoutRef.current = window.setTimeout(() => {
      setIsVisible(false);
      hideTimeoutRef.current = null;
    }, 180);
  }, [pathname, searchParams, isVisible]);

  return (
    <div
      aria-hidden="true"
      className={[
        "pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden transition-opacity duration-200",
        isVisible ? "opacity-100" : "opacity-0",
      ].join(" ")}
    >
      <div className="h-full w-full origin-left animate-[specia-progress_1.1s_ease-in-out_infinite] bg-[linear-gradient(90deg,var(--panel-text)_0%,#38bdf8_45%,#f59e0b_100%)] shadow-[0_0_18px_rgba(56,189,248,0.5)]" />
    </div>
  );
}
