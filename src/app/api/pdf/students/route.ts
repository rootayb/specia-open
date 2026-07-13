import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";

import { getStudentsForUser } from "@/lib/data";
import { getCorporatePdfSigningMeta } from "@/lib/corporate-pdf-signatures";
import { buildIssuedPdfVerificationCode, issuePdfDocument } from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { generateStudentListPdf } from "@/lib/pdf";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const statusTitles: Record<"active" | "archived" | "all", string> = {
  active: "SPECIA Aktif Öğrenci Listesi",
  archived: "SPECIA Pasif Öğrenci Listesi",
  all: "SPECIA Öğrenci Kayıt Listesi (Tumu)",
};

export async function GET(request: NextRequest) {
  try {
    await enforceRateLimit("pdf_generation", 10, 60 * 1000);
  } catch (error) {
    return handleApiError(error);
  }
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status: "active" | "archived" | "all" =
    statusParam === "archived" || statusParam === "all" ? statusParam : "active";

  const institution = user.institutionId
    ? await prisma.institution.findUnique({
        where: { id: user.institutionId },
        select: { name: true },
      })
    : null;

  const students = await getStudentsForUser(user, { status });
  students.sort((left, right) =>
    `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`, "tr"),
  );
  const title = statusTitles[status];
  const signingMeta = await getCorporatePdfSigningMeta(user, user.institutionId);
  const generatedAt = new Date();
  const verificationCode = buildIssuedPdfVerificationCode("student_list", generatedAt);
  const fileName = buildSafePdfFilename("specia-öğrenci-kayıt-listesi", "öğrenci-kayıt-listesi");
  const bytes = await generateStudentListPdf({
    title,
    institutionName: institution?.name ?? null,
    generatedAt,
    generatedByName: signingMeta.generatedByName,
    generatedByRole: signingMeta.generatedByRole,
    institutionId: signingMeta.institutionId,
    institutionManagerName: signingMeta.institutionManagerName,
    institutionManagerTitle: signingMeta.institutionManagerTitle,
    referenceCode: verificationCode,
    students: students.map((student) => ({
      firstName: student.firstName,
      lastName: student.lastName,
      schoolName: student.schoolName,
      classroom: student.classroom,
      bepCount: student.documents.length,
      parentCount: student.parentStudentLinks.length,
      isActive: student.isActive,
    })),
  });

  await issuePdfDocument({
    documentType: "student_list",
    verificationCode,
    title,
    fileName,
    bytes,
    institutionId: user.institutionId,
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
