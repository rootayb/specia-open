import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  summary: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  eyebrow,
  title,
  summary,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-[#050505] px-4 py-16 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 shadow-[0_30px_100px_-60px_rgba(0,0,0,0.95)] sm:p-10">
          <Link
            href="/"
            className="group mb-8 inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            Ana sayfaya dön
          </Link>
          <div className="text-xs font-semibold uppercase tracking-[0.28em] text-neutral-500">
            {eyebrow}
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-neutral-300 sm:text-lg">
            {summary}
          </p>

          <div className="mt-6 flex flex-wrap gap-3 text-sm text-neutral-400">
            <Link className="transition hover:text-white" href="/gizlilik">
              Gizlilik
            </Link>
            <Link className="transition hover:text-white" href="/cerez-politikasi">
              Cerez Politikasi
            </Link>
            <Link className="transition hover:text-white" href="/kullanim-kosullari">
              Kullanim Koşulları
            </Link>
          </div>

          <div className="mt-10 space-y-6">{children}</div>
        </div>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[24px] border border-white/8 bg-black/30 p-6">
      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-white">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-7 text-neutral-300 sm:text-[15px]">
        {children}
      </div>
    </section>
  );
}
