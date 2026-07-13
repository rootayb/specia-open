"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";

import { cn } from "@/lib/utils";

type ThemeOption = {
  value: string;
  label: string;
  Icon: typeof Sun;
};

const OPTIONS: ThemeOption[] = [
  { value: "light", label: "Açık", Icon: Sun },
  { value: "dark", label: "Koyu", Icon: Moon },
  { value: "system", label: "Sistem", Icon: Monitor },
];

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Tema yalnızca istemcide bilinir; hidrasyon uyumsuzluğunu önlemek için
  // bağlanana kadar aktif seçenek nötr bırakılır.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const active = mounted ? theme ?? "system" : undefined;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-0.5",
        className,
      )}
      role="group"
      aria-label="Tema seçimi"
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const isActive = active === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={label}
            aria-pressed={isActive}
            title={label}
            className={cn(
              "inline-flex size-7 items-center justify-center rounded-lg transition",
              isActive
                ? "bg-[color:var(--panel-bg-hover)] text-[color:var(--panel-text)]"
                : "text-[color:var(--panel-text-muted)] hover:text-[color:var(--panel-text)]",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
