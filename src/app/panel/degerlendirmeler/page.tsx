import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BookOpenCheck, ClipboardList, Activity } from "lucide-react";

import { PanelPageIntro } from "@/components/layout/panel-page-intro";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getCourseEvaluationsForUser } from "@/lib/data";
import { getEvaluationAccessWhere, isParentRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

const sections = [
  {
    href: "/panel/degerlendirmeler/kaba",
    title: "Kaba Değerlendirme",
    description:
      "Ders kazanımlarını öğrenci bazında değerlendirin, sonuçları düzenleyin ve PDF çıktısı alın.",
    icon: ClipboardList,
    isNew: false,
  },
  {
    href: "/panel/degerlendirmeler/ogretim-sonu",
    title: "Öğretim Sonu Değerlendirmeler",
    description:
      "ÖBT, Kontrol Listesi ve Beceri Analizi kayıtlarını yönetin; formları doldurun, güncelleyin ve PDF veya Word çıktısı alın.",
    icon: BookOpenCheck,
    isNew: false,
  },
  {
    href: "/panel/degerlendirmeler/davranis",
    title: "Davranış Değerlendirmesi",
    description:
      "Uygulamalı Davranış Analizi (UDA) temelli ABC modeli ile sınıf içi anlık veri toplayın, gün sonu analizleri yapın ve RAM uyumlu raporlar üretin.",
    icon: Activity,
    isNew: true,
  },
];

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

type ParentEvaluationItem = {
  id: string;
  href: string;
  title: string;
  studentName: string;
  date: Date | null;
  typeLabel: string;
};

function formatDate(value: Date | null) {
  return value ? dateFormatter.format(value) : "Tarih yok";
}

function getEvaluationHref(type: string, id: string) {
  if (type === "kontrol") {
    return `/panel/degerlendirmeler/kontrol-listesi/${id}`;
  }
  if (type === "beceri") {
    return `/panel/degerlendirmeler/beceri-analizi/${id}`;
  }
  return `/panel/degerlendirmeler/ogretim-sonu/${id}`;
}

function getEvaluationTypeLabel(type: string) {
  if (type === "obt") {
    return "ÖBT";
  }
  if (type === "kontrol") {
    return "Kontrol Listesi";
  }
  if (type === "beceri") {
    return "Beceri Analizi";
  }
  return "Değerlendirme";
}

function ParentEvaluationSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: ParentEvaluationItem[];
}) {
  return (
    <Card className="grid gap-4">
      <div className="flex items-center justify-between gap-4 border-b border-[color:var(--panel-border)] pb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-[var(--panel-radius-lg)] border border-[color:var(--panel-info-border)] bg-[color:var(--panel-info-bg)] text-[color:var(--panel-info-text)]">
            <Icon className="size-5" />
          </div>
          <h2 className="truncate text-lg font-semibold text-[color:var(--panel-text)]">
            {title}
          </h2>
        </div>
        <div className="shrink-0 rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--panel-text-muted)]">
          {items.length} kayıt
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] px-4 py-8 text-center text-sm text-[color:var(--panel-text-soft)]">
          Kayıt bulunmuyor.
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="group grid gap-3 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-3 transition hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-2 py-0.5 text-[11px] font-semibold text-[color:var(--panel-text-muted)]">
                    {item.typeLabel}
                  </span>
                  <span className="text-xs text-[color:var(--panel-text-soft)]">
                    {formatDate(item.date)}
                  </span>
                </div>
                <div className="mt-2 truncate text-sm font-semibold text-[color:var(--panel-text)]">
                  {item.title}
                </div>
                <div className="mt-1 truncate text-sm text-[color:var(--panel-text-muted)]">
                  {item.studentName}
                </div>
              </div>
              <span className="inline-flex min-h-8 w-full items-center justify-center rounded-lg bg-[color:var(--panel-bg-elevated)] px-2.5 py-1.5 text-[13px] font-semibold text-[color:var(--panel-text)] ring-1 ring-[color:var(--panel-border)] transition group-hover:bg-[color:var(--panel-bg-hover)] sm:w-auto">
                Görüntüle
              </span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}

export default async function EvaluationsHubPage() {
  const user = await requireUser();

  if (isParentRole(user.role)) {
    const [courseEvaluations, teachingEvaluations] = await Promise.all([
      getCourseEvaluationsForUser(user),
      prisma.evaluationDocument.findMany({
        where: getEvaluationAccessWhere(user),
        orderBy: { createdAt: "desc" },
        include: {
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const courseItems: ParentEvaluationItem[] = courseEvaluations.map((document) => ({
      id: document.id,
      href: `/panel/degerlendirmeler/kaba/${document.id}`,
      title: document.title,
      studentName: `${document.student.firstName} ${document.student.lastName}`,
      date: document.evaluationDate,
      typeLabel: "Kaba Değerlendirme",
    }));

    const teachingItems: ParentEvaluationItem[] = teachingEvaluations.map((document) => ({
      id: document.id,
      href: getEvaluationHref(document.type, document.id),
      title: document.title,
      studentName: `${document.student.firstName} ${document.student.lastName}`,
      date: document.evaluationDate,
      typeLabel: getEvaluationTypeLabel(document.type),
    }));

    return (
      <div className="grid gap-6">
        <PanelPageIntro
          eyebrow="Değerlendirmeler"
          title="Değerlendirmeler"
        />

        <div className="grid gap-4 xl:grid-cols-2">
          <ParentEvaluationSection
            title="Kaba Değerlendirmeler"
            icon={ClipboardList}
            items={courseItems}
          />
          <ParentEvaluationSection
            title="Öğretim Sonu Değerlendirmeler"
            icon={BookOpenCheck}
            items={teachingItems}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <PanelPageIntro
        eyebrow="Değerlendirmeler"
        title="Değerlendirme araçlarını tek merkezden yönetin"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;

          return (
            <Link key={section.href} href={section.href} className="group">
              <Card className="h-full transition group-hover:border-[color:var(--panel-border-strong)] group-hover:bg-[color:var(--panel-bg-hover)]">
                <Icon className="size-7 text-[color:var(--panel-text-soft)]" />
                <h2 className="mt-6 text-2xl font-semibold text-[color:var(--panel-text)] flex items-center gap-3">
                  <span>{section.title}</span>
                  {section.isNew && (
                    <Badge tone="success" className="text-[10px] font-bold py-0.5 px-2 rounded-full tracking-normal normal-case">
                      Yeni
                    </Badge>
                  )}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[color:var(--panel-text-muted)]">
                  {section.description}
                </p>
                <div className="mt-6 text-sm font-semibold text-[color:var(--panel-text)]">
                  Bölümü aç
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
