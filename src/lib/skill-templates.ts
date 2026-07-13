import { prisma } from "@/lib/prisma";
import type { SkillTemplateSummary } from "@/lib/skill-analysis";

/** Ham JSON `steps`'i güvenli biçimde string dizisine çözer. */
export function parseSkillTemplateSteps(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((step): step is string => typeof step === "string" && step.trim().length > 0);
}

function toSummary(template: {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  steps: unknown;
}): SkillTemplateSummary {
  return {
    id: template.id,
    name: template.name,
    category: template.category,
    description: template.description,
    steps: parseSkillTemplateSteps(template.steps),
  };
}

/** Öğretmenlerin beceri analizi formunda seçebileceği aktif şablonlar. */
export async function getActiveSkillTemplates(): Promise<SkillTemplateSummary[]> {
  const templates = await prisma.skillTemplate.findMany({
    where: { isActive: true },
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return templates.map(toSummary);
}

export type SkillTemplateListItem = SkillTemplateSummary & {
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

/** Admin "Beceri Şablonları" liste sayfası için tüm şablonlar (aktif/pasif). */
export async function getAllSkillTemplates(): Promise<SkillTemplateListItem[]> {
  const templates = await prisma.skillTemplate.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
  });
  return templates.map((template) => ({
    ...toSummary(template),
    order: template.order,
    isActive: template.isActive,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }));
}

export async function getSkillTemplateById(id: string): Promise<SkillTemplateListItem | null> {
  const template = await prisma.skillTemplate.findUnique({ where: { id } });
  if (!template) {
    return null;
  }
  return {
    ...toSummary(template),
    order: template.order,
    isActive: template.isActive,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}
