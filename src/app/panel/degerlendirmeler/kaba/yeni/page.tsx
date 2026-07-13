import Link from "next/link";
import { notFound } from "next/navigation";

import { CourseEvaluationEditor } from "@/components/evaluations/course-evaluation-editor";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { emptyCourseEvaluationValues } from "@/lib/course-evaluation";
import { listCourseEvaluationCourses } from "@/lib/course-evaluation-catalog";
import { getStudentById, getStudentOptionsForUser } from "@/lib/data";
import { canCreateBep } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function NewCourseEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireUser();

  if (!canCreateBep(user.role)) {
    return (
      <Card>
        <SectionHeading eyebrow="Erişim" title="Bu modüle erişiminiz yok." />
      </Card>
    );
  }

  const { studentId } = await searchParams;

  if (!studentId) {
    const students = await getStudentOptionsForUser(user);

    return (
      <div className="grid gap-6">
        <Card>
          <SectionHeading
            eyebrow="Kaba Değerlendirme"
            title="Yeni kaba değerlendirme başlat"
            description="Önce bir öğrenci seçin. Sonraki ekranda ders seçip değerlendirme tablosunu otomatik oluşturacaksınız."
          />
        </Card>

        {students.length === 0 ? (
          <Card>
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--panel-text-muted)]">
                Henüz öğrenci kaydı yok. Önce öğrenci oluşturmanız gerekiyor.
              </p>
              <Link href="/panel/ogrenciler/yeni">
                <Button>Yeni öğrenci oluştur</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/panel/degerlendirmeler/kaba/yeni?studentId=${student.id}`}
                className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-5 transition hover:border-[color:var(--panel-border-strong)] hover:bg-[color:var(--panel-bg-hover)]"
              >
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Öğrenci
                  </div>
                  <div className="text-xl font-semibold text-[color:var(--panel-text)]">
                    {student.firstName} {student.lastName}
                  </div>
                  <div className="text-sm text-[color:var(--panel-text-soft)]">
                    {student.schoolName || "Okul belirtilmedi"} · Sınıf: {student.classroom || "-"}
                  </div>
                  <div className="pt-3 text-sm font-medium text-[color:var(--panel-text-muted)]">
                    Bu öğrenci için değerlendirme oluştur
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const student = await getStudentById(user, studentId);
  if (!student) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <Card>
        <SectionHeading
          eyebrow="Kaba Değerlendirme"
          title="Yeni kaba değerlendirme"
          description={`Öğrenci: ${student.firstName} ${student.lastName}`}
        />
      </Card>

      <CourseEvaluationEditor
        defaultValues={emptyCourseEvaluationValues(student.id, user.name ?? user.email)}
        studentName={`${student.firstName} ${student.lastName}`}
        studentSchoolName={student.schoolName}
        courseOptions={listCourseEvaluationCourses()}
      />
    </div>
  );
}
