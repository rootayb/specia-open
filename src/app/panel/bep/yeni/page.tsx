import { notFound } from "next/navigation";
import Link from "next/link";

import { BepEditor } from "@/components/bep/bep-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { getLatestCommitteeTemplate, getStudentById, getStudentOptionsForUser } from "@/lib/data";
import { emptyBepValues } from "@/lib/defaults";
import { listCurriculumCourses } from "@/lib/curriculum";
import { requireUser } from "@/lib/session";

export default async function NewBepPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireUser();
  const { studentId } = await searchParams;

  if (!studentId) {
    const students = await getStudentOptionsForUser(user);

    return (
      <div className="grid gap-6">
        <Card padding="lg">
          <SectionHeading
            eyebrow="Yeni BEP"
            title="Önce öğrenciyi seçin"
            description="Öğrenciyi seçtikten sonra yeni doküman tuvali doğrudan açılır. Büyük kartlar yerine daha hızlı taranan bir liste kullanılır."
          />
        </Card>

        {students.length === 0 ? (
          <Card variant="subtle" padding="lg">
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--panel-text-muted)]">
                Henüz öğrenci kaydı yok. Önce öğrenci oluşturmanız gerekiyor.
              </p>
              <Link href="/panel/ogrenciler/yeni">
                <Button>Yeni Öğrenci Oluştur</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="grid gap-px bg-[color:var(--panel-border)]">
              {students.map((student) => (
                <Link
                  key={student.id}
                  href={`/panel/bep/yeni?studentId=${student.id}`}
                  className="grid gap-3 bg-[color:var(--panel-bg-base)] px-5 py-4 transition hover:bg-[color:var(--panel-bg-hover)] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_180px]"
                >
                  <div className="min-w-0">
                    <div className="text-lg font-semibold text-[color:var(--panel-text)]">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="mt-1 text-sm text-[color:var(--panel-text-soft)]">
                      {student.schoolName || "Okul belirtilmedi"}
                    </div>
                  </div>
                  <div className="text-sm text-[color:var(--panel-text-soft)]">
                    Sınıf: {student.classroom || "-"}
                  </div>
                  <div className="text-sm font-medium text-[color:var(--panel-text-soft)] md:text-right">
                    BEP oluştur
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  const student = await getStudentById(user, studentId);
  if (!student) {
    notFound();
  }

  const committeeTemplate = (await getLatestCommitteeTemplate(user)).map((member, index) => ({
    sortOrder: index,
    role: member.role,
    title: member.title ?? "",
    fullName: member.fullName ?? "",
    branch: member.branch ?? "",
  }));

  return (
    <div className="grid gap-6">
      <Card variant="subtle" padding="lg">
        <SectionHeading
          eyebrow="Yeni BEP"
          title={`${student.firstName} ${student.lastName}`}
          description="Yeni plan doğrudan geniş çalışma alanında açılır. Belge meta bilgileri, hedefler ve kararlar tek akışta düzenlenir."
        />
      </Card>
      <BepEditor
        defaultValues={emptyBepValues(student.id, committeeTemplate)}
        studentName={`${student.firstName} ${student.lastName}`}
        curriculumOptions={listCurriculumCourses()}
      />
    </div>
  );
}
