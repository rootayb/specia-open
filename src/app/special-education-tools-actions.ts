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
  deleteSensoryRegulationMenuItemSchema,
  deleteSpecialEducationDailyDataEntrySchema,
  deleteSpecialEducationReinforcerSchema,
  sensoryRegulationMenuItemSchema,
  specialEducationDailyDataEntrySchema,
  specialEducationReinforcerSchema,
  type SensoryRegulationMenuItemInput,
  type SpecialEducationDailyDataEntryInput,
  type SpecialEducationReinforcerInput,
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

async function requireSpecialEducationUser() {
  await assertTrustedActionOrigin();

  const user = await requireUser();
  if (!canAccessSpecialEducationTools(user.role)) {
    throw new Error("Bu hesap özel eğitim araclarini yonetemez.");
  }

  return user;
}

async function getAccessibleStudent(user: Awaited<ReturnType<typeof requireUser>>, studentId: string) {
  return prisma.student.findFirst({
    where: {
      id: studentId,
      ...getStudentAccessWhere(user),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      institutionId: true,
    },
  });
}

async function getAccessibleDocument(
  user: Awaited<ReturnType<typeof requireUser>>,
  documentId?: string | null,
) {
  if (!documentId?.trim()) {
    return null;
  }

  return prisma.bepDocument.findFirst({
    where: {
      id: documentId,
      ...getDocumentAccessWhere(user),
    },
    select: {
      id: true,
      studentId: true,
    },
  });
}

function revalidateSpecialEducationPaths(studentId: string) {
  revalidatePath("/panel/ozel-egitim-araclari");
  revalidatePath(`/panel/ogrenciler/${studentId}`);
  revalidatePath("/panel/egitsel-analiz");
}

export async function saveSpecialEducationReinforcerAction(
  input: SpecialEducationReinforcerInput,
): Promise<ActionResult> {
  try {
    const user = await requireSpecialEducationUser();
    const parsed = specialEducationReinforcerSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Pekiştireç formu dogrulanamadi.",
      };
    }

    const student = await getAccessibleStudent(user, parsed.data.studentId);
    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    if (parsed.data.id) {
      const existing = await prisma.specialEducationReinforcer.findFirst({
        where: {
          id: parsed.data.id,
          student: getStudentAccessWhere(user),
        },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "Pekiştireç kaydı bulunamadı." };
      }

      const reinforcer = await prisma.specialEducationReinforcer.update({
        where: { id: existing.id },
        data: {
          title: parsed.data.title.trim(),
          category: parsed.data.category.trim(),
          useCase: parsed.data.useCase?.trim() || null,
          deliveryType: parsed.data.deliveryType?.trim() || null,
          notes: parsed.data.notes?.trim() || null,
          strengthLevel: parsed.data.strengthLevel,
          isActive: parsed.data.isActive,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "special_education_reinforcer.updated",
        entityType: "specialEducationReinforcer",
        entityId: reinforcer.id,
        summary: `${student.firstName} ${student.lastName} için pekiştireç havuzu guncellendi.`,
        metadata: { studentId: student.id, institutionId: student.institutionId },
      });

      revalidateSpecialEducationPaths(student.id);
      return { success: true, message: "Pekiştireç kaydı guncellendi.", id: reinforcer.id };
    }

    const reinforcer = await prisma.specialEducationReinforcer.create({
      data: {
        studentId: student.id,
        createdById: user.id,
        title: parsed.data.title.trim(),
        category: parsed.data.category.trim(),
        useCase: parsed.data.useCase?.trim() || null,
        deliveryType: parsed.data.deliveryType?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        strengthLevel: parsed.data.strengthLevel,
        isActive: parsed.data.isActive,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "special_education_reinforcer.created",
      entityType: "specialEducationReinforcer",
      entityId: reinforcer.id,
      summary: `${student.firstName} ${student.lastName} için yeni pekiştireç eklendi.`,
      metadata: { studentId: student.id, institutionId: student.institutionId },
    });

    revalidateSpecialEducationPaths(student.id);
    return { success: true, message: "Pekiştireç kaydı olusturuldu.", id: reinforcer.id };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error) };
  }
}

