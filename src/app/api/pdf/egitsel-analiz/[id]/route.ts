import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { generateEducationalProgressPdf } from "@/lib/educational-progress-pdf";
import {
  buildIssuedPdfVerificationCode,
  issuePdfDocument,
  stampIssuedPdfVerificationCode,
} from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { getDocumentAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(
  request: Request,
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
    const url = new URL(request.url);
    const goalId = url.searchParams.get("goalId");

    const document = await prisma.bepDocument.findFirst({
      where: {
        id,
        ...getDocumentAccessWhere(user),
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true,
            schoolName: true,
            schoolNumber: true,
            classroom: true,
          },
        },
        planRows: {
          orderBy: { sortOrder: "asc" },
          include: {
            goalProgressEntries: {
              orderBy: [{ measuredAt: "desc" }, { updatedAt: "desc" }],
              include: {
                createdBy: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!document) {
      return NextResponse.json({ error: "BEP kaydı bulunamadı." }, { status: 404 });
    }

    const generatedAt = new Date();
    const verificationCode = buildIssuedPdfVerificationCode("educational_progress", generatedAt);
    const fileName = buildSafePdfFilename(
      `${document.title}-egitsel-ilerleme`,
      "egitsel-analiz",
    );
    const bytes = await generateEducationalProgressPdf(document, { selectedGoalId: goalId });
    const stampedBytes = await stampIssuedPdfVerificationCode(bytes, verificationCode);

    await issuePdfDocument({
      documentType: "educational_progress",
      verificationCode,
      title: `${document.title} Egitsel Analiz Raporu`,
      fileName,
      bytes: stampedBytes,
      institutionId: document.institutionId,
      studentId: document.studentId,
      sourceId: document.id,
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
    const message =
      error instanceof Error ? error.message : "Egitsel analiz çıktısı olusturulamadi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
