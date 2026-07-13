"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { restoreTurkishText } from "@/lib/turkish";
import { cn } from "@/lib/utils";

type ActionToastTone = "success" | "error" | "info";

type ActionToastItem = {
  id: number;
  title?: string;
  message: string;
  tone: ActionToastTone;
};

type ActionToastInput = {
  title?: string;
  message: string;
  tone?: ActionToastTone;
};

type ActionToastContextValue = {
  showToast: (input: ActionToastInput) => void;
};

type ActionResultLike = {
  success: boolean;
  message: string;
};

type ActionFeedbackOptions = {
  successTitle?: string;
  errorTitle?: string;
  successMessage?: string;
  errorMessage?: string;
};

const ActionToastContext = createContext<ActionToastContextValue | null>(null);

export function ActionToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ActionToastItem[]>([]);

  const removeToast = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, message, tone = "info" }: ActionToastInput) => {
      const id = Date.now() + Math.floor(Math.random() * 1000);

      setItems((current) => [...current.slice(-2), { id, title, message, tone }]);
      window.setTimeout(() => removeToast(id), 2200);
    },
    [removeToast],
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ActionToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[90] grid gap-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:bottom-auto sm:w-[320px]">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto rounded-[var(--panel-radius-lg)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-elevated)] text-[color:var(--panel-text)] shadow-[var(--panel-shadow)] backdrop-blur-xl transition-all duration-300",
            )}
          >
            <div className="flex items-center gap-3 px-3.5 py-2.5">
              <div
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center",
                  item.tone === "success" && "text-[color:var(--panel-success-text)]",
                  item.tone === "error" && "text-[color:var(--panel-danger-text)]",
                  item.tone === "info" && "text-[color:var(--panel-info-text)]",
                )}
              >
                {item.tone === "success" ? (
                  <CheckCircle2 className="size-4" />
                ) : item.tone === "error" ? (
                  <AlertCircle className="size-4" />
                ) : (
                  <Info className="size-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                {item.title ? (
                  <div className="text-xs font-bold text-[color:var(--panel-text)]">{restoreTurkishText(item.title)}</div>
                ) : null}
                <div className={cn("text-xs leading-5 text-[color:var(--panel-text-muted)]", item.title ? "mt-0.5" : "")}>
                  {restoreTurkishText(item.message)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ActionToastContext.Provider>
  );
}

export function useActionToast() {
  const context = useContext(ActionToastContext);

  if (!context) {
    throw new Error("useActionToast must be used inside ActionToastProvider.");
  }

  return context;
}

export function useActionFeedback() {
  const { showToast } = useActionToast();

  const showResult = useCallback(
    (result: ActionResultLike, options: ActionFeedbackOptions = {}) => {
      showToast({
        title: result.success
          ? options.successTitle ?? "İşlem tamamlandı"
          : options.errorTitle ?? "İşlem tamamlanamadı",
        message: result.success
          ? options.successMessage ?? result.message
          : options.errorMessage ?? result.message,
        tone: result.success ? "success" : "error",
      });
    },
    [showToast],
  );

  return { showResult, showToast };
}
