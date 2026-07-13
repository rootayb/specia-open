import Link from "next/link";
import { Instagram } from "lucide-react";

import { SpeciaLogoBadge } from "@/components/brand/specia-logo-badge";
import { getAppVersionInfo } from "@/lib/app-version";

const legalLinks = [
  { href: "/gizlilik", label: "Gizlilik ve KVKK" },
  { href: "/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/kullanim-kosullari", label: "Kullanım Koşulları" },
  { href: "/blog", label: "Blog" },
];

export async function SiteFooter() {
  const contactEmail = "bilgi@specia.com.tr";
  const instagramUrl = "https://instagram.com/speciaapp";
  const socialIconClass =
    "inline-flex size-7 items-center justify-center rounded-full border border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)] transition hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]";

  const versionInfo = await getAppVersionInfo("ios");

  return (
    <footer className="border-t border-[color:var(--panel-border)] bg-[color:var(--panel-bg-elevated)] px-4 py-4 text-[color:var(--panel-text-muted)] backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <SpeciaLogoBadge
            size="xs"
            variant="auto"
            frameTone="none"
            className="shadow-none p-0"
            imageClassName="h-6 w-auto"
          />
          <span className="text-[11px] text-[color:var(--panel-text-soft)]">
            © {new Date().getFullYear()} Specia Dijital Eğitim Çözümleri.{" "}
            <span className="ml-1 font-mono text-[10px] text-[color:var(--panel-text-muted)] opacity-80">v{versionInfo.currentVersion}</span>
          </span>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Specia Instagram hesabı"
            className={socialIconClass}
          >
            <Instagram className="size-3.5" aria-hidden="true" />
          </a>
        </div>

        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px]">
          {legalLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[color:var(--panel-text-muted)] transition hover:text-[color:var(--panel-text)]"
            >
              {link.label}
            </Link>
          ))}
          <a
            className="text-[color:var(--panel-text-muted)] transition hover:text-[color:var(--panel-text)]"
            href={`mailto:${contactEmail}`}
          >
            İletişim
          </a>
        </nav>
      </div>
    </footer>
  );
}
