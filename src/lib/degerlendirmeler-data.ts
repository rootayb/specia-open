import type { Prisma } from "@/lib/prisma-shim";

import { prisma } from "@/lib/prisma";

export async function getEvaluationDocuments(options?: {
  studentId?: string;
  type?: string;
  institutionId?: string;
}) {
  const where: Prisma.EvaluationDocumentWhereInput = {};
  if (options?.studentId) where.studentId = options.studentId;
  if (options?.type) where.type = options.type;
  if (options?.institutionId) where.institutionId = options.institutionId;

  return prisma.evaluationDocument.findMany({
    where,
    orderBy: { createdAt: "desc" },
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
}

export async function getEvaluationDocumentById(id: string) {
  return prisma.evaluationDocument.findUnique({
    where: { id },
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
}
