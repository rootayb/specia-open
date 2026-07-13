import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { getCalendarHubData } from "@/lib/data";
import { getCorporatePdfSigningMeta } from "@/lib/corporate-pdf-signatures";
import { buildIssuedPdfVerificationCode, issuePdfDocument } from "@/lib/issued-pdf-documents";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { generateCalendarAgendaPdf } from "@/lib/pdf";
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

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  const data = await getCalendarHubData(user, date);
  const signingMeta = await getCorporatePdfSigningMeta(user, user.institutionId);
  const generatedAt = new Date();
  const verificationCode = buildIssuedPdfVerificationCode("calendar_agenda", generatedAt);
  const fileName = buildSafePdfFilename("specia-günlük-takvim-ajandasi", "takvim-ajandasi");
  const bytes = await generateCalendarAgendaPdf({
    title: "SPECIA Günlük Takvim Ajandasi",
    generatedAt,
    generatedByName: signingMeta.generatedByName,
    generatedByRole: signingMeta.generatedByRole,
    institutionId: signingMeta.institutionId,
    institutionManagerName: signingMeta.institutionManagerName,
    institutionManagerTitle: signingMeta.institutionManagerTitle,
    referenceCode: verificationCode,
    selectedDate: data.selectedDate,
    events: data.agendaEvents.map((event) => ({
      title: event.title,
      description: event.description,
      scope: event.scope,
      startAt: event.startAt,
      endAt: event.endAt,
      ownerName: event.owner.name,
      assignedUserName: event.assignedUser?.name,
      studentName: event.student
        ? `${event.student.firstName} ${event.student.lastName}`
        : null,
    })),
    sessions: data.agendaSessions.map((session) => {
      const startsAt = new Date(session.sessionDate);
      const [hours, minutes] = session.startTime.split(":").map(Number);
      startsAt.setHours(hours, minutes, 0, 0);
      const endAt = new Date(startsAt.getTime() + session.durationMinutes * 60_000);

      return {
        studentName: `${session.student.firstName} ${session.student.lastName}`,
        teacherName: session.teacher?.name,
        roomName: session.room?.name,
        sessionType: session.sessionType,
        status: session.status,
        startAt: startsAt,
        endAt,
      };
    }),
  });

  await issuePdfDocument({
    documentType: "calendar_agenda",
    verificationCode,
    title: "SPECIA Günlük Takvim Ajandasi",
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
