"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import { inferBehaviorFunction } from "@/lib/abc-engine";
import {
  studentBehaviorSchema,
  deleteStudentBehaviorSchema,
  abcLogSchema,
  labelAbcLogSchema,
  deleteAbcLogSchema,
  type StudentBehaviorInput,
  type DeleteStudentBehaviorInput,
  type AbcLogInput,
  type LabelAbcLogInput,
  type DeleteAbcLogInput
} from "@/lib/schemas";

export type ActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

// 1. Save or Update Student Behavior Profile
export async function saveStudentBehaviorAction(input: StudentBehaviorInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role === "parent") {
      return { success: false, message: "Veliler davranış tanımlayamaz." };
    }

    const parsed = studentBehaviorSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Geçersiz veri." };
    }

    const { id, studentId, name, trackingType } = parsed.data;

    // Verify student ownership or institution link
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, ownerId: true, institutionId: true }
    });

    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    if (user.role !== "admin" && student.ownerId !== user.id && user.institutionId !== student.institutionId) {
      return { success: false, message: "Bu işlem için yetkiniz bulunmuyor." };
    }

    if (id) {
      // Update
      const behavior = await prisma.studentBehavior.update({
        where: { id },
        data: { name: name.trim(), trackingType }
      });

      await writeAuditLog({
        actorId: user.id,
        action: "UPDATE_BEHAVIOR",
        entityType: "StudentBehavior",
        entityId: behavior.id,
        summary: `'${studentId}' idli öğrenci için '${name}' davranışı güncellendi.`
      });

      revalidatePath(`/panel/degerlendirmeler/davranis`);
      return { success: true, message: "Davranış başarıyla güncellendi.", id: behavior.id };
    } else {
      // Create
      const behavior = await prisma.studentBehavior.create({
        data: {
          studentId,
          name: name.trim(),
          trackingType
        }
      });

      await writeAuditLog({
        actorId: user.id,
        action: "CREATE_BEHAVIOR",
        entityType: "StudentBehavior",
        entityId: behavior.id,
        summary: `'${studentId}' idli öğrenci için yeni '${name}' davranışı tanımlandı.`
      });

      revalidatePath(`/panel/degerlendirmeler/davranis`);
      return { success: true, message: "Davranış başarıyla eklendi.", id: behavior.id };
    }
  } catch (error) {
    console.error("saveStudentBehaviorAction error:", error);
    return { success: false, message: "Sistemsel bir hata oluştu." };
  }
}

// 2. Delete Student Behavior Profile
export async function deleteStudentBehaviorAction(input: DeleteStudentBehaviorInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role === "parent") {
      return { success: false, message: "Veliler davranış silemez." };
    }

    const parsed = deleteStudentBehaviorSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Geçersiz istek." };
    }

    const { id } = parsed.data;

    const behavior = await prisma.studentBehavior.findUnique({
      where: { id },
      include: { student: { select: { ownerId: true, institutionId: true } } }
    });

    if (!behavior) {
      return { success: false, message: "Silinmek istenen davranış bulunamadı." };
    }

    if (user.role !== "admin" && behavior.student.ownerId !== user.id && user.institutionId !== behavior.student.institutionId) {
      return { success: false, message: "Bu davranışı silme yetkiniz bulunmuyor." };
    }

    await prisma.studentBehavior.delete({
      where: { id }
    });

    await writeAuditLog({
      actorId: user.id,
      action: "DELETE_BEHAVIOR",
      entityType: "StudentBehavior",
      entityId: id,
      summary: `'${behavior.studentId}' idli öğrenciden '${behavior.name}' davranışı silindi.`
    });

    revalidatePath(`/panel/degerlendirmeler/davranis`);
    return { success: true, message: "Davranış başarıyla silindi." };
  } catch (error) {
    console.error("deleteStudentBehaviorAction error:", error);
    return { success: false, message: "Davranış silinirken hata oluştu." };
  }
}

