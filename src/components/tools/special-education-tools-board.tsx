"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain,
  ChevronRight,
  ClipboardList,
  Copy,
  Layers3,
  Sparkles,
  Target,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import type { SpecialEducationToolSlug } from "@/lib/special-education-tools-catalog";
import { getDocumentProgressSnapshot, type ToolStudent } from "@/lib/special-education-tools";

type Props = {
  students: ToolStudent[];
  initialStudentId?: string;
};

function formatStudentName(student: Pick<ToolStudent, "firstName" | "lastName"> | null) {
  if (!student) return "Öğrenci secilmedi";
  return `${student.firstName} ${student.lastName}`.trim();
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-3.5">
      <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">{label}</div>
      <div className="mt-1.5 text-2xl font-semibold text-[color:var(--panel-text)]">{value}</div>
    </div>
  );
}

function ToolLaunchCard({
  href,
  icon,
  title,
  description,
  meta,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  meta: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-5 text-left transition hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-3 text-[color:var(--panel-text)]">{icon}</div>
        <span className="text-xs uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">{meta}</span>
      </div>
      <div className="mt-5">
        <div className="text-xl font-semibold text-[color:var(--panel-text)]">{title}</div>
        <p className="mt-2 text-sm leading-7 text-[color:var(--panel-text-muted)]">{description}</p>
      </div>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-[color:var(--panel-text-soft)] transition group-hover:text-[color:var(--panel-text)]">
        Aracı aç
        <ChevronRight className="size-4 transition group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

export function SpecialEducationToolsBoard({ students, initialStudentId }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [studentId, setStudentId] = useState(initialStudentId ?? students[0]?.id ?? "");  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? students[0] ?? null,
    [studentId, students],
  );
  const selectedDocument = selectedStudent?.documents[0] ?? null;
  const progressSnapshot = getDocumentProgressSnapshot(selectedDocument);
  const activeReinforcerCount = (selectedStudent?.reinforcers ?? []).filter((item) => item.isActive).length;
  const activeSensoryCount = (selectedStudent?.sensoryMenuItems ?? []).filter((item) => item.isActive).length;

  const toolCards: Array<{
    slug: SpecialEducationToolSlug | "daily-data";
    icon: ReactNode;
    title: string;
    description: string;
    meta: string;
  }> = [
    {
      slug: "support-profile",
      icon: <Brain className="size-5" />,
      title: "Destek profili",
      description: "Güçlü yönleri, öncelikleri ve hedef odağını tek özet ekranda görün; PDF çıktısı alın.",
      meta: `${progressSnapshot.goalCount} hedef`,
    },
    {
      slug: "reinforcer-pool",
      icon: <Target className="size-5" />,
      title: "Pekiştireç havuzu",
      description: "Pekiştireçleri kaydedin, düzenleyin ve yazdırılabilir liste olarak çıktı alın.",
      meta: `${activeReinforcerCount} aktif`,
    },
    {
      slug: "sensory-menu",
      icon: <Layers3 className="size-5" />,
      title: "Duyusal menü",
      description: "Duyusal düzenleme kartlarını öğrenci bazlı yönetin; sınıfa asılabilir PDF üretin.",
      meta: `${activeSensoryCount} öge`,
    },
    {
      slug: "story-builder",
      icon: <Copy className="size-5" />,
      title: "Sosyal öykü",
      description: "Sosyal öykü ve görev analizi metinlerini hazırlayın, öğrenciyle kullanılacak PDF'i alın.",
      meta: "içerik hazırlama",
    },
    {
      slug: "abc-analysis",
      icon: <ClipboardList className="size-5" />,
      title: "ABC analizi",
      description: "Öncül, davranış ve sonuç örüntülerini kaydedin; özeti PDF olarak belgeleyin.",
      meta: "hızlı analiz",
    },
    {
      slug: "daily-data",
      icon: <Sparkles className="size-5" />,
      title: "Hızlı veri girişi",
      description: "Seans sırasında hedef bazlı günlük veriyi saniyeler içinde kaydedin.",
      meta: "günlük kayıt",
    },
  ];

  if (students.length === 0) {
    return <Card>Öğrenci bulunmuyor.</Card>;
  }

  return (
    <div className="grid gap-6">
      <Card variant="subtle" className="grid gap-5 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Field label="Öğrenci">
          <select
            className={inputClassName()}
            value={studentId}
            onChange={(event) => {
              const nextStudentId = event.target.value;
              setStudentId(nextStudentId);
              startTransition(() => {
                router.replace(`/panel/ozel-egitim-araclari?studentId=${nextStudentId}`, {
                  scroll: false,
                });
              });
            }}
          >
            {students.map((student) => (
              <option key={student.id} value={student.id}>
                {student.firstName} {student.lastName}
              </option>
            ))}
          </select>
        </Field>

        <div className="rounded-[14px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-4">
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">Seçili öğrenci</div>
          <div className="mt-2 text-xl font-semibold text-[color:var(--panel-text)]">
            {formatStudentName(selectedStudent)}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm text-[color:var(--panel-text-muted)]">
            <span className="rounded-full border border-[color:var(--panel-border)] px-3 py-1">
              {selectedStudent?.schoolName || "Okul bilgisi yok"}
            </span>
            <span className="rounded-full border border-[color:var(--panel-border)] px-3 py-1">
              {selectedStudent?.classroom || "Sınıf bilgisi yok"}
            </span>
            <span className="rounded-full border border-[color:var(--panel-border)] px-3 py-1">
              {selectedStudent?.diagnosis || "Tanı bilgisi yok"}
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric
          label="Aktif hedef"
          value={`${Math.max(0, progressSnapshot.goalCount - progressSnapshot.completedGoalCount)}`}
        />
        <Metric
          label="Ortalama ilerleme"
          value={`%${progressSnapshot.averageProgressPercent}`}
        />
        <Metric label="Pekiştireç" value={`${activeReinforcerCount}`} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {toolCards.map((tool) => (
          <ToolLaunchCard
            key={tool.slug}
            href={
              tool.slug === "daily-data"
                ? `/panel/hizli-veri-girisi?studentId=${selectedStudent?.id ?? ""}`
                : `/panel/ozel-egitim-araclari/${tool.slug}?studentId=${selectedStudent?.id ?? ""}`
            }
            icon={tool.icon}
            title={tool.title}
            description={tool.description}
            meta={tool.meta}
          />
        ))}
      </div>
    </div>
  );
}
