import {
  GeneralExpenseCategory,
  GeneralExpenseStatus,
  GoalProgressStatus,
  InvoicePaymentMethod,
  LearningPhase,
  PlatformIncidentStatus,
  Prisma,
  StaffEmploymentType,
  StaffExpenseCategory,
  StaffExpenseStatus,
  StaffModulePermission,
  SupportTicketStatus,
  UserRole,
} from "@/lib/prisma-shim";

import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api/errors";
import { hashBepTransferToken } from "@/lib/bep-transfer";
import {
  canAccessEducationalAnalysis,
  getFamilyEducationPlanAccessWhere,
  canCreateBep,
  getCalendarEventAccessWhere,
  getCourseEvaluationAccessWhere,
  getCoordinationMeetingAccessWhere,
  getDocumentAccessWhere,
  getParentMessageAccessWhere,
  getSessionAccessWhere,
  getSessionRoomAccessWhere,
  getStudentAccessWhere,
  getStudentFileAccessWhere,
  getUserManagementWhere,
  getZumreMeetingAccessWhere,
  isAdminRole,
  isInstitutionRole,
  isParentRole,
  isTeacherRole,
} from "@/lib/permissions";
import {
  serializeBepForForm,
  serializeCourseEvaluationForForm,
  serializeStudentForForm,
} from "@/lib/serializers";
import { getProcessComponentLabels } from "@/lib/process-component-schedules";
import { educationTypeOf } from "@/lib/financial-compliance";
import { getActiveStudentParticipationWhere } from "@/lib/student-participation";
import { buildGoalAnalysis, type GoalAnalysis } from "@/lib/educational-analysis";

type ScopedUser = {
  id: string;
  role: UserRole;
  institutionId?: string | null;
  allowedModules?: StaffModulePermission[] | null;
};

const EDUCATIONAL_PROGRESS_HISTORY_LIMIT = 20;

