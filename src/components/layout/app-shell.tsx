"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { InstitutionType, StaffModulePermission, UserRole } from "@/lib/prisma-shim";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Banknote,
  BookText,
  Building2,
  CalendarDays,
  ClipboardList,
  FileCheck2,
  FilePenLine,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  HelpCircle,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  ReceiptText,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  Ticket,
  Users,
  Wallet,
  X,
} from "lucide-react";

import { SpeciaLogoBadge } from "@/components/brand/specia-logo-badge";
import { SignOutButton } from "@/components/layout/sign-out-button";
import { SpotlightSearch } from "@/components/layout/spotlight-search";
import type { QuickActionItem } from "@/components/layout/quick-actions-modal";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  canAccessBepApprovalInbox,
  canAccessEducationalAnalysis,
  canAccessFamilyEducation,
  canAccessSpecialEducationTools,
  canCreateBep,
  canManageInstitutionRecords,
  hasModuleAccess,
  isAdminRole,
  isInstitutionRole,
  isParentRole,
  isTeacherRole,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { supportsSessionAndFinanceModules } from "@/lib/institution-features";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

function matchesPath(pathname: string, href: string) {
  if (href === "/panel") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({
  item,
  pathname,
  compact = false,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = matchesPath(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={item.label}
      className={cn(
        "group flex items-center gap-2 rounded-lg px-2.5 py-1 text-[13px] font-medium text-[color:var(--panel-text)] transition outline-none",
        active
          ? "bg-white/12"
          : "hover:bg-[color:var(--panel-bg-hover)]",
        compact && "justify-center px-0",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          active ? "text-[color:var(--panel-text)]" : "text-white/80 group-hover:text-white",
        )}
      />
      <span className={cn("min-w-0 truncate", compact ? "hidden" : "block")}>
        {item.label}
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  userId,
  userName,
  userRole,
  institutionId,
  allowedModules,
  institutionType,
  announcements,
}: {
  children: React.ReactNode;
  userId: string;
  userName: string;
  userRole: UserRole;
  institutionId?: string | null;
  allowedModules?: StaffModulePermission[] | null;
  institutionType?: InstitutionType | null;
  announcements: Array<{
    id: string;
    title: string;
    summary?: string | null;
    content: string;
    showAsPopup: boolean;
    publishedAt: string | Date;
    updatedAt: string | Date;
  }>;
}) {
  const pathname = usePathname();
  const isSessionSchedulePath = matchesPath(pathname, "/panel/seans-programi");
  const isAdminPath = matchesPath(pathname, "/panel/admin");
  const hidesSidebarByDefault = isSessionSchedulePath || isAdminPath;
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState<{ pathname: string; hidden: boolean } | null>(null);
  const isSidebarHidden =
    sidebarState?.pathname === pathname ? sidebarState.hidden : hidesSidebarByDefault;

  const isInstitutionManager = isInstitutionRole(userRole);
  const isParent = isParentRole(userRole);
  const isTeacher = isTeacherRole(userRole);
  // Yerel sürüm: güvenlik kodu ve güncelleme merkezi kaldırıldı.
  const isIndependentTeacher = isTeacher && !institutionId;
  const hasTeacherParentCommunicationAccess =
    isAdminRole(userRole) || (isTeacher && Boolean(institutionId)) || isParent;

  const hasOperationalModules = supportsSessionAndFinanceModules(institutionType);
  const canAccessStudents = isParent || hasModuleAccess(userRole, allowedModules, "students");
  const canAccessSessions =
    hasOperationalModules &&
    (canManageInstitutionRecords(userRole) || (isTeacher && Boolean(institutionId)));
  // Yerel sürüm: yalnızca Öğrenciler + BEP + Değerlendirmeler + Formlar bölümleri
  // taşındığı için diğer modüllerin menü erişimleri kapalıdır.
  const canAccessCalendar = false;
  const canAccessCommunication = false;
  const canAccessAnalysis = false;
  const canUseBepModule =
    canCreateBep(userRole) && hasModuleAccess(userRole, allowedModules, "bep");
  const canAccessForms = !isParent && canUseBepModule;
  const canAccessTools = false;
  const canAccessZumreMeetings = false;
  const canCreateStudent = !isParent && hasModuleAccess(userRole, allowedModules, "students");
  const canAccessBep = canCreateBep(userRole);
  const canAccessFamilyPlans = false;
  const showAdminAccess = isAdminRole(userRole);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileNavOpen]);

  type NavGroup = {
    id: string;
    label: string;
    items: NavItem[];
  };

  const navGroups = useMemo<NavGroup[]>(() => {
    // Yerel sürümde genel bakış/notlar/evrak kontrol modülleri bulunmaz.
    const genelItems: NavItem[] = [];

    const egitimItems: NavItem[] = [];
    if (isInstitutionManager) {
      egitimItems.push(
        { href: "/panel/ogrenciler", label: "Öğrenciler", icon: Users },
        { href: "/panel/bep", label: "BEP", icon: FilePenLine },
        { href: "/panel/degerlendirmeler", label: "Değerlendirmeler", icon: ClipboardList }
      );
      if (hasOperationalModules) {
        egitimItems.push({ href: "/panel/seans-programi", label: "Seanslar", icon: CalendarDays });
      }
    } else if (isParent) {
      egitimItems.push(
        { href: "/panel/cocuklarim", label: "Çocuğum", icon: Users },
        { href: "/panel/belgeler", label: "Belgeler", icon: FilePenLine },
        { href: "/panel/degerlendirmeler", label: "Değerlendirmeler", icon: ClipboardList },
        { href: "/panel/takvim", label: "Takvim", icon: CalendarDays }
      );
      if (canAccessAnalysis) {
        egitimItems.push({ href: "/panel/egitsel-analiz", label: "Analiz", icon: BarChart3 });
      }
    } else {
      if (canAccessStudents) {
        egitimItems.push({ href: "/panel/ogrenciler", label: "Öğrenciler", icon: Users });
      }
      if (canAccessBep) {
        egitimItems.push({ href: "/panel/bep", label: "BEP", icon: FilePenLine });
      }
      egitimItems.push({ href: "/panel/degerlendirmeler", label: "Değerlendirmeler", icon: ClipboardList });
      if (canAccessSessions) {
        egitimItems.push({ href: "/panel/seans-programi", label: "Seanslar", icon: CalendarDays });
      } else if (canAccessCalendar) {
        egitimItems.push({ href: "/panel/takvim", label: "Takvim", icon: CalendarDays });
      }
    }

    if (!isParent) {
      if (canAccessForms) {
        egitimItems.push({ href: "/panel/formlar", label: "Formlar", icon: FileText });
      }
      if (canAccessTools) {
        egitimItems.push({ href: "/panel/ozel-egitim-araclari", label: "Araçlar", icon: Sparkles });
      }
      if (canAccessFamilyPlans) {
        egitimItems.push({ href: "/panel/aile-egitimi", label: "Aile Eğitimi", icon: FileText });
      }
      if (canAccessAnalysis) {
        egitimItems.push({ href: "/panel/egitsel-analiz", label: "Analiz", icon: BarChart3 });
      }
    } else {
      if (canAccessFamilyPlans) {
        egitimItems.push({ href: "/panel/aile-egitimi", label: "Aile Eğitimi", icon: FileText });
      }
    }

    const kurumItems: NavItem[] = [];
    if (isInstitutionManager) {
      kurumItems.push(
        { href: "/panel/kurum", label: "Kurum", icon: Building2 },
        { href: "/panel/raporlar", label: "Raporlar", icon: BarChart3 },
        { href: "/panel/uyeler", label: "Üyeler", icon: Users },
        { href: "/panel/belgeler", label: "Belgeler", icon: FilePenLine },
        ...(canAccessZumreMeetings
          ? [{ href: "/panel/tutanaklar", label: "Tutanaklar", icon: ClipboardList }]
          : []),
        ...(canAccessBepApprovalInbox({ role: userRole })
          ? [{ href: "/panel/bep-onaylari", label: "BEP Onayları", icon: Shield }]
          : []),
        { href: "/panel/veli-eslestirme", label: "Veli Eşleştirme", icon: Users },
        { href: "/panel/davet-kodlari", label: "Davet Kodları", icon: Ticket }
      );
      if (canAccessCommunication) {
        kurumItems.push({ href: "/panel/iletisim", label: "İletişim", icon: MessageSquare });
      }
    } else if (!isParent) {
      if (canAccessZumreMeetings) {
        kurumItems.push({ href: "/panel/tutanaklar", label: "Tutanaklar", icon: ClipboardList });
      }
      if (canAccessCommunication) {
        kurumItems.push({ href: "/panel/iletisim", label: "İletişim", icon: MessageSquare });
      }
    } else {
      if (canAccessCommunication) {
        kurumItems.push({ href: "/panel/iletisim", label: "İletişim", icon: MessageSquare });
      }
    }

    const finansItems: NavItem[] = [];
    if (isInstitutionManager && hasOperationalModules) {
      finansItems.push(
        { href: "/panel/finans", label: "Faturalar", icon: ReceiptText },
        { href: "/panel/hak-edis", label: "Hak Ediş", icon: Wallet },
        { href: "/panel/finans/giderler", label: "Personel Giderleri", icon: Banknote },
        { href: "/panel/finans/genel-giderler", label: "Genel Giderler", icon: Receipt },
        { href: "/panel/finans/raporlar", label: "Mali Raporlar", icon: BarChart3 }
      );
    }

    // Yerel sürümde destek/yardım/ayarlar sayfaları bulunmaz.
    const sistemItems: NavItem[] = [];

    const adminItems: NavItem[] = [];
    if (showAdminAccess) {
      adminItems.push({ href: "/panel/admin", label: "Yönetim Paneli", icon: ShieldCheck });
    }

    const groups: NavGroup[] = [];
    if (genelItems.length > 0) {
      groups.push({ id: "genel", label: "", items: genelItems });
    }

    // Kurum yöneticisi için yönetimsel gruplar (Kurum/Finans) eğitim akışının
    // önüne alınır; diğer roller için eğitim odaklı sıralama korunur.
    if (isInstitutionManager) {
      if (kurumItems.length > 0) {
        groups.push({ id: "kurumsal", label: "Kurum", items: kurumItems });
      }
      if (finansItems.length > 0) {
        groups.push({ id: "finans", label: "Finans", items: finansItems });
      }
      if (egitimItems.length > 0) {
        groups.push({ id: "eğitim", label: "Eğitim", items: egitimItems });
      }
    } else {
      if (egitimItems.length > 0) {
        groups.push({ id: "eğitim", label: "Eğitim", items: egitimItems });
      }
      if (finansItems.length > 0) {
        groups.push({ id: "finans", label: "Finans", items: finansItems });
      }
      if (kurumItems.length > 0) {
        groups.push({ id: "kurumsal", label: "Kurum", items: kurumItems });
      }
    }

    if (sistemItems.length > 0) {
      groups.push({ id: "sistem", label: "Destek", items: sistemItems });
    }

    if (adminItems.length > 0) {
      groups.push({ id: "admin", label: "Yönetici", items: adminItems });
    }

    return groups;
  }, [
    isInstitutionManager,
    isParent,
    canAccessStudents,
    canAccessBep,
    canAccessSessions,
    canAccessCalendar,
    canAccessForms,
    canAccessTools,
    canAccessFamilyPlans,
    canAccessAnalysis,
    canAccessZumreMeetings,
    userRole,
    canAccessCommunication,
    showAdminAccess,
    hasOperationalModules,
  ]);

  const quickActions = useMemo<QuickActionItem[]>(
    () => [
      ...(canAccessBep
        ? [
            {
              href: "/panel/bep",
              label: "BEP",
              description: "Planları açın, düzenleyin ve son kayıtları gözden geçirin.",
              icon: FilePenLine,
            },
          ]
        : []),
      ...(canAccessZumreMeetings
        ? [
            {
              href: "/panel/tutanaklar",
              label: "Tutanaklar",
              description: "Kurul ve zümre tutanakları taslağı oluşturun, PDF ve DOCX çıktı alın.",
              icon: ClipboardList,
            },
          ]
        : []),
      ...(canAccessFamilyPlans
        ? [
            {
              href: "/panel/aile-egitimi",
              label: "Aile Eğitimi",
              description: isParent
                ? "Öğretmenin paylastigi günlük, haftalık ve aylik yonlendirmeleri acin."
                : "Aileye paylasilan yonlendirmeleri ve takip planlarini yonetin.",
              icon: FileText,
            },
          ]
        : []),
      ...(canAccessStudents
        ? [
            {
              href: isParent ? "/panel/cocuklarim" : "/panel/ogrenciler",
              label: isParent ? "Çocuğum" : "Öğrenciler",
              description: "Öğrenci kayıtlarına hızlıca ulaşın.",
              icon: Users,
            },
          ]
        : []),
      ...(canAccessSessions
        ? [
            {
              href: "/panel/seans-programi",
              label: "Seanslar",
              description: "Seans planını ve haftalık akışı açın.",
              icon: CalendarDays,
            },
          ]
        : canAccessCalendar
          ? [
              {
                href: "/panel/takvim",
                label: "Takvim",
                description: "Kişisel ve günlük takvim akışını görüntüleyin.",
                icon: CalendarDays,
              },
            ]
          : []),
      ...(canAccessCommunication
        ? [
            {
              href: "/panel/iletisim",
              label: "İletişim",
              description: "Mesajları ve iletişim kayıtlarını yönetin.",
              icon: MessageSquare,
            },
          ]
        : []),
      ...(isInstitutionManager
        ? [
            {
              href: "/panel/raporlar",
              label: "Raporlar",
              description: "Kurumsal PDF çıktıları ve özet raporları açın.",
              icon: BarChart3,
            },
          ]
        : canAccessAnalysis
          ? [
              {
                href: "/panel/egitsel-analiz",
                label: "Analiz",
                description: "Analiz ve izleme ekranlarını açın.",
                icon: BarChart3,
              },
            ]
          : []),
      ...(canAccessForms
        ? [
            {
              href: "/panel/formlar",
              label: "Formlar",
              description: "Hazır form şablonlarını öğrenci bazlı kullanın.",
              icon: FileText,
            },
          ]
        : []),
      {
        href: "/panel/degerlendirmeler",
        label: "Değerlendirmeler",
        description: "Kaba ve öğretim sonu değerlendirmelerini tek merkezden açın.",
        icon: ClipboardList,
      },
      ...(canAccessTools
        ? [
            {
              href: "/panel/ozel-egitim-araclari",
              label: "Araçlar",
              description: "Özel eğitim araçlarını tek yerden açın.",
              icon: Sparkles,
            },
          ]
        : []),
      ...(showAdminAccess
        ? [
            {
              href: "/panel/admin",
              label: "Yönetim Paneli",
              description: "Platform yönetim ve denetim alanını açın.",
              icon: ShieldCheck,
            },
          ]
        : []),
    ],
    [
      canAccessAnalysis,
      canAccessBep,
      canAccessCalendar,
      canAccessCommunication,
      canAccessFamilyPlans,
      canAccessForms,
      canAccessSessions,
      canAccessStudents,
      canAccessTools,
      canAccessZumreMeetings,
      isInstitutionManager,
      isParent,
      showAdminAccess,
    ],
  );

  const roleLabel = isAdminRole(userRole)
    ? "Admin"
    : isInstitutionRole(userRole)
      ? "Kurum yöneticisi"
      : isParent
        ? "Veli"
        : "Öğretmen";

  const closeMobileNav = () => setIsMobileNavOpen(false);

  const renderSidebarContent = ({
    compactNav,
    mobile,
  }: {
    compactNav: boolean;
    mobile: boolean;
  }) => (
    <div className="flex h-full min-h-0 flex-col rounded-[16px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-2.5 shadow-[var(--panel-shadow)]">
      <div className="shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SpeciaLogoBadge
              size="md"
              variant="auto"
              frameTone="none"
              className="px-0 py-0"
              imageClassName={cn("h-auto", compactNav ? "w-[38px]" : "w-[86px]")}
            />
            <div className={cn("mt-1.5", compactNav ? "hidden" : "block")}>
              <div className="truncate text-[12px] font-semibold tracking-[-0.01em] text-[color:var(--panel-text)]">
                {userName}
              </div>
              <div className="text-[10px] text-white/72">{roleLabel}</div>
            </div>
          </div>

          {mobile ? (
            <button
              type="button"
              onClick={closeMobileNav}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
              aria-label="Menüyü kapat"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-1.5 min-h-0 flex-1 overflow-y-auto pr-1">
        <nav className="space-y-1 pb-1">
          {navGroups.map((group) => (
            <div
              key={group.id}
              className={cn(
                group.label &&
                  "border-t border-[color:var(--panel-border)] pt-1.5 first:border-t-0 first:pt-0",
              )}
            >
              {group.label && (
                <div className={cn(
                  "px-2.5 pb-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/70",
                  compactNav ? "hidden" : "block"
                )}>
                  {group.label}
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    compact={compactNav}
                    onNavigate={closeMobileNav}
                  />
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="mt-auto shrink-0 space-y-1 border-t border-[color:var(--panel-border)] pt-1.5">
        <SignOutButton />
      </div>
    </div>
  );

  return (
    <div className="panel-surface min-h-screen bg-[color:var(--panel-bg-canvas)]">
      <div className="mx-auto w-full max-w-none px-2 py-2 sm:px-3 sm:py-3 xl:px-4 2xl:px-5">
        <div
          className={cn(
            "grid min-h-[calc(100vh-1rem)] gap-3",
            isSidebarHidden
              ? "lg:grid-cols-[minmax(0,1fr)]"
              : "lg:grid-cols-[240px_minmax(0,1fr)]",
          )}
        >
          {isSidebarHidden ? null : (
            <aside className="hidden lg:block sticky top-3 h-[calc(100vh-1.5rem)]">
              {renderSidebarContent({ compactNav: false, mobile: false })}
            </aside>
          )}

          <div className="min-w-0 space-y-3">
            <header className="flex flex-col gap-2.5 rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3.5 py-2.5 shadow-[var(--panel-shadow)] sm:px-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsMobileNavOpen(true)}
                  className="inline-flex size-9 items-center justify-center rounded-xl border border-[color:var(--panel-border)] text-[color:var(--panel-text)] lg:hidden"
                  aria-label="Menüyü aç"
                >
                  <Menu className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarState({ pathname, hidden: !isSidebarHidden })}
                  className="hidden size-9 items-center justify-center rounded-xl border border-[color:var(--panel-border)] text-[color:var(--panel-text-muted)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)] lg:inline-flex"
                  aria-label={isSidebarHidden ? "Panel menüsünü göster" : "Panel menüsünü gizle"}
                  title={isSidebarHidden ? "Panel menüsünü göster" : "Panel menüsünü gizle"}
                >
                  {isSidebarHidden ? (
                    <PanelLeftOpen className="size-5" />
                  ) : (
                    <PanelLeftClose className="size-5" />
                  )}
                </button>
              </div>

              <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto">
                <ThemeToggle className="self-start sm:self-auto" />
                <SpotlightSearch items={quickActions} />
              </div>
            </header>

            <main className="min-w-0">{children}</main>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-[120] flex bg-black/70 backdrop-blur-sm transition lg:hidden",
          isMobileNavOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        <button
          type="button"
          aria-label="Menüyü kapat"
          className="absolute inset-0"
          onClick={closeMobileNav}
        />
        <div
          className={cn(
            "relative z-10 h-full w-[min(92vw,340px)] max-w-full p-2 transition",
            isMobileNavOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {renderSidebarContent({ compactNav: false, mobile: true })}
        </div>

      </div>
    </div>
  );
}
