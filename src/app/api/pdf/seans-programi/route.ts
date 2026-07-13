import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { getInstitutionSchedule } from "@/lib/data";
import { getCorporatePdfSigningMeta } from "@/lib/corporate-pdf-signatures";
import { buildIssuedPdfVerificationCode, issuePdfDocument } from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { generateSessionSchedulePdf } from "@/lib/pdf";
import { requireApiUser } from "@/lib/session";
import { userSupportsSessionAndFinanceModules } from "@/lib/institution-features";

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
  if (!userSupportsSessionAndFinanceModules(user)) {
    return NextResponse.json({ error: "Bu modül kurum tipiniz için kullanılamaz." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const teacherId = searchParams.get("teacherId") ?? undefined;
  const data = await getInstitutionSchedule(user, date, teacherId);
  const signingMeta = await getCorporatePdfSigningMeta(user, user.institutionId);
  const selectedTeacher = teacherId
    ? data.teachers.find((teacher) => teacher.id === teacherId) ?? null
    : null;

  const generatedAt = new Date();
  const targetDate = date ? new Date(date) : new Date();
  const targetDateKey = formatDateKey(targetDate);
  const targetDay = data.weekDays.find((day) => formatDateKey(day) === targetDateKey) || targetDate;

  const verificationCode = buildIssuedPdfVerificationCode("session_schedule", generatedAt);
  const fileName = buildSafePdfFilename("specia-günlük-seans-programi", "seans-programi");
  
  const bytes = await generateSessionSchedulePdf({
    title: "SPECIA Günlük Seans Programı",
    generatedAt,
    generatedByName: signingMeta.generatedByName,
    generatedByRole: signingMeta.generatedByRole,
    institutionId: signingMeta.institutionId,
    institutionManagerName: signingMeta.institutionManagerName,
    institutionManagerTitle: signingMeta.institutionManagerTitle,
    referenceCode: verificationCode,
    weekStart: targetDay,
    weekEnd: targetDay,
    teacherName: selectedTeacher?.name ?? null,
    days: [
      {
        label: targetDay.toLocaleDateString("tr-TR", { weekday: "long" }),
        date: targetDay,
        sessions: data.sessions
          .filter((session) => formatDateKey(session.sessionDate) === targetDateKey)
          .map((session) => ({
            studentName: `${session.student.firstName} ${session.student.lastName}`,
            teacherName: session.teacher?.name,
            roomName: session.room?.name,
            sessionType: session.sessionType,
            status: session.status,
            startTime: session.startTime,
            durationMinutes: session.durationMinutes,
            notes: session.notes,
          })),
      }
    ],
  });

  await issuePdfDocument({
    documentType: "session_schedule",
    verificationCode,
    title: "SPECIA Günlük Seans Programı",
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

function formatDateKey(value: Date) {
  return value.toLocaleDateString("en-CA");
}
