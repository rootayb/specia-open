import { cn } from "@/lib/utils";
import { restoreTurkishText } from "@/lib/turkish";

type FieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function Field({ label, hint, error, children, className }: FieldProps) {
  return (
    <label className={cn("grid gap-2", className)}>
      <span className="text-sm font-semibold text-[color:var(--panel-text)]">
        {restoreTurkishText(label)}
      </span>
      {children}
      {hint ? (
        <span className="text-xs text-[color:var(--panel-text-soft)]">{restoreTurkishText(hint)}</span>
      ) : null}
      {error ? (
        <span className="text-xs text-[color:var(--panel-danger-text)]">{restoreTurkishText(error)}</span>
      ) : null}
    </label>
  );
}

export function inputClassName() {
  return "min-h-9 w-full rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3 py-2 text-sm text-[color:var(--panel-text)] outline-none transition placeholder:text-[color:var(--panel-text-soft)] selection:bg-white/20 selection:text-white focus:border-[color:var(--panel-border-strong)] focus:bg-[color:var(--panel-bg-hover)] focus:ring-2 focus:ring-white/10";
}
