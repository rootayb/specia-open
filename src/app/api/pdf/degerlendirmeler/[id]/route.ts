import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/session";
import { getEvaluationAccessWhere } from "@/lib/permissions";
import { generateObtPdf } from "@/lib/obt-export";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function buildSafePdfFilename(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "değerlendirme"}.pdf`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
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

  const { id } = await params;
  const document = await prisma.evaluationDocument.findFirst({
    where: {
      id,
      ...getEvaluationAccessWhere(user),
    },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      owner: {
        select: {
          name: true,
          branch: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Değerlendirme bulunamadı." }, { status: 404 });
  }

  const bytes = await generateObtPdf(document);
  const fileName = buildSafePdfFilename(document.title);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
