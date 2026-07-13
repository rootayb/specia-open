"use client";

import React, { useCallback, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Button } from "./button";
import { AlertTriangle, ShieldAlert, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConfirmModalOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  doubleConfirm?: boolean;
  doubleConfirmText?: string;
}

interface ConfirmDialogProps {
  options: ConfirmModalOptions;
  onClose: (value: boolean) => void;
}

function ConfirmDialog({ options, onClose }: ConfirmDialogProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [doubleConfirmed, setDoubleConfirmed] = useState(false);
  const {
    title,
    message,
    confirmText = "Onayla",
    cancelText = "Vazgeç",
    variant = "danger",
    doubleConfirm = false,
    doubleConfirmText = "Bu işlemin geri alınamayacağını ve verinin kalıcı olarak silineceğini onaylıyorum.",
  } = options;

  const handleAction = useCallback((confirm: boolean) => {
    setIsClosing(true);
    setTimeout(() => {
      onClose(confirm);
    }, 150);
  }, [onClose]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleAction(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleAction]);

  const getIcon = () => {
    switch (variant) {
      case "danger":
        return <ShieldAlert className="size-6 text-[color:var(--panel-danger-text)]" />;
      case "warning":
        return <AlertTriangle className="size-6 text-[color:var(--panel-warning-text)]" />;
      default:
        return <Info className="size-6 text-[color:var(--panel-info-text)]" />;
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          border: "border-[color:var(--panel-danger-border)]",
          bg: "bg-[color:var(--panel-danger-bg)]",
          glow: "shadow-[var(--panel-shadow)]",
        };
      case "warning":
        return {
          border: "border-[color:var(--panel-warning-border)]",
          bg: "bg-[color:var(--panel-warning-bg)]",
          glow: "shadow-[var(--panel-shadow)]",
        };
      default:
        return {
          border: "border-[color:var(--panel-info-border)]",
          bg: "bg-[color:var(--panel-info-bg)]",
          glow: "shadow-[var(--panel-shadow)]",
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className={cn(
        "fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/72 backdrop-blur-[3px]",
        isClosing ? "animate-fade-out" : "animate-fade-in"
      )}
      onClick={() => handleAction(false)}
    >
      <div
        className={cn(
          "relative w-full max-w-md rounded-xl border bg-[color:var(--panel-bg-elevated)] p-5 text-left shadow-2xl flex flex-col gap-4",
          styles.border,
          styles.glow,
          isClosing ? "animate-scale-out" : "animate-scale-in"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => handleAction(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-[color:var(--panel-text-soft)] hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)] transition"
        >
          <X className="size-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className={cn("inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]")}>
            {getIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-[color:var(--panel-text)] tracking-tight leading-6">
              {title}
            </h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[color:var(--panel-text-muted)]">
              {message}
            </p>
          </div>
        </div>

        {doubleConfirm && (
          <label className="mt-2 flex items-start gap-2.5 rounded-lg border border-[color:var(--panel-danger-border)] bg-[color:var(--panel-danger-bg)] p-3 text-[12px] text-[color:var(--panel-danger-text)] cursor-pointer select-none transition">
            <input
              type="checkbox"
              checked={doubleConfirmed}
              onChange={(e) => setDoubleConfirmed(e.target.checked)}
              className="mt-0.5 rounded border-[color:var(--panel-border-strong)] bg-[color:var(--panel-bg-soft)] focus:ring-0 cursor-pointer"
            />
            <span className="leading-normal">{doubleConfirmText}</span>
          </label>
        )}

        <div className="flex items-center justify-end gap-2.5 mt-2 border-t border-[color:var(--panel-border)] pt-4">
          <Button
            variant="ghost"
            onClick={() => handleAction(false)}
            className="text-xs"
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "secondary"}
            disabled={doubleConfirm && !doubleConfirmed}
            onClick={() => handleAction(true)}
            className="text-xs font-semibold"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function confirmModal(options: ConfirmModalOptions): Promise<boolean> {
  return new Promise((resolve) => {
    // Only run on client side
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }

    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    const handleClose = (value: boolean) => {
      root.unmount();
      container.remove();
      resolve(value);
    };

    root.render(<ConfirmDialog options={options} onClose={handleClose} />);
  });
}
