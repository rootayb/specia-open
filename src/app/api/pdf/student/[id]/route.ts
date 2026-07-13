import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { getStudentById } from "@/lib/data";
import { getCorporatePdfSigningMeta } from "@/lib/corporate-pdf-signatures";
import { buildIssuedPdfVerificationCode, issuePdfDocument } from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { generateStudentProfilePdf } from "@/lib/pdf";
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
  const student = await getStudentById(user, id);

  if (!student) {
    return NextResponse.json({ error: "Öğrenci bulunamadı." }, { status: 404 });
  }

  const signingMeta = await getCorporatePdfSigningMeta(
    user,
    student.institutionId ?? user.institutionId ?? null,
  );
  const generatedAt = new Date();
  const verificationCode = buildIssuedPdfVerificationCode("student_profile", generatedAt);
  const title = `${student.firstName} ${student.lastName} Öğrenci Bilgi Raporu`;
  const fileName = buildSafePdfFilename(
    `${student.firstName}-${student.lastName}-öğrenci-bilgi-raporu`,
    "öğrenci-bilgi-raporu",
  );
  const bytes = await generateStudentProfilePdf({
    title,
    generatedAt,
    generatedByName: signingMeta.generatedByName,
    generatedByRole: signingMeta.generatedByRole,
    institutionId: signingMeta.institutionId,
    institutionManagerName: signingMeta.institutionManagerName,
    institutionManagerTitle: signingMeta.institutionManagerTitle,
    referenceCode: verificationCode,
    student,
  });

  await issuePdfDocument({
    documentType: "student_profile",
    verificationCode,
    title,
    fileName,
    bytes,
    institutionId: user.institutionId,
    studentId: student.id,
    sourceId: student.id,
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
