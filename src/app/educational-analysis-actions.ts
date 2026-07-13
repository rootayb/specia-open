"use server";

import { revalidatePath } from "next/cache";

import { writeAuditLog } from "@/lib/audit";
import {
  canAccessEducationalAnalysis,
  getDocumentAccessWhere,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  bepGoalProgressEntrySchema,
  deleteBepGoalProgressEntrySchema,
  type BepGoalProgressEntryInput,
  type DeleteBepGoalProgressEntryInput,
} from "@/lib/schemas";
import { requireUser } from "@/lib/session";
import { parseDate } from "@/lib/utils";

type ActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

async function requireTeacherAnalysisUser() {
  const user = await requireUser();

  if (!canAccessEducationalAnalysis(user.role, user.allowedModules)) {
    return null;
  }

  return user;
}

export async function saveBepGoalProgressEntryAction(
  input: BepGoalProgressEntryInput,
): Promise<ActionResult> {
  try {
    const user = await requireTeacherAnalysisUser();
    if (!user) {
      return {
        success: false,
        message: "Bu modul yalnızca egitsel analiz yetkisi olan kullanıcılar icindir.",
      };
    }

    const parsed = bepGoalProgressEntrySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Ilerleme formu dogrulanamadi.",
      };
    }

    const measuredAt = parseDate(parsed.data.measuredAt);
    if (!measuredAt) {
      return { success: false, message: "Izleme tarihi geçersiz." };
    }

    const planRow = await prisma.bepPlanRow.findFirst({
      where: {
        id: parsed.data.planRowId,
        documentId: parsed.data.documentId,
        document: {
          ...getDocumentAccessWhere(user),
          studentId: parsed.data.studentId,
        },
      },
      select: {
        id: true,
        courseName: true,
        learningArea: true,
        learningOutcome: true,
        document: {
          select: {
            id: true,
            title: true,
            studentId: true,
            institutionId: true,
            student: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!planRow) {
      return { success: false, message: "Ilerleme kaydı için BEP amaçı bulunamadı." };
    }

    const payload = {
      status: parsed.data.status,
      phase: parsed.data.phase,
      progressPercent: parsed.data.progressPercent,
      note: parsed.data.note?.trim() || null,
      nextStep: parsed.data.nextStep?.trim() || null,
      measuredAt,
    };

    if (parsed.data.id) {
      const existing = await prisma.bepGoalProgressEntry.findFirst({
        where: {
          id: parsed.data.id,
          planRow: {
            id: planRow.id,
            document: getDocumentAccessWhere(user),
          },
        },
        select: {
          id: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Duzenlenecek ilerleme kaydı bulunamadı." };
      }

      const progressEntry = await prisma.bepGoalProgressEntry.update({
        where: { id: existing.id },
        data: payload,
        select: {
          id: true,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "bep_goal_progress.updated",
        entityType: "bepGoalProgressEntry",
        entityId: progressEntry.id,
        summary: `${planRow.document.student.firstName} ${planRow.document.student.lastName} için amaç ilerleme kaydı guncellendi.`,
        metadata: {
          documentId: planRow.document.id,
          planRowId: planRow.id,
          studentId: planRow.document.studentId,
          status: parsed.data.status,
          progressPercent: parsed.data.progressPercent,
        },
      });

      revalidatePath("/panel/egitsel-analiz");
      return {
        success: true,
        message: "Ilerleme kaydı guncellendi.",
        id: progressEntry.id,
      };
    }

    const progressEntry = await prisma.bepGoalProgressEntry.create({
      data: {
        documentId: planRow.document.id,
        planRowId: planRow.id,
        studentId: planRow.document.studentId,
        institutionId: planRow.document.institutionId ?? user.institutionId ?? null,
        createdById: user.id,
        ...payload,
      },
      select: {
        id: true,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "bep_goal_progress.created",
      entityType: "bepGoalProgressEntry",
      entityId: progressEntry.id,
      summary: `${planRow.document.student.firstName} ${planRow.document.student.lastName} için yeni amaç ilerleme kaydı olusturuldu.`,
      metadata: {
        documentId: planRow.document.id,
        planRowId: planRow.id,
        studentId: planRow.document.studentId,
        status: parsed.data.status,
        progressPercent: parsed.data.progressPercent,
      },
    });

    revalidatePath("/panel/egitsel-analiz");
    return {
      success: true,
      message: "Ilerleme kaydı olusturuldu.",
      id: progressEntry.id,
    };
  } catch {
    return {
      success: false,
      message: "Ilerleme kaydı islenirken bir hata olustu.",
    };
  }
}

export async function deleteBepGoalProgressEntryAction(
  input: DeleteBepGoalProgressEntryInput,
): Promise<ActionResult> {
  try {
    const user = await requireTeacherAnalysisUser();
    if (!user) {
      return {
        success: false,
        message: "Bu modul yalnızca egitsel analiz yetkisi olan kullanıcılar icindir.",
      };
    }

    const parsed = deleteBepGoalProgressEntrySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Silme isteği geçersiz.",
      };
    }

    const existing = await prisma.bepGoalProgressEntry.findFirst({
      where: {
        id: parsed.data.id,
        planRow: {
          document: getDocumentAccessWhere(user),
        },
      },
      select: {
        id: true,
        studentId: true,
        planRowId: true,
        documentId: true,
        planRow: {
          select: {
            courseName: true,
            learningArea: true,
          },
        },
      },
    });

    if (!existing) {
      return { success: false, message: "Silinecek ilerleme kaydı bulunamadı." };
    }

    await prisma.bepGoalProgressEntry.delete({
      where: {
        id: existing.id,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "bep_goal_progress.deleted",
      entityType: "bepGoalProgressEntry",
      entityId: existing.id,
      summary: `${existing.planRow.courseName} / ${existing.planRow.learningArea} amaci icin ilerleme kaydi silindi.`,
      metadata: {
        documentId: existing.documentId,
        planRowId: existing.planRowId,
        studentId: existing.studentId,
      },
    });

    revalidatePath("/panel/egitsel-analiz");
    return {
      success: true,
      message: "Ilerleme kaydı silindi.",
      id: existing.id,
    };
  } catch {
    return {
      success: false,
      message: "Ilerleme kaydı silinirken bir hata olustu.",
    };
  }
}
