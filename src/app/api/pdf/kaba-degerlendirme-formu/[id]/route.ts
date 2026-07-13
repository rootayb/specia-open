import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { generateCourseEvaluationPdf } from "@/lib/course-evaluation-pdf";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { getCourseEvaluationAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    try {
      await enforceRateLimit("pdf_generation", 10, 60 * 1000);
    } catch (error) {
      return handleApiError(error);
    }
    const user = await requireApiUser();
    if (!user) {
      return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
    }

    const { id } = await context.params;

    const document = await prisma.courseEvaluationDocument.findFirst({
      where: {
        id,
        ...getCourseEvaluationAccessWhere(user),
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            schoolName: true,
            schoolNumber: true,
          },
        },
        rows: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Değerlendirme kaydı bulunamadı." }, { status: 404 });
    }

    const fileName = buildSafePdfFilename(document.title, "kaba-değerlendirme");
    const bytes = await generateCourseEvaluationPdf(document);

    // Yerel sürüm: evrak kontrol kodu kaydı tutulmaz.
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF çıktısı oluşturulamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
