import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { generateBepPdf } from "@/lib/pdf";
import { getDocumentAccessWhere } from "@/lib/permissions";
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

  const document = await prisma.bepDocument.findFirst({
    where: {
      id,
      ...getDocumentAccessWhere(user),
    },
    include: {
      student: true,
      performanceEntries: {
        orderBy: { sortOrder: "asc" },
      },
      planRows: {
        orderBy: { sortOrder: "asc" },
      },
      supportServiceEntries: {
        orderBy: { sortOrder: "asc" },
      },
      decisionEntries: {
        orderBy: { sortOrder: "asc" },
      },
      committeeMembers: {
        orderBy: { sortOrder: "asc" },
      },
      subjectTeachers: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  }

  const bytes = await generateBepPdf(document);

  // Yerel sürüm: evrak kontrol kodu kaydı tutulmaz.
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      // Yerel sürüm: önizleme yerine PDF doğrudan bilgisayara indirilir.
      "Content-Disposition": `attachment; filename="${buildSafePdfFilename(document.title, "bep")}"`,
    },
  });
}
