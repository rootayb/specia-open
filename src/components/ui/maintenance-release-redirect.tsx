"use client";

import { useEffect } from "react";

export function MaintenanceReleaseRedirect() {
  useEffect(() => {
    let cancelled = false;

    const checkStatus = async () => {
      try {
        const response = await fetch("/api/runtime-status", { cache: "no-store" });
        if (!response.ok || cancelled) {
          return;
        }

        const data = (await response.json()) as {
          maintenance?: {
            isActive?: boolean;
          };
        };

        if (!data.maintenance?.isActive) {
          window.location.replace("/");
        }
      } catch {
        // Network issue while polling should not break the page.
      }
    };

    const interval = window.setInterval(checkStatus, 20000);
    void checkStatus();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return null;
}
