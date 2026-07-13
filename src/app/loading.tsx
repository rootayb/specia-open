import { SpeciaLogoBadge } from "@/components/brand/specia-logo-badge";

export default function RootLoading() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#09090b] px-4">
      {/* Background Gradients */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.035),transparent_40%)]" />
      <div className="pointer-events-none absolute left-[15%] top-[10%] h-[35rem] w-[35rem] rounded-full bg-white/[0.015] blur-[140px]" />
      <div className="pointer-events-none absolute right-[15%] bottom-[10%] h-[35rem] w-[35rem] rounded-full bg-white/[0.01] blur-[140px]" />

      <div className="relative flex flex-col items-center gap-6">
        {/* Pulsing Logo Container */}
        <div className="relative animate-pulse duration-[2000ms]">
          {/* Subtle glow behind the logo */}
          <div className="absolute inset-0 -z-10 rounded-full bg-white/5 blur-2xl filter" />
          <SpeciaLogoBadge size="md" variant="white" frameTone="none" className="p-0 select-none" />
        </div>

        {/* Minimal Spinner / Progress line */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-[2px] w-28 overflow-hidden rounded-full bg-white/10">
            <div className="h-full w-full origin-left animate-[specia-progress_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite] rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em] text-neutral-500 select-none animate-pulse duration-[1500ms]">
            Yükleniyor
          </span>
        </div>
      </div>
    </div>
  );
}
