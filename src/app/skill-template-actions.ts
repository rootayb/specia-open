"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/session";
import { writeAuditLog } from "@/lib/audit";
import {
  skillTemplateSchema,
  deleteSkillTemplateSchema,
  type SkillTemplateInput,
  type DeleteSkillTemplateInput,
} from "@/lib/schemas";

export type ActionResult = {
  success: boolean;
  message: string;
  id?: string;
};

export async function saveSkillTemplateAction(input: SkillTemplateInput): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = skillTemplateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Form verileri doğrulanamadı.",
      };
    }

    const { id, name, category, description, steps, order, isActive } = parsed.data;

    const payload = {
      name: name.trim(),
      category: category?.trim() || null,
      description: description?.trim() || null,
      steps: steps.map((step) => step.trim()).filter((step) => step.length > 0),
      order,
      isActive,
    };

    if (id) {
      const existing = await prisma.skillTemplate.findUnique({
        where: { id },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "Düzenlenmek istenen beceri şablonu bulunamadı." };
      }

      const template = await prisma.skillTemplate.update({
        where: { id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "skill_template.updated",
        entityType: "skillTemplate",
        entityId: template.id,
        summary: `"${template.name}" başlıklı beceri şablonu güncellendi.`,
        metadata: { isActive: template.isActive },
      });

      revalidatePath("/panel/admin/beceri-sablonlari");

      return {
        success: true,
        message: "Beceri şablonu başarıyla güncellendi.",
        id: template.id,
      };
    } else {
      const template = await prisma.skillTemplate.create({
        data: { ...payload, authorId: user.id },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "skill_template.created",
        entityType: "skillTemplate",
        entityId: template.id,
        summary: `"${template.name}" başlıklı yeni bir beceri şablonu oluşturuldu.`,
        metadata: { isActive: template.isActive },
      });

      revalidatePath("/panel/admin/beceri-sablonlari");

      return {
        success: true,
        message: "Beceri şablonu başarıyla oluşturuldu.",
        id: template.id,
      };
    }
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      return { success: false, message: "Bu beceri adıyla başka bir şablon zaten var." };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Beceri şablonu kaydedilirken bir hata oluştu.",
    };
  }
}

export async function deleteSkillTemplateAction(
  input: DeleteSkillTemplateInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = deleteSkillTemplateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Geçersiz silme isteği.",
      };
    }

    const existing = await prisma.skillTemplate.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, name: true },
    });

    if (!existing) {
      return { success: false, message: "Silinmek istenen beceri şablonu bulunamadı." };
    }

    await prisma.skillTemplate.delete({
      where: { id: parsed.data.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "skill_template.deleted",
      entityType: "skillTemplate",
      entityId: existing.id,
      summary: `"${existing.name}" başlıklı beceri şablonu silindi.`,
    });

    revalidatePath("/panel/admin/beceri-sablonlari");

    return {
      success: true,
      message: "Beceri şablonu başarıyla silindi.",
    };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Beceri şablonu silinirken bir hata oluştu.",
    };
  }
}
