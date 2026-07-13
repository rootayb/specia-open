"use server";

import { revalidatePath } from "next/cache";

import { assertTrustedActionOrigin } from "@/lib/action-security";
import { writeAuditLog } from "@/lib/audit";
import { getReadableDbError } from "@/lib/db-errors";
import {
  canAccessSpecialEducationTools,
  getDocumentAccessWhere,
  getStudentAccessWhere,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import {
  dailyQuickEntrySchema,
  deleteDailyQuickEntrySchema,
  type DailyQuickEntryInput,
} from "@/lib/schemas";
import { requireUser } from "@/lib/session";

type ActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return getReadableDbError(error);
}

function parseDateTime(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function requireDailyQuickEntryUser() {
  await assertTrustedActionOrigin();

  const user = await requireUser();
  if (!canAccessSpecialEducationTools(user.role)) {
    throw new Error("Bu hesap günlük hızlı veri girişi yapamaz.");
  }

  return user;
}

function revalidateDailyQuickEntryPaths(studentId: string) {
  revalidatePath("/panel");
  revalidatePath(`/panel/ogrenciler/${studentId}`);
  revalidatePath("/panel/egitsel-analiz");
}

export async function saveDailyQuickEntryAction(input: DailyQuickEntryInput): Promise<ActionResult> {
  try {
    const user = await requireDailyQuickEntryUser();
    const parsed = dailyQuickEntrySchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Hızlı veri girişi formu dogrulanamadi.",
      };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parsed.data.studentId,
        ...getStudentAccessWhere(user),
      },
      select: { id: true, firstName: true, lastName: true, institutionId: true },
    });

    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    const measuredAt = parseDateTime(parsed.data.measuredAt);
    if (!measuredAt) {
      return { success: false, message: "Gecerli bir olcum tarihi girin." };
    }

    const planRow = await prisma.bepPlanRow.findFirst({
      where: {
        id: parsed.data.planRowId,
        documentId: parsed.data.documentId,
        document: {
          ...getDocumentAccessWhere(user),
          studentId: student.id,
        },
      },
      select: { id: true, document: { select: { id: true, institutionId: true } } },
    });

    if (!planRow) {
      return { success: false, message: "Hedef bulunamadı veya erişim yetkiniz yok." };
    }

    const payload = {
      value: parsed.data.value,
      phase: parsed.data.phase,
      note: parsed.data.note?.trim() || null,
      measuredAt,
    };

    if (parsed.data.id) {
      const existing = await prisma.dailyQuickEntry.findFirst({
        where: { id: parsed.data.id, planRowId: planRow.id },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "Veri kaydı bulunamadı." };
      }

      const entry = await prisma.$transaction(async (tx) => {
        const e = await tx.dailyQuickEntry.update({
          where: { id: existing.id },
          data: payload,
        });

        const progressEntry = await tx.bepGoalProgressEntry.findUnique({
          where: { dailyQuickEntryId: e.id },
        });

        const progressData = {
          status: payload.value === 100 ? "completed" : "in_progress",
          phase: payload.phase,
          progressPercent: payload.value,
          note: payload.note,
          measuredAt: payload.measuredAt,
        } as const;

        if (progressEntry) {
          await tx.bepGoalProgressEntry.update({
            where: { id: progressEntry.id },
            data: progressData,
          });
        } else {
          await tx.bepGoalProgressEntry.create({
            data: {
              studentId: student.id,
              documentId: planRow.document.id,
              planRowId: planRow.id,
              institutionId: planRow.document.institutionId ?? student.institutionId ?? null,
              createdById: user.id,
              dailyQuickEntryId: e.id,
              ...progressData,
            },
          });
        }

        return e;
      });

      await writeAuditLog({
        actorId: user.id,
        action: "daily_quick_entry.updated",
        entityType: "dailyQuickEntry",
        entityId: entry.id,
        summary: `${student.firstName} ${student.lastName} için hızlı veri girişi guncellendi.`,
        metadata: { studentId: student.id, documentId: planRow.document.id, planRowId: planRow.id },
      });

      revalidateDailyQuickEntryPaths(student.id);
      return { success: true, message: "Hızlı veri girişi guncellendi.", id: entry.id };
    }

    const entry = await prisma.$transaction(async (tx) => {
      const e = await tx.dailyQuickEntry.create({
        data: {
          studentId: student.id,
          documentId: planRow.document.id,
          planRowId: planRow.id,
          institutionId: planRow.document.institutionId ?? student.institutionId ?? null,
          createdById: user.id,
          ...payload,
        },
      });

      await tx.bepGoalProgressEntry.create({
        data: {
          studentId: student.id,
          documentId: planRow.document.id,
          planRowId: planRow.id,
          institutionId: planRow.document.institutionId ?? student.institutionId ?? null,
          createdById: user.id,
          status: payload.value === 100 ? "completed" : "in_progress",
          phase: payload.phase,
          progressPercent: payload.value,
          note: payload.note,
          measuredAt: payload.measuredAt,
          dailyQuickEntryId: e.id,
        },
      });

      return e;
    });

    await writeAuditLog({
      actorId: user.id,
      action: "daily_quick_entry.created",
      entityType: "dailyQuickEntry",
      entityId: entry.id,
      summary: `${student.firstName} ${student.lastName} için hızlı veri girişi olusturuldu.`,
      metadata: { studentId: student.id, documentId: planRow.document.id, planRowId: planRow.id },
    });

    revalidateDailyQuickEntryPaths(student.id);
    return { success: true, message: "Hızlı veri girişi olusturuldu.", id: entry.id };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error) };
  }
}

export async function deleteDailyQuickEntryAction(input: { id: string }): Promise<ActionResult> {
  try {
    const user = await requireDailyQuickEntryUser();
    const parsed = deleteDailyQuickEntrySchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Veri kaydı seçimi geçersiz." };
    }

    const entry = await prisma.dailyQuickEntry.findFirst({
      where: {
        id: parsed.data.id,
        student: getStudentAccessWhere(user),
      },
      include: {
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (!entry) {
      return { success: false, message: "Veri kaydı bulunamadı." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.bepGoalProgressEntry.deleteMany({
        where: { dailyQuickEntryId: entry.id },
      });

      await tx.dailyQuickEntry.delete({
        where: { id: entry.id },
      });
    });

    await writeAuditLog({
      actorId: user.id,
      action: "daily_quick_entry.deleted",
      entityType: "dailyQuickEntry",
      entityId: entry.id,
      summary: `${entry.student.firstName} ${entry.student.lastName} için hızlı veri girişi silindi.`,
      metadata: { studentId: entry.student.id },
    });

    revalidateDailyQuickEntryPaths(entry.student.id);
    return { success: true, message: "Hızlı veri girişi silindi.", id: entry.id };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error) };
  }
}
