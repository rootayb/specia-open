"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Bell,
  BookText,
  Building2,
  ClipboardList,
  FileCheck2,
  FileText,
  HeartPulse,
  Layers,
  LayoutDashboard,
  Megaphone,
  Radio,
  ShieldCheck,
  Smartphone,
  ThumbsUp,
  Ticket,
  Users,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

type AdminNavGroup = {
  id: string;
  label: string;
  items: AdminNavItem[];
};

const adminNavGroups: AdminNavGroup[] = [
  {
    id: "genel",
    label: "Genel Bakış",
    items: [{ href: "/panel/admin", label: "Kontrol Paneli", icon: LayoutDashboard }],
  },
  {
    id: "kullanıcı-kurum",
    label: "Kullanıcı & Kurum",
    items: [
      { href: "/panel/admin/kullanicilar", label: "Kullanıcılar", icon: Users },
      { href: "/panel/admin/kurumlar", label: "Kurumlar", icon: Building2 },
      { href: "/panel/admin/kurum-basvurulari", label: "Kurum Başvuruları", icon: FileCheck2 },
    ],
  },
  {
    id: "içerik",
    label: "İçerik",
    items: [
      { href: "/panel/admin/blog", label: "Blog", icon: BookText },
      { href: "/panel/admin/beceri-sablonlari", label: "Beceri Şablonları", icon: Layers },
      { href: "/panel/admin/legal", label: "Legal Belgeler", icon: FileText },
    ],
  },
  {
    id: "sistem-guvenlik",
    label: "Sistem & Güvenlik",
    items: [
      { href: "/panel/admin/sistem-sagligi", label: "Sistem Sağlığı", icon: HeartPulse },
      { href: "/panel/admin/guvenlik", label: "Güvenlik", icon: ShieldCheck },
      { href: "/panel/admin/bakim", label: "Bakım", icon: Wrench },
      { href: "/panel/admin/durum-merkezi", label: "Durum Merkezi", icon: Radio },
      { href: "/panel/admin/denetim", label: "Denetim Günlükleri", icon: ClipboardList },
    ],
  },
  {
    id: "iletişim",
    label: "İletişim",
    items: [
      { href: "/panel/admin/duyurular", label: "Duyurular", icon: Megaphone },
      { href: "/panel/admin/bildirimler", label: "Bildirimler", icon: Bell },
      { href: "/panel/admin/destek-talepleri", label: "Destek Talepleri", icon: Ticket },
      { href: "/panel/admin/geri-bildirim", label: "Geri Bildirim", icon: ThumbsUp },
    ],
  },
  {
    id: "mobil",
    label: "Mobil",
    items: [{ href: "/panel/admin/mobil-surum", label: "Mobil Sürüm", icon: Smartphone }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/panel/admin") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-5 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
      {adminNavGroups.map((group) => (
        <div key={group.id} className="min-w-max shrink-0 lg:min-w-0 lg:shrink">
          <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
            {group.label}
          </div>
          <div className="flex gap-1.5 lg:flex-col">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-[var(--panel-radius-sm)] border px-3 py-2 text-[13px] font-medium transition",
                    active
                      ? "border-[color:var(--panel-border-strong)] bg-[color:var(--panel-bg-hover)] text-[color:var(--panel-text)]"
                      : "border-transparent text-[color:var(--panel-text-muted)] hover:border-[color:var(--panel-border)] hover:bg-[color:var(--panel-bg-soft)] hover:text-[color:var(--panel-text)]",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
