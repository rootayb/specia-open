import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { getInstitutionReports } from "@/lib/data";
import { getCorporatePdfSigningMeta } from "@/lib/corporate-pdf-signatures";
import { buildIssuedPdfVerificationCode, issuePdfDocument } from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { generateInstitutionReportPdf } from "@/lib/pdf";
import { canManageInstitutionRecords } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await enforceRateLimit("pdf_generation", 10, 60 * 1000);
  } catch (error) {
    return handleApiError(error);
  }
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  if (!canManageInstitutionRecords(user.role)) {
    return NextResponse.json({ error: "Bu rapora erişim yetkiniz yok." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") || "month";

  const periodLabels: Record<string, string> = {
    daily: "Bugün",
    weekly: "Bu hafta",
    month: "Bu ay",
    "3months": "Son 3 ay",
    "6months": "Son 6 ay",
    "1year": "Son 1 yıl",
  };
  const periodLabel = periodLabels[period] || "Bu ay";

  // Check if a report of this period was already generated within the last 1 hour
  const lastReport = await prisma.issuedPdfDocument.findFirst({
    where: {
      institutionId: user.institutionId ?? "__no_institution__",
      documentType: "institution_report",
      fileName: { contains: `-${period}` }
    },
    orderBy: { issuedAt: "desc" }
  });

  if (lastReport) {
    const now = new Date();
    const diffMs = now.getTime() - new Date(lastReport.issuedAt).getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
      const { resolveIssuedPdfBytes } = await import("@/lib/issued-pdf-documents");
      const pdfBytes = await resolveIssuedPdfBytes(lastReport);

      return new NextResponse(new Uint8Array(pdfBytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${lastReport.fileName}"`,
        },
      });
    }
  }

  const institution = user.institutionId
    ? await prisma.institution.findUnique({
        where: { id: user.institutionId },
        select: { name: true },
      })
    : null;

  const report = await getInstitutionReports(user, period);
  const signingMeta = await getCorporatePdfSigningMeta(user, user.institutionId);
  const generatedAt = new Date();
  const verificationCode = buildIssuedPdfVerificationCode("institution_report", generatedAt);
  const title = `SPECIA Kurum Değerlendirme Raporu (${periodLabel})`;
  const fileName = buildSafePdfFilename(`specia-kurum-değerlendirme-raporu-${period}`, "kurum-raporu");
  const reportInput = {
    title,
    generatedAt,
    generatedByName: signingMeta.generatedByName,
    generatedByRole: signingMeta.generatedByRole,
    institutionId: signingMeta.institutionId,
    institutionManagerName: signingMeta.institutionManagerName,
    institutionManagerTitle: signingMeta.institutionManagerTitle,
    referenceCode: verificationCode,
    institutionName: institution?.name ?? null,
    periodLabel,
    summary: {
      studentCount: report.studentCount,
      documentCount: report.documentCount,
      completedDocuments: report.completedDocuments,
      approvedDocuments: report.approvedDocuments,
      pendingApprovals: report.pendingApprovals,
      studentFileCount: report.studentFileCount,
      expiringFiles: report.expiringFiles,
      teacherCount: report.teacherCount,
      parentCount: report.parentCount,
      roomCount: report.roomCount,
      totalSessionsThisMonth: report.totalSessionsThisMonth,
      plannedSessions: report.plannedSessions,
      completedSessions: report.completedSessions,
      cancelledSessions: report.cancelledSessions,
    },
    staffWorkload: report.staffWorkload,
    sessionTypeBreakdown: report.sessionTypeBreakdown,
    studentSessionLeaderboard: report.studentSessionLeaderboard,
    recentDocuments: report.recentDocuments,
  };

  const bytes = await generateInstitutionReportPdf(reportInput);

  await issuePdfDocument({
    documentType: "institution_report",
    verificationCode,
    title,
    fileName,
    bytes: Buffer.from(JSON.stringify(reportInput), "utf-8"),
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
