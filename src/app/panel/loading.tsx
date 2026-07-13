export default function PanelLoading() {
  return (
    <div className="grid gap-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Panel yükleniyor...</span>
      <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="h-3 w-24 animate-pulse rounded-full bg-white/8" />
            <div className="mt-5 h-10 w-full max-w-[34rem] animate-pulse rounded-[var(--panel-radius-lg)] bg-white/8" />
            <div className="mt-3 h-4 w-full max-w-[42rem] animate-pulse rounded-full bg-white/6" />
            <div className="mt-2 h-4 w-5/6 max-w-[30rem] animate-pulse rounded-full bg-white/6" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3 xl:w-[420px] xl:grid-cols-1">
            <div className="h-12 animate-pulse rounded-[var(--panel-radius-lg)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
            <div className="h-12 animate-pulse rounded-[var(--panel-radius-lg)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
            <div className="h-12 animate-pulse rounded-[var(--panel-radius-lg)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <div className="h-32 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
        <div className="h-32 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
        <div className="h-32 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
        <div className="h-32 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
      </div>

      <div className="grid gap-4 2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] p-5 sm:p-6">
          <div className="h-4 w-40 animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 grid gap-3">
            <div className="h-20 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
            <div className="h-20 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
            <div className="h-20 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]" />
          </div>
        </div>

        <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] p-5 sm:p-6">
          <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2 2xl:grid-cols-1">
            <div className="h-24 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/75" />
            <div className="h-24 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/75" />
            <div className="h-24 animate-pulse rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/75" />
          </div>
        </div>
      </div>
    </div>
  );
}
