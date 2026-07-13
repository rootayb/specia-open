import Link from "next/link";

import { DeleteCourseEvaluationButton } from "@/components/evaluations/delete-course-evaluation-button";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { inputClassName } from "@/components/ui/field";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCourseEvaluationsForUser } from "@/lib/data";
import { canCreateBep } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

function formatDate(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(value);
}

export default async function CourseEvaluationPage({
  searchParams,
}: {
  searchParams?: Promise<{ studentId?: string }>;
}) {
  const user = await requireUser();

  const canManage = canCreateBep(user.role);

  const params = (await searchParams) ?? {};
  const documents = await getCourseEvaluationsForUser(user);

  const selectedStudentId = params.studentId || "all";
  const studentOptions = Array.from(
    new Map(documents.map((document) => [document.student.id, document.student])).values(),
  ).sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr"),
  );
  const filteredDocuments =
    selectedStudentId === "all"
      ? documents
      : documents.filter((document) => document.student.id === selectedStudentId);
  const groupedDocuments = studentOptions
    .map((student) => ({
      student,
      documents: filteredDocuments.filter((document) => document.student.id === student.id),
    }))
    .filter((group) => group.documents.length > 0);
  const selectedStudent = studentOptions.find((student) => student.id === selectedStudentId);
  const totalRows = filteredDocuments.reduce((sum, document) => sum + document.rows.length, 0);

  return (
    <div className="grid gap-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeading
            eyebrow="Değerlendirme"
            title="Kaba değerlendirme"
          />
          {canManage ? (
            <Link href="/panel/degerlendirmeler/kaba/yeni">
              <Button>Yeni değerlendirme</Button>
            </Link>
          ) : null}
        </div>

        <form
          action="/panel/degerlendirmeler/kaba"
          className="mt-6 grid gap-3 rounded-3xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4 md:grid-cols-[minmax(240px,1fr)_auto_auto]"
        >
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
              Öğrenci filtresi
            </span>
            <select name="studentId" defaultValue={selectedStudentId} className={inputClassName()}>
              <option value="all">Tüm öğrenciler</option>
              {studentOptions.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.firstName} {student.lastName}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" className="w-full md:w-auto">
              Filtrele
            </Button>
          </div>
          <div className="flex items-end">
            <Link href="/panel/degerlendirmeler/kaba" className="w-full md:w-auto">
              <Button variant="ghost" className="w-full md:w-auto" disabled={selectedStudentId === "all"}>
                Temizle
              </Button>
            </Link>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-4">
          <div className="text-sm text-[color:var(--panel-text-soft)]">Gösterilen belge</div>
          <div className="mt-2 text-2xl font-semibold text-white">{filteredDocuments.length}</div>
          <div className="mt-1 text-xs text-[color:var(--panel-text-soft)]">
            {selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}` : "Tüm öğrenciler"}
          </div>
        </div>
        <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-4">
          <div className="text-sm text-[color:var(--panel-text-soft)]">Toplam satır</div>
          <div className="mt-2 text-2xl font-semibold text-white">{totalRows}</div>
          <div className="mt-1 text-xs text-[color:var(--panel-text-soft)]">Filtre sonucundaki değerlendirme satırları</div>
        </div>
      </div>

      {documents.length === 0 ? (
        <Card>
          <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] px-5 py-12 text-sm text-[color:var(--panel-text-soft)]">
            Henüz kaba değerlendirme kaydı yok. Yeni belge oluşturup değerlendirme tablosunu
            otomatik doldurabilirsiniz.
          </div>
        </Card>
      ) : groupedDocuments.length === 0 ? (
        <Card>
          <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] px-5 py-12 text-sm text-[color:var(--panel-text-soft)]">
            Seçili öğrenci için kaba değerlendirme kaydı bulunmuyor.
          </div>
        </Card>
      ) : (
        <div className="grid gap-5">
          {groupedDocuments.map((group) => (
            <Card key={group.student.id}>
              <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[color:var(--panel-border)] pb-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Öğrenci
                  </div>
                  <h2 className="mt-2 text-xl font-semibold text-white">
                    {group.student.firstName} {group.student.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--panel-text-soft)]">Okul: {group.student.schoolName || "-"}</p>
                </div>
                <div className="rounded-full border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3 py-1.5 text-sm font-semibold text-[color:var(--panel-text-muted)]">
                  {group.documents.length} değerlendirme
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                {group.documents.map((document) => {
                  return (
                    <div
                      key={document.id}
                      className="grid gap-4 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4 lg:grid-cols-[minmax(0,1fr)_260px]"
                    >
                      <div className="min-w-0 space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                          {document.courseName}
                        </div>
                        <h3 className="text-lg font-semibold text-white">{document.title}</h3>
                        <p className="text-sm text-[color:var(--panel-text-soft)]">
                          Değerlendirme tarihi: {formatDate(document.evaluationDate)}
                        </p>
                        <p className="text-sm text-[color:var(--panel-text-soft)]">
                          Hazırlayan: {document.owner.name ?? document.owner.email}
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                        <Link href={`/panel/degerlendirmeler/kaba/${document.id}`}>
                          <Button className="w-full">Aç ve düzenle</Button>
                        </Link>
                        <a
                          href={`/api/pdf/kaba-degerlendirme-formu/${document.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex w-full items-center justify-center rounded-[var(--panel-radius-lg)] bg-[color:var(--panel-bg-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--panel-text)] ring-1 ring-[color:var(--panel-border)] transition hover:bg-[color:var(--panel-bg-hover)]"
                        >
                          Çıktıyı aç
                        </a>
                        {canManage ? (
                          <DeleteCourseEvaluationButton
                            documentId={document.id}
                            title={document.title}
                            className="w-full"
                          />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