export type EducationalProgressEntryRecord = {
  id: string;
  status: GoalProgressStatus;
  phase: LearningPhase;
  progressPercent: number;
  note: string;
  nextStep: string;
  measuredAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

export type EducationalProgressGoalRecord = {
  id: string;
  sortOrder: number;
  courseName: string;
  learningArea: string;
  learningOutcome: string;
  processComponents: string[];
  criterion: string;
  methodTechnique: string;
  materials: string;
  tendencies: string;
  evaluationMethods: string;
  latestEntry: EducationalProgressEntryRecord | null;
  history: EducationalProgressEntryRecord[];
};

export type EducationalProgressDocumentRecord = {
  id: string;
  title: string;
  status: string;
  approvalStatus: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  goalCount: number;
  completedGoalCount: number;
  goals: EducationalProgressGoalRecord[];
};

export type EducationalProgressStudentRecord = {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  classroom: string;
  documents: EducationalProgressDocumentRecord[];
};

export type TeacherEducationalProgressWorkspace = {
  checkedAt: string;
  studentCount: number;
  documentCount: number;
  goalCount: number;
  completedGoalCount: number;
  inProgressGoalCount: number;
  notStartedGoalCount: number;
  needsSupportGoalCount: number;
  progressEntryCount: number;
  averageProgressPercent: number;
  statusBreakdown: Array<{
    key: GoalProgressStatus;
    label: string;
    count: number;
    percent: number;
  }>;
  studentProgressAverages: Array<{
    studentId: string;
    studentName: string;
    averageProgressPercent: number;
    goalCount: number;
    completedGoalCount: number;
    documentCount: number;
  }>;
  students: EducationalProgressStudentRecord[];
};

export type TeacherEducationalAnalysisSummary = {
  checkedAt: Date;
  studentCount: number;
  documentCount: number;
  draftDocumentCount: number;
  completedDocumentCount: number;
  pendingApprovalCount: number;
  approvedDocumentCount: number;
  rejectedDocumentCount: number;
  totalSessionsThisMonth: number;
  plannedSessionsThisMonth: number;
  completedSessionsThisMonth: number;
  cancelledSessionsThisMonth: number;
  studentsWithDocuments: number;
  studentsWithCompletedDocuments: number;
  studentsWithRecentSessions: number;
  expiringFileCount: number;
  averageSessionsPerStudent: number;
  insights: string[];
  sessionTypeBreakdown: Array<{
    type: string;
    count: number;
  }>;
  weeklySessionFlow: Array<{
    week: number;
    label: string;
    total: number;
    completed: number;
    planned: number;
    cancelled: number;
  }>;
  studentsNeedingAttention: Array<{
    studentId: string;
    studentName: string;
    classroom: string | null;
    totalDocumentCount: number;
    completedDocumentCount: number;
    monthlySessionCount: number;
    completedSessionCount: number;
    latestDocumentUpdate: Date | null;
    latestSessionDate: Date | null;
    expiringFileCount: number;
    reasons: string[];
  }>;
  studentMomentum: Array<{
    studentId: string;
    studentName: string;
    classroom: string | null;
    totalDocumentCount: number;
    completedDocumentCount: number;
    monthlySessionCount: number;
    completedSessionCount: number;
    latestDocumentUpdate: Date | null;
    latestSessionDate: Date | null;
    expiringFileCount: number;
    reasons: string[];
  }>;
  expiringFiles: Array<{
    id: string;
    title: string;
    expiresAt: Date | null;
    studentId: string;
    student: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  recentDocuments: Array<{
    id: string;
    title: string;
    status: string;
    approvalStatus: string;
    updatedAt: Date;
    student: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
};

export type AdminUserFilters = {
  q?: string;
  role?: "all" | "admin" | "institution" | "teacher" | "parent";
  scope?: "all" | "independent" | string;
  state?: "all" | "active" | "inactive";
};

export type PlatformStatusIncidentUpdateRecord = {
  id: string;
  status: PlatformIncidentStatus;
  message: string;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type PlatformStatusIncidentRecord = {
  id: string;
  title: string;
  summary: string | null;
  serviceLabel: string | null;
  status: PlatformIncidentStatus;
  isActive: boolean;
  startedAt: Date;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  updatedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  updates: PlatformStatusIncidentUpdateRecord[];
};

export type InstitutionRamTrackingRecord = {
  id: string;
  title: string;
  reportNumber: string | null;
  supportCategory: string | null;
  reportDate: Date;
  validUntil: Date | null;
  weeklyIndividualHours: number;
  weeklyGroupHours: number;
  monthlyIndividualHours: number | null;
  monthlyGroupHours: number | null;
  monthlyMakeupHours: number;
  reviewDate: Date | null;
  notes: string | null;
  status: "active" | "review_due" | "expired" | "archived";
  createdAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type InstitutionTransportPlanRecord = {
  id: string;
  title: string;
  serviceType: string;
  routeName: string | null;
  pickupAddress: string | null;
  dropoffAddress: string | null;
  daysLabel: string | null;
  timeLabel: string | null;
  vehicleLabel: string | null;
  companionName: string | null;
  companionPhone: string | null;
  reviewDate: Date | null;
  notes: string | null;
  status: "active" | "paused" | "completed";
  createdAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type InstitutionArchiveRecord = {
  id: string;
  title: string;
  section: "inspection_file" | "institution_archive";
  category: string;
  documentNumber: string | null;
  responsibleUnit: string | null;
  issuedAt: Date | null;
  reviewDate: Date | null;
  fileName: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  notes: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type FamilyEducationPlanNoteRecord = {
  id: string;
  noteType: "meeting_note" | "family_feedback" | "teacher_note" | "home_program";
  title: string | null;
  content: string;
  nextStep: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type FamilyEducationPlanResponseRecord = {
  id: string;
  status: "done" | "partial" | "not_done";
  content: string | null;
  imageMimeType: string | null;
  imageName: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

export type FamilyEducationPlanRecord = {
  id: string;
  title: string;
  cadence: "daily" | "weekly" | "monthly";
  weeklyFocus: string | null;
  homeActivity: string | null;
  familySuggestion: string | null;
  deliveryMethod: string | null;
  sharedAt: Date | null;
  dueDate: Date | null;
  followUpDate: Date | null;
  status: "draft" | "shared" | "applied" | "not_applied" | "review_due" | "completed";
  implementationNote: string | null;
  familyFeedback: string | null;
  teacherNote: string | null;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  notes: FamilyEducationPlanNoteRecord[];
  responses: FamilyEducationPlanResponseRecord[];
};

export type TeacherReminderRecord = {
  id: string;
  kind: "ram" | "bep" | "family" | "meeting" | "document" | "transport" | "reminder";
  title: string;
  description: string;
  studentName: string | null;
  dueAt: Date | null;
  href: string;
  urgency: "high" | "medium" | "low";
};

export type InstitutionManagementStudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string | null;
};

export type StudentListFilters = {
  query?: string;
  schoolName?: string;
  classroom?: string;
  ownerId?: string;
  parentLink?: "linked" | "unlinked";
  bepStatus?: "none" | "draft" | "pending" | "completed";
  enrollmentType?: "regular" | "periodic";
  status?: "active" | "archived" | "all";
};

export async function getStudentOptionsForUser(user: ScopedUser) {
  const students = await prisma.student.findMany({
    where: {
      AND: [
        getStudentAccessWhere(user),
        getActiveStudentParticipationWhere(),
        { OR: [{ classroom: null }, { NOT: { classroom: "Sistem" } }] },
      ],
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      schoolName: true,
      classroom: true,
      _count: {
        select: {
          documents: true,
          parentStudentLinks: true,
        },
      },
    },
  });

  return students.map(({ _count, ...student }) => ({
    ...student,
    documentCount: _count.documents,
    parentLinkCount: _count.parentStudentLinks,
  }));
}

export async function getStudentFilterOptionsForUser(user: ScopedUser) {
  return prisma.student.findMany({
    where: {
      AND: [getStudentAccessWhere(user), { OR: [{ classroom: null }, { NOT: { classroom: "Sistem" } }] }],
    },
    select: {
      schoolName: true,
      classroom: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getStudentsForUser(user: ScopedUser, filters: StudentListFilters = {}) {
  const query = filters.query?.trim();
  const filterWhere: Prisma.StudentWhereInput = {
    ...(query
      ? {
          OR: [
            { firstName: { contains: query } },
            { lastName: { contains: query } },
            { schoolNumber: { contains: query } },
          ],
        }
      : {}),
    ...(filters.schoolName ? { schoolName: filters.schoolName } : {}),
    ...(filters.classroom ? { classroom: filters.classroom } : {}),
    ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
    ...(filters.parentLink === "linked"
      ? { parentStudentLinks: { some: {} } }
      : filters.parentLink === "unlinked"
        ? { parentStudentLinks: { none: {} } }
        : {}),
    ...(filters.bepStatus === "none"
      ? { documents: { none: {} } }
      : filters.bepStatus === "draft"
        ? { documents: { some: { status: "draft" } } }
        : filters.bepStatus === "pending"
          ? { documents: { some: { approvalStatus: "pending" } } }
          : filters.bepStatus === "completed"
            ? { documents: { some: { status: "completed" } } }
            : {}),
    ...(filters.enrollmentType ? { enrollmentType: filters.enrollmentType } : {}),
    ...(filters.status === "archived"
      ? { isActive: false }
      : filters.status === "all"
        ? {}
        : { isActive: true }),
  };

  return prisma.student.findMany({
    where: {
      AND: [
        getStudentAccessWhere(user),
        filterWhere,
        { OR: [{ classroom: null }, { NOT: { classroom: "Sistem" } }] }
      ],
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      documents: {
        select: {
          id: true,
          title: true,
          status: true,
          approvalStatus: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      parentStudentLinks: {
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });
}

export async function getStudentById(user: ScopedUser, studentId: string) {
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      ...getStudentAccessWhere(user),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      documents: {
        select: {
          id: true,
          title: true,
          status: true,
          approvalStatus: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: "desc" },
      },
      studentFiles: {
        orderBy: { createdAt: "desc" },
        omit: {
          fileData: true,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      courseEvaluations: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          updatedAt: true,
          evaluationDate: true,
        },
      },
      evaluationDocuments: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          updatedAt: true,
          evaluationDate: true,
        },
      },
      familyEducationPlans: {
        orderBy: [{ sharedAt: "desc" }, { updatedAt: "desc" }],
        select: {
          id: true,
          title: true,
          cadence: true,
          status: true,
          sharedAt: true,
          updatedAt: true,
          dueDate: true,
          followUpDate: true,
        },
      },
      parentStudentLinks: {
        include: {
          parent: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!student) {
    return null;
  }

  const [messages, meetings, sessions] = await Promise.all([
    prisma.parentMessage.findMany({
      where: {
        studentId: student.id,
        ...getParentMessageAccessWhere(user),
      },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        subject: true,
        createdAt: true,
        sender: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.coordinationMeeting.findMany({
      where: {
        studentId: student.id,
        ...getCoordinationMeetingAccessWhere(user),
      },
      orderBy: { scheduledAt: "desc" },
      take: 12,
      select: {
        id: true,
        title: true,
        meetingType: true,
        status: true,
        scheduledAt: true,
      },
    }),
    prisma.institutionSession.findMany({
      where: {
        studentId: student.id,
        ...getSessionAccessWhere(user),
      },
      orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
      take: 12,
      select: {
        id: true,
        sessionDate: true,
        startTime: true,
        sessionType: true,
        status: true,
        teacher: {
          select: {
            name: true,
          },
        },
      },
    }),
  ]);

  const timeline = [
    {
      key: `student-created-${student.id}`,
      occurredAt: student.createdAt,
      type: "student" as const,
      title: "Öğrenci profili oluşturuldu",
      description: `${student.firstName} ${student.lastName} için kayıt açıldı.`,
      href: `/panel/ogrenciler/${student.id}`,
    },
    ...student.documents.flatMap((document) => {
      const items = [
        {
          key: `document-created-${document.id}`,
          occurredAt: document.createdAt,
          type: "document" as const,
          title: "BEP kaydı eklendi",
          description: `${document.title} başlıklı BEP kaydı oluşturuldu.`,
          href: `/panel/bep/${document.id}`,
        },
      ];

      if (document.updatedAt.getTime() !== document.createdAt.getTime()) {
        items.push({
          key: `document-updated-${document.id}`,
          occurredAt: document.updatedAt,
          type: "document" as const,
          title: "BEP kaydı güncellendi",
          description: `${document.title} kaydında yeni düzenleme yapıldı.`,
          href: `/panel/bep/${document.id}`,
        });
      }

      return items;
    }),
    ...student.studentFiles.map((file) => ({
      key: `file-${file.id}`,
      occurredAt: file.createdAt,
      type: "file" as const,
      title: "Öğrenci belgesi eklendi",
      description: `${file.title} belgesi arşive işlendi.`,
      href: "/panel/belgeler",
    })),
    ...messages.map((message) => ({
      key: `message-${message.id}`,
      occurredAt: message.createdAt,
      type: "message" as const,
      title: "İletişim kaydı oluştu",
      description: `${message.sender.name} tarafından "${message.subject}" konulu mesaj gönderildi.`,
      href: "/panel/iletisim",
    })),
    ...meetings.map((meeting) => ({
      key: `meeting-${meeting.id}`,
      occurredAt: meeting.scheduledAt,
      type: "meeting" as const,
      title: "Toplantı planı işlendi",
      description: `${meeting.title} · ${meetingTypeToLabel(meeting.meetingType)} · ${meetingStatusToLabel(meeting.status)}`,
      href: "/panel/toplantilar",
    })),
    ...sessions.map((session) => ({
      key: `session-${session.id}`,
      occurredAt: buildSessionDateTime(session.sessionDate, session.startTime),
      type: "session" as const,
      title: "Seans akışı güncellendi",
      description: `${session.teacher?.name ?? "Atanmamış öğretmen"} · ${sessionTypeToLabel(session.sessionType)} · ${sessionStatusToLabel(session.status)}`,
      href: "/panel/seans-programi",
    })),
  ]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, 30);

  return {
    ...student,
    formValues: serializeStudentForForm(student),
    timeline,
  };
}

export async function getBepDocumentById(user: ScopedUser, documentId: string) {
  const document = await prisma.bepDocument.findFirst({
    where: {
      id: documentId,
      ...getDocumentAccessWhere(user),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolName: true,
          institutionId: true,
          parentStudentLinks: {
            include: {
              parent: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
      performanceEntries: {
        orderBy: { sortOrder: "asc" },
      },
      planRows: {
        orderBy: { sortOrder: "asc" },
      },
      supportServiceEntries: {
        orderBy: { sortOrder: "asc" },
      },
      decisionEntries: {
        orderBy: { sortOrder: "asc" },
      },
      committeeMembers: {
        orderBy: { sortOrder: "asc" },
      },
      subjectTeachers: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!document) {
    return null;
  }

  // Yerel sürüm: evrak kontrol kodu üretimi kaldırıldı.
  return {
    ...document,
    verificationCode: null as string | null,
    formValues: serializeBepForForm(document),
  };
}

export async function getBepTransferInviteByToken(token: string) {
  if (!token.trim()) {
    return null;
  }

  return prisma.bepTransferInvite.findUnique({
    where: {
      tokenHash: hashBepTransferToken(token),
    },
    include: {
      document: {
        select: {
          id: true,
          title: true,
          ownerId: true,
          institutionId: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              ownerId: true,
              institutionId: true,
              schoolName: true,
              classroom: true,
            },
          },
        },
      },
      fromUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      acceptedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getStudentTransferInviteByToken(token: string) {
  if (!token.trim()) {
    return null;
  }

  return prisma.studentTransferInvite.findUnique({
    where: {
      tokenHash: hashBepTransferToken(token),
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          ownerId: true,
          institutionId: true,
          schoolName: true,
          classroom: true,
        },
      },
      fromUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      acceptedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getCourseEvaluationsForUser(user: ScopedUser) {
  return prisma.courseEvaluationDocument.findMany({
    where: getCourseEvaluationAccessWhere(user),
    orderBy: { updatedAt: "desc" },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolName: true,
        },
      },
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      rows: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });
}

export async function getCourseEvaluationById(user: ScopedUser, documentId: string) {
  const document = await prisma.courseEvaluationDocument.findFirst({
    where: {
      id: documentId,
      ...getCourseEvaluationAccessWhere(user),
    },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolName: true,
          schoolNumber: true,
        },
      },
      rows: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!document) {
    return null;
  }

  // Yerel sürüm: evrak kontrol kodu üretimi kaldırıldı.
  return {
    ...document,
    verificationCode: null as string | null,
    formValues: serializeCourseEvaluationForForm(document),
  };
}

export async function getDashboardSummary(user: ScopedUser) {
  const studentScope = getStudentAccessWhere(user);
  const documentScope = getDocumentAccessWhere(user);
  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [
    studentCount,
    documentCount,
    completedCount,
    pendingApprovalCount,
    studentFileCount,
    teacherCount,
    parentCount,
    inviteCount,
    todaySessionCount,
    roomCount,
  ] =
    await Promise.all([
      prisma.student.count({ where: studentScope }),
      prisma.bepDocument.count({ where: documentScope }),
      prisma.bepDocument.count({ where: { ...documentScope, status: "completed" } }),
      user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role))
        ? prisma.bepDocument.count({
            where: {
              institutionId: user.institutionId,
              approvalStatus: "pending",
            },
          })
        : Promise.resolve(0),
      prisma.studentFile.count({ where: getStudentFileAccessWhere(user) }),
      user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role))
        ? prisma.user.count({
            where: {
              institutionId: user.institutionId,
              role: "teacher",
            },
          })
        : Promise.resolve(0),
      user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role))
        ? prisma.user.count({
            where: {
              institutionId: user.institutionId,
              role: "parent",
            },
          })
        : Promise.resolve(0),
      user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role))
        ? prisma.inviteCode.count({
            where: {
              institutionId: user.institutionId,
              usedAt: null,
              expiresAt: { gt: new Date() },
            },
          })
        : Promise.resolve(0),
      user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role))
        ? prisma.institutionSession.count({
            where: {
              institutionId: user.institutionId,
              sessionDate: {
                gte: dayStart,
                lt: dayEnd,
              },
            },
          })
        : Promise.resolve(0),
      user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role))
        ? prisma.sessionRoom.count({
            where: {
              institutionId: user.institutionId,
            },
          })
        : Promise.resolve(0),
    ]);

  return {
    studentCount,
    documentCount,
    completedCount,
    pendingApprovalCount,
    studentFileCount,
    teacherCount,
    parentCount,
    inviteCount,
    todaySessionCount,
    roomCount,
  };
}

export async function getRecentDocuments(user: ScopedUser) {
  return prisma.bepDocument.findMany({
    where: getDocumentAccessWhere(user),
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

export async function getParentCommunicationHub(user: ScopedUser) {
  const canBuildRecipientOptions = isTeacherRole(user.role) || isParentRole(user.role);

  const [messages, managedStudents, parentLinks] = await Promise.all([
    prisma.parentMessage.findMany({
      where: getParentMessageAccessWhere(user),
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        },
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    canBuildRecipientOptions
      ? prisma.student.findMany({
          where: {
            AND: [
              getStudentAccessWhere(user),
              { OR: [{ classroom: null }, { NOT: { classroom: "Sistem" } }] }
            ]
          },
          orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
            owner: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
            parentStudentLinks: {
              include: {
                parent: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    isParentRole(user.role)
      ? prisma.parentStudentLink.findMany({
          where: { parentId: user.id },
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                classroom: true,
                owner: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
  ]);

  const recipientOptions =
    isTeacherRole(user.role)
      ? managedStudents.flatMap((student) =>
          student.parentStudentLinks.map((link) => ({
            key: `${student.id}:${link.parent.id}`,
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            studentClassroom: student.classroom,
            recipientId: link.parent.id,
            recipientName: link.parent.name,
            recipientEmail: link.parent.email,
            recipientRole: "parent" as const,
          })),
        )
      : isParentRole(user.role)
        ? parentLinks
            .filter((link) => link.student.owner.role === "teacher")
            .map((link) => ({
              key: `${link.student.id}:${link.student.owner.id}`,
              studentId: link.student.id,
              studentName: `${link.student.firstName} ${link.student.lastName}`,
              studentClassroom: link.student.classroom,
              recipientId: link.student.owner.id,
              recipientName: link.student.owner.name,
              recipientEmail: link.student.owner.email,
              recipientRole: "teacher" as const,
            }))
        : [];

  const uniqueRecipientOptions = Array.from(
    recipientOptions.reduce<Map<string, (typeof recipientOptions)[number]>>((map, option) => {
      map.set(option.key, option);
      return map;
    }, new Map()),
  ).map(([, option]) => option);

  return {
    messages,
    managedStudents,
    recipientOptions: uniqueRecipientOptions,
    unreadIncomingCount: messages.filter(
      (message) => message.recipientId === user.id && !message.readAt,
    ).length,
  };
}

export async function getCoordinationMeetingHub(user: ScopedUser) {
  const [meetings, students] = await Promise.all([
    prisma.coordinationMeeting.findMany({
      where: getCoordinationMeetingAccessWhere(user),
      orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
      take: 80,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        },
        actionItems: {
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.student.findMany({
      where: {
        AND: [
          getStudentAccessWhere(user),
          getActiveStudentParticipationWhere(),
          { OR: [{ classroom: null }, { NOT: { classroom: "Sistem" } }] },
        ],
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classroom: true,
      },
    }),
  ]);

  return {
    meetings,
    students,
    openActionItemCount: meetings.reduce(
      (total, meeting) =>
        total + meeting.actionItems.filter((item) => item.status === "open").length,
      0,
    ),
    plannedMeetingCount: meetings.filter((meeting) => meeting.status === "planned").length,
  };
}

export async function getZumreMeetingHub(user: ScopedUser, documentType: string = "zumre") {
  const [documents, institutionSettings] = await Promise.all([
    prisma.zumreMeetingDocument.findMany({
      where: {
        ...getZumreMeetingAccessWhere(user),
        documentType,
      },
      orderBy: [{ meetingDate: "desc" }, { createdAt: "desc" }],
      take: 80,
      include: {
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
      },
    }),
    user.institutionId
      ? prisma.institutionSettings.findUnique({
          where: { institutionId: user.institutionId },
        })
      : null,
  ]);

  return {
    documents,
    institutionSettings,
    draftCount: documents.filter((document) => document.status === "draft").length,
    completedCount: documents.filter((document) => document.status === "completed").length,
  };
}

export async function getZumreMeetingById(user: ScopedUser, id: string) {
  return prisma.zumreMeetingDocument.findFirst({
    where: {
      id,
      ...getZumreMeetingAccessWhere(user),
    },
    include: {
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
    },
  });
}

function buildSessionDateTime(sessionDate: Date, startTime: string) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const date = new Date(sessionDate);
  date.setHours(hours || 0, minutes || 0, 0, 0);
  return date;
}

function sessionTypeToLabel(type: string) {
  const labels: Record<string, string> = {
    individual: "Bireysel seans",
    group: "Grup seansı",
    speech: "Dil konuşma",
    occupational: "Ergoterapi",
    psychomotor: "Psikomotor",
    resource_room: "Kaynak oda",
    makeup: "Telafi",
    parent_meeting: "Veli görüşmesi",
  };

  return labels[type] ?? type;
}

function meetingTypeToLabel(type: string) {
  const labels: Record<string, string> = {
    parent_meeting: "Veli görüşmesi",
    ram_meeting: "RAM toplantısı",
    coordination: "Koordinasyon toplantısı",
    other: "Diğer",
  };

  return labels[type] ?? type;
}

function meetingStatusToLabel(status: string) {
  const labels: Record<string, string> = {
    planned: "Planlandı",
    completed: "Tamamlandı",
    cancelled: "İptal edildi",
  };

  return labels[status] ?? status;
}

function sessionStatusToLabel(status: string) {
  const labels: Record<string, string> = {
    planned: "Planlandı",
    completed: "Tamamlandı",
    cancelled: "İptal edildi",
  };

  return labels[status] ?? status;
}

export async function getCoordinationCenter(user: ScopedUser) {
  const now = new Date();
  const nextFourteenDays = new Date(now);
  nextFourteenDays.setDate(nextFourteenDays.getDate() + 14);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const [unreadMessages, openMeetings, upcomingSessions, expiringFiles, recentMeetings] =
    await Promise.all([
      prisma.parentMessage.findMany({
        where: {
          ...getParentMessageAccessWhere(user),
          recipientId: user.id,
          readAt: null,
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.coordinationMeeting.findMany({
        where: {
          ...getCoordinationMeetingAccessWhere(user),
          actionItems: {
            some: {
              status: "open",
            },
          },
        },
        orderBy: { scheduledAt: "desc" },
        take: 8,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          actionItems: {
            where: {
              status: "open",
            },
            orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }],
          },
        },
      }),
      prisma.institutionSession.findMany({
        where: {
          ...getSessionAccessWhere(user),
          sessionDate: {
            gte: todayStart,
            lte: nextFourteenDays,
          },
        },
        orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
        take: 8,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
            },
          },
          room: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.studentFile.findMany({
        where: {
          ...getStudentFileAccessWhere(user),
          expiresAt: {
            gte: now,
            lte: nextFourteenDays,
          },
        },
        orderBy: { expiresAt: "asc" },
        take: 8,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.coordinationMeeting.findMany({
        where: {
          ...getCoordinationMeetingAccessWhere(user),
          scheduledAt: {
            gte: todayStart,
            lte: nextFourteenDays,
          },
        },
        orderBy: { scheduledAt: "asc" },
        take: 6,
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

  const openActionItems = openMeetings.flatMap((meeting) =>
    meeting.actionItems.map((item) => ({
      id: item.id,
      title: item.title,
      ownerLabel: item.ownerLabel,
      dueDate: item.dueDate,
      meetingTitle: meeting.title,
      studentName: meeting.student
        ? `${meeting.student.firstName} ${meeting.student.lastName}`
        : "Genel kayıt",
    })),
  );

  return {
    unreadMessages,
    openActionItems,
    upcomingSessions,
    expiringFiles,
    recentMeetings,
    counts: {
      unreadMessages: unreadMessages.length,
      openActionItems: openActionItems.length,
      upcomingSessions: upcomingSessions.length,
      expiringFiles: expiringFiles.length,
      recentMeetings: recentMeetings.length,
    },
  };
}

export async function getPendingBepApprovals(user: ScopedUser) {
  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return [];
  }

  return prisma.bepDocument.findMany({
    where: {
      institutionId: user.institutionId,
      approvalStatus: "pending",
    },
    orderBy: { updatedAt: "desc" },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classroom: true,
          schoolName: true,
        },
      },
    },
  });
}

export async function getLatestCommitteeTemplate(user: ScopedUser) {
  const document = await prisma.bepDocument.findFirst({
    where: getDocumentAccessWhere(user),
    orderBy: { updatedAt: "desc" },
    select: {
      committeeMembers: {
        orderBy: { sortOrder: "asc" },
        select: {
          sortOrder: true,
          role: true,
          title: true,
          fullName: true,
          branch: true,
        },
      },
    },
  });

  return document?.committeeMembers ?? [];
}

export async function getInstitutionMembers(user: ScopedUser) {
  const where = getUserManagementWhere(user);

  return prisma.user.findMany({
    where,
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branch: true,
      employmentType: true,
      allowedModules: true,
      isActive: true,
      institutionId: true,
      institution: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      _count: {
        select: {
          students: true,
          documents: true,
          parentStudentLinks: true,
          assignedSessions: true,
        },
      },
      parentStudentLinks: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
}

export async function getInstitutionRooms(user: ScopedUser) {
  return prisma.sessionRoom.findMany({
    where: {
      ...getSessionRoomAccessWhere(user),
      isActive: true,
    },
    orderBy: [{ name: "asc" }],
    include: {
      _count: {
        select: {
          sessions: true,
        },
      },
    },
  });
}

function buildScheduleWeek(selectedDate: Date) {
  const normalizedDate = new Date(selectedDate);
  normalizedDate.setHours(0, 0, 0, 0);
  const dayIndex = (normalizedDate.getDay() + 6) % 7;
  const weekStart = new Date(normalizedDate);
  weekStart.setDate(weekStart.getDate() - dayIndex);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return date;
  });

  return {
    selectedDate: normalizedDate,
    weekStart,
    weekEnd,
    weekDays,
  };
}

async function getScheduleStudents(user: ScopedUser, selectedDate: Date) {
  const select = {
    id: true,
    firstName: true,
    lastName: true,
    classroom: true,
    ramReports: {
      where: {
        status: "active" as const,
      },
      select: {
        id: true,
        weeklyIndividualHours: true,
        weeklyGroupHours: true,
        validUntil: true,
      },
    },
  };

  try {
    return await prisma.student.findMany({
      where: {
        AND: [
          getStudentAccessWhere(user),
          getActiveStudentParticipationWhere(selectedDate),
          { OR: [{ classroom: null }, { NOT: { classroom: "Sistem" } }] },
        ],
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select,
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2022"
    ) {
      throw error;
    }

    // Keep scheduling available while an additive Student schema deployment is propagating.
    return prisma.student.findMany({
      where: {
        AND: [
          getStudentAccessWhere(user),
          { OR: [{ classroom: null }, { NOT: { classroom: "Sistem" } }] },
        ],
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select,
    });
  }
}

export async function getInstitutionSchedule(
  user: ScopedUser,
  dateInput?: string | Date,
  teacherFilterId?: string,
) {
  const baseDate = dateInput ? new Date(dateInput) : new Date();
  const selectedDate = Number.isNaN(baseDate.getTime()) ? new Date() : baseDate;
  const { weekStart, weekEnd, weekDays } = buildScheduleWeek(selectedDate);

  const teacherScope =
    teacherFilterId && user.institutionId
      ? {
          teacherId: teacherFilterId,
        }
      : {};

  const [rooms, archivedRooms, timeSlots, sessions, historySessions, teachers, students] =
    await Promise.all([
    prisma.sessionRoom.findMany({
      where: {
        ...getSessionRoomAccessWhere(user),
        isActive: true,
      },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    }),
    prisma.sessionRoom.findMany({
      where: {
        ...getSessionRoomAccessWhere(user),
        isActive: false,
      },
      orderBy: [{ archivedAt: "desc" }, { name: "asc" }],
      take: 10,
    }),
    user.institutionId
      ? prisma.sessionTimeSlot.findMany({
          where: {
            institutionId: user.institutionId,
            isActive: true,
          },
          orderBy: [{ sortOrder: "asc" }, { startTime: "asc" }],
        })
      : Promise.resolve([]),
    prisma.institutionSession.findMany({
      where: {
        ...getSessionAccessWhere(user),
        ...teacherScope,
        deletedAt: null,
        sessionDate: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }, { createdAt: "asc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            branch: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            color: true,
            isActive: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            name: true,
            startTime: true,
            durationMinutes: true,
            sortOrder: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.institutionSession.findMany({
      where: {
        ...getSessionAccessWhere(user),
        ...teacherScope,
        OR: [
          {
            deletedAt: { not: null },
            sessionDate: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
          { sessionDate: { lt: weekStart } },
          { status: { in: ["completed", "cancelled"] } },
        ],
      },
      orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
      take: 30,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            branch: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            color: true,
            isActive: true,
          },
        },
        timeSlot: {
          select: {
            id: true,
            name: true,
            startTime: true,
            durationMinutes: true,
            sortOrder: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: user.institutionId
        ? {
            institutionId: user.institutionId,
            role: UserRole.teacher,
            isActive: true,
          }
        : isAdminRole(user.role)
          ? {
              role: UserRole.teacher,
              isActive: true,
            }
          : {
              id: user.id,
            },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        branch: true,
      },
    }),
    getScheduleStudents(user, selectedDate),
  ]);

  return {
    selectedDate: weekStart,
    focusDate: selectedDate,
    weekDays,
    teacherFilterId: teacherFilterId ?? "",
    rooms,
    archivedRooms,
    timeSlots,
    sessions,
    historySessions,
    teachers,
    students,
  };
}

function buildMonthGrid(selectedDate: Date) {
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
  const gridStart = new Date(monthStart);
  const startDay = (gridStart.getDay() + 6) % 7;
  gridStart.setDate(gridStart.getDate() - startDay);
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridEnd.getDate() + 42);

  return { monthStart, monthEnd, gridStart, gridEnd };
}

export async function getCalendarHubData(user: ScopedUser, selectedDateInput?: string | Date) {
  const now = selectedDateInput ? new Date(selectedDateInput) : new Date();
  const selectedDate = Number.isNaN(now.getTime()) ? new Date() : now;
  selectedDate.setHours(0, 0, 0, 0);

  const { monthStart, monthEnd, gridStart, gridEnd } = buildMonthGrid(selectedDate);
  const agendaStart = new Date(selectedDate);
  const agendaEnd = new Date(selectedDate);
  agendaEnd.setDate(agendaEnd.getDate() + 1);

  const canUseInstitutionAssignments = user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role));

  const [events, sessions, assignableUsers, students] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        ...getCalendarEventAccessWhere(user),
        startAt: { lt: gridEnd },
        endAt: { gte: gridStart },
      },
      orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
      include: {
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        },
      },
    }),
    prisma.institutionSession.findMany({
      where: {
        ...getSessionAccessWhere(user),
        sessionDate: {
          gte: gridStart,
          lt: gridEnd,
        },
      },
      orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            branch: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    }),
    canUseInstitutionAssignments
      ? prisma.user.findMany({
          where: {
            institutionId: user.institutionId,
            isActive: true,
            role: {
              in: [UserRole.teacher, UserRole.institution],
            },
          },
          orderBy: [{ role: "asc" }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        })
      : Promise.resolve([]),
    prisma.student.findMany({
      where: getStudentAccessWhere(user),
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classroom: true,
      },
    }),
  ]);

  const upcomingItems = [
    ...events
      .filter((event) => event.endAt >= new Date())
      .slice(0, 6)
      .map((event) => ({
        type: "event" as const,
        startsAt: event.startAt,
        title: event.title,
        subtitle:
          event.scope === "institution"
            ? "Kurum etkinliği"
            : event.assignedUser?.name ?? event.owner.name,
      })),
    ...sessions
      .map((session) => {
        const startsAt = new Date(session.sessionDate);
        const [hours, minutes] = session.startTime.split(":").map(Number);
        startsAt.setHours(hours, minutes, 0, 0);

        return {
          ...session,
          startsAt,
        };
      })
      .filter((session) => session.startsAt >= new Date())
      .slice(0, 6)
      .map((session) => ({
        type: "session" as const,
        startsAt: session.startsAt,
        title: `${session.student.firstName} ${session.student.lastName} seansi`,
        subtitle: session.teacher?.name ?? "Öğretmen atanmadi",
      })),
  ]
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
    .slice(0, 6);

  return {
    selectedDate,
    monthStart,
    monthEnd,
    events,
    sessions,
    assignableUsers,
    students: students.filter((s) => s.classroom !== "Sistem"),
    upcomingItems,
    agendaEvents: events.filter((event) => event.startAt < agendaEnd && event.endAt >= agendaStart),
    agendaSessions: sessions.filter(
      (session) => session.sessionDate >= agendaStart && session.sessionDate < agendaEnd,
    ),
  };
}

export async function getInstitutionReports(user: ScopedUser, period: string = "month") {
  const now = new Date();
  let startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  let endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  if (period === "daily") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (period === "weekly") {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.getFullYear(), now.getMonth(), diff);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 7);
  } else if (period === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (period === "3months") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (period === "6months") {
    startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  } else if (period === "1year") {
    startDate = new Date(now.getFullYear() - 1, now.getMonth() + 1, 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  const nextThirtyDays = new Date(now);
  nextThirtyDays.setDate(nextThirtyDays.getDate() + 30);

  const studentScope = getStudentAccessWhere(user);
  const documentScope = getDocumentAccessWhere(user);
  const sessionScope = getSessionAccessWhere(user);
  const roomScope = getSessionRoomAccessWhere(user);
  const memberScope = getUserManagementWhere(user);

  const [
    studentCount,
    documentCount,
    completedDocuments,
    approvedDocuments,
    pendingApprovals,
    studentFileCount,
    expiringFiles,
    teachers,
    parents,
    rooms,
    sessionsThisMonth,
    recentDocuments,
  ] = await Promise.all([
    prisma.student.count({ where: studentScope }),
    prisma.bepDocument.count({ where: documentScope }),
    prisma.bepDocument.count({ where: { ...documentScope, status: "completed" } }),
    prisma.bepDocument.count({ where: { ...documentScope, approvalStatus: "approved" } }),
    prisma.bepDocument.count({ where: { ...documentScope, approvalStatus: "pending" } }),
    prisma.studentFile.count({ where: getStudentFileAccessWhere(user) }),
    prisma.studentFile.count({
      where: {
        ...getStudentFileAccessWhere(user),
        expiresAt: {
          gte: now,
          lte: nextThirtyDays,
        },
      },
    }),
    prisma.user.findMany({
      where: {
        ...memberScope,
        role: UserRole.teacher,
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        branch: true,
      },
    }),
    prisma.user.count({
      where: {
        ...memberScope,
        role: UserRole.parent,
      },
    }),
    prisma.sessionRoom.findMany({
      where: roomScope,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        color: true,
        _count: {
          select: {
            sessions: true,
          },
        },
      },
    }),
    prisma.institutionSession.findMany({
      where: {
        ...sessionScope,
        sessionDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    prisma.bepDocument.findMany({
      where: documentScope,
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        owner: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
  ]);

  const sessionTypeBreakdown = sessionsThisMonth.reduce<Record<string, number>>((acc, session) => {
    acc[session.sessionType] = (acc[session.sessionType] ?? 0) + 1;
    return acc;
  }, {});

  const staffWorkload = teachers.map((teacher) => {
    const teacherSessions = sessionsThisMonth.filter((session) => session.teacherId === teacher.id);
    const completed = teacherSessions.filter((session) => session.status === "completed").length;

    return {
      ...teacher,
      sessionCount: teacherSessions.length,
      completedSessionCount: completed,
    };
  });

  const studentSessionLeaderboard = Object.values(
    sessionsThisMonth.reduce<
      Record<
        string,
        {
          studentId: string;
          studentName: string;
          sessionCount: number;
        }
      >
    >((acc, session) => {
      const key = session.studentId;
      acc[key] ??= {
        studentId: session.studentId,
        studentName: `${session.student.firstName} ${session.student.lastName}`,
        sessionCount: 0,
      };
      acc[key].sessionCount += 1;
      return acc;
    }, {}),
  )
    .sort((a, b) => b.sessionCount - a.sessionCount)
    .slice(0, 5);

  const plannedSessions = sessionsThisMonth.filter((session) => session.status === "planned").length;
  const completedSessions = sessionsThisMonth.filter(
    (session) => session.status === "completed",
  ).length;
  const cancelledSessions = sessionsThisMonth.filter(
    (session) => session.status === "cancelled",
  ).length;

  return {
    studentCount,
    documentCount,
    completedDocuments,
    approvedDocuments,
    pendingApprovals,
    studentFileCount,
    expiringFiles,
    teacherCount: teachers.length,
    parentCount: parents,
    roomCount: rooms.length,
    totalSessionsThisMonth: sessionsThisMonth.length,
    plannedSessions,
    completedSessions,
    cancelledSessions,
    sessionTypeBreakdown: Object.entries(sessionTypeBreakdown)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    staffWorkload,
    rooms,
    studentSessionLeaderboard,
    recentDocuments,
  };
}

export async function getTeacherEducationalAnalysis(
  user: ScopedUser,
): Promise<TeacherEducationalAnalysisSummary | null> {
  if (!canAccessEducationalAnalysis(user.role, user.allowedModules)) {
    return null;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const lastThirtyDays = new Date(now);
  lastThirtyDays.setDate(lastThirtyDays.getDate() - 30);
  const nextThirtyDays = new Date(now);
  nextThirtyDays.setDate(nextThirtyDays.getDate() + 30);

  const studentScope = getStudentAccessWhere(user);
  const documentScope = getDocumentAccessWhere(user);
  const sessionScope = getSessionAccessWhere(user);
  const fileScope = getStudentFileAccessWhere(user);

  const [students, documents, sessionsThisMonth, recentSessions, expiringFilesRaw] =
    await Promise.all([
      prisma.student.findMany({
        where: studentScope,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classroom: true,
        },
      }),
      prisma.bepDocument.findMany({
        where: documentScope,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          studentId: true,
          title: true,
          status: true,
          approvalStatus: true,
          updatedAt: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      prisma.institutionSession.findMany({
        where: {
          ...sessionScope,
          sessionDate: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
        select: {
          id: true,
          studentId: true,
          status: true,
          sessionType: true,
          sessionDate: true,
          startTime: true,
        },
      }),
      prisma.institutionSession.findMany({
        where: {
          ...sessionScope,
          sessionDate: {
            gte: lastThirtyDays,
            lte: now,
          },
        },
        orderBy: [{ sessionDate: "desc" }, { startTime: "desc" }],
        select: {
          id: true,
          studentId: true,
          status: true,
          sessionDate: true,
        },
      }),
      prisma.studentFile.findMany({
        where: {
          ...fileScope,
          studentId: { not: null },
          expiresAt: {
            gte: now,
            lte: nextThirtyDays,
          },
        },
        orderBy: { expiresAt: "asc" },
        select: {
          id: true,
          title: true,
          expiresAt: true,
          studentId: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
    ]);

  const expiringFiles = expiringFilesRaw.flatMap((file) =>
    file.student ? [{ ...file, studentId: file.student.id, student: file.student }] : [],
  );

  const documentsByStudent = documents.reduce<Record<string, typeof documents>>((acc, document) => {
    acc[document.studentId] ??= [];
    acc[document.studentId].push(document);
    return acc;
  }, {});

  const sessionsThisMonthByStudent = sessionsThisMonth.reduce<
    Record<string, typeof sessionsThisMonth>
  >((acc, session) => {
    acc[session.studentId] ??= [];
    acc[session.studentId].push(session);
    return acc;
  }, {});

  const recentSessionsByStudent = recentSessions.reduce<Record<string, typeof recentSessions>>(
    (acc, session) => {
      acc[session.studentId] ??= [];
      acc[session.studentId].push(session);
      return acc;
    },
    {},
  );

  const expiringFilesByStudent = expiringFiles.reduce<Record<string, typeof expiringFiles>>(
    (acc, file) => {
      acc[file.studentId] ??= [];
      acc[file.studentId].push(file);
      return acc;
    },
    {},
  );

  const sessionTypeBreakdown = Object.entries(
    sessionsThisMonth.reduce<Record<string, number>>((acc, session) => {
      acc[session.sessionType] = (acc[session.sessionType] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  const weeklySessionFlow = Object.values(
    sessionsThisMonth.reduce<
      Record<
        number,
        {
          week: number;
          label: string;
          total: number;
          completed: number;
          planned: number;
          cancelled: number;
        }
      >
    >((acc, session) => {
      const week = Math.floor((session.sessionDate.getDate() - 1) / 7) + 1;
      acc[week] ??= {
        week,
        label: `Hafta ${week}`,
        total: 0,
        completed: 0,
        planned: 0,
        cancelled: 0,
      };
      acc[week].total += 1;
      acc[week][session.status as "completed" | "planned" | "cancelled"] += 1;
      return acc;
    }, {}),
  ).sort((a, b) => a.week - b.week);

  const studentInsights = students.map((student) => {
    const studentDocuments = documentsByStudent[student.id] ?? [];
    const currentMonthSessions = sessionsThisMonthByStudent[student.id] ?? [];
    const recentStudentSessions = recentSessionsByStudent[student.id] ?? [];
    const expiringStudentFiles = expiringFilesByStudent[student.id] ?? [];
    const completedDocuments = studentDocuments.filter((document) => document.status === "completed");
    const latestDocumentUpdate = studentDocuments[0]?.updatedAt ?? null;
    const latestSessionDate = recentStudentSessions[0]?.sessionDate ?? null;

    const reasons: string[] = [];
    if (studentDocuments.length === 0) {
      reasons.push("BEP kaydı yok");
    }
    if (completedDocuments.length === 0) {
      reasons.push("Tamamlanmis BEP yok");
    }
    if (currentMonthSessions.length === 0) {
      reasons.push("Bu ay planlanan seans yok");
    }
    if (recentStudentSessions.length === 0) {
      reasons.push("Son 30 gunde seans yok");
    }
    if (expiringStudentFiles.length > 0) {
      reasons.push(`${expiringStudentFiles.length} belge süresi doluyor`);
    }

    return {
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      classroom: student.classroom,
      totalDocumentCount: studentDocuments.length,
      completedDocumentCount: completedDocuments.length,
      monthlySessionCount: currentMonthSessions.length,
      completedSessionCount: currentMonthSessions.filter(
        (session) => session.status === "completed",
      ).length,
      latestDocumentUpdate,
      latestSessionDate,
      expiringFileCount: expiringStudentFiles.length,
      reasons,
    };
  });

  const studentsNeedingAttention = studentInsights
    .filter((student) => student.reasons.length > 0)
    .sort((a, b) => {
      if (b.reasons.length !== a.reasons.length) {
        return b.reasons.length - a.reasons.length;
      }

      if (a.monthlySessionCount !== b.monthlySessionCount) {
        return a.monthlySessionCount - b.monthlySessionCount;
      }

      return a.totalDocumentCount - b.totalDocumentCount;
    })
    .slice(0, 6);

  const studentMomentum = [...studentInsights]
    .sort((a, b) => {
      if (b.monthlySessionCount !== a.monthlySessionCount) {
        return b.monthlySessionCount - a.monthlySessionCount;
      }

      if (b.completedDocumentCount !== a.completedDocumentCount) {
        return b.completedDocumentCount - a.completedDocumentCount;
      }

      return a.studentName.localeCompare(b.studentName, "tr");
    })
    .slice(0, 8);

  const studentsWithDocuments = studentInsights.filter(
    (student) => student.totalDocumentCount > 0,
  ).length;
  const studentsWithCompletedDocuments = studentInsights.filter(
    (student) => student.completedDocumentCount > 0,
  ).length;
  const studentsWithRecentSessions = studentInsights.filter(
    (student) => student.latestSessionDate !== null,
  ).length;

  const draftDocumentCount = documents.filter((document) => document.status === "draft").length;
  const completedDocumentCount = documents.filter(
    (document) => document.status === "completed",
  ).length;
  const pendingApprovalCount = documents.filter(
    (document) => document.approvalStatus === "pending",
  ).length;
  const approvedDocumentCount = documents.filter(
    (document) => document.approvalStatus === "approved",
  ).length;
  const rejectedDocumentCount = documents.filter(
    (document) => document.approvalStatus === "rejected",
  ).length;
  const plannedSessionsThisMonth = sessionsThisMonth.filter(
    (session) => session.status === "planned",
  ).length;
  const completedSessionsThisMonth = sessionsThisMonth.filter(
    (session) => session.status === "completed",
  ).length;
  const cancelledSessionsThisMonth = sessionsThisMonth.filter(
    (session) => session.status === "cancelled",
  ).length;

  const insights = [
    studentInsights.length > 0
      ? `${studentsWithDocuments}/${studentInsights.length} ogrencide en az bir BEP kaydi var.`
      : "Henüz analiz edilecek öğrenci bulunmuyor.",
    `${studentsWithCompletedDocuments} öğrencinin tamamlanmis BEP kaydı mevcut.`,
    `${studentsWithRecentSessions} öğrenci son 30 gunde seans gorunurlugu sagliyor.`,
  ];

  return {
    checkedAt: now,
    studentCount: students.length,
    documentCount: documents.length,
    draftDocumentCount,
    completedDocumentCount,
    pendingApprovalCount,
    approvedDocumentCount,
    rejectedDocumentCount,
    totalSessionsThisMonth: sessionsThisMonth.length,
    plannedSessionsThisMonth,
    completedSessionsThisMonth,
    cancelledSessionsThisMonth,
    studentsWithDocuments,
    studentsWithCompletedDocuments,
    studentsWithRecentSessions,
    expiringFileCount: expiringFiles.length,
    averageSessionsPerStudent:
      students.length > 0 ? Number((sessionsThisMonth.length / students.length).toFixed(1)) : 0,
    insights,
    sessionTypeBreakdown,
    weeklySessionFlow,
    studentsNeedingAttention,
    studentMomentum,
    expiringFiles,
    recentDocuments: documents.slice(0, 6),
  };
}

function formatProgressEntry(record: {
  id: string;
  status: string;
  phase: string;
  progressPercent: number;
  note: string | null;
  nextStep: string | null;
  measuredAt: Date;
  updatedAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
}): EducationalProgressEntryRecord {
  return {
    id: record.id,
    status: record.status as GoalProgressStatus,
    phase: record.phase as LearningPhase,
    progressPercent: record.progressPercent,
    note: record.note ?? "",
    nextStep: record.nextStep ?? "",
    measuredAt: record.measuredAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    createdBy: {
      id: record.createdBy.id,
      name: record.createdBy.name ?? record.createdBy.email,
      email: record.createdBy.email,
    },
  };
}

export async function getTeacherEducationalProgressWorkspace(
  user: ScopedUser,
): Promise<TeacherEducationalProgressWorkspace | null> {
  if (!canAccessEducationalAnalysis(user.role, user.allowedModules)) {
    return null;
  }

  const documents = await prisma.bepDocument.findMany({
    where: {
      ...getDocumentAccessWhere(user),
      planRows: {
        some: {},
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      status: true,
      approvalStatus: true,
      updatedAt: true,
      startDate: true,
      endDate: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          schoolName: true,
          classroom: true,
        },
      },
      planRows: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          courseName: true,
          learningArea: true,
          learningOutcome: true,
          processComponents: true,
          criterion: true,
          methodTechnique: true,
          materials: true,
          tendencies: true,
          evaluationMethods: true,
          _count: {
            select: {
              goalProgressEntries: true,
            },
          },
          goalProgressEntries: {
            orderBy: [{ measuredAt: "desc" }, { updatedAt: "desc" }],
            take: EDUCATIONAL_PROGRESS_HISTORY_LIMIT,
            select: {
              id: true,
              status: true,
              phase: true,
              progressPercent: true,
              note: true,
              nextStep: true,
              measuredAt: true,
              updatedAt: true,
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const studentMap = new Map<string, EducationalProgressStudentRecord>();
  let goalCount = 0;
  let completedGoalCount = 0;
  let inProgressGoalCount = 0;
  let notStartedGoalCount = 0;
  let needsSupportGoalCount = 0;
  let progressEntryCount = 0;
  let progressPercentTotal = 0;

  documents.forEach((document) => {
    const goals = document.planRows.map((row) => {
      const history = row.goalProgressEntries.map(formatProgressEntry);
      const latestEntry = history[0] ?? null;

      goalCount += 1;
      progressEntryCount += row._count.goalProgressEntries;
      progressPercentTotal += latestEntry?.progressPercent ?? 0;

      if (!latestEntry || latestEntry.status === "not_started") {
        notStartedGoalCount += 1;
      } else if (latestEntry.status === "completed") {
        completedGoalCount += 1;
      } else if (latestEntry.status === "needs_support") {
        needsSupportGoalCount += 1;
      } else {
        inProgressGoalCount += 1;
      }

      return {
        id: row.id,
        sortOrder: row.sortOrder,
        courseName: row.courseName,
        learningArea: row.learningArea,
        learningOutcome: row.learningOutcome,
        processComponents: getProcessComponentLabels(row.processComponents),
        criterion: row.criterion ?? "",
        methodTechnique: row.methodTechnique ?? "",
        materials: row.materials ?? "",
        tendencies: row.tendencies ?? "",
        evaluationMethods: row.evaluationMethods ?? "",
        latestEntry,
        history,
      } satisfies EducationalProgressGoalRecord;
    });

    const completedGoals = goals.filter((goal) => goal.latestEntry?.status === "completed").length;
    const studentRecord =
      studentMap.get(document.student.id) ??
      ({
        id: document.student.id,
        firstName: document.student.firstName,
        lastName: document.student.lastName,
        schoolName: document.student.schoolName ?? "",
        classroom: document.student.classroom ?? "",
        documents: [],
      } satisfies EducationalProgressStudentRecord);

    studentRecord.documents.push({
      id: document.id,
      title: document.title,
      status: document.status,
      approvalStatus: document.approvalStatus,
      updatedAt: document.updatedAt.toISOString(),
      startDate: document.startDate?.toISOString() ?? "",
      endDate: document.endDate?.toISOString() ?? "",
      goalCount: goals.length,
      completedGoalCount: completedGoals,
      goals,
    });

    studentMap.set(document.student.id, studentRecord);
  });

  const students = Array.from(studentMap.values())
    .sort((first, second) => {
      const byName = `${first.firstName} ${first.lastName}`.localeCompare(
        `${second.firstName} ${second.lastName}`,
        "tr",
      );

      return byName;
    })
    .map((student) => ({
      ...student,
      documents: student.documents.sort(
        (first, second) =>
          new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime(),
      ),
    }));

  const statusBreakdown = [
    {
      key: "completed" as const,
      label: "Tamamlandı",
      count: completedGoalCount,
    },
    {
      key: "in_progress" as const,
      label: "Sürüyor",
      count: inProgressGoalCount,
    },
    {
      key: "not_started" as const,
      label: "Başlanmadı",
      count: notStartedGoalCount,
    },
    {
      key: "needs_support" as const,
      label: "Destek gerekli",
      count: needsSupportGoalCount,
    },
  ].map((item) => ({
    ...item,
    percent: goalCount > 0 ? Math.round((item.count / goalCount) * 100) : 0,
  }));

  const studentProgressAverages = students
    .map((student) => {
      const goals = student.documents.flatMap((document) => document.goals);
      const completedGoals = goals.filter((goal) => goal.latestEntry?.status === "completed").length;
      const totalProgress = goals.reduce(
        (sum, goal) => sum + (goal.latestEntry?.progressPercent ?? 0),
        0,
      );

      return {
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        averageProgressPercent: goals.length > 0 ? Math.round(totalProgress / goals.length) : 0,
        goalCount: goals.length,
        completedGoalCount: completedGoals,
        documentCount: student.documents.length,
      };
    })
    .sort((left, right) => {
      if (right.averageProgressPercent !== left.averageProgressPercent) {
        return right.averageProgressPercent - left.averageProgressPercent;
      }

      if (right.completedGoalCount !== left.completedGoalCount) {
        return right.completedGoalCount - left.completedGoalCount;
      }

      return left.studentName.localeCompare(right.studentName, "tr");
    });

  return {
    checkedAt: new Date().toISOString(),
    studentCount: students.length,
    documentCount: documents.length,
    goalCount,
    completedGoalCount,
    inProgressGoalCount,
    notStartedGoalCount,
    needsSupportGoalCount,
    progressEntryCount,
    averageProgressPercent: goalCount > 0 ? Math.round(progressPercentTotal / goalCount) : 0,
    statusBreakdown,
    studentProgressAverages,
    students,
  };
}

export type StudentEducationalAnalysis = {
  studentId: string;
  studentName: string;
  classroom: string | null;
  generatedAt: string;
  goals: Array<
    GoalAnalysis & {
      documentId: string;
      documentTitle: string;
    }
  >;
};

/**
 * Tek bir öğrencinin tüm BEP amaçlarını ve ilerleme kayıtlarını,
 * grafik/karta hazır eğitsel analiz verisine dönüştürür. Erişim,
 * mevcut belge yetki kuralları (`getDocumentAccessWhere`) ile sınırlanır;
 * yetkisiz / kapsam dışı öğrenci için `null` döner.
 */
export async function getStudentEducationalAnalysis(
  user: ScopedUser,
  studentId: string,
): Promise<StudentEducationalAnalysis | null> {
  if (!canAccessEducationalAnalysis(user.role, user.allowedModules)) {
    return null;
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      ...getStudentAccessWhere(user),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      classroom: true,
    },
  });

  if (!student) {
    return null;
  }

  const documents = await prisma.bepDocument.findMany({
    where: {
      ...getDocumentAccessWhere(user),
      studentId: student.id,
      planRows: {
        some: {},
      },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      title: true,
      startDate: true,
      planRows: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          sortOrder: true,
          courseName: true,
          learningArea: true,
          learningOutcome: true,
          processComponents: true,
          criterion: true,
          methodTechnique: true,
          materials: true,
          tendencies: true,
          evaluationMethods: true,
          goalProgressEntries: {
            orderBy: [{ measuredAt: "desc" }, { updatedAt: "desc" }],
            take: EDUCATIONAL_PROGRESS_HISTORY_LIMIT,
            select: {
              id: true,
              status: true,
              phase: true,
              progressPercent: true,
              note: true,
              nextStep: true,
              measuredAt: true,
              updatedAt: true,
              createdBy: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
    },
  });

  const goals = documents.flatMap((document) =>
    document.planRows.map((row) => {
      const history = row.goalProgressEntries.map(formatProgressEntry);
      const goalRecord: EducationalProgressGoalRecord = {
        id: row.id,
        sortOrder: row.sortOrder,
        courseName: row.courseName,
        learningArea: row.learningArea,
        learningOutcome: row.learningOutcome,
        processComponents: getProcessComponentLabels(row.processComponents),
        criterion: row.criterion ?? "",
        methodTechnique: row.methodTechnique ?? "",
        materials: row.materials ?? "",
        tendencies: row.tendencies ?? "",
        evaluationMethods: row.evaluationMethods ?? "",
        latestEntry: history[0] ?? null,
        history,
      };

      const analysis = buildGoalAnalysis(goalRecord, {
        startDateFallback: document.startDate?.toISOString() ?? null,
      });

      return {
        ...analysis,
        documentId: document.id,
        documentTitle: document.title,
      };
    }),
  );

  return {
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    classroom: student.classroom ?? null,
    generatedAt: new Date().toISOString(),
    goals,
  };
}

export async function getInstitutionParents(user: ScopedUser) {
  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return [];
  }

  return prisma.user.findMany({
    where: {
      institutionId: user.institutionId,
      role: UserRole.parent,
    },
    orderBy: { createdAt: "desc" },
    include: {
      parentStudentLinks: {
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
    },
  });
}

export async function getInstitutionInviteCodes(user: ScopedUser) {
  if (!user.institutionId && !isAdminRole(user.role)) {
    return [];
  }

  return prisma.inviteCode.findMany({
    where: user.institutionId ? { institutionId: user.institutionId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      usedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

export async function getInstitutionSettings(institutionId?: string | null) {
  return prisma.institutionSettings.findFirst({
    where: institutionId ? { institutionId } : undefined,
    orderBy: { createdAt: "asc" },
  });
}

export async function getInstitutionBillingHub(user: ScopedUser) {
  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return {
      settings: null,
      invoices: [],
    };
  }

  const [settings, invoices] = await Promise.all([
    getInstitutionSettings(user.institutionId),
    prisma.institutionInvoice.findMany({
      where: {
        institutionId: user.institutionId,
      },
      orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          orderBy: { sortOrder: "asc" },
        },
        payments: {
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      take: 100,
    }),
  ]);

  return {
    settings,
    invoices,
  };
}

function resolveBillingPeriod(periodInput?: string | null) {
  const now = new Date();
  const match = periodInput?.match(/^(\d{4})-(\d{2})$/);
  const year = match ? Number(match[1]) : now.getFullYear();
  const month = match ? Number(match[2]) - 1 : now.getMonth();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  return {
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(start),
    start,
    end,
  };
}

export async function getEntitlementBillingHub(user: ScopedUser, periodInput?: string | null) {
  const period = resolveBillingPeriod(periodInput);

  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return {
      period,
      entitlements: [],
      invoices: [],
      settings: null,
      tariffs: [],
      claims: [],
    };
  }

  const [sessions, invoices, settings, tariffs, claims] = await Promise.all([
    prisma.institutionSession.findMany({
      where: {
        ...getSessionAccessWhere(user),
        deletedAt: null,
        status: "completed",
        sessionDate: {
          gte: period.start,
          lt: period.end,
        },
      },
      orderBy: [{ sessionDate: "asc" }, { startTime: "asc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
            ramReports: {
              where: { status: "active" },
              select: {
                id: true,
                weeklyIndividualHours: true,
                weeklyGroupHours: true,
                validUntil: true,
              },
              take: 1,
            },
          },
        },
        teacher: { select: { id: true, name: true } },
      },
    }),
    prisma.institutionInvoice.findMany({
      where: {
        institutionId: user.institutionId,
        billingPeriod: { in: [period.key, `diff-${period.key}`] },
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        payments: {
          orderBy: [{ paymentDate: "desc" }, { createdAt: "desc" }],
          include: {
            createdBy: { select: { id: true, name: true, email: true } },
          },
        },
      },
    }),
    getInstitutionSettings(user.institutionId),
    prisma.financialTariff.findMany({
      where: {
        institutionId: user.institutionId,
        educationType: { in: ["individual", "group", "makeup"] },
      },
      orderBy: [{ isActive: "desc" }, { startDate: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.entitlementClaim.findMany({
      where: { institutionId: user.institutionId },
      orderBy: [{ periodStart: "desc" }],
      take: 24,
      include: {
        lines: {
          orderBy: [{ student: { firstName: "asc" } }, { educationType: "asc" }],
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, classroom: true },
            },
            tariff: {
              select: { id: true, officialBasis: true },
            },
          },
        },
      },
    }),
  ]);

  const grouped = new Map<string, {
    student: (typeof sessions)[number]["student"];
    total: number;
    individual: number;
    group: number;
    makeup: number;
    dates: string[];
  }>();

  sessions.forEach((session) => {
    if (session.sessionType === "parent_meeting") {
      return;
    }

    const current = grouped.get(session.student.id) ?? {
      student: session.student,
      total: 0,
      individual: 0,
      group: 0,
      makeup: 0,
      dates: [],
    };
    current.total += 1;
    if (session.sessionType === "group") {
      current.group += 1;
    } else {
      current.individual += 1;
    }
    if (session.sessionType === "makeup") {
      current.makeup += 1;
    }
    current.dates.push(session.sessionDate.toISOString());
    grouped.set(session.student.id, current);
  });

  const entitlements = Array.from(grouped.values()).map((entry) => {
    const invoice = invoices.find((item) => item.billingStudentId === entry.student.id) ?? null;
    const activeRam = entry.student.ramReports[0] ?? null;
    const warnings: string[] = [];
    if (!activeRam) {
      warnings.push("Aktif RAM raporu bulunmuyor.");
    } else if (activeRam.validUntil && activeRam.validUntil < period.end) {
      warnings.push("RAM raporu bu dönem içinde gecerliligini yitiriyor.");
    }

    return {
      studentId: entry.student.id,
      studentName: `${entry.student.firstName} ${entry.student.lastName}`.trim(),
      classroom: entry.student.classroom,
      completedSessions: entry.total,
      individualSessions: entry.individual,
      groupSessions: entry.group,
      makeupSessions: entry.makeup,
      sessionDates: entry.dates,
      ramIndividualHours: activeRam?.weeklyIndividualHours ?? 0,
      ramGroupHours: activeRam?.weeklyGroupHours ?? 0,
      warnings,
      invoice,
    };
  });

  return {
    period,
    entitlements,
    invoices,
    settings,
    tariffs,
    claims,
  };
}

export type MonthlyClosingChecklist = {
  period: ReturnType<typeof resolveBillingPeriod>;
  missingAttendanceCount: number;
  unassignedTeacherCount: number;
  ramExpiringCount: number;
  missingTariffEducationTypes: Array<"individual" | "group" | "makeup">;
  existingClaim: {
    id: string;
    status: string;
    calculatedAmount: number;
    mebSubmissionStatus: string;
  } | null;
  draftInvoiceCount: number;
};

/**
 * Aylık kapanış sihirbazı için ön kontrol listesi: bu ayın hak edişi
 * hesaplanmadan/faturalandırılmadan önce giderilmesi gereken eksikleri
 * (eksik yoklama, öğretmen ataması, RAM süresi, tarife) tek ekranda özetler.
 * Hesaplama/fatura/MEM gönderim işlemlerinin kendisini tekrar üretmez;
 * mevcut hak ediş ve fatura akışlarına yönlendirir.
 */
export async function getMonthlyClosingChecklist(
  user: ScopedUser,
  periodInput?: string | null,
): Promise<MonthlyClosingChecklist> {
  const period = resolveBillingPeriod(periodInput);

  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return {
      period,
      missingAttendanceCount: 0,
      unassignedTeacherCount: 0,
      ramExpiringCount: 0,
      missingTariffEducationTypes: [],
      existingClaim: null,
      draftInvoiceCount: 0,
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const elapsedCutoff = period.end < today ? period.end : today;

  const [
    missingAttendanceCount,
    unassignedTeacherCount,
    periodSessions,
    studentsWithSessions,
    activeTariffs,
    existingClaim,
    draftInvoiceCount,
  ] = await Promise.all([
    prisma.institutionSession.count({
      where: {
        ...getSessionAccessWhere(user),
        deletedAt: null,
        status: "planned",
        sessionDate: { gte: period.start, lt: elapsedCutoff },
        student: { OR: [{ classroom: null }, { classroom: { not: "Sistem" } }] },
      },
    }),
    prisma.institutionSession.count({
      where: {
        ...getSessionAccessWhere(user),
        deletedAt: null,
        status: { not: "cancelled" },
        teacherId: null,
        sessionDate: { gte: period.start, lt: elapsedCutoff },
        student: { OR: [{ classroom: null }, { classroom: { not: "Sistem" } }] },
      },
    }),
    prisma.institutionSession.findMany({
      where: {
        ...getSessionAccessWhere(user),
        deletedAt: null,
        status: "completed",
        sessionDate: { gte: period.start, lt: period.end },
      },
      select: { sessionType: true, studentId: true },
    }),
    prisma.student.findMany({
      where: {
        ...getStudentAccessWhere(user),
        AND: [{ OR: [{ classroom: null }, { classroom: { not: "Sistem" } }] }],
        sessions: {
          some: {
            deletedAt: null,
            status: "completed",
            sessionDate: { gte: period.start, lt: period.end },
          },
        },
      },
      select: {
        id: true,
        ramReports: {
          where: { status: { in: ["active", "review_due"] } },
          select: { validUntil: true },
          take: 1,
        },
      },
    }),
    prisma.financialTariff.findMany({
      where: {
        institutionId: user.institutionId,
        isActive: true,
        startDate: { lt: period.end },
        OR: [{ endDate: null }, { endDate: { gte: period.start } }],
      },
      select: { educationType: true },
    }),
    prisma.entitlementClaim.findFirst({
      where: { institutionId: user.institutionId, period: period.key },
      select: { id: true, status: true, calculatedAmount: true, mebSubmissionStatus: true },
    }),
    prisma.institutionInvoice.count({
      where: {
        institutionId: user.institutionId,
        billingPeriod: period.key,
        billingSource: "entitlement",
      },
    }),
  ]);

  const ramExpiringCount = studentsWithSessions.filter((student) => {
    const activeRam = student.ramReports[0];
    if (!activeRam) return true;
    return Boolean(activeRam.validUntil && activeRam.validUntil < period.end);
  }).length;

  const usedEducationTypes = new Set(
    periodSessions
      .map((session) => educationTypeOf(session.sessionType))
      .filter((type): type is "individual" | "group" | "makeup" => type !== null),
  );
  const coveredTypes = new Set(activeTariffs.map((tariff) => tariff.educationType));
  const missingTariffEducationTypes = Array.from(usedEducationTypes).filter(
    (type) => !coveredTypes.has(type),
  );

  return {
    period,
    missingAttendanceCount,
    unassignedTeacherCount,
    ramExpiringCount,
    missingTariffEducationTypes,
    existingClaim: existingClaim
      ? {
          id: existingClaim.id,
          status: existingClaim.status,
          calculatedAmount: Number(existingClaim.calculatedAmount),
          mebSubmissionStatus: existingClaim.mebSubmissionStatus,
        }
      : null,
    draftInvoiceCount,
  };
}

export type StaffExpenseRecord = {
  id: string;
  staffUserId: string | null;
  staffName: string;
  staffRole: string | null;
  category: StaffExpenseCategory;
  status: StaffExpenseStatus;
  period: string;
  amount: number;
  paymentDate: string | null;
  paymentMethod: InvoicePaymentMethod | null;
  notes: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type StaffOption = {
  id: string;
  name: string;
  branch: string | null;
  employmentType: StaffEmploymentType | null;
};

/**
 * Kurumun personel giderlerini (maaş, prim, seans başı ücret vb.) dönem
 * bazında yükler. Mali Raporlar'daki net kâr/zarar hesabı da bu veriyi kullanır.
 */
export async function getStaffExpenseHub(user: ScopedUser, periodInput?: string | null) {
  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return {
      period: resolveBillingPeriod(periodInput),
      expenses: [] as StaffExpenseRecord[],
      staffOptions: [] as StaffOption[],
    };
  }

  const period = resolveBillingPeriod(periodInput);

  const [expenses, staffOptions] = await Promise.all([
    prisma.staffExpense.findMany({
      where: { institutionId: user.institutionId, period: period.key },
      orderBy: [{ createdAt: "desc" }],
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { institutionId: user.institutionId, isActive: true },
      orderBy: [{ name: "asc" }],
      select: { id: true, name: true, branch: true, employmentType: true },
    }),
  ]);

  return {
    period,
    expenses: expenses.map((expense) => ({
      id: expense.id,
      staffUserId: expense.staffUserId,
      staffName: expense.staffName,
      staffRole: expense.staffRole,
      category: expense.category,
      status: expense.status,
      period: expense.period,
      amount: Number(expense.amount),
      paymentDate: expense.paymentDate?.toISOString() ?? null,
      paymentMethod: expense.paymentMethod,
      notes: expense.notes,
      createdAt: expense.createdAt.toISOString(),
      createdBy: { id: expense.createdBy.id, name: expense.createdBy.name },
    })),
    staffOptions,
  };
}

export type GeneralExpenseRecord = {
  id: string;
  title: string;
  vendorName: string | null;
  category: GeneralExpenseCategory;
  status: GeneralExpenseStatus;
  period: string;
  amount: number;
  paymentDate: string | null;
  paymentMethod: InvoicePaymentMethod | null;
  notes: string | null;
  hasReceipt: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
};

/**
 * Kurumun personel dışı işletme giderlerini (kira, fatura, ofis malzemesi,
 * bakım-onarım vb.) dönem bazında yükler. Fiş görseli ayrı bir uçtan servis
 * edilir; burada yalnızca `hasReceipt` bayrağı döner.
 */
export async function getGeneralExpenseHub(user: ScopedUser, periodInput?: string | null) {
  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return {
      period: resolveBillingPeriod(periodInput),
      expenses: [] as GeneralExpenseRecord[],
    };
  }

  const period = resolveBillingPeriod(periodInput);

  const expenses = await prisma.generalExpense.findMany({
    where: { institutionId: user.institutionId, period: period.key },
    orderBy: [{ createdAt: "desc" }],
    include: {
      createdBy: { select: { id: true, name: true } },
    },
  });

  return {
    period,
    expenses: expenses.map((expense) => ({
      id: expense.id,
      title: expense.title,
      vendorName: expense.vendorName,
      category: expense.category,
      status: expense.status,
      period: expense.period,
      amount: Number(expense.amount),
      paymentDate: expense.paymentDate?.toISOString() ?? null,
      paymentMethod: expense.paymentMethod,
      notes: expense.notes,
      hasReceipt: Boolean(expense.receiptData),
      createdAt: expense.createdAt.toISOString(),
      createdBy: { id: expense.createdBy.id, name: expense.createdBy.name },
    })),
  };
}

export type InstitutionManagementSummary = {
  period: { key: string; label: string };
  monthlyRevenue: number;
  monthlyStaffExpense: number;
  monthlyGeneralExpense: number;
  netResult: number;
  pendingCollectionAmount: number;
  pendingStaffExpenseAmount: number;
  activeStaffCount: number;
};

function invoiceGrossTotal(invoice: { quantity: unknown; unitPrice: unknown; taxRate: unknown }) {
  const subtotal = Number(invoice.quantity) * Number(invoice.unitPrice);
  return subtotal + subtotal * (Number(invoice.taxRate) / 100);
}

export async function getInstitutionManagementSummary(
  user: ScopedUser,
): Promise<InstitutionManagementSummary> {
  const period = resolveBillingPeriod();
  const empty: InstitutionManagementSummary = {
    period,
    monthlyRevenue: 0,
    monthlyStaffExpense: 0,
    monthlyGeneralExpense: 0,
    netResult: 0,
    pendingCollectionAmount: 0,
    pendingStaffExpenseAmount: 0,
    activeStaffCount: 0,
  };

  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return empty;
  }

  const [invoices, staffExpenses, generalExpenses, activeStaffCount] = await Promise.all([
    prisma.institutionInvoice.findMany({
      where: {
        institutionId: user.institutionId,
        issueDate: { gte: period.start, lt: period.end },
        status: { not: "cancelled" },
      },
      select: { quantity: true, unitPrice: true, taxRate: true, status: true },
    }),
    prisma.staffExpense.findMany({
      where: { institutionId: user.institutionId, period: period.key },
      select: { amount: true, status: true },
    }),
    prisma.generalExpense.findMany({
      where: { institutionId: user.institutionId, period: period.key },
      select: { amount: true, status: true },
    }),
    prisma.user.count({
      where: { institutionId: user.institutionId, role: "teacher", isActive: true },
    }),
  ]);

  const monthlyRevenue = invoices.reduce((sum, invoice) => sum + invoiceGrossTotal(invoice), 0);
  const pendingCollectionAmount = invoices
    .filter((invoice) => ["approved", "issued"].includes(invoice.status))
    .reduce((sum, invoice) => sum + invoiceGrossTotal(invoice), 0);

  const monthlyStaffExpense = staffExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const pendingStaffExpenseAmount = staffExpenses
    .filter((expense) => expense.status === "planned")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  const monthlyGeneralExpense = generalExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  return {
    period,
    monthlyRevenue,
    monthlyStaffExpense,
    monthlyGeneralExpense,
    netResult: monthlyRevenue - monthlyStaffExpense - monthlyGeneralExpense,
    pendingCollectionAmount,
    pendingStaffExpenseAmount,
    activeStaffCount,
  };
}

export async function getInstitutionRamTrackingHub(user: ScopedUser) {
  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return {
      records: [] as InstitutionRamTrackingRecord[],
      students: [] as InstitutionManagementStudentOption[],
      totalCount: 0,
      expiringSoonCount: 0,
      expiredCount: 0,
    };
  }

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setDate(nextMonth.getDate() + 30);

  const [records, students, totalCount, expiringSoonCount, expiredCount] = await Promise.all([
    prisma.institutionRamTracking.findMany({
      where: {
        institutionId: user.institutionId,
      },
      orderBy: [{ validUntil: "asc" }, { reportDate: "desc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 120,
    }),
    prisma.student.findMany({
      where: {
        institutionId: user.institutionId,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classroom: true,
      },
    }),
    prisma.institutionRamTracking.count({
      where: { institutionId: user.institutionId },
    }),
    prisma.institutionRamTracking.count({
      where: {
        institutionId: user.institutionId,
        validUntil: {
          gte: now,
          lte: nextMonth,
        },
      },
    }),
    prisma.institutionRamTracking.count({
      where: {
        institutionId: user.institutionId,
        OR: [
          { status: "expired" },
          {
            validUntil: {
              lt: now,
            },
          },
        ],
      },
    }),
  ]);

  return {
    records,
    students: students.filter((s) => s.classroom !== "Sistem"),
    totalCount,
    expiringSoonCount,
    expiredCount,
  };
}

export async function getInstitutionTransportHub(user: ScopedUser) {
  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return {
      records: [] as InstitutionTransportPlanRecord[],
      students: [] as InstitutionManagementStudentOption[],
      totalCount: 0,
      activeCount: 0,
      pausedCount: 0,
      reviewDueCount: 0,
    };
  }

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setDate(nextMonth.getDate() + 30);

  const [records, students, totalCount, activeCount, pausedCount, reviewDueCount] = await Promise.all([
    prisma.institutionTransportPlan.findMany({
      where: {
        institutionId: user.institutionId,
      },
      orderBy: [{ reviewDate: "asc" }, { status: "asc" }, { createdAt: "desc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 120,
    }),
    prisma.student.findMany({
      where: {
        institutionId: user.institutionId,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        classroom: true,
      },
    }),
    prisma.institutionTransportPlan.count({
      where: { institutionId: user.institutionId },
    }),
    prisma.institutionTransportPlan.count({
      where: { institutionId: user.institutionId, status: "active" },
    }),
    prisma.institutionTransportPlan.count({
      where: { institutionId: user.institutionId, status: "paused" },
    }),
    prisma.institutionTransportPlan.count({
      where: {
        institutionId: user.institutionId,
        reviewDate: {
          gte: now,
          lte: nextMonth,
        },
      },
    }),
  ]);

  return {
    records,
    students: students.filter((s) => s.classroom !== "Sistem"),
    totalCount,
    activeCount,
    pausedCount,
    reviewDueCount,
  };
}

export async function getInstitutionArchiveHub(user: ScopedUser) {
  if (!user.institutionId || (!isInstitutionRole(user.role) && !isAdminRole(user.role))) {
    return {
      records: [] as InstitutionArchiveRecord[],
      totalCount: 0,
      inspectionCount: 0,
      reviewDueCount: 0,
    };
  }

  const now = new Date();
  const nextMonth = new Date(now);
  nextMonth.setDate(nextMonth.getDate() + 30);

  const [records, totalCount, inspectionCount, reviewDueCount] = await Promise.all([
    prisma.institutionArchiveRecord.findMany({
      where: {
        institutionId: user.institutionId,
      },
      orderBy: [{ reviewDate: "asc" }, { createdAt: "desc" }],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 150,
    }),
    prisma.institutionArchiveRecord.count({
      where: { institutionId: user.institutionId },
    }),
    prisma.institutionArchiveRecord.count({
      where: { institutionId: user.institutionId, section: "inspection_file" },
    }),
    prisma.institutionArchiveRecord.count({
      where: {
        institutionId: user.institutionId,
        reviewDate: {
          gte: now,
          lte: nextMonth,
        },
      },
    }),
  ]);

  return {
    records,
    totalCount,
    inspectionCount,
    reviewDueCount,
  };
}

export async function getFamilyEducationHub(user: ScopedUser) {
  const canAccess =
    isAdminRole(user.role) ||
    isInstitutionRole(user.role) ||
    isTeacherRole(user.role) ||
    isParentRole(user.role);

  if (!canAccess) {
    return {
      students: [] as InstitutionManagementStudentOption[],
      plans: [] as FamilyEducationPlanRecord[],
      totalCount: 0,
      dueSoonCount: 0,
      appliedCount: 0,
      needsFollowUpCount: 0,
    };
  }

  const now = new Date();
  const nextFourteenDays = new Date(now);
  nextFourteenDays.setDate(nextFourteenDays.getDate() + 14);

  const [students, plans, totalCount, dueSoonCount, appliedCount, needsFollowUpCount] =
    await Promise.all([
      prisma.student.findMany({
        where: getStudentAccessWhere(user),
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classroom: true,
        },
      }),
      prisma.familyEducationPlan.findMany({
        where: getFamilyEducationPlanAccessWhere(user),
        orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
        include: {
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              classroom: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          notes: {
            orderBy: [{ createdAt: "desc" }],
            include: {
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          responses: {
            orderBy: [{ createdAt: "desc" }],
            select: {
              id: true,
              status: true,
              content: true,
              imageMimeType: true,
              imageName: true,
              createdAt: true,
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        take: 120,
      }),
      prisma.familyEducationPlan.count({
        where: getFamilyEducationPlanAccessWhere(user),
      }),
      prisma.familyEducationPlan.count({
        where: {
          ...getFamilyEducationPlanAccessWhere(user),
          status: {
            in: ["draft", "shared", "review_due"],
          },
          OR: [
            {
              dueDate: {
                gte: now,
                lte: nextFourteenDays,
              },
            },
            {
              followUpDate: {
                gte: now,
                lte: nextFourteenDays,
              },
            },
          ],
        },
      }),
      prisma.familyEducationPlan.count({
        where: {
          ...getFamilyEducationPlanAccessWhere(user),
          status: {
            in: ["applied", "completed"],
          },
        },
      }),
      prisma.familyEducationPlan.count({
        where: {
          ...getFamilyEducationPlanAccessWhere(user),
          status: {
            in: ["shared", "review_due", "not_applied"],
          },
        },
      }),
    ]);

  return {
    students: students.filter((s) => s.classroom !== "Sistem"),
    plans,
    totalCount,
    dueSoonCount,
    appliedCount,
    needsFollowUpCount,
  };
}

function buildReminderUrgency(dueAt: Date | null, now: Date): "high" | "medium" | "low" {
  if (!dueAt) {
    return "low";
  }

  const differenceMs = dueAt.getTime() - now.getTime();
  const differenceDays = differenceMs / (1000 * 60 * 60 * 24);

  if (differenceDays < 0 || differenceDays <= 3) {
    return "high";
  }

  if (differenceDays <= 10) {
    return "medium";
  }

  return "low";
}

export async function getTaskReminderHub(
  user: ScopedUser,
  options?: { includeReminders?: boolean },
) {
  const now = new Date();
  const nextThirtyDays = new Date(now);
  nextThirtyDays.setDate(nextThirtyDays.getDate() + 30);
  const nextFourteenDays = new Date(now);
  nextFourteenDays.setDate(nextFourteenDays.getDate() + 14);
  const includeReminders = options?.includeReminders ?? false;

  const [
    ramRecords,
    expiringFiles,
    parentMeetings,
    familyPlans,
    transportPlans,
    bepDocuments,
    ownReminders,
    dismissals,
  ] = await Promise.all([
    user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role))
      ? prisma.institutionRamTracking.findMany({
          where: {
            institutionId: user.institutionId,
            OR: [
              {
                reviewDate: {
                  lte: nextThirtyDays,
                },
              },
              {
                validUntil: {
                  lte: nextThirtyDays,
                },
              },
            ],
          },
          orderBy: [{ reviewDate: "asc" }, { validUntil: "asc" }],
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 20,
        })
      : Promise.resolve([]),
    prisma.studentFile.findMany({
      where: {
        ...getStudentFileAccessWhere(user),
        studentId: { not: null },
        expiresAt: {
          lte: nextThirtyDays,
        },
      },
      orderBy: { expiresAt: "asc" },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 20,
    }),
    prisma.coordinationMeeting.findMany({
      where: {
        ...getCoordinationMeetingAccessWhere(user),
        meetingType: "parent_meeting",
        OR: [
          {
            scheduledAt: {
              gte: now,
              lte: nextFourteenDays,
            },
          },
          {
            nextMeetingAt: {
              gte: now,
              lte: nextFourteenDays,
            },
          },
        ],
      },
      orderBy: [{ scheduledAt: "asc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 20,
    }),
    prisma.familyEducationPlan.findMany({
      where: {
        ...getFamilyEducationPlanAccessWhere(user),
        status: {
          in: ["draft", "shared", "review_due", "not_applied"],
        },
        OR: [
          {
            dueDate: {
              lte: nextFourteenDays,
            },
          },
          {
            followUpDate: {
              lte: nextFourteenDays,
            },
          },
        ],
      },
      orderBy: [{ dueDate: "asc" }, { followUpDate: "asc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 20,
    }),
    user.institutionId && (isInstitutionRole(user.role) || isAdminRole(user.role))
      ? prisma.institutionTransportPlan.findMany({
          where: {
            institutionId: user.institutionId,
            reviewDate: {
              lte: nextThirtyDays,
            },
          },
          orderBy: [{ reviewDate: "asc" }],
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 20,
        })
      : Promise.resolve([]),
    prisma.bepDocument.findMany({
      where: {
        ...getDocumentAccessWhere(user),
        endDate: {
          lte: nextThirtyDays,
        },
      },
      orderBy: [{ endDate: "asc" }],
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      take: 20,
    }),
    includeReminders
      ? prisma.reminder.findMany({
          where: {
            ownerId: user.id,
            isCompleted: false,
            // notifiedAt varsa hatırlatıcının zamanı çoktan geldi ve cron
            // (src/app/api/cron/reminders) zaten bir AppNotification/push
            // tetikledi; bu ön izleme listesinde tekrar görünmesin.
            notifiedAt: null,
            remindAt: { lte: nextThirtyDays },
          },
          orderBy: [{ remindAt: "asc" }],
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          take: 20,
        })
      : Promise.resolve([]),
    includeReminders
      ? prisma.notificationDismissal.findMany({
          where: { userId: user.id },
          select: { reminderId: true },
        })
      : Promise.resolve([]),
  ]);

  const dismissedIds = new Set(dismissals.map((item) => item.reminderId));

  const reminders: TeacherReminderRecord[] = [
    ...ramRecords.map((record) => {
      const dueAt = record.reviewDate ?? record.validUntil ?? null;
      return {
        id: `ram-${record.id}`,
        kind: "ram" as const,
        title: record.title,
        description: record.reviewDate
          ? "RAM kaydı için takip tarihi yaklasiyor."
          : "RAM raporunun geçerlilik süresi yaklasiyor.",
        studentName: record.student
          ? `${record.student.firstName} ${record.student.lastName}`
          : null,
        dueAt,
        href: "/panel/ram-takip",
        urgency: buildReminderUrgency(dueAt, now),
      };
    }),
    ...expiringFiles.flatMap((file) =>
      file.student
        ? [
            {
              id: `file-${file.id}`,
              kind: "document" as const,
              title: file.title,
              description: "Öğrenci belgesinin geçerlilik süresi yaklasiyor.",
              studentName: `${file.student.firstName} ${file.student.lastName}`,
              dueAt: file.expiresAt,
              href: "/panel/belgeler",
              urgency: buildReminderUrgency(file.expiresAt, now),
            },
          ]
        : [],
    ),
    ...parentMeetings.map((meeting) => {
      const dueAt = meeting.nextMeetingAt ?? meeting.scheduledAt;
      return {
        id: `meeting-${meeting.id}`,
        kind: "meeting" as const,
        title: meeting.title,
        description: "Aile görüşmesi veya bir sonraki veli bulusmasi yaklasiyor.",
        studentName: meeting.student
          ? `${meeting.student.firstName} ${meeting.student.lastName}`
          : null,
        dueAt,
        href: "/panel/toplantilar",
        urgency: buildReminderUrgency(dueAt, now),
      };
    }),
    ...familyPlans.map((plan) => {
      const dueAt = plan.followUpDate ?? plan.dueDate ?? null;
      return {
        id: `family-${plan.id}`,
        kind: "family" as const,
        title: plan.title,
        description:
          plan.status === "draft"
            ? "Aileyle paylasilmayi bekleyen bir ev programi var."
            : "Aile eğitimi plani için takip veya geri bildirim zamani geldi.",
        studentName: `${plan.student.firstName} ${plan.student.lastName}`,
        dueAt,
        href: "/panel/aile-egitimi",
        urgency: buildReminderUrgency(dueAt, now),
      };
    }),
    ...transportPlans.map((plan) => ({
      id: `transport-${plan.id}`,
      kind: "transport" as const,
      title: plan.title,
      description: "Taşıma veya servis planinin gozden gecirme tarihi yaklasiyor.",
      studentName: plan.student ? `${plan.student.firstName} ${plan.student.lastName}` : null,
      dueAt: plan.reviewDate,
      href: "/panel/tasima-servis",
      urgency: buildReminderUrgency(plan.reviewDate, now),
    })),
    ...bepDocuments.map((document) => ({
      id: `bep-${document.id}`,
      kind: "bep" as const,
      title: document.title,
      description: "BEP süresi yaklasiyor. Plani gozden gecirip yenileyin.",
      studentName: `${document.student.firstName} ${document.student.lastName}`,
      dueAt: document.endDate,
      href: `/panel/bep/${document.id}`,
      urgency: buildReminderUrgency(document.endDate, now),
    })),
    ...ownReminders.map((reminder) => ({
      id: `reminder-${reminder.id}`,
      kind: "reminder" as const,
      title: reminder.title,
      description: reminder.note?.trim() || "Kendi olusturdugunuz hatirlatici.",
      studentName: reminder.student
        ? `${reminder.student.firstName} ${reminder.student.lastName}`
        : null,
      dueAt: reminder.remindAt,
      href: "",
      urgency: buildReminderUrgency(reminder.remindAt, now),
    })),
  ]
    .filter((item) => !dismissedIds.has(item.id))
    .sort((left, right) => {
      const leftTime = left.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = right.dueAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 40);

  return {
    reminders,
    counts: {
      total: reminders.length,
      high: reminders.filter((item) => item.urgency === "high").length,
      medium: reminders.filter((item) => item.urgency === "medium").length,
      low: reminders.filter((item) => item.urgency === "low").length,
    },
  };
}

export async function getStudentFiles(
  user: ScopedUser,
  filters: { studentId?: string | null; folderId?: string | null } = {},
) {
  return prisma.studentFile.findMany({
    where: {
      ...getStudentFileAccessWhere(user),
      ...(filters.studentId ? { studentId: filters.studentId } : {}),
      ...(filters.folderId ? { folderId: filters.folderId } : {}),
    },
    orderBy: { createdAt: "desc" },
    omit: {
      fileData: true,
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classroom: true,
        },
      },
      folder: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
}

export async function getStudentFileFolders(user: ScopedUser) {
  if (isAdminRole(user.role)) {
    return prisma.studentFileFolder.findMany({
      orderBy: [{ name: "asc" }],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
    });
  }

  if (isInstitutionRole(user.role) || isTeacherRole(user.role)) {
    return prisma.studentFileFolder.findMany({
      where: user.institutionId
        ? {
            OR: [{ institutionId: user.institutionId }, { createdById: user.id }],
          }
        : { createdById: user.id },
      orderBy: [{ name: "asc" }],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            files: true,
          },
        },
      },
    });
  }

  return [];
}

export async function getInstitutions() {
  return prisma.institution.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          users: true,
          students: true,
          documents: true,
          inviteCodes: true,
        },
      },
    },
  });
}

function buildAdminUserWhere(filters: AdminUserFilters = {}) {
  const q = filters.q?.trim();

  return {
    ...(filters.role && filters.role !== "all"
      ? {
          role: filters.role as UserRole,
        }
      : {}),
    ...(filters.state === "active"
      ? { isActive: true }
      : filters.state === "inactive"
        ? { isActive: false }
        : {}),
    ...(filters.scope === "independent"
      ? { institutionId: null }
      : filters.scope && filters.scope !== "all"
        ? { institutionId: filters.scope }
        : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : {}),
  };
}

export async function getAdminOverview(user?: ScopedUser, adminUserFilters: AdminUserFilters = {}) {
  if (!user || isAdminRole(user.role)) {
    const adminUserWhere = buildAdminUserWhere(adminUserFilters);
    const [
      userCount,
      activeUserCount,
      studentCount,
      documentCount,
      adminCount,
      institutionCount,
      teacherCount,
      parentCount,
      recentAuditLogs,
      recentUsers,
      filteredUsers,
      filteredUserCount,
      institutions,
      institutionApplicationCount,
      newInstitutionApplicationCount,
      recentInstitutionApplications,
      blogPostCount,
      publishedBlogPostCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.student.count(),
      prisma.bepDocument.count(),
      prisma.user.count({ where: { role: UserRole.admin } }),
      prisma.institution.count(),
      prisma.user.count({ where: { role: UserRole.teacher } }),
      prisma.user.count({ where: { role: UserRole.parent } }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          suspendedUntil: true,
          createdAt: true,
          institutionId: true,
          institution: {
            select: {
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              students: true,
              documents: true,
              parentStudentLinks: true,
            },
          },
        },
      }),
      prisma.user.findMany({
        where: adminUserWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          suspendedUntil: true,
          createdAt: true,
          institutionId: true,
          institution: {
            select: {
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              students: true,
              documents: true,
              parentStudentLinks: true,
            },
          },
        },
      }),
      prisma.user.count({
        where: adminUserWhere,
      }),
      getInstitutions(),
      prisma.institutionApplication.count(),
      prisma.institutionApplication.count({ where: { status: "new" } }),
      prisma.institutionApplication.findMany({
        orderBy: [{ createdAt: "desc" }],
        take: 10,
        include: {
          reviewedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      prisma.blogPost.count(),
      prisma.blogPost.count({ where: { published: true } }),
    ]);

    return {
      userCount,
      activeUserCount,
      studentCount,
      documentCount,
      adminCount,
      institutionCount,
      teacherCount,
      parentCount,
      recentAuditLogs,
      recentUsers,
      filteredUsers,
      filteredUserCount,
      institutions,
      institutionApplicationCount,
      newInstitutionApplicationCount,
      recentInstitutionApplications,
      blogPostCount,
      publishedBlogPostCount,
    };
  }

  const institutionId = user.institutionId;
  if (!institutionId) {
    return {
      userCount: 0,
      activeUserCount: 0,
      studentCount: 0,
      documentCount: 0,
      adminCount: 0,
      institutionCount: 0,
      teacherCount: 0,
      parentCount: 0,
      recentAuditLogs: [],
      recentUsers: [],
      filteredUsers: [],
      filteredUserCount: 0,
      institutions: [],
      institutionApplicationCount: 0,
      newInstitutionApplicationCount: 0,
      recentInstitutionApplications: [],
      institutionSettings: null,
      blogPostCount: 0,
      publishedBlogPostCount: 0,
    };
  }

  const [
    userCount,
    activeUserCount,
    studentCount,
    documentCount,
    teacherCount,
    parentCount,
    recentAuditLogs,
    recentUsers,
    institutionSettings,
  ] = await Promise.all([
    prisma.user.count({ where: { institutionId } }),
    prisma.user.count({ where: { institutionId, isActive: true } }),
    prisma.student.count({ where: { institutionId } }),
    prisma.bepDocument.count({ where: { institutionId } }),
    prisma.user.count({ where: { institutionId, role: UserRole.teacher } }),
    prisma.user.count({ where: { institutionId, role: UserRole.parent } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      where: {
        OR: [
          { metadata: { path: "$.institutionId", equals: institutionId } },
          { actor: { institutionId } },
        ],
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: { institutionId },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        suspendedUntil: true,
        createdAt: true,
        institutionId: true,
        institution: {
          select: {
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            students: true,
            documents: true,
            parentStudentLinks: true,
          },
        },
      },
    }),
    getInstitutionSettings(institutionId),
  ]);

  return {
    userCount,
    activeUserCount,
    studentCount,
    documentCount,
    adminCount: 0,
    institutionCount: institutionId ? 1 : 0,
    teacherCount,
    parentCount,
    recentAuditLogs,
    recentUsers,
    filteredUsers: recentUsers,
    filteredUserCount: recentUsers.length,
    institutions: [],
    institutionApplicationCount: 0,
    newInstitutionApplicationCount: 0,
    recentInstitutionApplications: [],
    institutionSettings,
    blogPostCount: 0,
    publishedBlogPostCount: 0,
  };
}

export async function getInstitutionApplications() {
  return prisma.institutionApplication.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      reviewedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 100,
  });
}

export async function getPlatformAnnouncements() {
  return prisma.platformAnnouncement.findMany({
    orderBy: [{ isActive: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 100,
  });
}

export async function getActivePlatformAnnouncements() {
  return prisma.platformAnnouncement.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      summary: true,
      content: true,
      showAsPopup: true,
      publishedAt: true,
      updatedAt: true,
    },
    take: 12,
  });
}

export async function getUserBepCompletionFeedback(user: ScopedUser, documentId: string) {
  if (!canCreateBep(user.role)) {
    return null;
  }

  return prisma.productFeedback.findFirst({
    where: {
      userId: user.id,
      documentId,
      source: "bep_completed",
    },
    select: {
      id: true,
      value: true,
      reason: true,
      createdAt: true,
    },
  });
}

export async function shouldAskForBepCompletionFeedback(user: ScopedUser, documentId: string) {
  if (!canCreateBep(user.role)) {
    return false;
  }

  const latestFeedback = await prisma.productFeedback.findFirst({
    where: {
      userId: user.id,
      source: "bep_completed",
    },
    select: {
      documentId: true,
      value: true,
      updatedAt: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (!latestFeedback) {
    return true;
  }

  if (latestFeedback.documentId === documentId || latestFeedback.value === "like") {
    return false;
  }

  const retryAfter = new Date(latestFeedback.updatedAt);
  retryAfter.setMonth(retryAfter.getMonth() + 3);

  return retryAfter <= new Date();
}

export async function getProductFeedbackOverview() {
  const [totalCount, likeCount, dislikeCount, recentFeedback] = await Promise.all([
    prisma.productFeedback.count(),
    prisma.productFeedback.count({
      where: { value: "like" },
    }),
    prisma.productFeedback.count({
      where: { value: "dislike" },
    }),
    prisma.productFeedback.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 12,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        institution: {
          select: {
            id: true,
            name: true,
          },
        },
        document: {
          select: {
            id: true,
            title: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    totalCount,
    likeCount,
    dislikeCount,
    recentFeedback,
  };
}

export async function getPlatformStatusIncidents() {
  return prisma.platformStatusIncident.findMany({
    orderBy: [{ isActive: "desc" }, { startedAt: "desc" }, { createdAt: "desc" }],
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      updates: {
        orderBy: [{ createdAt: "desc" }],
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    take: 50,
  });
}

type AuditLogFilters = {
  q?: string;
  action?: string;
  entityType?: string;
  institutionId?: string | null;
};

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const q = filters.q?.trim();

  return prisma.auditLog.findMany({
    where: {
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.institutionId
        ? {
            OR: [
              { metadata: { path: "$.institutionId", equals: filters.institutionId } },
              { actor: { institutionId: filters.institutionId } },
            ],
          }
        : {}),
      ...(q
        ? {
            AND: [
              {
                OR: [
                  { summary: { contains: q } },
                  { action: { contains: q } },
                  { entityType: { contains: q } },
                  { actor: { email: { contains: q } } },
                  { actor: { name: { contains: q } } },
                ],
              },
            ],
          }
        : {}),
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          institutionId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function getAuditLogDetail(logId: string) {
  return prisma.auditLog.findUnique({
    where: { id: logId },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          institutionId: true,
        },
      },
    },
  });
}

export async function getParentLinkedStudents(user: ScopedUser) {
  if (!isParentRole(user.role)) {
    return [];
  }

  return prisma.parentStudentLink.findMany({
    where: {
      parentId: user.id,
    },
    include: {
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classroom: true,
          schoolName: true,
          studentFiles: {
            select: {
              id: true,
              title: true,
              fileName: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" },
          },
          courseEvaluations: {
            select: {
              id: true,
              title: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
          },
          familyEducationPlans: {
            select: {
              id: true,
              title: true,
              cadence: true,
              status: true,
              sharedAt: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
          },
          evaluationDocuments: {
            select: {
              id: true,
              title: true,
              type: true,
              evaluationDate: true,
              updatedAt: true,
              owner: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
            orderBy: { updatedAt: "desc" },
          },
          documents: {
            select: {
              id: true,
              title: true,
              status: true,
              updatedAt: true,
            },
            orderBy: { updatedAt: "desc" },
          },
          specialEducationDailyDataEntries: {
            select: {
              id: true,
              measuredAt: true,
              skillArea: true,
              target: true,
              metricType: true,
              metricValue: true,
              sessionLabel: true,
            },
            orderBy: { measuredAt: "desc" },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export async function getSupportTicketsForUser(userId: string) {
  return prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getSupportTicketById(user: { id: string; role: string }, ticketId: string) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) return null;

  const isAdmin = user.role === "admin";
  if (!isAdmin && ticket.userId !== user.id) {
    throw new ApiError("FORBIDDEN", "Bu destek talebine erişim izniniz yok.", 403);
  }

  return ticket;
}

export async function getAllSupportTickets(filters?: {
  status?: string;
  source?: string;
  search?: string;
}) {
  const where: Prisma.SupportTicketWhereInput = {};

  if (
    filters?.status &&
    filters.status !== "all" &&
    Object.values(SupportTicketStatus).includes(filters.status as SupportTicketStatus)
  ) {
    where.status = filters.status as SupportTicketStatus;
  }

  if (filters?.source && filters.source !== "all") {
    where.source = filters.source;
  }

  if (filters?.search) {
    where.OR = [
      { subject: { contains: filters.search } },
      { email: { contains: filters.search } },
      { name: { contains: filters.search } },
      { message: { contains: filters.search } },
    ];
  }

  return prisma.supportTicket.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getSupportTicketStats() {
  const [total, open, inProgress, resolved, closed] = await Promise.all([
    prisma.supportTicket.count(),
    prisma.supportTicket.count({ where: { status: "open" } }),
    prisma.supportTicket.count({ where: { status: "in_progress" } }),
    prisma.supportTicket.count({ where: { status: "resolved" } }),
    prisma.supportTicket.count({ where: { status: "closed" } }),
  ]);

  return {
    total,
    open,
    inProgress,
    resolved,
    closed,
  };
}

export async function getMaintenanceWindows() {
  return prisma.maintenanceWindow.findMany({
    orderBy: [{ startsAt: "desc" }],
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getMaintenanceHistory() {
  return prisma.auditLog.findMany({
    where: {
      action: "platform_maintenance.updated",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    take: 50,
  });
}

export async function getBehaviorEvaluationHub(user: ScopedUser) {
  const students = await prisma.student.findMany({
    where: getStudentAccessWhere(user),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      behaviors: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          trackingType: true,
        },
      },
      abcLogs: {
        orderBy: { timestamp: "desc" },
        select: {
          id: true,
          studentId: true,
          behaviorId: true,
          timestamp: true,
          durationSeconds: true,
          frequency: true,
          lessonName: true,
          subTopic: true,
          classSize: true,
          antecedentTag: true,
          antecedentDisplay: true,
          consequenceTag: true,
          consequenceDisplay: true,
          teacherNotes: true,
          inferredFunction: true,
          confidenceScore: true,
          behavior: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
  });

  return students.map((student) => ({
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    behaviors: student.behaviors,
    abcLogs: student.abcLogs,
  }));
}
