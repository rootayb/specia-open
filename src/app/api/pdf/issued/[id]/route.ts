import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
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

  const { id } = await context.params;

  const record = await prisma.issuedPdfDocument.findFirst({
    where:
      user.role === "admin"
        ? { id }
        : {
            id,
            institutionId: user.institutionId ?? "__no_institution__",
          },
  });

  if (!record) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }

  const { resolveIssuedPdfBytes } = await import("@/lib/issued-pdf-documents");
  const pdfBytes = await resolveIssuedPdfBytes(record);

  return new NextResponse(new Uint8Array(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${record.fileName}"`,
    },
  });
}
