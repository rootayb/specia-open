import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { generateEducationalAnalysisSummaryPdf } from "@/lib/educational-progress-summary-pdf";
import {
  buildIssuedPdfVerificationCode,
  issuePdfDocument,
  stampIssuedPdfVerificationCode,
} from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import {
  getTeacherEducationalAnalysis,
  getTeacherEducationalProgressWorkspace,
} from "@/lib/data";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const studentId = url.searchParams.get("studentId");
    const documentId = url.searchParams.get("documentId");
    const goalId = url.searchParams.get("goalId");

    const [analysis, workspace] = await Promise.all([
      getTeacherEducationalAnalysis(user),
      getTeacherEducationalProgressWorkspace(user),
    ]);

    if (!analysis || !workspace) {
      return NextResponse.json({ error: "Eğitsel analiz özeti hazırlanamadı." }, { status: 404 });
    }

    const selectedStudent =
      workspace.students.find((student) => student.id === studentId) ?? workspace.students[0] ?? null;
    const selectedDocument =
      selectedStudent?.documents.find((document) => document.id === documentId) ??
      selectedStudent?.documents[0] ??
      null;
    const selectedGoal =
      selectedDocument?.goals.find((goal) => goal.id === goalId) ?? selectedDocument?.goals[0] ?? null;

    const generatedAt = new Date();
    const verificationCode = buildIssuedPdfVerificationCode(
      "educational_analysis_summary",
      generatedAt,
    );
    const fileName = buildSafePdfFilename(
      "egitsel-analiz-özeti",
      "egitsel-analiz-özeti",
    );
    const bytes = await generateEducationalAnalysisSummaryPdf({
      checkedAt: generatedAt,
      workspace,
      analysis,
      selectedStudent,
      selectedDocument,
      selectedGoal,
      institutionId: user.institutionId,
    });
    const stampedBytes = await stampIssuedPdfVerificationCode(bytes, verificationCode);

    await issuePdfDocument({
      documentType: "educational_analysis_summary",
      verificationCode,
      title: "Egitsel Analiz Özeti",
      fileName,
      bytes: stampedBytes,
      institutionId: user.institutionId,
      studentId: selectedStudent?.id ?? null,
      sourceId: selectedDocument?.id ?? null,
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
      error instanceof Error ? error.message : "Eğitsel analiz özeti oluşturulamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
