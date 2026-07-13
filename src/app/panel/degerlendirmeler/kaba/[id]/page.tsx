import { notFound } from "next/navigation";

import { DeleteCourseEvaluationButton } from "@/components/evaluations/delete-course-evaluation-button";
import { CourseEvaluationEditor } from "@/components/evaluations/course-evaluation-editor";
import { Card } from "@/components/ui/card";
import { listCourseEvaluationCourses } from "@/lib/course-evaluation-catalog";
import { getCourseEvaluationById } from "@/lib/data";
import { canCreateBep } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function CourseEvaluationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const document = await getCourseEvaluationById(user, id);

  if (!document) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      <Card>
        <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              {document.courseName}
            </div>
            <h1 className="mt-2 text-3xl font-semibold text-[color:var(--panel-text)]">{document.title}</h1>
            <p className="mt-2 text-sm text-[color:var(--panel-text-muted)]">
              Ogrenci: {document.student.firstName} {document.student.lastName}
            </p>
            <p className="mt-2 text-sm text-[color:var(--panel-text-soft)]">
              Hazirlayan: {document.owner.name ?? document.owner.email}
            </p>
          </div>

          <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-4 text-sm text-[color:var(--panel-text-muted)]">
            <div>Toplam satir: {document.rows.length}</div>
            <div className="mt-2">Degerlendiren: {document.evaluatorName || "-"}</div>
            <div className="mt-4">
              <DeleteCourseEvaluationButton
                documentId={document.id}
                title={document.title}
                className="w-full"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
          <iframe
            title="Kaba değerlendirme PDF onizleme"
            src={`/api/pdf/kaba-degerlendirme-formu/${document.id}`}
            className="h-[720px] w-full bg-black"
          />
        </div>
      </Card>

      {canCreateBep(user.role) ? (
        <CourseEvaluationEditor
          defaultValues={document.formValues}
          studentName={`${document.student.firstName} ${document.student.lastName}`}
          studentSchoolName={document.student.schoolName}
          documentId={document.id}
          courseOptions={listCourseEvaluationCourses()}
        />
      ) : null}
    </div>
  );
}