export async function deleteSpecialEducationReinforcerAction(input: { id: string }): Promise<ActionResult> {
  try {
    const user = await requireSpecialEducationUser();
    const parsed = deleteSpecialEducationReinforcerSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Pekiştireç seçimi geçersiz." };
    }

    const reinforcer = await prisma.specialEducationReinforcer.findFirst({
      where: {
        id: parsed.data.id,
        student: getStudentAccessWhere(user),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            institutionId: true,
          },
        },
      },
    });

    if (!reinforcer) {
      return { success: false, message: "Pekiştireç kaydı bulunamadı." };
    }

    await prisma.specialEducationReinforcer.delete({
      where: { id: reinforcer.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "special_education_reinforcer.deleted",
      entityType: "specialEducationReinforcer",
      entityId: reinforcer.id,
      summary: `${reinforcer.student.firstName} ${reinforcer.student.lastName} için pekiştireç silindi.`,
      metadata: { studentId: reinforcer.student.id, institutionId: reinforcer.student.institutionId },
    });

    revalidateSpecialEducationPaths(reinforcer.student.id);
    return { success: true, message: "Pekiştireç kaydı silindi.", id: reinforcer.id };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error) };
  }
}

export async function saveSensoryRegulationMenuItemAction(
  input: SensoryRegulationMenuItemInput,
): Promise<ActionResult> {
  try {
    const user = await requireSpecialEducationUser();
    const parsed = sensoryRegulationMenuItemSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Duyusal menu formu dogrulanamadi.",
      };
    }

    const student = await getAccessibleStudent(user, parsed.data.studentId);
    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    if (parsed.data.id) {
      const existing = await prisma.sensoryRegulationMenuItem.findFirst({
        where: {
          id: parsed.data.id,
          student: getStudentAccessWhere(user),
        },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "Menu ogesi bulunamadı." };
      }

      const item = await prisma.sensoryRegulationMenuItem.update({
        where: { id: existing.id },
        data: {
          title: parsed.data.title.trim(),
          category: parsed.data.category.trim(),
          useWhen: parsed.data.useWhen?.trim() || null,
          durationLabel: parsed.data.durationLabel?.trim() || null,
          materials: parsed.data.materials?.trim() || null,
          notes: parsed.data.notes?.trim() || null,
          sortOrder: parsed.data.sortOrder,
          isActive: parsed.data.isActive,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "sensory_regulation_menu.updated",
        entityType: "sensoryRegulationMenuItem",
        entityId: item.id,
        summary: `${student.firstName} ${student.lastName} için duyusal menu guncellendi.`,
        metadata: { studentId: student.id, institutionId: student.institutionId },
      });

      revalidateSpecialEducationPaths(student.id);
      return { success: true, message: "Duyusal menu ogesi guncellendi.", id: item.id };
    }

    const item = await prisma.sensoryRegulationMenuItem.create({
      data: {
        studentId: student.id,
        createdById: user.id,
        title: parsed.data.title.trim(),
        category: parsed.data.category.trim(),
        useWhen: parsed.data.useWhen?.trim() || null,
        durationLabel: parsed.data.durationLabel?.trim() || null,
        materials: parsed.data.materials?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
        sortOrder: parsed.data.sortOrder,
        isActive: parsed.data.isActive,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "sensory_regulation_menu.created",
      entityType: "sensoryRegulationMenuItem",
      entityId: item.id,
      summary: `${student.firstName} ${student.lastName} için duyusal menu ogesi eklendi.`,
      metadata: { studentId: student.id, institutionId: student.institutionId },
    });

    revalidateSpecialEducationPaths(student.id);
    return { success: true, message: "Duyusal menu ogesi olusturuldu.", id: item.id };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error) };
  }
}

export async function deleteSensoryRegulationMenuItemAction(input: { id: string }): Promise<ActionResult> {
  try {
    const user = await requireSpecialEducationUser();
    const parsed = deleteSensoryRegulationMenuItemSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Menu seçimi geçersiz." };
    }

    const item = await prisma.sensoryRegulationMenuItem.findFirst({
      where: {
        id: parsed.data.id,
        student: getStudentAccessWhere(user),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            institutionId: true,
          },
        },
      },
    });

    if (!item) {
      return { success: false, message: "Menu ogesi bulunamadı." };
    }

    await prisma.sensoryRegulationMenuItem.delete({
      where: { id: item.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "sensory_regulation_menu.deleted",
      entityType: "sensoryRegulationMenuItem",
      entityId: item.id,
      summary: `${item.student.firstName} ${item.student.lastName} için duyusal menu ogesi silindi.`,
      metadata: { studentId: item.student.id, institutionId: item.student.institutionId },
    });

    revalidateSpecialEducationPaths(item.student.id);
    return { success: true, message: "Duyusal menu ogesi silindi.", id: item.id };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error) };
  }
}

