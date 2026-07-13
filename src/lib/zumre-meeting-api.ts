import type { Prisma, ZumreMeetingAgendaItem, ZumreMeetingDocument } from "@/lib/prisma-shim";

import type { ApiUser } from "@/lib/api/auth";
import { parseDate } from "@/lib/utils";
import { buildZumreMeetingTitle, splitZumreParticipants } from "@/lib/zumre-meeting";
import type { ZumreMeetingDocumentInput } from "@/lib/schemas";

export type ZumreMeetingApiRecord = ZumreMeetingDocument & {
  agendaItems: ZumreMeetingAgendaItem[];
  createdBy?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

export const zumreMeetingApiInclude = {
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  },
  agendaItems: {
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.ZumreMeetingDocumentInclude;

export function assertZumreWritable(user: Pick<ApiUser, "role">) {
  return user.role !== "parent";
}

export function buildZumreMeetingWritePayload(
  input: ZumreMeetingDocumentInput,
  user: Pick<ApiUser, "institutionId">,
) {
  const meetingDate = parseDate(input.meetingDate);
  if (!meetingDate) {
    return { error: "Toplantı tarihi geçersiz." as const };
  }

  const announcementDate = input.announcementDate ? parseDate(input.announcementDate) : null;
  if (input.announcementDate && !announcementDate) {
    return { error: "Duyuru tarihi geçersiz." as const };
  }

  const title =
    input.title.trim() ||
    buildZumreMeetingTitle({
      educationYear: input.educationYear,
      schoolName: input.schoolName,
      zumreName: input.zumreName,
      termLabel: input.termLabel,
      documentType: input.documentType,
    });

  return {
    data: {
      institutionId: user.institutionId ?? null,
      documentType: input.documentType,
      status: input.status,
      title,
      educationYear: input.educationYear.trim(),
      termLabel: input.termLabel.trim(),
      meetingNo: input.meetingNo.trim(),
      meetingDate,
      meetingTime: input.meetingTime.trim(),
      location: input.location.trim(),
      city: input.city?.trim() || null,
      district: input.district?.trim() || null,
      schoolName: input.schoolName.trim(),
      zumreName: input.zumreName.trim(),
      gradeLevel: input.gradeLevel?.trim() || null,
      meetingType: input.meetingType.trim(),
      chairpersonName: input.chairpersonName.trim(),
      recorderName: input.recorderName?.trim() || null,
      principalName: input.principalName.trim(),
      principalTitle: input.principalTitle?.trim() || null,
      participants: input.participants.trim(),
      announcementDate,
      complianceNotes: input.complianceNotes?.trim() || null,
    },
    agendaItems: input.agendaItems.map((item, index) => ({
      sortOrder: index,
      title: item.title.trim(),
      discussionText: item.discussionText?.trim() || null,
      decisionText: item.decisionText?.trim() || null,
      responsible: null,
      followUpNote: null,
    })),
  };
}

export function serializeZumreMeetingForApi(document: ZumreMeetingApiRecord) {
  return {
    ...document,
    agendaItems: document.agendaItems.map((item) => ({
      id: item.id,
      documentId: item.documentId,
      sortOrder: item.sortOrder,
      title: item.title,
      discussionText: item.discussionText,
      decisionText: item.decisionText,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    participantList: splitZumreParticipants(document.participants),
    outputUrls: {
      pdf: `/api/mobile/v1/zumre/${document.id}/pdf`,
      docx: `/api/mobile/v1/zumre/${document.id}/docx`,
      webPdf: `/api/pdf/zumre/${document.id}`,
      webDocx: `/api/docx/zumre/${document.id}`,
    },
  };
}
