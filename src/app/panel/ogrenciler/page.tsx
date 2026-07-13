import Link from "next/link";
import { ArrowRight, ChevronDown, X, FileText } from "lucide-react";

import { PanelPageIntro } from "@/components/layout/panel-page-intro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { inputClassName } from "@/components/ui/field";
import { getStudentFilterOptionsForUser, getStudentsForUser } from "@/lib/data";
import { canManageInstitutionRecords, isAdminRole, isParentRole } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { StudentList } from "@/components/students/student-list";

type StudentSearchParams = {
  q?: string;
  school?: string;
  classroom?: string;
  ownerId?: string;
  parentLink?: string;
  bepStatus?: string;
  enrollmentType?: string;
  status?: string;
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams?: Promise<StudentSearchParams>;
}) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const filters = {
    query: params.q,
    schoolName: params.school,
    classroom: params.classroom,
    ownerId: params.ownerId,
    parentLink:
      params.parentLink === "linked" || params.parentLink === "unlinked"
        ? params.parentLink
        : undefined,
    bepStatus:
      params.bepStatus === "none" ||
      params.bepStatus === "draft" ||
      params.bepStatus === "pending" ||
      params.bepStatus === "completed"
        ? params.bepStatus
        : undefined,
    enrollmentType:
      params.enrollmentType === "regular" || params.enrollmentType === "periodic"
        ? params.enrollmentType
        : undefined,
    status:
      params.status === "archived" || params.status === "all"
        ? params.status
        : "active",
  } as const;
  const [students, allStudents] = await Promise.all([
    getStudentsForUser(user, filters),
    getStudentFilterOptionsForUser(user),
  ]);
  const schoolOptions = Array.from(
    new Set(allStudents.map((student) => student.schoolName).filter(Boolean)),
  ).sort((left, right) => left!.localeCompare(right!, "tr"));
  const classroomOptions = Array.from(
    new Set(allStudents.map((student) => student.classroom).filter(Boolean)),
  ).sort((left, right) => left!.localeCompare(right!, "tr"));
  const ownerOptions = Array.from(
    new Map(allStudents.map((student) => [student.owner.id, student.owner])).values(),
  ).sort((left, right) =>
    (left.name ?? left.email).localeCompare(right.name ?? right.email, "tr"),
  );
  const activeFilterCount = Object.values(params).filter(Boolean).length;

  const bepStatusLabels: Record<string, string> = {
    none: "BEP kaydı yok",
    draft: "Taslak BEP",
    pending: "Onay bekleyen BEP",
    completed: "Tamamlanan BEP",
  };
  const enrollmentTypeLabels: Record<string, string> = {
    regular: "Düzenli öğrenciler",
    periodic: "Dönemsel öğrenciler",
  };
  const parentLinkLabels: Record<string, string> = {
    linked: "Velisi bağlı",
    unlinked: "Velisi bağlı değil",
  };
  const statusLabels: Record<string, string> = {
    archived: "Pasif öğrenciler",
    all: "Tüm durumlar",
  };

  function buildHrefWithout(key: keyof StudentSearchParams) {
    const next = new URLSearchParams();
    for (const [paramKey, value] of Object.entries(params)) {
      if (paramKey !== key && value) {
        next.set(paramKey, value);
      }
    }
    const query = next.toString();
    return query ? `/panel/ogrenciler?${query}` : "/panel/ogrenciler";
  }

  function buildHrefWithStatus(status: "active" | "archived" | "all") {
    const next = new URLSearchParams();
    for (const [paramKey, value] of Object.entries(params)) {
      if (paramKey !== "status" && value) {
        next.set(paramKey, value);
      }
    }
    if (status !== "active") {
      next.set("status", status);
    }
    const query = next.toString();
    return query ? `/panel/ogrenciler?${query}` : "/panel/ogrenciler";
  }

  const activeChips: Array<{ key: keyof StudentSearchParams; label: string }> = [];
  if (params.q) activeChips.push({ key: "q", label: `Arama: "${params.q}"` });
  if (params.school) activeChips.push({ key: "school", label: `Okul: ${params.school}` });
  if (params.classroom) activeChips.push({ key: "classroom", label: `Sınıf: ${params.classroom}` });
  if (params.ownerId) {
    const owner = ownerOptions.find((option) => option.id === params.ownerId);
    activeChips.push({ key: "ownerId", label: `Öğretmen: ${owner?.name ?? owner?.email ?? params.ownerId}` });
  }
  if (params.parentLink && parentLinkLabels[params.parentLink]) {
    activeChips.push({ key: "parentLink", label: parentLinkLabels[params.parentLink] });
  }
  if (params.bepStatus && bepStatusLabels[params.bepStatus]) {
    activeChips.push({ key: "bepStatus", label: bepStatusLabels[params.bepStatus] });
  }
  if (params.enrollmentType && enrollmentTypeLabels[params.enrollmentType]) {
    activeChips.push({ key: "enrollmentType", label: enrollmentTypeLabels[params.enrollmentType] });
  }
  if (params.status && statusLabels[params.status]) {
    activeChips.push({ key: "status", label: statusLabels[params.status] });
  }

  const hasAdvancedFilters = Boolean(
    params.school || params.classroom || params.ownerId || params.parentLink || params.bepStatus || params.enrollmentType,
  );

  return (
    <div className="grid gap-6">
      <PanelPageIntro
        eyebrow="Öğrenciler"
        title="Öğrenci akışını daha rahat tarayın"
        actions={
          !isParentRole(user.role) ? (
            <>
              <Link href="/panel/ogrenciler/yeni">
                <Button>Yeni Öğrenci</Button>
              </Link>
              <Link href="/panel/ogrenciler/toplu">
                <Button variant="ghost">Toplu Ekle</Button>
              </Link>
              <Link href={`/api/pdf/students?status=${filters.status}`} target="_blank">
                <Button variant="outline">
                  <FileText className="mr-2 size-4" />
                  {filters.status === "archived"
                    ? "PDF (Pasif)"
                    : filters.status === "all"
                      ? "PDF (Tümü)"
                      : "PDF (Aktif)"}
                </Button>
              </Link>
            </>
          ) : undefined
        }
        aside={
          <div className="grid h-full gap-4">
            <StatCard
              label="Özet"
              value={students.length}
              meta={activeFilterCount > 0 ? `${allStudents.length} kayıttan eşleşen` : "görünebilir öğrenci"}
            />
            {/* Removed bulk operation text block */}
          </div>
        }
      />

      <Card className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { value: "active", label: "Aktif öğrenciler" },
              { value: "archived", label: "Pasif öğrenciler" },
              { value: "all", label: "Tümü" },
            ] as const
          ).map((option) => (
            <Link key={option.value} href={buildHrefWithStatus(option.value)}>
              <Button
                type="button"
                size="sm"
                variant={filters.status === option.value ? "secondary" : "ghost"}
              >
                {option.label}
              </Button>
            </Link>
          ))}
        </div>

        <form action="/panel/ogrenciler" className="grid gap-4">
          <input type="hidden" name="status" value={filters.status} />
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={`${inputClassName()} sm:flex-1`}
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Ad, soyad veya okul numarası ara"
            />
            <Button type="submit">Filtrele</Button>
          </div>

          <details className="group" open={hasAdvancedFilters}>
            <summary className="flex w-fit cursor-pointer select-none list-none items-center gap-1.5 text-sm font-medium text-[color:var(--panel-text-muted)] transition hover:text-[color:var(--panel-text)]">
              <ChevronDown className="size-4 shrink-0 transition group-open:rotate-180" />
              Gelişmiş filtreler
            </summary>

            <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <select className={inputClassName()} name="school" defaultValue={params.school ?? ""}>
                <option value="">Tüm okullar</option>
                {schoolOptions.map((school) => (
                  <option key={school} value={school!}>{school}</option>
                ))}
              </select>
              <select className={inputClassName()} name="classroom" defaultValue={params.classroom ?? ""}>
                <option value="">Tüm sınıflar</option>
                {classroomOptions.map((classroom) => (
                  <option key={classroom} value={classroom!}>{classroom}</option>
                ))}
              </select>
              <select className={inputClassName()} name="ownerId" defaultValue={params.ownerId ?? ""}>
                <option value="">Tüm sorumlu öğretmenler</option>
                {ownerOptions.map((owner) => (
                  <option key={owner.id} value={owner.id}>{owner.name ?? owner.email}</option>
                ))}
              </select>
              <select className={inputClassName()} name="parentLink" defaultValue={params.parentLink ?? ""}>
                <option value="">Tüm veli bağlantıları</option>
                <option value="linked">Velisi bağlı</option>
                <option value="unlinked">Velisi bağlı değil</option>
              </select>
              <select className={inputClassName()} name="bepStatus" defaultValue={params.bepStatus ?? ""}>
                <option value="">Tüm BEP durumları</option>
                <option value="none">BEP kaydı yok</option>
                <option value="draft">Taslak BEP</option>
                <option value="pending">Onay bekleyen BEP</option>
                <option value="completed">Tamamlanan BEP</option>
              </select>
              <select
                className={inputClassName()}
                name="enrollmentType"
                defaultValue={params.enrollmentType ?? ""}
              >
                <option value="">Tüm kayıt tipleri</option>
                <option value="regular">Düzenli öğrenciler</option>
                <option value="periodic">Dönemsel öğrenciler</option>
              </select>
            </div>
          </details>
        </form>

        {activeChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 border-t border-[color:var(--panel-border)] pt-4">
            {activeChips.map((chip) => (
              <Link
                key={chip.key}
                href={buildHrefWithout(chip.key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3 py-1 text-xs font-medium text-[color:var(--panel-text-muted)] transition hover:border-[color:var(--panel-border-strong)] hover:text-[color:var(--panel-text)]"
              >
                {chip.label}
                <X className="size-3" />
              </Link>
            ))}
            <Link
              href="/panel/ogrenciler"
              className="text-xs font-medium text-[color:var(--panel-text-soft)] underline-offset-2 transition hover:text-[color:var(--panel-text)] hover:underline"
            >
              Tümünü temizle
            </Link>
          </div>
        ) : null}
      </Card>

      <Card>
        {students.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[color:var(--panel-border)] px-4 py-10 text-sm text-[color:var(--panel-text-soft)]">
            {activeFilterCount > 0
              ? "Seçili filtrelerle eşleşen öğrenci bulunamadı."
              : "Henüz öğrenci kaydı oluşturulmadı."}
          </div>
        ) : (
          <StudentList students={students} />
        )}
      </Card>
    </div>
  );
}
