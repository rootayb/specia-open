import { notFound, redirect } from "next/navigation";

import { requireUser } from "@/lib/session";
import { getEvaluationAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { BeceriAnaliziEditor } from "@/components/degerlendirmeler/beceri-analizi-editor";
import { getActiveSkillTemplates } from "@/lib/skill-templates";

export const dynamic = "force-dynamic";

export default async function SkillAnalysisDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const document = await prisma.evaluationDocument.findFirst({
    where: {
      id,
      ...getEvaluationAccessWhere(user),
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolName: true,
          schoolNumber: true,
        },
      },
    },
  });

  if (!document) {
    notFound();
  }

  // Diğer türler kendi editörlerine yönlendirilir.
  if (document.type === "kontrol") {
    redirect(`/panel/degerlendirmeler/kontrol-listesi/${id}`);
  }
  if (document.type !== "beceri") {
    redirect(`/panel/degerlendirmeler/ogretim-sonu/${id}`);
  }

  const serializedDoc = {
    id: document.id,
    studentId: document.studentId,
    title: document.title,
    type: document.type,
    kazanim: document.kazanim,
    evaluationType: document.evaluationType,
    evaluationDate: document.evaluationDate ? document.evaluationDate.toISOString() : null,
    evaluatorName: document.evaluatorName,
    data: document.data,
    student: document.student,
  };

  const skillTemplates = user.role === "parent" ? [] : await getActiveSkillTemplates();

  return (
    <BeceriAnaliziEditor
      document={serializedDoc}
      isParent={user.role === "parent"}
      templates={skillTemplates}
    />
  );
}
