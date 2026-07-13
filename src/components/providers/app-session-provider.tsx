"use client";

import { useEffect } from "react";

export function AppSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        target.tagName === "INPUT" &&
        (target as HTMLInputElement).type === "date" &&
        !(target as HTMLInputElement).readOnly &&
        !(target as HTMLInputElement).disabled
      ) {
        try {
          (target as HTMLInputElement).showPicker();
        } catch (err) {
          // ignore error if showPicker is unsupported or fails
        }
      }
    };

    document.addEventListener("click", handleGlobalClick);
    return () => {
      document.removeEventListener("click", handleGlobalClick);
    };
  }, []);

  // Yerel sürüm: NextAuth SessionProvider kaldırıldı; oturum sunucu tarafında sabittir.
  return <>{children}</>;
}
