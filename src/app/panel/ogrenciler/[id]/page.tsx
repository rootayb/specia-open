import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";

import { StudentStatusButton } from "@/components/students/student-status-button";
import { StudentForm } from "@/components/students/student-form";
import { StudentTimeline } from "@/components/students/student-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { ExpandableList } from "@/components/ui/expandable-list";
import { getStudentById } from "@/lib/data";
import {
  canAccessFamilyEducation,
  canCreateBep,
  canManageInstitutionRecords,
  isParentRole,
} from "@/lib/permissions";
import { requireUser } from "@/lib/session";

const bepStatusLabels: Record<string, string> = {
  draft: "Taslak",
  completed: "Tamamlandı",
};

const cadenceLabels: Record<"daily" | "weekly" | "monthly", string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
};

const familyPlanStatusLabels: Record<string, string> = {
  draft: "Taslak",
  shared: "Paylaşıldı",
  applied: "Uygulandı",
  not_applied: "Uygulanmadı",
  review_due: "Takip Bekliyor",
  completed: "Tamamlandı",
};

function formatDate(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
}

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  
  // Yerel sürüm: öğrenci devir (transfer) mantığı kaldırıldı.
  const student = await getStudentById(user, id);

  if (!student) {
    notFound();
  }

  const canManageParentExperience = !isParentRole(user.role);
  const canOpenFamilyEducation = canAccessFamilyEducation(user.role);
  const canOpenParentMessaging =
    canManageParentExperience && (Boolean(user.institutionId) || canManageInstitutionRecords(user.role));

  const allEvaluations = [
    ...student.courseEvaluations.map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      typeLabel: "Kaba Değerlendirme",
      href: `/panel/degerlendirmeler/kaba/${doc.id}`,
    })),
    ...student.evaluationDocuments.map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt,
      typeLabel: doc.type === "kontrol" ? "Kontrol Listesi" : "Öğretim Sonu Değ. (ÖBT)",
      href: doc.type === "kontrol"
        ? `/panel/degerlendirmeler/kontrol-listesi/${doc.id}`
        : `/panel/degerlendirmeler/ogretim-sonu/${doc.id}`,
    })),
  ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-[color:var(--panel-text)]">
              {student.firstName} {student.lastName}
            </h1>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone={student.isActive ? "success" : "warning"}>
                {student.isActive ? "Aktif" : "Pasif"}
              </Badge>
              <Badge tone="neutral">
                {student.enrollmentType === "periodic" ? "Dönemsel öğrenci" : "Düzenli öğrenci"}
              </Badge>
            </div>
            <p className="mt-2 text-sm text-[color:var(--panel-text-muted)]">
              Öğrenci profilini yönetin, koordinasyon geçmişini izleyin ve aynı ekrandan yeni BEP
              başlatın.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/api/pdf/student/${student.id}`} target="_blank">
              <Button variant="outline">
                <FileText className="size-4 mr-2" />
                PDF
              </Button>
            </Link>
            {canCreateBep(user.role) ? (
              <Link href={`/panel/bep/yeni?studentId=${student.id}`}>
                <Button>Bu öğrenci için BEP oluştur</Button>
              </Link>
            ) : null}
            {!isParentRole(user.role) ? (
              <StudentStatusButton
                studentId={student.id}
                studentName={`${student.firstName} ${student.lastName}`}
                isActive={student.isActive}
              />
            ) : null}
          </div>
        </div>
      </Card>

      {canManageParentExperience ? (
        <Card>
          <SectionHeading
            eyebrow="Veliye Açık Akış"
            title="Veli tarafında görünen içerikleri yönetin"
            description="Çocuğum ve aile eğitimi alanında veliye açılan belge, form ve yönlendirmeleri bu öğrenci üzerinden takip edin."
            action={
              <div className="flex flex-wrap gap-2">
                {canOpenParentMessaging ? (
                  <Link href="/panel/iletisim">
                    <Button size="sm">Veliyle İletişimi Aç</Button>
                  </Link>
                ) : null}
                {canOpenFamilyEducation ? (
                  <Link href={`/panel/aile-egitimi?studentId=${student.id}`}>
                    <Button variant="secondary" size="sm">
                      Aile Eğitimi Yönet
                    </Button>
                  </Link>
                ) : null}
                {canManageInstitutionRecords(user.role) ? (
                  <Link href="/panel/veli-eslestirme">
                    <Button variant="ghost" size="sm">
                      Eşleştirmeleri Aç
                    </Button>
                  </Link>
                ) : null}
              </div>
            }
          />

          <div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-5">
            <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-4">
              <div className="text-sm text-[color:var(--panel-text-soft)]">Bağlı veli</div>
              <div className="mt-2 text-2xl font-semibold text-[color:var(--panel-text)]">
                {student.parentStudentLinks.length}
              </div>
            </div>
            <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-4">
              <div className="text-sm text-[color:var(--panel-text-soft)]">BEP</div>
              <div className="mt-2 text-2xl font-semibold text-[color:var(--panel-text)]">
                {student.documents.length}
              </div>
            </div>
            <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-4">
              <div className="text-sm text-[color:var(--panel-text-soft)]">Dosya</div>
              <div className="mt-2 text-2xl font-semibold text-[color:var(--panel-text)]">
                {student.studentFiles.length}
              </div>
            </div>
            <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-4">
              <div className="text-sm text-[color:var(--panel-text-soft)]">Değerlendirme</div>
              <div className="mt-2 text-2xl font-semibold text-[color:var(--panel-text)]">
                {student.courseEvaluations.length + student.evaluationDocuments.length}
              </div>
            </div>
            <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-4">
              <div className="text-sm text-[color:var(--panel-text-soft)]">Aile eğitimi</div>
              <div className="mt-2 text-2xl font-semibold text-[color:var(--panel-text)]">
                {student.familyEducationPlans.length}
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <SectionHeading
            eyebrow="Öğrenci Akışı"
            title="Zaman çizgisi"
            description="Belge, toplantı, iletişim ve seans hareketlerini tek akışta izleyin."
          />
          <Link href="/panel">
            <Button variant="ghost">Genel akışa git</Button>
          </Link>
        </div>
        <div className="mt-6">
          <StudentTimeline items={student.timeline} />
        </div>
      </Card>

      <div className="grid gap-6 2xl:grid-cols-2">
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">BEP kayıtları</h2>
            <Link href={`/panel/bep?studentId=${student.id}`}>
              <Button variant="ghost" size="sm">
                Tümünü aç
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <ExpandableList
              emptyMessage={<div className="text-sm text-neutral-500">Henüz kayıtlı BEP yok.</div>}
            >
              {student.documents.map((document) => (
                <Link
                  key={document.id}
                  href={`/panel/bep/${document.id}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/20 block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{document.title}</div>
                      <div className="mt-1 text-sm text-neutral-500">
                        {formatDate(document.updatedAt)}
                      </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                      {bepStatusLabels[document.status] ?? document.status}
                    </div>
                  </div>
                </Link>
              ))}
            </ExpandableList>
          </div>
        </Card>

        <Card>
          <h2 className="text-xl font-semibold text-white">Bağlı veliler</h2>
          <div className="mt-4">
            <ExpandableList
              emptyMessage={<div className="text-sm text-neutral-500">Bu öğrenciye bağlı veli hesabı yok.</div>}
            >
              {student.parentStudentLinks.map((link) => (
                <div
                  key={link.id}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4"
                >
                  <div className="font-semibold text-white">{link.parent.name}</div>
                  <div className="text-sm text-neutral-500">{link.parent.email}</div>
                </div>
              ))}
            </ExpandableList>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Belge kayıtları</h2>
            <Link href="/panel/belgeler">
              <Button variant="ghost" size="sm">
                Belge merkezine git
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <ExpandableList
              emptyMessage={<div className="text-sm text-neutral-500">Bu öğrenci için henüz belge kaydı yok.</div>}
            >
              {student.studentFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/api/student-files/${file.id}`}
                  target="_blank"
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/20 block"
                >
                  <div className="font-semibold text-white">{file.title}</div>
                  <div className="text-sm text-neutral-500">
                    {file.fileName ?? "Dosya adı belirtilmedi"}
                  </div>
                </Link>
              ))}
            </ExpandableList>
          </div>
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Değerlendirme ve formlar</h2>
            <Link href="/panel/degerlendirmeler">
              <Button variant="ghost" size="sm">
                Değerlendirmelere git
              </Button>
            </Link>
          </div>
          <div className="mt-4">
            <ExpandableList
              emptyMessage={<div className="text-sm text-neutral-500">Bu öğrenci için kayıtlı değerlendirme formu yok.</div>}
            >
              {allEvaluations.map((document) => (
                <Link
                  key={document.id}
                  href={document.href}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/20 block"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{document.title}</div>
                      <div className="mt-1 text-sm text-[color:var(--panel-text-muted)]">
                        Son güncelleme: {formatDate(document.updatedAt)}
                      </div>
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-neutral-300 shrink-0">
                      {document.typeLabel}
                    </span>
                  </div>
                </Link>
              ))}
            </ExpandableList>
          </div>
        </Card>

        <Card className="2xl:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-white">Aile eğitimi planları</h2>
            {canOpenFamilyEducation ? (
              <Link href={`/panel/aile-egitimi?studentId=${student.id}`}>
                <Button variant="ghost" size="sm">
                  Aile eğitimini yönet
                </Button>
              </Link>
            ) : null}
          </div>
          <div className="mt-4">
            <ExpandableList
              emptyMessage={<div className="text-sm text-neutral-500">Bu öğrenci için yayınlanmış aile eğitimi planı yok.</div>}
            >
              {student.familyEducationPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/panel/aile-egitimi?studentId=${student.id}`}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 transition hover:border-white/20 block"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{plan.title}</div>
                      <div className="mt-1 text-sm text-neutral-500">
                        Paylaşım: {formatDate(plan.sharedAt || plan.updatedAt)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                      <span>{cadenceLabels[plan.cadence as keyof typeof cadenceLabels]}</span>
                      <span>{familyPlanStatusLabels[plan.status] ?? plan.status}</span>
                    </div>
                  </div>
                  {(plan.followUpDate || plan.dueDate) && (
                    <div className="mt-3 text-sm text-neutral-500">
                      Takip: {formatDate(plan.followUpDate || plan.dueDate)}
                    </div>
                  )}
                </Link>
              ))}
            </ExpandableList>
          </div>
        </Card>
      </div>

      {!isParentRole(user.role) ? <StudentForm defaultValues={student.formValues} /> : null}
    </div>
  );
}
