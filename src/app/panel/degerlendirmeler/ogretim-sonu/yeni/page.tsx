import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getStudentById, getStudentOptionsForUser } from "@/lib/data";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { YeniDegerlendirmeForm } from "@/components/degerlendirmeler/yeni-degerlendirme-form";

import { getDocumentAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getActiveSkillTemplates } from "@/lib/skill-templates";

export const dynamic = "force-dynamic";

export default async function NewEvaluationPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireUser();

  if (user.role === "parent") {
    redirect("/panel/degerlendirmeler/ogretim-sonu");
  }

  const { studentId } = await searchParams;

  if (!studentId) {
    const students = await getStudentOptionsForUser(user);

    return (
      <div className="grid gap-6">
        <Card padding="lg">
          <SectionHeading
            eyebrow="Yeni Değerlendirme"
            title="Önce Öğrenciyi Seçin"
            description="Değerlendirme formunu doldurmaya başlamak için listeden bir öğrenci seçin."
          />
        </Card>

        {students.length === 0 ? (
          <Card variant="subtle" padding="lg">
            <div className="space-y-4">
              <p className="text-sm text-[color:var(--panel-text-muted)]">
                Henüz kayıtlı öğrencisiniz bulunmuyor. Önce öğrenci kaydı oluşturmanız gerekmektedir.
              </p>
              <Link href="/panel/ogrenciler/yeni">
                <Button>Yeni Öğrenci Ekle</Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card padding="none" className="overflow-hidden">
            <div className="grid gap-px bg-[color:var(--panel-border)]">
              {students.map((student) => (
                <Link
                  key={student.id}
                  href={`/panel/degerlendirmeler/ogretim-sonu/yeni?studentId=${student.id}`}
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
                  <div className="text-sm text-[color:var(--panel-text-soft)] flex items-center">
                    Sınıf: {student.classroom || "-"}
                  </div>
                  <div className="text-sm font-medium text-indigo-400 flex items-center md:justify-end">
                    Değerlendirme Oluştur
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

  // Fetch Bep documents of the student for Checklist/OBT integration
  const bepDocuments = await prisma.bepDocument.findMany({
    where: {
      studentId: student.id,
      ...getDocumentAccessWhere(user),
    },
    include: {
      planRows: {
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  const serializedBeps = bepDocuments.map((bep) => ({
    id: bep.id,
    title: bep.title,
    planRows: bep.planRows.map((row) => ({
      id: row.id,
      courseName: row.courseName,
      learningArea: row.learningArea,
      learningOutcome: row.learningOutcome,
      processComponents: row.processComponents,
      criterion: row.criterion,
    })),
  }));

  const skillTemplates = await getActiveSkillTemplates();

  // Format student object to match form requirements
  const formattedStudent = {
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    schoolName: student.schoolName,
    classroom: student.classroom,
    schoolNumber: student.schoolNumber,
  };

  return (
    <div className="grid gap-6">
      <Card variant="subtle" padding="lg">
        <SectionHeading
          eyebrow="Yeni Değerlendirme"
          title={`${student.firstName} ${student.lastName}`}
        />
      </Card>

      <YeniDegerlendirmeForm
        student={formattedStudent}
        bepDocuments={serializedBeps}
        defaultEvaluatorName={user.name ?? ""}
        skillTemplates={skillTemplates}
      />
    </div>
  );
}
