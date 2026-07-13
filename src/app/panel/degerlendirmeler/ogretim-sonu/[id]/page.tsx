import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getEvaluationAccessWhere, getDocumentAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ObtEditor } from "@/components/degerlendirmeler/obt-editor";

export const dynamic = "force-dynamic";

export default async function EvaluationDetailPage({
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
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!document) {
    notFound();
  }

  // If this is a checklist document, redirect to checklist editor
  if (document.type === "kontrol") {
    redirect(`/panel/degerlendirmeler/kontrol-listesi/${id}`);
  }

  // Beceri Analizi belgeleri kendi editörüne yönlendirilir.
  if (document.type === "beceri") {
    redirect(`/panel/degerlendirmeler/beceri-analizi/${id}`);
  }

  // Fetch Bep documents of the student for ÖBT integration
  const bepDocuments = await prisma.bepDocument.findMany({
    where: {
      studentId: document.studentId,
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

  // Serialize Document for the client component
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

  return (
    <ObtEditor
      document={serializedDoc}
      isParent={user.role === "parent"}
      bepDocuments={serializedBeps}
    />
  );
}