export async function saveSpecialEducationDailyDataEntryAction(
  input: SpecialEducationDailyDataEntryInput,
): Promise<ActionResult> {
  try {
    const user = await requireSpecialEducationUser();
    const parsed = specialEducationDailyDataEntrySchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Günlük veri formu dogrulanamadi.",
      };
    }

    const student = await getAccessibleStudent(user, parsed.data.studentId);
    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    const measuredAt = parseDateTime(parsed.data.measuredAt);
    if (!measuredAt) {
      return { success: false, message: "Gecerli bir olcum tarihi girin." };
    }

    const document = await getAccessibleDocument(user, parsed.data.documentId);
    if (parsed.data.documentId?.trim() && (!document || document.studentId !== student.id)) {
      return { success: false, message: "Referans BEP seçimi geçersiz." };
    }

    const payload = {
      documentId: document?.id ?? null,
      measuredAt,
      sessionLabel: parsed.data.sessionLabel?.trim() || null,
      skillArea: parsed.data.skillArea.trim(),
      target: parsed.data.target.trim(),
      metricType: parsed.data.metricType.trim(),
      metricValue:
        typeof parsed.data.metricValue === "number" && Number.isFinite(parsed.data.metricValue)
          ? parsed.data.metricValue
          : null,
      setting: parsed.data.setting?.trim() || null,
      note: parsed.data.note?.trim() || null,
      outcome: parsed.data.outcome?.trim() || null,
    };

    if (parsed.data.id) {
      const existing = await prisma.specialEducationDailyDataEntry.findFirst({
        where: {
          id: parsed.data.id,
          student: getStudentAccessWhere(user),
        },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "Veri kaydı bulunamadı." };
      }

      const entry = await prisma.specialEducationDailyDataEntry.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "special_education_daily_data.updated",
        entityType: "specialEducationDailyDataEntry",
        entityId: entry.id,
        summary: `${student.firstName} ${student.lastName} için günlük veri kaydı guncellendi.`,
        metadata: { studentId: student.id, institutionId: student.institutionId, documentId: document?.id ?? null },
      });

      revalidateSpecialEducationPaths(student.id);
      return { success: true, message: "Günlük veri kaydı guncellendi.", id: entry.id };
    }

    const entry = await prisma.specialEducationDailyDataEntry.create({
      data: {
        studentId: student.id,
        createdById: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "special_education_daily_data.created",
      entityType: "specialEducationDailyDataEntry",
      entityId: entry.id,
      summary: `${student.firstName} ${student.lastName} için günlük veri kaydı olusturuldu.`,
      metadata: { studentId: student.id, institutionId: student.institutionId, documentId: document?.id ?? null },
    });

    revalidateSpecialEducationPaths(student.id);
    return { success: true, message: "Günlük veri kaydı olusturuldu.", id: entry.id };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error) };
  }
}

export async function deleteSpecialEducationDailyDataEntryAction(input: { id: string }): Promise<ActionResult> {
  try {
    const user = await requireSpecialEducationUser();
    const parsed = deleteSpecialEducationDailyDataEntrySchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Veri kaydı seçimi geçersiz." };
    }

    const entry = await prisma.specialEducationDailyDataEntry.findFirst({
      where: {
        id: parsed.data.id,
        student: getStudentAccessWhere(user),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            institutionId: true,
          },
        },
      },
    });

    if (!entry) {
      return { success: false, message: "Veri kaydı bulunamadı." };
    }

    await prisma.specialEducationDailyDataEntry.delete({
      where: { id: entry.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "special_education_daily_data.deleted",
      entityType: "specialEducationDailyDataEntry",
      entityId: entry.id,
      summary: `${entry.student.firstName} ${entry.student.lastName} için günlük veri kaydı silindi.`,
      metadata: { studentId: entry.student.id, institutionId: entry.student.institutionId },
    });

    revalidateSpecialEducationPaths(entry.student.id);
    return { success: true, message: "Günlük veri kaydı silindi.", id: entry.id };
  } catch (error) {
    return { success: false, message: getActionErrorMessage(error) };
  }
}
