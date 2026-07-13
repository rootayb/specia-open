export default function FormsLoading() {
  return (
    <div className="grid gap-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Formlar yükleniyor...</span>

      {/* Öğrenci seçimi + seçili öğrenci kartı iskeleti */}
      <div className="grid gap-5 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] p-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          <div className="h-3 w-16 animate-pulse rounded-full bg-white/8" />
          <div className="mt-3 h-11 animate-pulse rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
        </div>
        <div className="rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-4">
          <div className="h-3 w-28 animate-pulse rounded-full bg-white/8" />
          <div className="mt-4 flex items-start gap-3">
            <div className="size-11 animate-pulse rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
            <div className="min-w-0 flex-1">
              <div className="h-6 w-48 animate-pulse rounded-full bg-white/10" />
              <div className="mt-2 h-4 w-64 animate-pulse rounded-full bg-white/6" />
            </div>
          </div>
        </div>
      </div>

      {/* Form kartları iskeleti */}
      <div className="grid gap-4 sm:grid-cols-2 min-[1500px]:grid-cols-3">
        {Array.from({ length: 9 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]"
          />
        ))}
      </div>
    </div>
  );
}
