import { requireUser } from "@/lib/session";
import { getEvaluationAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { DegerlendirmelerList } from "@/components/degerlendirmeler/degerlendirmeler-list";

export const dynamic = "force-dynamic";

export default async function DegerlendirmelerPage() {
  const user = await requireUser();
  const where = getEvaluationAccessWhere(user);

  const documents = await prisma.evaluationDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          schoolName: true,
          schoolNumber: true,
        },
      },
      owner: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  // Map Date objects to string safely for the client component prop
  const serializedDocs = documents.map((doc) => ({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    evaluationDate: doc.evaluationDate ? doc.evaluationDate.toISOString() : null,
  }));

  return (
    <div className="grid gap-6">
      <Card variant="subtle" padding="lg">
        <SectionHeading
          eyebrow="Yönetim"
          title="Öğretim Sonu Değerlendirmeler"
        />
      </Card>

      <DegerlendirmelerList documents={serializedDocs} userRole={user.role} />
    </div>
  );
}
