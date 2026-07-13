"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getEvaluationAccessWhere } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import {
  evaluationDocumentSchema,
  deleteEvaluationSchema,
  type EvaluationDocumentInput,
  type DeleteEvaluationInput,
} from "@/lib/schemas";

export type ActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

export async function saveEvaluationAction(input: EvaluationDocumentInput): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (user.role === "parent") {
      return { success: false, message: "Veliler değerlendirme ekleyemez veya düzenleyemez." };
    }

    const parsed = evaluationDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Veri doğrulama hatası.",
      };
    }

    const { id, studentId, title, type, kazanim, evaluationType, evaluationDate, evaluatorName, data } = parsed.data;

    // Verify student exists
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, ownerId: true, institutionId: true, firstName: true, lastName: true },
    });

    if (!student) {
      return { success: false, message: "Seçilen öğrenci bulunamadı." };
    }

    const isOwner = student.ownerId === user.id;
    const isSameInstitution = user.institutionId && user.institutionId === student.institutionId;

    if (user.role !== "admin" && !isOwner && !isSameInstitution) {
      return { success: false, message: "Bu öğrenci için işlem yapma yetkiniz bulunmuyor." };
    }

    const parsedDate = evaluationDate ? new Date(evaluationDate) : null;

    const payload = {
      studentId,
      title: title.trim(),
      type,
      kazanim: kazanim?.trim() || null,
      evaluationType: evaluationType?.trim() || null,
      evaluationDate: parsedDate,
      evaluatorName: evaluatorName?.trim() || null,
      data: data ? data : undefined,
      institutionId: student.institutionId,
      ownerId: user.id,
    };

    if (id) {
      // Update
      const existing = await prisma.evaluationDocument.findUnique({
        where: { id },
        select: { id: true, ownerId: true },
      });

      if (!existing) {
        return { success: false, message: "Güncellenmek istenen değerlendirme bulunamadı." };
      }

      // Check permissions
      if (user.role !== "admin" && existing.ownerId !== user.id && user.role !== "institution") {
        return { success: false, message: "Bu değerlendirmeyi güncelleme yetkiniz yok." };
      }

      const doc = await prisma.evaluationDocument.update({
        where: { id },
        data: {
          title: payload.title,
          kazanim: payload.kazanim,
          evaluationType: payload.evaluationType,
          evaluationDate: payload.evaluationDate,
          evaluatorName: payload.evaluatorName,
          data: payload.data,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "evaluation.updated",
        entityType: "evaluationDocument",
        entityId: doc.id,
        summary: `"${student.firstName} ${student.lastName}" adlı öğrenciye ait "${doc.title}" değerlendirmesi güncellendi.`,
      });

      revalidatePath("/panel/degerlendirmeler");
      revalidatePath(`/panel/degerlendirmeler/ogretim-sonu/${doc.id}`);

      return {
        success: true,
        message: "Değerlendirme başarıyla güncellendi.",
        id: doc.id,
      };
    } else {
      // Create
      const doc = await prisma.evaluationDocument.create({
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "evaluation.created",
        entityType: "evaluationDocument",
        entityId: doc.id,
        summary: `"${student.firstName} ${student.lastName}" adlı öğrenciye ait "${doc.title}" yeni değerlendirmesi oluşturuldu.`,
      });

      revalidatePath("/panel/degerlendirmeler");

      return {
        success: true,
        message: "Değerlendirme başarıyla oluşturuldu.",
        id: doc.id,
      };
    }
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Değerlendirme kaydedilirken hata oluştu.",
    };
  }
}

export async function duplicateEvaluationAction(input: DeleteEvaluationInput): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (user.role === "parent") {
      return { success: false, message: "Veliler değerlendirme kopyalayamaz." };
    }

    const parsed = deleteEvaluationSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Geçersiz kopyalama isteği." };
    }

    // Erişim kapsamı dahilindeki bir değerlendirme mi?
    const existing = await prisma.evaluationDocument.findFirst({
      where: { id: parsed.data.id, ...getEvaluationAccessWhere(user) },
    });

    if (!existing) {
      return { success: false, message: "Kopyalanmak istenen değerlendirme bulunamadı." };
    }

    const student = await prisma.student.findUnique({
      where: { id: existing.studentId },
      select: { id: true, institutionId: true, firstName: true, lastName: true },
    });

    if (!student) {
      return { success: false, message: "İlgili öğrenci bulunamadı." };
    }

    const doc = await prisma.evaluationDocument.create({
      data: {
        studentId: existing.studentId,
        title: `${existing.title} (Kopya)`,
        type: existing.type,
        kazanim: existing.kazanim,
        evaluationType: existing.evaluationType,
        evaluationDate: existing.evaluationDate,
        evaluatorName: existing.evaluatorName,
        data: existing.data === null ? undefined : JSON.parse(JSON.stringify(existing.data)),
        institutionId: student.institutionId,
        ownerId: user.id,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "evaluation.created",
      entityType: "evaluationDocument",
      entityId: doc.id,
      summary: `"${student.firstName} ${student.lastName}" adlı öğrenciye ait "${existing.title}" değerlendirmesi kopyalandı.`,
    });

    revalidatePath("/panel/degerlendirmeler");

    return { success: true, message: "Değerlendirme kopyalandı.", id: doc.id };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Değerlendirme kopyalanırken hata oluştu.",
    };
  }
}

export async function deleteEvaluationAction(input: DeleteEvaluationInput): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (user.role === "parent") {
      return { success: false, message: "Veliler değerlendirme silemez." };
    }

    const parsed = deleteEvaluationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Geçersiz silme isteği.",
      };
    }

    const { id } = parsed.data;

    const existing = await prisma.evaluationDocument.findUnique({
      where: { id },
      select: { id: true, ownerId: true, title: true, studentId: true },
    });

    if (!existing) {
      return { success: false, message: "Silinmek istenen değerlendirme bulunamadı." };
    }

    // Check permissions
    if (user.role !== "admin" && existing.ownerId !== user.id && user.role !== "institution") {
      return { success: false, message: "Bu değerlendirmeyi silme yetkiniz yok." };
    }

    const student = await prisma.student.findUnique({
      where: { id: existing.studentId },
      select: { firstName: true, lastName: true },
    });

    await prisma.evaluationDocument.delete({
      where: { id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "evaluation.deleted",
      entityType: "evaluationDocument",
      entityId: existing.id,
      summary: `"${student?.firstName ?? ""} ${student?.lastName ?? ""}" adlı öğrenciye ait "${existing.title}" değerlendirmesi silindi.`,
    });

    revalidatePath("/panel/degerlendirmeler");

    return {
      success: true,
      message: "Değerlendirme başarıyla silindi.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Değerlendirme silinirken hata oluştu.",
    };
  }
}
