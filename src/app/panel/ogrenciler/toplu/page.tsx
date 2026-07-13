import { BulkStudentImportBoard } from "@/components/students/bulk-student-import-board";
import { isParentRole } from "@/lib/permissions";
import { requireUser } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

export default async function BulkStudentsPage() {
  const user = await requireUser();

  if (isParentRole(user.role)) {
    return (
      <Card>
        <SectionHeading
          eyebrow="Erişim"
          title="Toplu öğrenci ekleme kullanilamiyor"
          description="Veli hesaplari sadece kendisine bağlı öğrenci kayitlarini goruntuleyebilir."
        />
      </Card>
    );
  }

  return <BulkStudentImportBoard />;
}
