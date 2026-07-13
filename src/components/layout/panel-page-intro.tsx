import { restoreTurkishText } from "@/lib/turkish";
import { cn } from "@/lib/utils";

export function PanelPageIntro({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  aside?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "relative grid gap-6 overflow-hidden rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[linear-gradient(135deg,var(--panel-bg-elevated)_0%,var(--panel-bg-base)_58%,var(--panel-bg-soft)_100%)] px-5 py-5 shadow-[var(--panel-shadow)] sm:px-6 sm:py-6 min-[1700px]:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]",
        "after:pointer-events-none after:absolute after:right-0 after:top-0 after:h-24 after:w-64 after:bg-[radial-gradient(circle_at_top_right,var(--panel-info-bg),transparent_68%)]",
        className,
      )}
    >
      <div className="relative z-10 space-y-4">
        {eyebrow ? (
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
            {restoreTurkishText(eyebrow)}
          </div>
        ) : null}
        <div className="space-y-3">
          <h1 className="max-w-4xl text-[1.4rem] font-semibold tracking-[-0.03em] text-[color:var(--panel-text)] sm:text-[1.65rem]">
            {restoreTurkishText(title)}
          </h1>
          {description ? (
            <p className="max-w-3xl text-sm leading-7 text-[color:var(--panel-text-muted)]">
              {restoreTurkishText(description)}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      {aside ? <div className="relative z-10 min-w-0">{aside}</div> : null}
    </section>
  );
}
