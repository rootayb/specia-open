import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { getZumreMeetingById } from "@/lib/data";
import { buildIssuedPdfVerificationCode, issuePdfDocument } from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { requireApiUser } from "@/lib/session";
import { generateZumreMeetingPdf } from "@/lib/zumre-meeting-export";

export const dynamic = "force-dynamic";

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
  const document = await getZumreMeetingById(user, id);
  if (!document) {
    return NextResponse.json({ error: "Zumre tutanağı bulunamadı." }, { status: 404 });
  }

  const generatedAt = new Date();
  const verificationCode = buildIssuedPdfVerificationCode("zumre_meeting", generatedAt);
  const fileName = buildSafePdfFilename(document.title, "zumre-toplantı-tutanağı");
  const bytes = await generateZumreMeetingPdf(document);

  await issuePdfDocument({
    documentType: "zumre_meeting",
    verificationCode,
    title: document.title,
    fileName,
    bytes,
    institutionId: document.institutionId,
    sourceId: document.id,
    issuedById: user.id,
    issuedAt: generatedAt,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
