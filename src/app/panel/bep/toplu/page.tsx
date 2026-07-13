import { BulkBepCreateBoard } from "@/components/bep/bulk-bep-create-board";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { listCurriculumCourses } from "@/lib/curriculum";
import { canCreateBep } from "@/lib/permissions";
import { getStudentOptionsForUser } from "@/lib/data";
import { requireUser } from "@/lib/session";

export default async function BulkBepPage() {
  const user = await requireUser();

  if (!canCreateBep(user.role)) {
    return (
      <Card>
        <SectionHeading
          eyebrow="Erişim"
          title="Toplu BEP olusturma kullanilamiyor"
          description="Bu hesapta sadece size acik BEP kayitlarini goruntuleyebilirsiniz."
        />
      </Card>
    );
  }

  const students = await getStudentOptionsForUser(user);

  return (
    <BulkBepCreateBoard
      curriculumOptions={listCurriculumCourses()}
      students={students.map((student) => ({
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
        schoolName: student.schoolName,
        classroom: student.classroom,
        documentCount: student.documentCount,
      }))}
    />
  );
}
