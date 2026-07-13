import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/permissions";
import { generateCustomFormPdf } from "@/lib/form-pdf";
import type { FormTemplateDefinition } from "@/lib/forms";
import {
  buildIssuedPdfVerificationCode,
  issuePdfDocument,
  stampIssuedPdfVerificationCode,
} from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { canAccessSpecialEducationTools, getStudentAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";
import {
  getSpecialEducationToolMeta,
  isSpecialEducationToolSlug,
} from "@/lib/special-education-tools-catalog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Özel eğitim araçlarının ekran içeriğini yazdırılabilir PDF'e çevirir.
 * İstemci, aracın o anki durumunu bölüm/alan çiftleri olarak gönderir;
 * sunucu içerik uzunluklarını doğrular ve form PDF motorunu yeniden kullanır.
 */
const toolPdfSchema = z.object({
  studentId: z.string().trim().min(1).max(64).optional(),
  sections: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(160),
        fields: z
          .array(
            z.object({
              label: z.string().trim().min(1).max(200),
              value: z.string().max(8000),
            }),
          )
          .min(1)
          .max(24),
      }),
    )
    .min(1)
    .max(12),
});

export async function POST(
  request: Request,
  context: { params: Promise<{ tool: string }> },
) {
  try {
    await enforceRateLimit("pdf_generation", 10, 60 * 1000);
  } catch (error) {
    return handleApiError(error);
  }

  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }
  if (!canAccessSpecialEducationTools(user.role)) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 403 });
  }

  const { tool } = await context.params;
  if (!isSpecialEducationToolSlug(tool)) {
    return NextResponse.json({ error: "Araç bulunamadı." }, { status: 404 });
  }
  const toolMeta = getSpecialEducationToolMeta(tool);

  try {
    const payload = toolPdfSchema.parse(await request.json());

    let studentName = "";
    let schoolName: string | null = null;
    if (payload.studentId) {
      const student = await prisma.student.findFirst({
        where: { id: payload.studentId, ...getStudentAccessWhere(user) },
        select: { firstName: true, lastName: true, schoolName: true },
      });
      if (!student) {
        return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
      }
      studentName = `${student.firstName} ${student.lastName}`.trim();
      schoolName = student.schoolName;
    }

    // Araç içeriği, form PDF motorunun beklediği şablon + değer yapısına
    // dönüştürülür; boş alanlar çıktıda yer kaplamasın diye atlanır.
    const values: Record<string, string> = {};
    const template: FormTemplateDefinition = {
      slug: `arac-${tool}`,
      category: "Araç",
      title: toolMeta.title,
      sourceFile: "specia",
      description: toolMeta.description,
      highlights: [],
      sections: payload.sections.map((section, sectionIndex) => ({
        id: `section-${sectionIndex}`,
        title: section.title,
        fields: section.fields
          .filter((field) => field.value.trim().length > 0)
          .map((field, fieldIndex) => {
            const id = `field-${sectionIndex}-${fieldIndex}`;
            values[id] = field.value;
            return {
              id,
              label: field.label,
              type: "textarea" as const,
              layout: "full" as const,
            };
          }),
      })),
    };
    template.sections = template.sections.filter((section) => section.fields.length > 0);
    if (template.sections.length === 0) {
      return NextResponse.json({ error: "Çıktı için içerik bulunamadı." }, { status: 400 });
    }

    const generatedAt = new Date();
    const verificationCode = buildIssuedPdfVerificationCode("custom_form", generatedAt);
    const bytes = await generateCustomFormPdf({
      template,
      values,
      institutionName: schoolName ?? user.institutionId ?? "Araç Çıktısı",
      generatedByName: user.name ?? user.email,
      generatedAt,
      institutionId: user.institutionId,
    });

    const fileName = buildSafePdfFilename(
      `${studentName || "arac"}-${toolMeta.title}`,
      "arac",
    );
    const stampedBytes = await stampIssuedPdfVerificationCode(bytes, verificationCode);

    await issuePdfDocument({
      documentType: "custom_form",
      verificationCode,
      title: `${toolMeta.title}${studentName ? ` · ${studentName}` : ""}`,
      fileName,
      bytes: stampedBytes,
      institutionId: user.institutionId,
      studentId: payload.studentId ?? null,
      sourceId: `arac:${tool}`,
      issuedById: user.id,
      issuedAt: generatedAt,
    });

    return new NextResponse(Buffer.from(stampedBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Geçersiz çıktı içeriği." }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "PDF oluşturulamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
