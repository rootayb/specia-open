import type { Prisma } from "@/lib/prisma-shim";

import { prisma } from "@/lib/prisma";
import {
  LEGAL_DOCUMENT_SLUGS,
  type LegalDocumentSlug,
  type LegalDocumentSection,
  type LegalDocumentPayload,
  defaultLegalDocuments,
} from "./legal-defaults";

export {
  LEGAL_DOCUMENT_SLUGS,
  type LegalDocumentSlug,
  type LegalDocumentSection,
  type LegalDocumentPayload,
  defaultLegalDocuments,
};

function isLegalSlug(value: string): value is LegalDocumentSlug {
  return (LEGAL_DOCUMENT_SLUGS as readonly string[]).includes(value);
}

function normalizeSections(value: Prisma.JsonValue): LegalDocumentSection[] {
  if (!Array.isArray(value)) return [];

  const sections: LegalDocumentSection[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as Record<string, unknown>;
    const title = typeof record.title === "string" ? record.title.trim() : "";
    if (!title) continue;
    const paragraphs = Array.isArray(record.paragraphs)
      ? record.paragraphs.filter((paragraph): paragraph is string => typeof paragraph === "string")
      : [];
    const bullets = Array.isArray(record.bullets)
      ? record.bullets.filter((bullet): bullet is string => typeof bullet === "string")
      : [];
    sections.push({ title, paragraphs, bullets });
  }
  return sections;
}



export async function getLegalDocument(slug: LegalDocumentSlug): Promise<LegalDocumentPayload> {
  const fallback = defaultLegalDocuments()[slug];
  try {
    const record = await prisma.legalDocumentContent.findUnique({
      where: { slug },
      select: { slug: true, title: true, summary: true, sections: true, updatedAt: true, isPublished: true },
    });

    if (!record?.isPublished || !isLegalSlug(record.slug)) {
      return fallback;
    }

    const sections = normalizeSections(record.sections);
    return {
      slug: record.slug,
      title: record.title || fallback.title,
      summary: record.summary || fallback.summary,
      sections: sections.length > 0 ? sections : fallback.sections,
      updatedAt: record.updatedAt.toISOString(),
    };
  } catch (error) {
    console.warn(`Failed to fetch legal document '${slug}' from database, using fallback:`, error);
    return fallback;
  }
}

export async function getLegalDocuments(): Promise<LegalDocumentPayload[]> {
  const docs = await Promise.all(LEGAL_DOCUMENT_SLUGS.map((slug) => getLegalDocument(slug)));
  return docs;
}

export async function getAdminLegalDocuments(): Promise<LegalDocumentPayload[]> {
  const fallback = defaultLegalDocuments();
  const records = await prisma.legalDocumentContent.findMany({
    where: { slug: { in: [...LEGAL_DOCUMENT_SLUGS] } },
    select: { slug: true, title: true, summary: true, sections: true, updatedAt: true },
  });
  const bySlug = new Map(records.filter((record) => isLegalSlug(record.slug)).map((record) => [record.slug as LegalDocumentSlug, record]));

  return LEGAL_DOCUMENT_SLUGS.map((slug) => {
    const record = bySlug.get(slug);
    if (!record) return fallback[slug];
    const sections = normalizeSections(record.sections);
    return {
      slug,
      title: record.title || fallback[slug].title,
      summary: record.summary || fallback[slug].summary,
      sections: sections.length > 0 ? sections : fallback[slug].sections,
      updatedAt: record.updatedAt.toISOString(),
    };
  });
}

export async function upsertLegalDocument(input: LegalDocumentPayload, updatedById: string) {
  return prisma.legalDocumentContent.upsert({
    where: { slug: input.slug },
    update: {
      title: input.title.trim(),
      summary: input.summary.trim(),
      sections: input.sections as unknown as Prisma.InputJsonValue,
      isPublished: true,
      updatedById,
    },
    create: {
      slug: input.slug,
      title: input.title.trim(),
      summary: input.summary.trim(),
      sections: input.sections as unknown as Prisma.InputJsonValue,
      isPublished: true,
      updatedById,
    },
  });
}
