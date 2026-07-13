import { StudentForm } from "@/components/students/student-form";
import { PanelPageIntro } from "@/components/layout/panel-page-intro";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { emptyStudentValues } from "@/lib/defaults";
import { isParentRole } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function NewStudentPage() {
  const user = await requireUser();

  if (isParentRole(user.role)) {
    return (
      <Card>
        <SectionHeading
          eyebrow="Erişim"
          title="Yeni öğrenci oluşturulamaz"
          description="Veli hesapları sadece bağlı olduğu öğrencileri görüntüleyebilir."
        />
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      <PanelPageIntro eyebrow="Öğrenciler" title="Yeni öğrenci oluştur" />
      <StudentForm defaultValues={emptyStudentValues()} />
    </div>
  );
}
