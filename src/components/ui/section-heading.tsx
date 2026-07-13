import { restoreTurkishText } from "@/lib/turkish";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  align = "start",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: "start" | "between";
}) {
  return (
    <div
      className={
        align === "between"
          ? "flex flex-wrap items-start justify-between gap-4"
          : "space-y-2"
      }
    >
      <div className="space-y-2">
        {eyebrow ? (
          <div className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
            <span className="size-1.5 rounded-full bg-[color:var(--panel-info-text)]" />
            <span>{restoreTurkishText(eyebrow)}</span>
          </div>
        ) : null}
        <h2 className="text-lg font-semibold tracking-[-0.02em] text-[color:var(--panel-text)] sm:text-xl">
          {restoreTurkishText(title)}
        </h2>
        {description ? (
          <p className="max-w-4xl text-sm leading-6 text-[color:var(--panel-text-muted)]">
            {restoreTurkishText(description)}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