// 3. Create raw ABC Log (Instant Touch Tracking)
export async function createAbcLogAction(input: AbcLogInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role === "parent") {
      return { success: false, message: "Veliler gözlem kaydı oluşturamaz." };
    }

    const parsed = abcLogSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Geçersiz gözlem verisi." };
    }

    const { studentId, behaviorId, durationSeconds, frequency, lessonName, subTopic, classSize, timestamp } = parsed.data;

    // Validate ownership
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { id: true, ownerId: true, institutionId: true }
    });

    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    if (user.role !== "admin" && student.ownerId !== user.id && user.institutionId !== student.institutionId) {
      return { success: false, message: "Gözlem kaydı ekleme yetkiniz yok." };
    }

    const logDate = timestamp ? new Date(timestamp) : new Date();

    const log = await prisma.abcLog.create({
      data: {
        studentId,
        behaviorId,
        timestamp: logDate,
        durationSeconds,
        frequency,
        lessonName: lessonName || null,
        subTopic: subTopic || null,
        classSize: classSize || null,
        teacherId: user.id
      }
    });

    revalidatePath(`/panel/degerlendirmeler/davranis`);
    return { success: true, message: "Davranış kaydı anlık olarak loglandı.", id: log.id };
  } catch (error) {
    console.error("createAbcLogAction error:", error);
    return { success: false, message: "Davranış kaydedilirken hata oluştu." };
  }
}

// 4. Label/Contextualize raw ABC log at the end of the day
export async function labelAbcLogAction(input: LabelAbcLogInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role === "parent") {
      return { success: false, message: "Veliler yorumlama yapamaz." };
    }

    const parsed = labelAbcLogSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Geçersiz etiket verisi." };
    }

    const { id, antecedentTag, antecedentDisplay, consequenceTag, consequenceDisplay, teacherNotes } = parsed.data;

    const log = await prisma.abcLog.findUnique({
      where: { id },
      include: { student: { select: { ownerId: true, institutionId: true } } }
    });

    if (!log) {
      return { success: false, message: "Yorumlanacak davranış kaydı bulunamadı." };
    }

    if (user.role !== "admin" && log.teacherId !== user.id && log.student.ownerId !== user.id && user.institutionId !== log.student.institutionId) {
      return { success: false, message: "Bu kaydı yorumlama yetkiniz bulunmuyor." };
    }

    // Run engine inference rules
    const inference = inferBehaviorFunction(antecedentTag, consequenceTag);

    const updatedLog = await prisma.abcLog.update({
      where: { id },
      data: {
        antecedentTag,
        antecedentDisplay,
        consequenceTag,
        consequenceDisplay,
        teacherNotes: teacherNotes || null,
        inferredFunction: inference.primary,
        confidenceScore: inference.confidence
      }
    });

    revalidatePath(`/panel/degerlendirmeler/davranis`);
    return { success: true, message: "Kayıt başarıyla yorumlandı ve UDA işlevi analiz edildi.", id: updatedLog.id };
  } catch (error) {
    console.error("labelAbcLogAction error:", error);
    return { success: false, message: "Yorumlama işlemi sırasında sistemsel hata." };
  }
}

// 5. Delete ABC Log
export async function deleteAbcLogAction(input: DeleteAbcLogInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role === "parent") {
      return { success: false, message: "Veliler gözlem kaydı silemez." };
    }

    const parsed = deleteAbcLogSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Geçersiz istek." };
    }

    const { id } = parsed.data;

    const log = await prisma.abcLog.findUnique({
      where: { id },
      include: { student: { select: { ownerId: true, institutionId: true } } }
    });

    if (!log) {
      return { success: false, message: "Silinecek kayıt bulunamadı." };
    }

    if (user.role !== "admin" && log.teacherId !== user.id && log.student.ownerId !== user.id && user.institutionId !== log.student.institutionId) {
      return { success: false, message: "Bu kaydı silme yetkiniz bulunmuyor." };
    }

    await prisma.abcLog.delete({
      where: { id }
    });

    revalidatePath(`/panel/degerlendirmeler/davranis`);
    return { success: true, message: "Gözlem kaydı başarıyla silindi." };
  } catch (error) {
    console.error("deleteAbcLogAction error:", error);
    return { success: false, message: "Kayıt silinirken hata meydana geldi." };
  }
}
