"use server";

import {
  getCoordinationMeetingAccessWhere,
  getCourseEvaluationAccessWhere,
  getDocumentAccessWhere,
  getStudentAccessWhere,
  getStudentFileAccessWhere,
  isAdminRole,
  isInstitutionRole,
  isParentRole,
} from "@/lib/permissions";
import { getReadableDbError } from "@/lib/db-errors";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export type GlobalSearchResult = {
  type: "student" | "document" | "note" | "evaluation" | "ram" | "meeting" | "file";
  label: string;
  description: string;
  href: string;
};

export async function searchGlobalAction(query: string): Promise<{
  success: boolean;
  message?: string;
  results?: GlobalSearchResult[];
}> {
  try {
    const user = await requireUser();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return { success: true, results: [] };
    }

    const searchWords = trimmed.split(/\s+/).filter(Boolean);
    const studentAccessWhere = getStudentAccessWhere(user);
    const documentAccessWhere = getDocumentAccessWhere(user);
    const courseEvaluationAccessWhere = getCourseEvaluationAccessWhere(user);
    const coordinationMeetingAccessWhere = getCoordinationMeetingAccessWhere(user);
    const studentFileAccessWhere = getStudentFileAccessWhere(user);
    const canSearchInstitutionRecords =
      (isInstitutionRole(user.role) || isAdminRole(user.role)) && Boolean(user.institutionId);

    const [
      students,
      documents,
      notes,
      evaluations,
      ramRecords,
      meetings,
      files,
    ] = await Promise.all([
      prisma.student.findMany({
        where: {
          AND: [
            studentAccessWhere,
            {
              AND: searchWords.map((word) => ({
                OR: [
                  { firstName: { contains: word } },
                  { lastName: { contains: word } },
                  { schoolNumber: { contains: word } },
                  { diagnosis: { contains: word } },
                  { motherName: { contains: word } },
                  { fatherName: { contains: word } },
                  { guardianName: { contains: word } },
                ],
              })),
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classroom: true,
        },
      }),
      prisma.bepDocument.findMany({
        where: {
          AND: [
            documentAccessWhere,
            {
              AND: searchWords.map((word) => ({
                OR: [
                  { title: { contains: word } },
                  { student: { firstName: { contains: word } } },
                  { student: { lastName: { contains: word } } },
                ],
              })),
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.personalNote.findMany({
        where: {
          ownerId: user.id,
          AND: searchWords.map((word) => ({
            OR: [
              { title: { contains: word } },
              { content: { contains: word } },
              { category: { contains: word } },
            ],
          })),
        },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
        },
      }),
      prisma.courseEvaluationDocument.findMany({
        where: {
          AND: [
            courseEvaluationAccessWhere,
            {
              AND: searchWords.map((word) => ({
                OR: [
                  { title: { contains: word } },
                  { courseName: { contains: word } },
                  { student: { firstName: { contains: word } } },
                  { student: { lastName: { contains: word } } },
                ],
              })),
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          courseName: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      canSearchInstitutionRecords
        ? prisma.institutionRamTracking.findMany({
            where: {
              institutionId: user.institutionId!,
              AND: searchWords.map((word) => ({
                OR: [
                  { title: { contains: word } },
                  { reportNumber: { contains: word } },
                  { supportCategory: { contains: word } },
                  { student: { firstName: { contains: word } } },
                  { student: { lastName: { contains: word } } },
                ],
              })),
            },
            take: 5,
            select: {
              id: true,
              title: true,
              reportNumber: true,
              student: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      prisma.coordinationMeeting.findMany({
        where: {
          AND: [
            coordinationMeetingAccessWhere,
            {
              AND: searchWords.map((word) => ({
                OR: [
                  { title: { contains: word } },
                  { location: { contains: word } },
                  { participants: { contains: word } },
                  { student: { firstName: { contains: word } } },
                  { student: { lastName: { contains: word } } },
                ],
              })),
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          location: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.studentFile.findMany({
        where: {
          AND: [
            studentFileAccessWhere,
            {
              AND: searchWords.map((word) => ({
                OR: [
                  { title: { contains: word } },
                  { fileName: { contains: word } },
                  { notes: { contains: word } },
                  { student: { firstName: { contains: word } } },
                  { student: { lastName: { contains: word } } },
                ],
              })),
            },
          ],
        },
        take: 5,
        select: {
          id: true,
          title: true,
          category: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

    const isParent = isParentRole(user.role);
    const results: GlobalSearchResult[] = [
      ...students.map((student) => ({
        type: "student" as const,
        label: `${student.firstName} ${student.lastName}`,
        description: student.classroom
          ? `${student.classroom} Sınıfı Öğrenci Profili`
          : "Kayıtlı Öğrenci Profili",
        href: isParent ? "/panel/cocuklarim" : `/panel/ogrenciler/${student.id}`,
      })),
      ...documents.map((document) => ({
        type: "document" as const,
        label: document.title,
        description: `${document.student.firstName} ${document.student.lastName} için Bireyselleştirilmiş Eğitim Planı`,
        href: `/panel/bep/${document.id}`,
      })),
      ...evaluations.map((evaluation) => ({
        type: "evaluation" as const,
        label: evaluation.title,
        description: `${evaluation.student.firstName} ${evaluation.student.lastName} - Kaba Değerlendirme / ${evaluation.courseName}`,
        href: `/panel/degerlendirmeler/kaba/${evaluation.id}`,
      })),
      ...ramRecords.map((record) => ({
        type: "ram" as const,
        label: record.title,
        description: `${record.student ? `${record.student.firstName} ${record.student.lastName} - ` : ""}RAM Takip (Rapor No: ${record.reportNumber || "-"})`,
        href: "/panel/ram-takip",
      })),
      ...meetings.map((meeting) => ({
        type: "meeting" as const,
        label: meeting.title,
        description: `${meeting.student ? `${meeting.student.firstName} ${meeting.student.lastName} - ` : ""}Toplantı / Konum: ${meeting.location || "Belirtilmemiş"}`,
        href: "/panel/toplantilar",
      })),
      ...files.map((file) => ({
        type: "file" as const,
        label: file.title,
        description: `${file.student ? `${file.student.firstName} ${file.student.lastName} - ` : ""}Belge (${file.category})`,
        href: "/panel/belgeler",
      })),
      ...notes.map((note) => ({
        type: "note" as const,
        label: note.title || "İsimsiz Not",
        description: `Kişisel Not / ${note.category}`,
        href: "/panel/notlar",
      })),
    ];

    return { success: true, results };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}
