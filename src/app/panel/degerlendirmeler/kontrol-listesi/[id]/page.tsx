import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getEvaluationAccessWhere, getDocumentAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { ChecklistEditor } from "@/components/degerlendirmeler/checklist-editor";

export const dynamic = "force-dynamic";

export default async function ChecklistDetailPage({
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

  // If this is an OBT document, redirect to OBT editor
  if (document.type === "obt") {
    redirect(`/panel/degerlendirmeler/ogretim-sonu/${id}`);
  }

  // Fetch Bep documents of the student for Checklist integration
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
    <ChecklistEditor
      document={serializedDoc}
      isParent={user.role === "parent"}
      bepDocuments={serializedBeps}
    />
  );
}
