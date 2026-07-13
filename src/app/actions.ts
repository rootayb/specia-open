"use server";

import crypto from "node:crypto";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { Prisma, StudentFileCategory, UserRole } from "@/lib/prisma-shim";

import { assertTrustedActionOrigin, getRequestIp } from "@/lib/action-security";
import { deleteUserAccount } from "@/lib/account-deletion";
import { ApiError } from "@/lib/api/errors";
import { buildCourseEvaluationDocumentMeta } from "@/lib/course-evaluation";
import { writeAuditLog } from "@/lib/audit";
import { getReadableDbError } from "@/lib/db-errors";
import { validateUploadedDocumentFile } from "@/lib/file-upload-security";
import {
  buildAdminCreatedAccountEmail,
  buildInstitutionApplicationReceivedEmail,
  buildInstitutionApplicationStatusEmail,
  buildPasswordResetEmail,
  buildRegistrationVerificationEmail,
  buildWelcomeEmail,
  buildUserSuspendedEmail,
  buildTwoFactorVerificationEmail,
  buildAccountDeletedEmail,
} from "@/lib/email-templates";
import { sendTransactionalEmail } from "@/lib/email";
import { invalidateSystemHealthCache } from "@/lib/system-health";
import { createPasswordResetToken, hashPasswordResetToken } from "@/lib/password-reset";
import { appendParentMessageAttachment } from "@/lib/parent-message-attachments";
import { notifyUsers } from "@/lib/notifications";
import {
  createBepTransferToken,
  getBepTransferInviteExpiresAt,
  getBepTransferUndoUntil,
  hashBepTransferToken,
} from "@/lib/bep-transfer";
import {
  isAdminRole,
  canAccessFamilyEducation,
  canManageInstitutionRecords,
  canApproveBep,
  getCalendarEventAccessWhere,
  canCreateBep,
  getCourseEvaluationAccessWhere,
  getCoordinationMeetingAccessWhere,
  getDocumentAccessWhere,
  getFamilyEducationPlanAccessWhere,
  getSessionAccessWhere,
  getSessionRoomAccessWhere,
  getStudentAccessWhere,
  getStudentFileAccessWhere,
  getUserManagementWhere,
  getZumreMeetingAccessWhere,
  isInstitutionRole,
  isParentRole,
} from "@/lib/permissions";
import {
  derivePlanRowDateSummary,
  serializeProcessComponentSchedules,
} from "@/lib/process-component-schedules";
import {
  invalidatePlatformRuntimeSettingsCache,
  PLATFORM_RUNTIME_SETTINGS_ID,
} from "@/lib/platform-runtime";
import { prisma } from "@/lib/prisma";
import { userSupportsSessionAndFinanceModules } from "@/lib/institution-features";
import {
  calculateEntitlementClaim,
  calculateInvoicePaymentState,
} from "@/lib/financial-compliance";
import { clearRateLimit, consumeRateLimit, purgeExpiredRateLimits } from "@/lib/rate-limit";
import {
  adminCreateUserSchema,
  adminDeleteUserSchema,
  adminUserRoleSchema,
  adminUserStateSchema,
  adminUpdateUserInstitutionSchema,
  type AdminUpdateUserInstitutionInput,
  acceptBepTransferInviteSchema,
  createStudentTransferInviteSchema,
  acceptStudentTransferInviteSchema,
  undoStudentTransferInviteSchema,
  type CreateStudentTransferInviteInput,
  type AcceptStudentTransferInviteInput,
  type UndoStudentTransferInviteInput,
  bulkBepCreateSchema,
  bulkStudentImportSchema,
  bepApprovalActionSchema,
  bepDocumentSchema,
  calendarEventSchema,
  closeAccountSchema,
  createBepTransferInviteSchema,
  courseEvaluationDocumentSchema,
  deleteBepDocumentSchema,
  deleteProductFeedbackSchema,
  coordinationMeetingSchema,
  zumreMeetingDocumentSchema,
  bepRejectionSchema,
  deleteCourseEvaluationSchema,
  deleteInstitutionSchema,
  deleteInstitutionApplicationSchema,
  deleteInstitutionArchiveRecordSchema,
  deletePlatformAnnouncementSchema,
  deletePlatformStatusIncidentSchema,
  deletePlatformStatusIncidentUpdateSchema,
  deleteInstitutionInvoiceSchema,
  deleteInstitutionInvoicePaymentSchema,
  deleteStaffExpenseSchema,
  deleteGeneralExpenseSchema,
  deleteFinancialTariffSchema,
  calculateEntitlementClaimSchema,
  financialTariffSchema,
  generateEntitlementInvoiceDraftsSchema,
  deleteInviteCodeSchema,
  deleteFamilyEducationNoteSchema,
  deleteFamilyEducationPlanSchema,
  deleteFamilyEducationResponseSchema,
  deletePersonalNoteSchema,
  deleteInstitutionRamTrackingSchema,
  deleteInstitutionTransportPlanSchema,
  deleteCalendarEventSchema,
  deleteCoordinationMeetingSchema,
  deleteZumreMeetingDocumentSchema,
  deleteInstitutionSessionSchema,
  deleteSessionRoomSchema,
  deleteSessionTimeSlotSchema,
  setStudentActiveSchema,
  deleteStudentFileFolderSchema,
  forgotPasswordSchema,
  institutionCreateSchema,
  institutionSaveSchema,
  institutionApplicationReviewSchema,
  institutionApplicationSchema,
  institutionArchiveRecordSchema,
  institutionInvoiceSchema,
  institutionInvoicePaymentSchema,
  staffExpenseSchema,
  generalExpenseSchema,
  institutionMemberStateSchema,
  updateEntitlementInvoiceStatusSchema,
  updateEntitlementClaimStatusSchema,
  updateMebSubmissionStatusSchema,
  familyEducationNoteSchema,
  familyEducationPlanSchema,
  familyEducationResponseSchema,
  personalNoteSchema,
  institutionRamTrackingSchema,
  institutionTransportPlanSchema,
  platformAnnouncementSchema,
  platformStatusIncidentSchema,
  platformStatusIncidentUpdateSchema,
  platformMaintenanceSettingsSchema,
  maintenanceWindowSchema,
  appVersionInfoSchema,
  type AppVersionInfoInput,
  adminNotificationSchema,
  type AdminNotificationInput,
  institutionSessionSchema,
  institutionSettingsSchema,
  inviteCodeCreateSchema,
  markParentMessageReadSchema,
  passwordChangeSchema,
  parentStudentLinkSchema,
  parentMessageSchema,
  parentStudentUnlinkSchema,
  productFeedbackSchema,
  profileUpdateSchema,
  quickSessionNoteSchema,
  registerSchema,
  removeInstitutionMemberSchema,
  resetPasswordSchema,
  sessionRoomSchema,
  sessionTimeSlotSchema,
  staffProfileSchema,
  studentFileSchema,
  studentFileFolderSchema,
  studentSchema,
  verifyRegistrationCodeSchema,
  type AdminCreateUserInput,
  type AdminDeleteUserInput,
  type AdminUserRoleInput,
  type AdminUserStateInput,
  type BulkBepCreateInput,
  type BulkStudentImportInput,
  type BepApprovalActionInput,
  type BepDocumentInput,
  type BepRejectionInput,
  type CalendarEventInput,
  type CloseAccountInput,
  type CoordinationMeetingInput,
  type CourseEvaluationDocumentInput,
  type DeleteBepDocumentInput,
  type DeleteProductFeedbackInput,
  type DeleteCourseEvaluationInput,
  type DeleteInstitutionInput,
  type DeleteInstitutionApplicationInput,
  type DeleteInstitutionArchiveRecordInput,
  type DeleteInstitutionInvoiceInput,
  type DeleteInstitutionInvoicePaymentInput,
  type DeleteStaffExpenseInput,
  type DeleteGeneralExpenseInput,
  type DeleteFinancialTariffInput,
  type CalculateEntitlementClaimInput,
  type FinancialTariffInput,
  type GenerateEntitlementInvoiceDraftsInput,
  type DeleteInviteCodeInput,
  type DeleteFamilyEducationNoteInput,
  type DeleteFamilyEducationResponseInput,
  type FamilyEducationResponseInput,
  type DeleteFamilyEducationPlanInput,
  type DeletePersonalNoteInput,
  type DeleteInstitutionRamTrackingInput,
  type DeleteInstitutionTransportPlanInput,
  type DeletePlatformAnnouncementInput,
  type DeletePlatformStatusIncidentInput,
  type DeletePlatformStatusIncidentUpdateInput,
  type DeleteCalendarEventInput,
  type DeleteCoordinationMeetingInput,
  type DeleteZumreMeetingDocumentInput,
  type DeleteInstitutionSessionInput,
  type DeleteSessionRoomInput,
  type DeleteSessionTimeSlotInput,
  type SetStudentActiveInput,
  type DeleteStudentFileFolderInput,
  type ForgotPasswordInput,
  type InstitutionCreateInput,
  type InstitutionSaveInput,
  type InstitutionApplicationInput,
  type InstitutionApplicationReviewInput,
  type InstitutionArchiveRecordInput,
  type InstitutionInvoiceInput,
  type InstitutionInvoicePaymentInput,
  type StaffExpenseInput,
  type GeneralExpenseInput,
  type InstitutionMemberStateInput,
  type UpdateEntitlementInvoiceStatusInput,
  type UpdateEntitlementClaimStatusInput,
  type UpdateMebSubmissionStatusInput,
  type FamilyEducationNoteInput,
  type FamilyEducationPlanInput,
  type PersonalNoteInput,
  type InstitutionRamTrackingInput,
  type InstitutionTransportPlanInput,
  type PlatformAnnouncementInput,
  type PlatformStatusIncidentInput,
  type PlatformStatusIncidentUpdateInput,
  type PlatformMaintenanceSettingsInput,
  type MaintenanceWindowInput,
  type InstitutionSessionInput,
  type InstitutionSettingsInput,
  type InviteCodeCreateInput,
  type MarkParentMessageReadInput,
  type PasswordChangeInput,
  type ParentStudentLinkInput,
  type ParentMessageInput,
  type ParentStudentUnlinkInput,
  type ProductFeedbackInput,
  type ProfileUpdateInput,
  type QuickSessionNoteInput,
  type RemoveInstitutionMemberInput,
  type ResetPasswordInput,
  type SessionRoomInput,
  type SessionTimeSlotInput,
  type StaffProfileInput,
  type StudentFileInput,
  type StudentFileFolderInput,
  type StudentInput,
  type VerifyRegistrationCodeInput,
  type ZumreMeetingDocumentInput,
  togglePlatformAnnouncementSchema,
  undoBepTransferInviteSchema,
  type AcceptBepTransferInviteInput,
  type CreateBepTransferInviteInput,
  type TogglePlatformAnnouncementInput,
  type UndoBepTransferInviteInput,
  supportTicketSchema,
  supportTicketReplySchema,
  supportTicketStatusSchema,
  deleteSupportTicketSchema,
  type SupportTicketInput,
  type SupportTicketReplyInput,
  type SupportTicketStatusInput,
  type DeleteSupportTicketInput,
} from "@/lib/schemas";
import { emptyBepValues } from "@/lib/defaults";
import { getSession, requireAdmin, requireManagementUser, requireUser } from "@/lib/session";
import { buildStudentWriteData } from "@/lib/student-write-data";
import { isStudentAvailableOnDate } from "@/lib/student-participation";
import { parseDate, sanitizeHtml } from "@/lib/utils";
import { buildZumreMeetingTitle } from "@/lib/zumre-meeting";

type ActionResult = {
  success: boolean;
  message: string;
  id?: string;
  sharePath?: string;
  undoUntil?: string;
  retryAfterSeconds?: number;
};

function operationalModuleDenied(user: {
  institutionId?: string | null;
  institution?: { type?: "rehabilitation_center" | "public_special_education_practice_school" | null } | null;
}): ActionResult | null {
  return userSupportsSessionAndFinanceModules(user)
    ? null
    : {
        success: false,
        message: "Bu modül Özel Eğitim Uygulama Okulları için kullanılamaz.",
      };
}

const PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS = 60;

function buildBepDocumentData(input: BepDocumentInput) {
  return {
    title: input.title.trim(),
    status: input.status,
    startDate: parseDate(input.startDate),
    endDate: parseDate(input.endDate),
    learningEnvironmentText: input.learningEnvironmentText?.trim() || null,
    physicalEnvironmentText: input.physicalEnvironmentText?.trim() || null,
    socialInteractionText: input.socialInteractionText?.trim() || null,
    digitalSupportsText: input.digitalSupportsText?.trim() || null,
    familyFrequency: input.familyFrequency?.trim() || null,
    familyMethod: input.familyMethod?.trim() || null,
    familyTrainingRequired: input.familyTrainingRequired,
    familyTrainingMethod: input.familyTrainingMethod?.trim() || null,
    nextMeetingDate: parseDate(input.nextMeetingDate),
    generalEvaluation: input.generalEvaluation?.trim() || null,
    otherDecisionOne: input.otherDecisionOne?.trim() || null,
    otherDecisionTwo: input.otherDecisionTwo?.trim() || null,
    otherDecisionThree: input.otherDecisionThree?.trim() || null,
  };
}

function buildBepDocumentPayload(input: BepDocumentInput) {
  return {
    performanceEntries: {
      create: input.performanceEntries.map((entry) => ({
        sortOrder: entry.sortOrder,
        courseName: entry.courseName.trim(),
        performanceLevel: entry.performanceLevel.trim(),
      })),
    },
    planRows: {
      create: input.planRows.map((row) => {
        const processComponents = serializeProcessComponentSchedules(
          row.processComponents,
          row.processComponentSchedules,
          {
            fallbackStartDate: row.startDate,
            fallbackEndDate: row.endDate,
            fallbackEvaluationDates: row.evaluationDates,
          },
        );
        const dateSummary = derivePlanRowDateSummary(processComponents);

        return {
          sortOrder: row.sortOrder,
          courseId: row.courseId || null,
          themeName: row.themeName?.trim() || null,
          outcomeCode: row.outcomeCode?.trim() || null,
          courseName: row.courseName.trim(),
          learningArea: row.learningArea.trim(),
          learningOutcome: row.learningOutcome.trim(),
          processComponents,
          criterion: row.criterion?.trim() || null,
          methodTechnique: row.methodTechnique?.trim() || null,
          materials: row.materials?.trim() || null,
          tendencies: row.tendencies?.trim() || null,
          startDate: parseDate(dateSummary.startDate || row.startDate),
          endDate: parseDate(dateSummary.endDate || row.endDate),
          evaluationMethods: row.evaluationMethods?.trim() || null,
          evaluationDates:
            dateSummary.evaluationDates.length > 0
              ? dateSummary.evaluationDates
              : row.evaluationDates,
          performanceResult: row.performanceResult?.trim() || null,
          isManualEntry: row.isManualEntry,
        };
      }),
    },
    supportServiceEntries: {
      create: input.supportServiceEntries.map((entry) => ({
        sortOrder: entry.sortOrder,
        serviceType: entry.serviceType.trim(),
        courseName: entry.courseName?.trim() || null,
        weeklyDuration: entry.weeklyDuration?.trim() || null,
        responsiblePeople: entry.responsiblePeople?.trim() || null,
      })),
    },
    decisionEntries: {
      create: input.decisionEntries.map((entry) => ({
        category: entry.category,
        sortOrder: entry.sortOrder,
        title: entry.title.trim(),
        value: entry.value.trim(),
      })),
    },
    committeeMembers: {
      create: input.committeeMembers.map((entry) => ({
        sortOrder: entry.sortOrder,
        role: entry.role.trim(),
        title: entry.title?.trim() || null,
        fullName: entry.fullName?.trim() || null,
        branch: entry.branch?.trim() || null,
      })),
    },
    subjectTeachers: {
      create: input.subjectTeachers.map((entry) => ({
        sortOrder: entry.sortOrder,
        courseName: entry.courseName?.trim() || null,
        fullName: entry.fullName?.trim() || null,
      })),
    },
  };
}

async function getActiveAdminCount(excludeUserId?: string) {
  return prisma.user.count({
    where: {
      role: UserRole.admin,
      isActive: true,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
  });
}

function generateInviteCode() {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
}

function generateVerificationCode() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function createEmailToken(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex").slice(0, 24);
}

function buildInvoiceNumber(prefix: string | null | undefined, sequence: number, issueDate: Date) {
  const normalizedPrefix =
    prefix?.trim().toLocaleUpperCase("tr-TR").replace(/[^A-Z0-9]/g, "") || "SPC";
  const year = issueDate.getFullYear();
  return `${normalizedPrefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

function resolveInvoicePeriod(period: string) {
  const [year, month] = period.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  return {
    key: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    label: new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(start),
    start,
    end,
  };
}

function canManageStudentFiles(role: UserRole) {
  return canCreateBep(role);
}

function getStudentFileFolderWhere(user: { id: string; role: UserRole; institutionId?: string | null }) {
  if (user.role === UserRole.admin) {
    return {};
  }

  if (user.institutionId && (isInstitutionRole(user.role) || user.role === UserRole.teacher)) {
    return {
      OR: [{ institutionId: user.institutionId }, { createdById: user.id }],
    };
  }

  return {
    createdById: user.id,
  };
}

function decodeUploadedStudentFile(
  base64?: string,
  metadata?: { fileName?: string | null; mimeType?: string | null },
) {
  if (!base64?.trim()) {
    return null;
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, "base64");
  } catch {
    return {
      error: "Dosya okunamadi.",
    } as const;
  }

  const validation = validateUploadedDocumentFile({
    buffer,
    fileName: metadata?.fileName,
    mimeType: metadata?.mimeType,
  });

  if (!validation.allowed) {
    return {
      error: validation.message,
    } as const;
  }

  return {
    buffer,
    size: buffer.byteLength,
    fileName: validation.safeFileName,
    mimeType: validation.mimeType,
  } as const;
}

function toPrismaBytes(buffer: Buffer) {
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
  return new Uint8Array(arrayBuffer);
}

function parseTimeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

function buildSessionEndTime(startTime: string, durationMinutes: number) {
  const totalMinutes = parseTimeToMinutes(startTime) + durationMinutes;
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function doTimesOverlap(
  leftStart: string,
  leftDuration: number,
  rightStart: string,
  rightDuration: number,
) {
  const leftStartMinutes = parseTimeToMinutes(leftStart);
  const leftEndMinutes = leftStartMinutes + leftDuration;
  const rightStartMinutes = parseTimeToMinutes(rightStart);
  const rightEndMinutes = rightStartMinutes + rightDuration;

  return leftStartMinutes < rightEndMinutes && rightStartMinutes < leftEndMinutes;
}

async function logEmailFailure(
  actorId: string | null,
  entityId: string,
  summary: string,
  message?: string,
) {
  await writeAuditLog({
    actorId,
    action: "email.send_failed",
    entityType: "user",
    entityId,
    summary,
    metadata: message ? { message } : undefined,
  });
}

async function enforceActionRateLimit(options: {
  action: string;
  key: string;
  limit: number;
  windowMs: number;
  blockMs?: number;
  actorId?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  message: string;
}) {
  const result = await consumeRateLimit({
    action: options.action,
    key: options.key,
    limit: options.limit,
    windowMs: options.windowMs,
    blockMs: options.blockMs,
  });

  if (!result.allowed) {
    let securityAction = `${options.action}.rate_limited`;
    let summaryText = `${options.action} isteği hiz sinirina takildi.`;

    if (options.action.includes("login") || options.action.includes("auth")) {
      securityAction = "security.brute_force_attempt";
      summaryText = `Şüpheli giriş denemesi (brute-force) engellendi. Hedef: ${options.key}`;
    } else if (options.action.includes("registration") || options.action.includes("register")) {
      securityAction = "security.registration_spam";
      summaryText = `Kayıt oluşturma spam denemesi engellendi. Hedef: ${options.key}`;
    } else if (options.action.includes("password_reset") || options.action.includes("şifre")) {
      securityAction = "security.password_reset_spam";
      summaryText = `Şifre sıfırlama spam denemesi engellendi. Hedef: ${options.key}`;
    } else {
      securityAction = "security.abuse_attempt";
      summaryText = `Spam / kötüye kullanım engellendi (${options.action}). Hedef: ${options.key}`;
    }

    await writeAuditLog({
      actorId: options.actorId ?? null,
      action: securityAction,
      entityType: "security",
      entityId: options.entityId ?? null,
      summary: summaryText,
      metadata: {
        key: options.key,
        limit: options.limit,
        windowMs: options.windowMs,
        retryAfterMs: result.retryAfterMs,
        ...(options.metadata ?? {}),
      },
    });

    return {
      success: false,
      message: options.message,
      retryAfterSeconds: Math.max(1, Math.ceil(result.retryAfterMs / 1000)),
    } satisfies ActionResult;
  }

  return null;
}

function buildApprovalStateForDocument(user: { id: string; name: string | null; role: UserRole; institutionId?: string | null }) {
  const needsInstitutionApproval = user.role === UserRole.teacher && !!user.institutionId;

  if (needsInstitutionApproval) {
    return {
      approvalStatus: "pending" as const,
      submittedAt: new Date(),
      approvedAt: null,
      approvedById: null,
      approvedByName: null,
      rejectedAt: null,
      rejectedById: null,
      rejectedByName: null,
      rejectionReason: null,
    };
  }

  return {
    approvalStatus: "approved" as const,
    submittedAt: new Date(),
    approvedAt: new Date(),
    approvedById: user.id,
    approvedByName: user.name ?? null,
    rejectedAt: null,
    rejectedById: null,
    rejectedByName: null,
    rejectionReason: null,
  };
}

async function resolveInviteCodeForRegistration(email: string, inviteCodeValue?: string | null) {
  if (!inviteCodeValue?.trim()) {
    return null;
  }

  const code = inviteCodeValue.trim().toUpperCase();
  const inviteCode = await prisma.inviteCode.findFirst({
    where: {
      code,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      role: true,
      institutionId: true,
      studentId: true,
      email: true,
    },
  });

  if (!inviteCode) {
    return { error: "Davet kodu geçersiz veya süresi dolmuş." } as const;
  }

  if (inviteCode.email && inviteCode.email.toLowerCase() !== email) {
    return {
      error: "Bu davet kodu farkli bir e-posta adresi için olusturulmus.",
    } as const;
  }

  return { inviteCode } as const;
}

async function finalizeRegisteredUser(input: {
  name: string;
  email: string;
  passwordHash: string;
  inviteCodeValue?: string | null;
}) {
  const inviteCodeResult = await resolveInviteCodeForRegistration(input.email, input.inviteCodeValue);
  if (inviteCodeResult?.error) {
    return {
      success: false,
      message: inviteCodeResult.error,
    } satisfies ActionResult;
  }

  const inviteCode = inviteCodeResult?.inviteCode ?? null;
  const targetRole = inviteCode?.role ?? UserRole.teacher;
  const institutionId = inviteCode?.institutionId ?? null;

  const createdUser = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash: input.passwordHash,
      role: targetRole,
      institutionId,
    },
  });

  if (inviteCode?.role === UserRole.parent && inviteCode.studentId) {
    await prisma.parentStudentLink.create({
      data: {
        parentId: createdUser.id,
        studentId: inviteCode.studentId,
      },
    });
  }

  if (inviteCode) {
    await prisma.inviteCode.update({
      where: { id: inviteCode.id },
      data: {
        usedAt: new Date(),
        usedById: createdUser.id,
      },
    });
  }

  await writeAuditLog({
    actorId: createdUser.id,
    action: "user.registered",
    entityType: "user",
    entityId: createdUser.id,
    summary:
      createdUser.role === UserRole.admin
        ? "Ilk kullanıcı admin olarak kaydedildi."
        : "Yeni kullanıcı kaydı olusturuldu.",
    metadata: {
      role: createdUser.role,
      email: createdUser.email,
      institutionId: createdUser.institutionId,
      inviteCodeId: inviteCode?.id ?? null,
    },
  });

  const welcomeEmail = buildWelcomeEmail(createdUser.name);
  const welcomeEmailResult = await sendTransactionalEmail({
    to: createdUser.email,
    subject: welcomeEmail.subject,
    html: welcomeEmail.html,
    text: welcomeEmail.text,
    idempotencyKey: `welcome-user/${createdUser.id}`,
    tags: [
      { name: "category", value: "welcome" },
      { name: "user_id", value: createdUser.id },
    ],
  });

  if (!welcomeEmailResult.success && !welcomeEmailResult.skipped) {
    await logEmailFailure(
      createdUser.id,
      createdUser.id,
      `${createdUser.email} için hoş geldiniz e-postasi gönderilemedi.`,
      welcomeEmailResult.message,
    );
  }

  return {
    success: true,
    message: "Kayıt tamamlandi. Giriş yapabilirsiniz.",
    id: createdUser.id,
  } satisfies ActionResult;
}

export async function registerUserAction(input: unknown): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    await purgeExpiredRateLimits();
    const parsed = registerSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Form dogrulanamadi.",
      };
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const requestIp = await getRequestIp();
    const emailRateLimit = await enforceActionRateLimit({
      action: "auth.register",
      key: `email:${normalizedEmail}`,
      limit: 3,
      windowMs: 1000 * 60 * 60,
      blockMs: 1000 * 60 * 60,
      metadata: { email: normalizedEmail, ip: requestIp },
      message: "Kayıt denemesi gecici olarak sınırlandı. Lutfen daha sonra tekrar deneyin.",
    });
    if (emailRateLimit) {
      return emailRateLimit;
    }

    const ipRateLimit = await enforceActionRateLimit({
      action: "auth.register",
      key: `ip:${requestIp}`,
      limit: 8,
      windowMs: 1000 * 60 * 60,
      blockMs: 1000 * 60 * 60,
      metadata: { email: normalizedEmail, ip: requestIp },
      message: "Kayıt denemesi gecici olarak sınırlandı. Lutfen daha sonra tekrar deneyin.",
    });
    if (ipRateLimit) {
      return ipRateLimit;
    }

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return { success: false, message: "Bu e-posta ile kayitli kullanıcı zaten var." };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const inviteCodeResult = await resolveInviteCodeForRegistration(
      normalizedEmail,
      parsed.data.inviteCode,
    );
    if (inviteCodeResult?.error) {
      return {
        success: false,
        message: inviteCodeResult.error,
      };
    }

    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

    await prisma.registrationVerification.upsert({
      where: { email: normalizedEmail },
      update: {
        name: parsed.data.name.trim(),
        passwordHash,
        inviteCode: parsed.data.inviteCode?.trim().toUpperCase() || null,
        codeHash,
        expiresAt,
        attempts: 0,
      },
      create: {
        email: normalizedEmail,
        name: parsed.data.name.trim(),
        passwordHash,
        inviteCode: parsed.data.inviteCode?.trim().toUpperCase() || null,
        codeHash,
        expiresAt,
      },
    });

    const verificationEmail = buildRegistrationVerificationEmail(parsed.data.name.trim(), code);
    const verificationEmailResult = await sendTransactionalEmail({
      to: normalizedEmail,
      subject: verificationEmail.subject,
      html: verificationEmail.html,
      text: verificationEmail.text,
      idempotencyKey: `registration-verification/${createEmailToken(normalizedEmail)}/${expiresAt.getTime()}`,
      tags: [
        { name: "category", value: "registration_verification" },
      ],
    });

    if (!verificationEmailResult.success) {
      if (!verificationEmailResult.skipped) {
        await logEmailFailure(
          null,
          normalizedEmail,
          `${normalizedEmail} için kayıt doğrulama e-postasi gönderilemedi.`,
          verificationEmailResult.message,
        );
      }

      await prisma.registrationVerification.deleteMany({
        where: { email: normalizedEmail },
      });

      return {
        success: false,
        message: verificationEmailResult.skipped
          ? "Doğrulama kodu gönderilemedi. E-posta servisi ayarları eksik."
          : `Doğrulama kodu gönderilemedi: ${verificationEmailResult.message ?? "Servis hatasi"}`,
      };
    }

    await writeAuditLog({
      actorId: null,
      action: "registration_verification.requested",
      entityType: "registrationVerification",
      summary: `${normalizedEmail} için kayıt doğrulama kodu gönderildi.`,
      metadata: {
        email: normalizedEmail,
        expiresAt: expiresAt.toISOString(),
      },
    });

    return {
      success: true,
      message: "6 haneli doğrulama kodu e-posta adresinize gönderildi.",
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function verifyRegistrationCodeAction(
  input: VerifyRegistrationCodeInput,
): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const parsed = verifyRegistrationCodeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Doğrulama kodu geçersiz.",
      };
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const verification = await prisma.registrationVerification.findUnique({
      where: { email: normalizedEmail },
    });

    if (!verification || verification.expiresAt < new Date()) {
      return {
        success: false,
        message: "Doğrulama kodunun süresi doldu. Yeni kod isteyin.",
      };
    }

    const nextAttempts = verification.attempts + 1;
    const matches = verification.codeHash === hashVerificationCode(parsed.data.code);

    if (!matches) {
      if (nextAttempts >= 5) {
        await prisma.registrationVerification.delete({
          where: { email: normalizedEmail },
        });
        return {
          success: false,
          message: "Cok fazla hatali deneme yapildi. Yeni kod isteyin.",
        };
      }

      await prisma.registrationVerification.update({
        where: { email: normalizedEmail },
        data: { attempts: nextAttempts },
      });

      return {
        success: false,
        message: "Doğrulama kodu hatali.",
      };
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      await prisma.registrationVerification.delete({
        where: { email: normalizedEmail },
      });
      return {
        success: false,
        message: "Bu e-posta ile kayitli kullanıcı zaten var.",
      };
    }

    const result = await finalizeRegisteredUser({
      name: verification.name,
      email: normalizedEmail,
      passwordHash: verification.passwordHash,
      inviteCodeValue: verification.inviteCode,
    });

    if (!result.success) {
      return result;
    }

    await prisma.registrationVerification.delete({
      where: { email: normalizedEmail },
    });

    return {
      success: true,
      message: "Kaydiniz onaylandi. Giriş yapabilirsiniz.",
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function createInstitutionApplicationAction(
  input: InstitutionApplicationInput,
): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    await purgeExpiredRateLimits();
    const parsed = institutionApplicationSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Başvuru formu dogrulanamadi.",
      };
    }

    const requestIp = await getRequestIp();
    const rateLimit = await enforceActionRateLimit({
      action: "institution.application",
      key: `ip:${requestIp}`,
      limit: 5,
      windowMs: 1000 * 60 * 60,
      blockMs: 1000 * 60 * 60,
      metadata: { ip: requestIp, email: parsed.data.email.trim().toLowerCase() },
      message: "Başvuru gonderimi gecici olarak sınırlandı. Lutfen daha sonra tekrar deneyin.",
    });
    if (rateLimit) {
      return rateLimit;
    }

    const application = await prisma.institutionApplication.create({
      data: {
        institutionName: parsed.data.institutionName.trim(),
        institutionType: parsed.data.institutionType,
        contactName: parsed.data.contactName.trim(),
        email: parsed.data.email.trim().toLowerCase(),
        phone: parsed.data.phone?.trim() || null,
        message: parsed.data.message?.trim() || null,
      },
    });

    await writeAuditLog({
      actorId: null,
      action: "institution_application.created",
      entityType: "institutionApplication",
      entityId: application.id,
      summary: `${application.institutionName} için kurum basvurusu olusturuldu.`,
      metadata: {
        email: application.email,
        status: application.status,
        institutionType: application.institutionType,
      },
    });

    const receivedEmail = buildInstitutionApplicationReceivedEmail(
      application.contactName,
      application.institutionName,
    );
    const receivedEmailResult = await sendTransactionalEmail({
      to: application.email,
      subject: receivedEmail.subject,
      html: receivedEmail.html,
      text: receivedEmail.text,
      idempotencyKey: `institution-application-received/${application.id}`,
      tags: [
        { name: "category", value: "institution_application_received" },
        { name: "application_id", value: application.id },
      ],
    });

    if (!receivedEmailResult.success && !receivedEmailResult.skipped) {
      await writeAuditLog({
        actorId: null,
        action: "institution_application.email_failed",
        entityType: "institutionApplication",
        entityId: application.id,
        summary: `${application.institutionName} kurum basvurusu için alindi e-postasi gönderilemedi.`,
        metadata: receivedEmailResult.message
          ? {
              email: application.email,
              message: receivedEmailResult.message,
            }
          : { email: application.email },
      });
    }

    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/kurum-basvurulari");

    return {
      success: true,
      message: "Başvurunuz alindi. Değerlendirme sonrası sizinle iletişime gececegiz.",
      id: application.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function requestPasswordResetAction(
  input: ForgotPasswordInput,
): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    await purgeExpiredRateLimits();
    const parsed = forgotPasswordSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "E-posta adresi dogrulanamadi.",
      };
    }

    const normalizedEmail = parsed.data.email.toLowerCase();
    const requestIp = await getRequestIp();
    const cooldownRateLimit = await enforceActionRateLimit({
      action: "auth.password_reset_request.cooldown",
      key: `email:${normalizedEmail}`,
      limit: 1,
      windowMs: 1000 * PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS,
      blockMs: 1000 * PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS,
      metadata: { email: normalizedEmail, ip: requestIp },
      message: `Yeni sifirlama maili istemeden once ${PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS} saniye bekleyin.`,
    });
    if (cooldownRateLimit) {
      return cooldownRateLimit;
    }

    const emailRateLimit = await enforceActionRateLimit({
      action: "auth.password_reset_request",
      key: `email:${normalizedEmail}`,
      limit: 3,
      windowMs: 1000 * 60 * 60,
      blockMs: 1000 * 60 * 60,
      metadata: { email: normalizedEmail, ip: requestIp },
      message:
        "Bu e-posta sistemde varsa şifre sifirlama bağlantısı gönderildi. Spam veya gereksiz klasorunuzu da kontrol edin.",
    });
    if (emailRateLimit) {
      return emailRateLimit;
    }

    const ipRateLimit = await enforceActionRateLimit({
      action: "auth.password_reset_request",
      key: `ip:${requestIp}`,
      limit: 10,
      windowMs: 1000 * 60 * 60,
      blockMs: 1000 * 60 * 60,
      metadata: { email: normalizedEmail, ip: requestIp },
      message:
        "Bu e-posta sistemde varsa şifre sifirlama bağlantısı gönderildi. Spam veya gereksiz klasorunuzu da kontrol edin.",
    });
    if (ipRateLimit) {
      return ipRateLimit;
    }

    await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { user: { email: normalizedEmail } }],
      },
    });

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, name: true, email: true, isActive: true },
    });

    const genericMessage =
      "Bu e-posta sistemde varsa şifre sifirlama bağlantısı gönderildi. Spam veya gereksiz klasorunuzu da kontrol edin.";

    if (!user || !user.isActive) {
      return {
        success: true,
        message: genericMessage,
        retryAfterSeconds: PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS,
      };
    }

    const resetToken = createPasswordResetToken();

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: resetToken.tokenHash,
        expiresAt: resetToken.expiresAt,
      },
    });

    const passwordResetEmail = buildPasswordResetEmail(user.name, resetToken.token);
    const emailResult = await sendTransactionalEmail({
      to: user.email,
      subject: passwordResetEmail.subject,
      html: passwordResetEmail.html,
      text: passwordResetEmail.text,
      idempotencyKey: `password-reset/${user.id}/${resetToken.tokenHash}`,
      tags: [
        { name: "category", value: "password_reset" },
        { name: "user_id", value: user.id },
      ],
    });

    if (!emailResult.success && !emailResult.skipped) {
      await writeAuditLog({
        actorId: null,
        action: "password_reset.email_failed",
        entityType: "user",
        entityId: user.id,
        summary: `${user.email} için şifre sifirlama e-postasi gönderilemedi.`,
        metadata: emailResult.message ? { message: emailResult.message } : undefined,
      });
    }

    await writeAuditLog({
      actorId: null,
      action: "password_reset.requested",
      entityType: "user",
      entityId: user.id,
      summary: `${user.email} için şifre sifirlama talebi olusturuldu.`,
      metadata: { emailSent: emailResult.success, institutionId: null },
    });

    return {
      success: true,
      message: genericMessage,
      retryAfterSeconds: PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function resetPasswordAction(input: ResetPasswordInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    await purgeExpiredRateLimits();
    const parsed = resetPasswordSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Şifre sifirlama formu dogrulanamadi.",
      };
    }

    const requestIp = await getRequestIp();
    const resetRateLimit = await enforceActionRateLimit({
      action: "auth.password_reset_complete",
      key: `ip:${requestIp}`,
      limit: 10,
      windowMs: 1000 * 60 * 30,
      blockMs: 1000 * 60 * 30,
      metadata: { ip: requestIp },
      message: "Şifre sifirlama denemesi gecici olarak sınırlandı. Lutfen daha sonra tekrar deneyin.",
    });
    if (resetRateLimit) {
      return resetRateLimit;
    }

    await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const tokenHash = hashPasswordResetToken(parsed.data.token);
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, isActive: true, institutionId: true },
        },
      },
    });

    if (!tokenRecord || tokenRecord.expiresAt < new Date() || !tokenRecord.user.isActive) {
      await writeAuditLog({
        actorId: tokenRecord?.userId ?? null,
        action: "password_reset.invalid_token",
        entityType: "user",
        entityId: tokenRecord?.userId ?? null,
        summary: "Geçersiz veya süresi dolmuş şifre sifirlama bağlantısı kullanıldı.",
        metadata: { ip: requestIp },
      });
      return {
        success: false,
        message: "Sifirlama bağlantısı geçersiz veya süresi dolmuş.",
      };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    await prisma.user.update({
      where: { id: tokenRecord.userId },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.deleteMany({
      where: { userId: tokenRecord.userId },
    });

    await writeAuditLog({
      actorId: tokenRecord.userId,
      action: "password_reset.completed",
      entityType: "user",
      entityId: tokenRecord.userId,
      summary: `${tokenRecord.user.email} kullanicisinin şifresi sifirlandi.`,
      metadata: { institutionId: tokenRecord.user.institutionId },
    });

    return {
      success: true,
      message: "Sifreniz guncellendi. Yeni sifrenizle giriş yapabilirsiniz.",
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateProfileAction(input: ProfileUpdateInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const parsed = profileUpdateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Profil formu dogrulanamadi.",
      };
    }

    const normalizedEmail = parsed.data.email.trim().toLowerCase();
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: user.id },
      },
      select: { id: true },
    });

    if (existingUser) {
      return { success: false, message: "Bu e-posta adresi baska bir hesapta kullaniliyor." };
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name.trim(),
        email: normalizedEmail,
      },
      select: {
        id: true,
        name: true,
        email: true,
        institutionId: true,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "profile.updated",
      entityType: "user",
      entityId: user.id,
      summary: `${updatedUser.email} kullanicisinin profil bilgileri guncellendi.`,
      metadata: {
        institutionId: updatedUser.institutionId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/profil");

    return {
      success: true,
      message: "Profil bilgileri guncellendi.",
      id: updatedUser.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

function buildPersonalNoteTitle(input: PersonalNoteInput) {
  const explicitTitle = input.title?.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const firstLine = input.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Yeni Not";
  }

  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

export async function savePersonalNoteAction(input: PersonalNoteInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const parsed = personalNoteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Not formu dogrulanamadi.",
      };
    }

    const payload = {
      title: buildPersonalNoteTitle(parsed.data),
      content: parsed.data.content.trim(),
      category: parsed.data.category?.trim() || "Genel",
      color: parsed.data.color,
      isPinned: parsed.data.isPinned,
      institutionId: user.institutionId ?? null,
      archivedAt: null,
    };

    if (parsed.data.id) {
      const existing = await prisma.personalNote.findFirst({
        where: {
          id: parsed.data.id,
          ownerId: user.id,
          archivedAt: null,
        },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "Not bulunamadı." };
      }

      const note = await prisma.personalNote.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "personal_note.updated",
        entityType: "personalNote",
        entityId: note.id,
        summary: `${note.title} notu guncellendi.`,
        metadata: {
          institutionId: note.institutionId,
          category: note.category,
        },
      });

      revalidatePath("/panel/notlar");
      return { success: true, message: "Not guncellendi.", id: note.id };
    }

    const note = await prisma.personalNote.create({
      data: {
        ownerId: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "personal_note.created",
      entityType: "personalNote",
      entityId: note.id,
      summary: `${note.title} notu olusturuldu.`,
      metadata: {
        institutionId: note.institutionId,
        category: note.category,
      },
    });

    revalidatePath("/panel/notlar");
    return { success: true, message: "Not kaydedildi.", id: note.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deletePersonalNoteAction(
  input: DeletePersonalNoteInput,
): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const parsed = deletePersonalNoteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Not silme isteği dogrulanamadi.",
      };
    }

    const note = await prisma.personalNote.findFirst({
      where: {
        id: parsed.data.id,
        ownerId: user.id,
        archivedAt: null,
      },
      select: {
        id: true,
        title: true,
        category: true,
        institutionId: true,
      },
    });

    if (!note) {
      return { success: false, message: "Not bulunamadı." };
    }

    await prisma.personalNote.delete({
      where: { id: note.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "personal_note.deleted",
      entityType: "personalNote",
      entityId: note.id,
      summary: `${note.title} notu silindi.`,
      metadata: {
        institutionId: note.institutionId,
        category: note.category,
      },
    });

    revalidatePath("/panel/notlar");
    return { success: true, message: "Not silindi.", id: note.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function changePasswordAction(input: PasswordChangeInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    await purgeExpiredRateLimits();
    const user = await requireUser();
    const parsed = passwordChangeSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Şifre formu dogrulanamadi.",
      };
    }

    const requestIp = await getRequestIp();
    const userRateLimit = await enforceActionRateLimit({
      action: "profile.password_change",
      key: `user:${user.id}`,
      limit: 5,
      windowMs: 1000 * 60 * 30,
      blockMs: 1000 * 60 * 30,
      actorId: user.id,
      entityId: user.id,
      metadata: { ip: requestIp },
      message: "Şifre değiştirme denemesi gecici olarak sınırlandı. Lutfen daha sonra tekrar deneyin.",
    });
    if (userRateLimit) {
      return userRateLimit;
    }

    const ipRateLimit = await enforceActionRateLimit({
      action: "profile.password_change",
      key: `ip:${requestIp}`,
      limit: 10,
      windowMs: 1000 * 60 * 30,
      blockMs: 1000 * 60 * 30,
      actorId: user.id,
      entityId: user.id,
      metadata: { ip: requestIp },
      message: "Şifre değiştirme denemesi gecici olarak sınırlandı. Lutfen daha sonra tekrar deneyin.",
    });
    if (ipRateLimit) {
      return ipRateLimit;
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        institutionId: true,
      },
    });

    if (!userRecord) {
      return { success: false, message: "Kullanıcı kaydı bulunamadı." };
    }

    const isValid = await bcrypt.compare(parsed.data.currentPassword, userRecord.passwordHash);
    if (!isValid) {
      await writeAuditLog({
        actorId: user.id,
        action: "profile.password_change_failed",
        entityType: "user",
        entityId: user.id,
        summary: `${userRecord.email} için mevcut şifre dogrulanamadi.`,
        metadata: {
          ip: requestIp,
          institutionId: userRecord.institutionId,
          reason: "invalid_password",
        },
      });
      return { success: false, message: "Mevcut şifre hatali." };
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "profile.password_changed",
      entityType: "user",
      entityId: user.id,
      summary: `${userRecord.email} kullanicisinin şifresi guncellendi.`,
      metadata: {
        ip: requestIp,
        institutionId: userRecord.institutionId,
      },
    });

    revalidatePath("/panel/profil");

    return {
      success: true,
      message: "Sifreniz guncellendi.",
      id: user.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function closeAccountAction(input: CloseAccountInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    await purgeExpiredRateLimits();
    const user = await requireUser();
    const parsed = closeAccountSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Hesap kapatma isteği dogrulanamadi.",
      };
    }

    const requestIp = await getRequestIp();
    const userRateLimit = await enforceActionRateLimit({
      action: "profile.close_account",
      key: `user:${user.id}`,
      limit: 3,
      windowMs: 1000 * 60 * 30,
      blockMs: 1000 * 60 * 30,
      actorId: user.id,
      entityId: user.id,
      metadata: { ip: requestIp },
      message: "Hesap kapatma denemesi gecici olarak sınırlandı. Lutfen daha sonra tekrar deneyin.",
    });
    if (userRateLimit) {
      return userRateLimit;
    }

    const ipRateLimit = await enforceActionRateLimit({
      action: "profile.close_account",
      key: `ip:${requestIp}`,
      limit: 6,
      windowMs: 1000 * 60 * 30,
      blockMs: 1000 * 60 * 30,
      actorId: user.id,
      entityId: user.id,
      metadata: { ip: requestIp },
      message: "Hesap kapatma denemesi gecici olarak sınırlandı. Lutfen daha sonra tekrar deneyin.",
    });
    if (ipRateLimit) {
      return ipRateLimit;
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        institutionId: true,
      },
    });

    if (!userRecord) {
      return { success: false, message: "Kullanıcı kaydı bulunamadı." };
    }

    const hasSocialLogin = await prisma.authIdentity.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!hasSocialLogin) {
      const isValid = (parsed.data.password && userRecord.passwordHash)
        ? await bcrypt.compare(parsed.data.password, userRecord.passwordHash)
        : false;
      if (!isValid) {
        await writeAuditLog({
          actorId: user.id,
          action: "profile.close_account_failed",
          entityType: "user",
          entityId: user.id,
          summary: "Hesap kapatma denemesi basarisiz oldu: Şifre dogrulanamadi.",
          metadata: { ip: requestIp },
        });
        return { success: false, message: "Mevcut sifreniz dogrulanamadi." };
      }
    }

    await deleteUserAccount({
      userId: userRecord.id,
      requestIp,
      source: "web",
    });

    await clearRateLimit("profile.close_account", `user:${userRecord.id}`);
    await clearRateLimit("auth.login", userRecord.email.toLowerCase());

    revalidatePath("/panel");
    revalidatePath("/panel/profil");

    return {
      success: true,
      message: "Hesabiniz ve size ait veriler sistemden silindi.",
      id: userRecord.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof ApiError ? error.message : getReadableDbError(error),
    };
  }
}

export async function saveStudentAction(input: StudentInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = studentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Öğrenci formu dogrulanamadi.",
      };
    }

    if (user.role === UserRole.parent) {
      return { success: false, message: "Veli hesabi öğrenci olusturamaz." };
    }

    const data = buildStudentWriteData(parsed.data);

    if (parsed.data.id) {
      const existing = await prisma.student.findFirst({
        where: {
          id: parsed.data.id,
          ...getStudentAccessWhere(user),
        },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "Öğrenci kaydı bulunamadı." };
      }

      const student = await prisma.student.update({
        where: { id: existing.id },
        data,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "student.updated",
        entityType: "student",
        entityId: student.id,
        summary: `${student.firstName} ${student.lastName} öğrenci kaydı guncellendi.`,
        metadata: { institutionId: student.institutionId },
      });

      revalidatePath(`/panel/ogrenciler/${student.id}`);
      revalidatePath("/panel/ogrenciler");
      revalidatePath("/panel");

      return { success: true, message: "Öğrenci kaydı guncellendi.", id: student.id };
    }

    const student = await prisma.student.create({
      data: {
        ownerId: user.id,
        institutionId: user.institutionId ?? null,
        ...data,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "student.created",
      entityType: "student",
      entityId: student.id,
      summary: `${student.firstName} ${student.lastName} öğrenci kaydı olusturuldu.`,
      metadata: { institutionId: student.institutionId },
    });

    revalidatePath("/panel/ogrenciler");
    revalidatePath("/panel");

    return { success: true, message: "Öğrenci kaydı olusturuldu.", id: student.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function setStudentActiveAction(input: SetStudentActiveInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = setStudentActiveSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Öğrenci seçimi geçersiz.",
      };
    }

    if (user.role === UserRole.parent) {
      return { success: false, message: "Veli hesabi öğrenci durumunu degistiremez." };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parsed.data.id,
        ...getStudentAccessWhere(user),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        institutionId: true,
        isActive: true,
      },
    });

    if (!student) {
      return { success: false, message: "Öğrenci kaydı bulunamadı." };
    }

    if (student.isActive === parsed.data.isActive) {
      return {
        success: true,
        message: parsed.data.isActive ? "Öğrenci zaten aktif." : "Öğrenci zaten arşivde.",
        id: student.id,
      };
    }

    await prisma.student.update({
      where: { id: student.id },
      data: {
        isActive: parsed.data.isActive,
        archivedAt: parsed.data.isActive ? null : new Date(),
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: parsed.data.isActive ? "student.activated" : "student.archived",
      entityType: "student",
      entityId: student.id,
      summary: `${student.firstName} ${student.lastName} öğrenci kaydı ${
        parsed.data.isActive ? "yeniden aktif edildi" : "arşive alindi"
      }.`,
      metadata: { institutionId: student.institutionId },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/ogrenciler");
    revalidatePath("/panel/bep");
    revalidatePath("/panel/belgeler");
    revalidatePath("/panel/egitsel-analiz");
    revalidatePath("/panel/gorev-merkezi");
    revalidatePath("/panel/seans-programi");
    revalidatePath(`/panel/ogrenciler/${student.id}`);

    return {
      success: true,
      message: parsed.data.isActive
        ? "Öğrenci yeniden aktif edildi."
        : "Öğrenci arşive alindi. Geçmiş kayıtları korunuyor.",
      id: student.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function bulkImportStudentsAction(
  input: BulkStudentImportInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role === UserRole.parent) {
      return { success: false, message: "Veli hesabi toplu öğrenci ekleyemez." };
    }

    const parsed = bulkStudentImportSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Toplu öğrenci listesi dogrulanamadi.",
      };
    }

    const createdStudents = await prisma.$transaction(
      parsed.data.rows.map((row) =>
        prisma.student.create({
          data: {
            ownerId: user.id,
            institutionId: user.institutionId ?? null,
            ...buildStudentWriteData(row),
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            institutionId: true,
          },
        }),
      ),
    );

    await Promise.all(
      createdStudents.map((student) =>
        writeAuditLog({
          actorId: user.id,
          action: "student.bulk_created",
          entityType: "student",
          entityId: student.id,
          summary: `${student.firstName} ${student.lastName} öğrenci kaydı toplu aktarim ile olusturuldu.`,
          metadata: { institutionId: student.institutionId },
        }),
      ),
    );

    revalidatePath("/panel/ogrenciler");
    revalidatePath("/panel");

    return {
      success: true,
      message: `${createdStudents.length} öğrenci kaydı eklendi.`,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveBepAction(input: BepDocumentInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = bepDocumentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "BEP formu dogrulanamadi.",
      };
    }

    if (!canCreateBep(user.role)) {
      return { success: false, message: "Bu hesapla BEP olusturamazsiniz." };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parsed.data.studentId,
        ...getStudentAccessWhere(user),
      },
      select: { id: true, institutionId: true },
    });

    if (!student) {
      return { success: false, message: "Secilen öğrenci bulunamadı." };
    }

    const data = buildBepDocumentData(parsed.data);
    const approvalState = buildApprovalStateForDocument(user);
    const payload = buildBepDocumentPayload(parsed.data);

    if (parsed.data.id) {
      const existing = await prisma.bepDocument.findFirst({
        where: {
          id: parsed.data.id,
          ...getDocumentAccessWhere(user),
        },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "BEP kaydı bulunamadı." };
      }

      await prisma.bepDocument.update({
        where: { id: existing.id },
        data: {
          ...data,
          ...approvalState,
          performanceEntries: { deleteMany: {} },
          planRows: { deleteMany: {} },
          supportServiceEntries: { deleteMany: {} },
          decisionEntries: { deleteMany: {} },
          committeeMembers: { deleteMany: {} },
          subjectTeachers: { deleteMany: {} },
        },
      });

      await prisma.bepDocument.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "bep.updated",
        entityType: "bepDocument",
        entityId: existing.id,
        summary: `${parsed.data.title} BEP kaydı guncellendi.`,
        metadata: {
          studentId: parsed.data.studentId,
          status: parsed.data.status,
          institutionId: student.institutionId,
          approvalStatus: approvalState.approvalStatus,
        },
      });

      revalidatePath(`/panel/bep/${existing.id}`);
      revalidatePath(`/panel/ogrenciler/${parsed.data.studentId}`);
      revalidatePath("/panel");

      return {
        success: true,
        message:
          approvalState.approvalStatus === "pending"
            ? "BEP kaydı guncellendi ve kurum onayina gönderildi."
            : "BEP kaydı guncellendi.",
        id: existing.id,
      };
    }

    const document = await prisma.bepDocument.create({
      data: {
        ownerId: user.id,
        studentId: parsed.data.studentId,
        institutionId: student.institutionId ?? user.institutionId ?? null,
        ...data,
        ...approvalState,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "bep.created",
      entityType: "bepDocument",
      entityId: document.id,
      summary: `${parsed.data.title} BEP kaydı olusturuldu.`,
      metadata: {
        studentId: parsed.data.studentId,
        status: parsed.data.status,
        institutionId: document.institutionId,
        approvalStatus: approvalState.approvalStatus,
      },
    });

    revalidatePath(`/panel/ogrenciler/${parsed.data.studentId}`);
    revalidatePath("/panel");

    return {
      success: true,
      message:
        approvalState.approvalStatus === "pending"
          ? "BEP kaydı olusturuldu ve kurum onayina gönderildi."
          : "BEP kaydı olusturuldu.",
      id: document.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function createBepTransferInviteAction(
  input: CreateBepTransferInviteInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = createBepTransferInviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "BEP devir bağlantısı isteği dogrulanamadi.",
      };
    }

    if (!canCreateBep(user.role)) {
      return { success: false, message: "Bu hesapla BEP devir bağlantısı olusturamazsiniz." };
    }

    const document = await prisma.bepDocument.findFirst({
      where: {
        id: parsed.data.documentId,
        ...getDocumentAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        ownerId: true,
        institutionId: true,
        studentId: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            ownerId: true,
            institutionId: true,
          },
        },
      },
    });

    if (!document) {
      return { success: false, message: "BEP kaydı bulunamadı." };
    }

    const canCreateInvite =
      user.role === UserRole.admin ||
      canManageInstitutionRecords(user.role) ||
      document.ownerId === user.id;

    if (!canCreateInvite) {
      return { success: false, message: "Bu BEP için devir bağlantısı olusturma yetkiniz yok." };
    }

    const canTransferStudent =
      user.role === UserRole.admin ||
      canManageInstitutionRecords(user.role) ||
      document.student.ownerId === user.id ||
      document.student.ownerId === document.ownerId;

    if (!canTransferStudent) {
      return {
        success: false,
        message: "Öğrenci sorumlulugunu devretme yetkiniz yok.",
      };
    }

    const token = createBepTransferToken();
    const tokenHash = hashBepTransferToken(token);

    const invite = await prisma.$transaction(async (tx) => {
      await tx.bepTransferInvite.updateMany({
        where: {
          documentId: document.id,
          status: "pending",
        },
        data: {
          status: "canceled",
          canceledAt: new Date(),
        },
      });

      return tx.bepTransferInvite.create({
        data: {
          documentId: document.id,
          fromUserId: user.id,
          tokenHash,
          previousOwnerId: document.ownerId,
          previousStudentOwnerId: document.student.ownerId,
          expiresAt: getBepTransferInviteExpiresAt(),
        },
      });
    });

    await writeAuditLog({
      actorId: user.id,
      action: "bep.transfer_invite.created",
      entityType: "bepDocument",
      entityId: document.id,
      summary: `${document.title} BEP kaydı için devir bağlantısı olusturuldu.`,
      metadata: {
        inviteId: invite.id,
        studentId: document.studentId,
        institutionId: document.institutionId ?? document.student.institutionId,
      },
    });

    revalidatePath(`/panel/bep/${document.id}`);

    return {
      success: true,
      message: "BEP devir bağlantısı olusturuldu.",
      id: invite.id,
      sharePath: `/panel/bep/devral/${token}`,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function acceptBepTransferInviteAction(
  input: AcceptBepTransferInviteInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = acceptBepTransferInviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "BEP devir bağlantısı dogrulanamadi.",
      };
    }

    if (user.role !== UserRole.teacher && user.role !== UserRole.institution) {
      return { success: false, message: "BEP devrini yalnızca öğretmen veya kurum hesabi kabul edebilir." };
    }

    const invite = await prisma.bepTransferInvite.findUnique({
      where: {
        tokenHash: hashBepTransferToken(parsed.data.token),
      },
      include: {
        document: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                ownerId: true,
                institutionId: true,
              },
            },
          },
        },
        fromUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!invite || invite.status !== "pending" || invite.expiresAt.getTime() < Date.now()) {
      return { success: false, message: "BEP devir bağlantısı geçersiz veya süresi dolmuş." };
    }

    if (invite.fromUserId === user.id) {
      return { success: false, message: "Kendi olusturdugunuz devir baglantisini kabul edemezsiniz." };
    }

    const documentInstitutionId =
      invite.document.institutionId ?? invite.document.student.institutionId;

    if (
      documentInstitutionId &&
      user.institutionId &&
      user.institutionId !== documentInstitutionId
    ) {
      return { success: false, message: "Bu BEP yalnızca ayni kurumdaki hesaplara devredilebilir." };
    }

    if (
      invite.document.ownerId !== invite.previousOwnerId ||
      invite.document.student.ownerId !== invite.previousStudentOwnerId
    ) {
      await prisma.bepTransferInvite.update({
        where: { id: invite.id },
        data: {
          status: "canceled",
          canceledAt: new Date(),
        },
      });

      return { success: false, message: "BEP sahibi degistigi için bu devir bağlantısı iptal edildi." };
    }

    const acceptedAt = new Date();
    const undoUntil = getBepTransferUndoUntil(acceptedAt);

    await prisma.$transaction([
      prisma.bepDocument.update({
        where: { id: invite.document.id },
        data: {
          ownerId: user.id,
          institutionId: user.institutionId ?? null,
        },
      }),
      prisma.student.update({
        where: { id: invite.document.studentId },
        data: {
          ownerId: user.id,
          institutionId: user.institutionId ?? null,
        },
      }),
      prisma.bepTransferInvite.update({
        where: { id: invite.id },
        data: {
          status: "accepted",
          acceptedById: user.id,
          acceptedAt,
          undoUntil,
        },
      }),
      prisma.bepTransferInvite.updateMany({
        where: {
          documentId: invite.documentId,
          id: { not: invite.id },
          status: "pending",
        },
        data: {
          status: "canceled",
          canceledAt: acceptedAt,
        },
      }),
    ]);

    await writeAuditLog({
      actorId: user.id,
      action: "bep.transferred",
      entityType: "bepDocument",
      entityId: invite.document.id,
      summary: `${invite.document.title} BEP kaydı devir bağlantısı ile ${user.email} kullanicisina tasindi.`,
      metadata: {
        inviteId: invite.id,
        previousOwnerId: invite.previousOwnerId,
        nextOwnerId: user.id,
        studentId: invite.document.studentId,
        previousStudentOwnerId: invite.previousStudentOwnerId,
        undoUntil: undoUntil.toISOString(),
        institutionId: user.institutionId ?? invite.document.institutionId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/bep");
    revalidatePath(`/panel/bep/${invite.document.id}`);
    revalidatePath("/panel/ogrenciler");
    revalidatePath(`/panel/ogrenciler/${invite.document.studentId}`);

    return {
      success: true,
      message: `${invite.document.student.firstName} ${invite.document.student.lastName} için BEP hesabınıza tasindi. 15 dakika içinde geri alinabilir.`,
      id: invite.id,
      undoUntil: undoUntil.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function undoBepTransferInviteAction(
  input: UndoBepTransferInviteInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = undoBepTransferInviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "BEP devir geri alma isteği dogrulanamadi.",
      };
    }

    const invite = await prisma.bepTransferInvite.findUnique({
      where: { id: parsed.data.inviteId },
      include: {
        document: {
          include: {
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                institutionId: true,
              },
            },
          },
        },
      },
    });

    if (!invite || invite.status !== "accepted" || !invite.undoUntil) {
      return { success: false, message: "Geri alinabilecek aktif bir BEP devri bulunamadı." };
    }

    const canUndo =
      invite.fromUserId === user.id ||
      invite.acceptedById === user.id ||
      user.role === UserRole.admin ||
      (canManageInstitutionRecords(user.role) &&
        Boolean(user.institutionId) &&
        user.institutionId === (invite.document.institutionId ?? invite.document.student.institutionId));

    if (!canUndo) {
      return { success: false, message: "Bu BEP devrini geri alma yetkiniz yok." };
    }

    if (invite.undoUntil.getTime() < Date.now()) {
      return { success: false, message: "15 dakikalik geri alma süresi dolmuş." };
    }

    await prisma.$transaction([
      prisma.bepDocument.update({
        where: { id: invite.documentId },
        data: {
          ownerId: invite.previousOwnerId,
        },
      }),
      prisma.student.update({
        where: { id: invite.document.studentId },
        data: {
          ownerId: invite.previousStudentOwnerId,
        },
      }),
      prisma.bepTransferInvite.update({
        where: { id: invite.id },
        data: {
          status: "undone",
          canceledAt: new Date(),
        },
      }),
    ]);

    await writeAuditLog({
      actorId: user.id,
      action: "bep.transfer_undone",
      entityType: "bepDocument",
      entityId: invite.documentId,
      summary: `${invite.document.title} BEP devri 15 dakikalik süre içinde geri alindi.`,
      metadata: {
        inviteId: invite.id,
        restoredOwnerId: invite.previousOwnerId,
        acceptedById: invite.acceptedById,
        studentId: invite.document.studentId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/bep");
    revalidatePath(`/panel/bep/${invite.documentId}`);
    revalidatePath("/panel/ogrenciler");
    revalidatePath(`/panel/ogrenciler/${invite.document.studentId}`);

    return {
      success: true,
      message: "BEP devri geri alindi.",
      id: invite.documentId,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function bulkCreateBepAction(input: BulkBepCreateInput): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canCreateBep(user.role)) {
      return { success: false, message: "Bu hesapla toplu BEP olusturamazsiniz." };
    }

    const parsed = bulkBepCreateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Toplu BEP formu dogrulanamadi.",
      };
    }

    const normalizedTitle = parsed.data.title.trim();
    if (!normalizedTitle) {
      return { success: false, message: "BEP basligi zorunludur." };
    }

    const students = await prisma.student.findMany({
      where: {
        id: { in: parsed.data.studentIds },
        ...getStudentAccessWhere(user),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        institutionId: true,
      },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });

    if (students.length === 0) {
      return { success: false, message: "Secilen öğrenciler bulunamadı." };
    }

    const existingStudentIds = parsed.data.skipExisting
      ? new Set(
          (
            await prisma.bepDocument.findMany({
              where: {
                studentId: { in: students.map((student) => student.id) },
                title: normalizedTitle,
              },
              select: { studentId: true },
            })
          ).map((document) => document.studentId),
        )
      : new Set<string>();

    const latestTemplate = await prisma.bepDocument.findFirst({
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

    const committeeTemplate =
      latestTemplate?.committeeMembers.map((member, index) => ({
        sortOrder: index,
        role: member.role,
        title: member.title ?? "",
        fullName: member.fullName ?? "",
        branch: member.branch ?? "",
      })) ?? [];

    const approvalState = buildApprovalStateForDocument(user);
    const targetStudents = students.filter((student) => !existingStudentIds.has(student.id));

    if (targetStudents.length === 0) {
      return {
        success: false,
        message: "Secilen öğrenciler için ayni baslikta BEP zaten bulunuyor.",
      };
    }

    const createdDocuments = await prisma.$transaction(
      targetStudents.map((student) => {
        const defaults = emptyBepValues(student.id, committeeTemplate);
        const customPlanRows = parsed.data.planRows.map((row, index) => ({
          sortOrder: index,
          courseId: row.courseId?.trim() || "",
          themeName: row.themeName?.trim() || "",
          outcomeCode: row.outcomeCode?.trim() || "",
          courseName: row.courseName.trim(),
          learningArea: row.learningArea.trim(),
          learningOutcome: row.learningOutcome.trim(),
          processComponents: row.processComponents,
          processComponentSchedules: row.processComponentSchedules,
          criterion: row.criterion?.trim() || "4/5 (%80)",
          methodTechnique: row.methodTechnique?.trim() || "",
          materials: row.materials?.trim() || "",
          tendencies: row.tendencies?.trim() || "",
          startDate: row.startDate?.trim() || parsed.data.startDate?.trim() || "",
          endDate: row.endDate?.trim() || parsed.data.endDate?.trim() || "",
          evaluationMethods: row.evaluationMethods?.trim() || "",
          evaluationDates: row.evaluationDates,
          performanceResult: row.performanceResult?.trim() || "",
          isManualEntry: row.isManualEntry,
        }));
        const uniqueCourseNames = Array.from(
          new Set(customPlanRows.map((row) => row.courseName).filter(Boolean)),
        );
        const nextValues: BepDocumentInput = {
          ...defaults,
          title: normalizedTitle,
          startDate: parsed.data.startDate?.trim() || "",
          endDate: parsed.data.endDate?.trim() || "",
          performanceEntries:
            uniqueCourseNames.length > 0
              ? uniqueCourseNames.map((courseName, index) => ({
                  sortOrder: index,
                  courseName,
                  performanceLevel: "",
                }))
              : defaults.performanceEntries,
          planRows: customPlanRows.length > 0 ? customPlanRows : defaults.planRows,
        };

        return prisma.bepDocument.create({
          data: {
            ownerId: user.id,
            studentId: student.id,
            institutionId: student.institutionId ?? user.institutionId ?? null,
            ...buildBepDocumentData(nextValues),
            ...approvalState,
            ...buildBepDocumentPayload(nextValues),
          },
          select: {
            id: true,
            institutionId: true,
            studentId: true,
            title: true,
          },
        });
      }),
    );

    await Promise.all(
      createdDocuments.map((document) =>
        writeAuditLog({
          actorId: user.id,
          action: "bep.bulk_created",
          entityType: "bepDocument",
          entityId: document.id,
          summary: `${document.title} BEP kaydı toplu olusturma ile eklendi.`,
          metadata: {
            studentId: document.studentId,
            institutionId: document.institutionId,
            approvalStatus: approvalState.approvalStatus,
          },
        }),
      ),
    );

    revalidatePath("/panel/bep");
    revalidatePath("/panel");
    targetStudents.forEach((student) => {
      revalidatePath(`/panel/ogrenciler/${student.id}`);
    });

    const skippedCount = students.length - targetStudents.length;
    const actionSuffix =
      approvalState.approvalStatus === "pending" ? " ve kurum onayina gönderildi" : "";

    return {
      success: true,
      message:
        skippedCount > 0
          ? `${createdDocuments.length} BEP kaydı olusturuldu${actionSuffix}. ${skippedCount} öğrencide ayni baslik bulundugu için atlandi.`
          : `${createdDocuments.length} BEP kaydı olusturuldu${actionSuffix}.`,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteBepDocumentAction(
  input: DeleteBepDocumentInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = deleteBepDocumentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "BEP seçimi geçersiz.",
      };
    }

    if (!canCreateBep(user.role)) {
      return { success: false, message: "Bu hesapla BEP silemezsiniz." };
    }

    const document = await prisma.bepDocument.findFirst({
      where: {
        id: parsed.data.id,
        ...getDocumentAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        studentId: true,
        institutionId: true,
      },
    });

    if (!document) {
      return { success: false, message: "BEP kaydı bulunamadı." };
    }

    await prisma.bepDocument.delete({
      where: { id: document.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "bep.deleted",
      entityType: "bepDocument",
      entityId: document.id,
      summary: `${document.title} BEP kaydı silindi.`,
      metadata: {
        studentId: document.studentId,
        institutionId: document.institutionId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/bep");
    revalidatePath(`/panel/bep/${document.id}`);
    revalidatePath(`/panel/ogrenciler/${document.studentId}`);
    revalidatePath("/panel/egitsel-analiz");

    return { success: true, message: "BEP kaydı silindi.", id: document.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveProductFeedbackAction(
  input: ProductFeedbackInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = productFeedbackSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Geri bildirim formu dogrulanamadi.",
      };
    }

    if (!canCreateBep(user.role)) {
      return { success: false, message: "Bu hesapla geri bildirim gonderilemez." };
    }

    const document = await prisma.bepDocument.findFirst({
      where: {
        id: parsed.data.documentId,
        ...getDocumentAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        institutionId: true,
      },
    });

    if (!document) {
      return { success: false, message: "Geri bildirim bağlantısı bulunamadı." };
    }

    const reason = parsed.data.reason?.trim() || null;

    await prisma.productFeedback.upsert({
      where: {
        userId_documentId_source: {
          userId: user.id,
          documentId: document.id,
          source: parsed.data.source,
        },
      },
      update: {
        institutionId: document.institutionId ?? user.institutionId ?? null,
        value: parsed.data.value,
        reason,
      },
      create: {
        userId: user.id,
        institutionId: document.institutionId ?? user.institutionId ?? null,
        documentId: document.id,
        source: parsed.data.source,
        value: parsed.data.value,
        reason,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "product_feedback.saved",
      entityType: "productFeedback",
      entityId: document.id,
      summary:
        parsed.data.value === "like"
          ? `${document.title} sonrasinda olumlu geri bildirim paylasildi.`
          : `${document.title} sonrasinda geliştirme geri bildirimi paylasildi.`,
      metadata: {
        documentId: document.id,
        institutionId: document.institutionId ?? user.institutionId ?? null,
        source: parsed.data.source,
        value: parsed.data.value,
      },
    });

    revalidatePath(`/panel/bep/${document.id}`);
    revalidatePath("/panel/admin");

    return {
      success: true,
      message:
        parsed.data.value === "like"
          ? "Tesekkurler, geri bildiriminiz kaydedildi."
          : "Tesekkurler, geri bildiriminiz kaydedildi ve incelenmek uzere alindi.",
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteProductFeedbackAction(
  input: DeleteProductFeedbackInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = deleteProductFeedbackSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Geri bildirim seçimi geçersiz.",
      };
    }

    const feedback = await prisma.productFeedback.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        value: true,
        documentId: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!feedback) {
      return { success: false, message: "Geri bildirim kaydı bulunamadı." };
    }

    await prisma.productFeedback.delete({
      where: { id: feedback.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "product_feedback.deleted",
      entityType: "productFeedback",
      entityId: feedback.id,
      summary: `${feedback.user.name ?? feedback.user.email} kullanicisina ait geri bildirim silindi.`,
      metadata: {
        documentId: feedback.documentId,
        value: feedback.value,
      },
    });

    revalidatePath("/panel/admin");
    if (feedback.documentId) {
      revalidatePath(`/panel/bep/${feedback.documentId}`);
    }

    return {
      success: true,
      message: "Geri bildirim silindi.",
      id: feedback.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveCourseEvaluationAction(
  input: CourseEvaluationDocumentInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = courseEvaluationDocumentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Değerlendirme formu dogrulanamadi.",
      };
    }

    if (!canCreateBep(user.role)) {
      return { success: false, message: "Bu hesapla değerlendirme olusturamazsiniz." };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parsed.data.studentId,
        ...getStudentAccessWhere(user),
      },
      select: {
        id: true,
        institutionId: true,
      },
    });

    if (!student) {
      return { success: false, message: "Secilen öğrenci bulunamadı." };
    }

    const meta = buildCourseEvaluationDocumentMeta(parsed.data.selectedCourseIds);
    const payload = {
      title: parsed.data.title.trim(),
      courseId: meta.courseId.trim(),
      courseName: meta.courseName.trim(),
      evaluatorName: parsed.data.evaluatorName?.trim() || user.name || user.email,
      evaluationDate: parseDate(parsed.data.evaluationDate),
      rows: {
        create: parsed.data.rows.map((row) => ({
          sortOrder: row.sortOrder,
          courseId: row.courseId.trim(),
          courseName: row.courseName.trim(),
          unitName: row.unitName.trim(),
          learningArea: row.learningArea.trim(),
          learningOutcome: row.learningOutcome.trim(),
          processComponent: row.processComponent?.trim() || null,
          result: row.result || null,
        })),
      },
    };

    if (parsed.data.id) {
      const existing = await prisma.courseEvaluationDocument.findFirst({
        where: {
          id: parsed.data.id,
          ...getCourseEvaluationAccessWhere(user),
        },
        select: {
          id: true,
          studentId: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Değerlendirme kaydı bulunamadı." };
      }

      await prisma.courseEvaluationDocument.update({
        where: { id: existing.id },
        data: {
          title: payload.title,
          courseId: payload.courseId,
          courseName: payload.courseName,
          evaluatorName: payload.evaluatorName,
          evaluationDate: payload.evaluationDate,
          rows: { deleteMany: {} },
        },
      });

      const document = await prisma.courseEvaluationDocument.update({
        where: { id: existing.id },
        data: {
          ...payload,
          rows: payload.rows,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "course_evaluation.updated",
        entityType: "courseEvaluationDocument",
        entityId: document.id,
        summary: `${document.title} kaba değerlendirme kaydı guncellendi.`,
        metadata: {
          studentId: existing.studentId,
          institutionId: student.institutionId,
          courseId: document.courseId,
        },
      });

      revalidatePath("/panel");
      revalidatePath("/panel/degerlendirmeler/kaba");
      revalidatePath(`/panel/degerlendirmeler/kaba/${document.id}`);
      revalidatePath(`/panel/ogrenciler/${existing.studentId}`);

      return {
        success: true,
        message: "Kaba değerlendirme guncellendi.",
        id: document.id,
      };
    }

    const document = await prisma.courseEvaluationDocument.create({
      data: {
        studentId: parsed.data.studentId,
        ownerId: user.id,
        institutionId: student.institutionId ?? user.institutionId ?? null,
        title: payload.title,
        courseId: payload.courseId,
        courseName: payload.courseName,
        evaluatorName: payload.evaluatorName,
        evaluationDate: payload.evaluationDate,
        rows: payload.rows,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "course_evaluation.created",
      entityType: "courseEvaluationDocument",
      entityId: document.id,
      summary: `${document.title} kaba değerlendirme kaydı olusturuldu.`,
      metadata: {
        studentId: parsed.data.studentId,
        institutionId: document.institutionId,
        courseId: document.courseId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/degerlendirmeler/kaba");
    revalidatePath(`/panel/ogrenciler/${parsed.data.studentId}`);

    return {
      success: true,
      message: "Kaba değerlendirme olusturuldu.",
      id: document.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteCourseEvaluationAction(
  input: DeleteCourseEvaluationInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = deleteCourseEvaluationSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Silme isteği dogrulanamadi.",
      };
    }

    if (!canCreateBep(user.role)) {
      return { success: false, message: "Bu hesapla değerlendirme silemezsiniz." };
    }

    const document = await prisma.courseEvaluationDocument.findFirst({
      where: {
        id: parsed.data.id,
        ...getCourseEvaluationAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        studentId: true,
      },
    });

    if (!document) {
      return { success: false, message: "Değerlendirme kaydı bulunamadı." };
    }

    await prisma.courseEvaluationDocument.delete({
      where: { id: document.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "course_evaluation.deleted",
      entityType: "courseEvaluationDocument",
      entityId: document.id,
      summary: `${document.title} kaba değerlendirme kaydı silindi.`,
      metadata: {
        studentId: document.studentId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/degerlendirmeler/kaba");
    revalidatePath(`/panel/ogrenciler/${document.studentId}`);

    return {
      success: true,
      message: "Kaba değerlendirme silindi.",
      id: document.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function approveBepAction(
  input: BepApprovalActionInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = bepApprovalActionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Onay isteği dogrulanamadi.",
      };
    }

    if (!canApproveBep(user.role)) {
      return { success: false, message: "Bu hesapla BEP onaylayamazsiniz." };
    }

    const document = await prisma.bepDocument.findFirst({
      where: {
        id: parsed.data.documentId,
        ...getDocumentAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        studentId: true,
        institutionId: true,
      },
    });

    if (!document) {
      return { success: false, message: "BEP kaydı bulunamadı." };
    }

    await prisma.bepDocument.update({
      where: { id: document.id },
      data: {
        approvalStatus: "approved",
        approvedAt: new Date(),
        approvedById: user.id,
        approvedByName: user.name ?? null,
        rejectedAt: null,
        rejectedById: null,
        rejectedByName: null,
        rejectionReason: null,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "bep.approved",
      entityType: "bepDocument",
      entityId: document.id,
      summary: `${document.title} BEP kaydı onaylandi.`,
      metadata: {
        institutionId: document.institutionId,
        studentId: document.studentId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/bep-onaylari");
    revalidatePath(`/panel/bep/${document.id}`);
    revalidatePath(`/panel/ogrenciler/${document.studentId}`);

    return { success: true, message: "BEP onaylandi.", id: document.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function rejectBepAction(
  input: BepRejectionInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = bepRejectionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Ret isteği dogrulanamadi.",
      };
    }

    if (!canApproveBep(user.role)) {
      return { success: false, message: "Bu hesapla BEP reddedemezsiniz." };
    }

    const document = await prisma.bepDocument.findFirst({
      where: {
        id: parsed.data.documentId,
        ...getDocumentAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        studentId: true,
        institutionId: true,
      },
    });

    if (!document) {
      return { success: false, message: "BEP kaydı bulunamadı." };
    }

    await prisma.bepDocument.update({
      where: { id: document.id },
      data: {
        approvalStatus: "rejected",
        rejectedAt: new Date(),
        rejectedById: user.id,
        rejectedByName: user.name ?? null,
        rejectionReason: parsed.data.rejectionReason.trim(),
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "bep.rejected",
      entityType: "bepDocument",
      entityId: document.id,
      summary: `${document.title} BEP kaydı reddedildi.`,
      metadata: {
        institutionId: document.institutionId,
        studentId: document.studentId,
        rejectionReason: parsed.data.rejectionReason.trim(),
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/bep-onaylari");
    revalidatePath(`/panel/bep/${document.id}`);
    revalidatePath(`/panel/ogrenciler/${document.studentId}`);

    return { success: true, message: "BEP reddedildi.", id: document.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function linkParentToStudentAction(
  input: ParentStudentLinkInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = parentStudentLinkSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Eşleşme formu dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Bu islem için kuruma bağlı olmalisiniz." };
    }

    const [parent, student] = await Promise.all([
      prisma.user.findFirst({
        where: {
          id: parsed.data.parentId,
          institutionId: user.institutionId,
          role: UserRole.parent,
        },
        select: { id: true, email: true },
      }),
      prisma.student.findFirst({
        where: {
          id: parsed.data.studentId,
          institutionId: user.institutionId,
        },
        select: { id: true, firstName: true, lastName: true, institutionId: true },
      }),
    ]);

    if (!parent || !student) {
      return { success: false, message: "Veli veya öğrenci bulunamadı." };
    }

    await prisma.parentStudentLink.upsert({
      where: {
        parentId_studentId: {
          parentId: parent.id,
          studentId: student.id,
        },
      },
      create: {
        parentId: parent.id,
        studentId: student.id,
      },
      update: {},
    });

    await writeAuditLog({
      actorId: user.id,
      action: "parent_student_link.created",
      entityType: "student",
      entityId: student.id,
      summary: `${parent.email} velisi ${student.firstName} ${student.lastName} ogrencisine baglandi.`,
      metadata: {
        institutionId: student.institutionId,
        parentId: parent.id,
      },
    });

    revalidatePath("/panel/veli-eslestirme");
    revalidatePath(`/panel/ogrenciler/${student.id}`);

    return { success: true, message: "Veli-öğrenci eşleşmesi kaydedildi." };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function unlinkParentFromStudentAction(
  input: ParentStudentUnlinkInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = parentStudentUnlinkSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Eşleşme silme isteği dogrulanamadi.",
      };
    }

    const link = await prisma.parentStudentLink.findFirst({
      where: {
        parentId: parsed.data.parentId,
        studentId: parsed.data.studentId,
        student: user.institutionId ? { institutionId: user.institutionId } : undefined,
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            institutionId: true,
          },
        },
        parent: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!link) {
      return { success: false, message: "Eşleşme bulunamadı." };
    }

    await prisma.parentStudentLink.delete({
      where: {
        parentId_studentId: {
          parentId: link.parentId,
          studentId: link.studentId,
        },
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "parent_student_link.deleted",
      entityType: "student",
      entityId: link.student.id,
      summary: `${link.parent.email} velisinin ${link.student.firstName} ${link.student.lastName} öğrencisi ile bağlantısı kaldirildi.`,
      metadata: {
        institutionId: link.student.institutionId,
        parentId: link.parent.id,
      },
    });

    revalidatePath("/panel/veli-eslestirme");
    revalidatePath(`/panel/ogrenciler/${link.student.id}`);

    return { success: true, message: "Eşleşme kaldirildi." };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function sendParentMessageAction(
  input: ParentMessageInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (user.role !== UserRole.teacher && user.role !== UserRole.parent) {
      return { success: false, message: "Bu modul yalnızca öğretmen ve veliler icindir." };
    }

    if (user.role === UserRole.teacher && !user.institutionId) {
      return {
        success: false,
        message: "Öğretmen-veli mesajlasmasi için kuruma bağlı olmalisiniz.",
      };
    }

    const parsed = parentMessageSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Mesaj formu dogrulanamadi.",
      };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parsed.data.studentId,
        ...getStudentAccessWhere(user),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        institutionId: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            role: true,
          },
        },
        parentStudentLinks: {
          select: {
            parentId: true,
          },
        },
      },
    });

    if (!student) {
      return { success: false, message: "Mesaj için uygun öğrenci bulunamadı." };
    }

    const allowedParentIds = new Set(student.parentStudentLinks.map((link) => link.parentId));
    let recipientId: string | null = null;

    if (user.role === UserRole.teacher) {
      if (!allowedParentIds.has(parsed.data.recipientId)) {
        return { success: false, message: "Secilen veli bu öğrenci ile eslesmis değil." };
      }

      recipientId = parsed.data.recipientId;
    } else {
      if (parsed.data.recipientId !== student.ownerId || student.owner.role !== UserRole.teacher) {
        return {
          success: false,
          message: "Veli hesabi yalnızca öğrencinin öğretmenine mesaj gonderebilir.",
        };
      }

      recipientId = student.ownerId;
    }

    const recipient = await prisma.user.findFirst({
      where: {
        id: recipientId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
      },
    });

    if (!recipient) {
      return { success: false, message: "Mesaj alicisi bulunamadı." };
    }

    const uploadedFile = decodeUploadedStudentFile(parsed.data.uploadedBase64, {
      fileName: parsed.data.uploadedFileName,
      mimeType: parsed.data.uploadedMimeType,
    });
    if (uploadedFile && "error" in uploadedFile) {
      return { success: false, message: uploadedFile.error ?? "Dosya okunamadi." };
    }

    let attachmentMeta:
      | {
          fileId: string;
          fileName: string;
          mimeType: string | null;
          fileSize: number | null;
        }
      | null = null;

    if (uploadedFile) {
      const fileName = uploadedFile.fileName || parsed.data.uploadedFileName?.trim() || "mesaj-eki";
      const storedFile = await prisma.studentFile.create({
        data: {
          studentId: student.id,
          institutionId: student.institutionId ?? user.institutionId ?? null,
          createdById: user.id,
          title: `Mesaj eki - ${fileName}`,
          category: StudentFileCategory.other,
          fileName,
          fileData: toPrismaBytes(uploadedFile.buffer),
          mimeType: uploadedFile.mimeType,
          fileSize: uploadedFile.size,
        },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
        },
      });

      attachmentMeta = {
        fileId: storedFile.id,
        fileName: storedFile.fileName || fileName,
        mimeType: storedFile.mimeType,
        fileSize: storedFile.fileSize,
      };
    }

    const sanitizedSubject = sanitizeHtml(
      parsed.data.subject?.trim() || `${student.firstName} ${student.lastName} mesajlasmasi`
    );
    const sanitizedBody = sanitizeHtml(parsed.data.body);

    const message = await prisma.parentMessage.create({
      data: {
        institutionId: student.institutionId ?? user.institutionId ?? null,
        studentId: student.id,
        senderId: user.id,
        recipientId: recipient.id,
        subject: sanitizedSubject,
        body: appendParentMessageAttachment(sanitizedBody, attachmentMeta),
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "parent_message.created",
      entityType: "parentMessage",
      entityId: message.id,
      summary: `${student.firstName} ${student.lastName} öğrencisi için yeni iletişim mesaji olusturuldu.`,
      metadata: {
        institutionId: student.institutionId,
        studentId: student.id,
        recipientId: recipient.id,
        recipientRole: recipient.role,
        attachmentId: attachmentMeta?.fileId ?? null,
      },
    });

    await notifyUsers([recipient.id], {
      type: "parent_message",
      title: "Yeni mesaj",
      body: `${student.firstName} ${student.lastName} için yeni mesajınız var.`,
      data: {
        type: "parent_message",
        messageId: message.id,
        studentId: student.id,
      },
    });

    revalidatePath("/panel/iletisim");
    revalidatePath("/panel");

    return { success: true, message: "Mesaj gönderildi.", id: message.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function markParentMessageReadAction(
  input: MarkParentMessageReadInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = markParentMessageReadSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Mesaj isteği dogrulanamadi.",
      };
    }

    const message = await prisma.parentMessage.findFirst({
      where: {
        id: parsed.data.id,
        recipientId: user.id,
      },
      select: {
        id: true,
        readAt: true,
        studentId: true,
      },
    });

    if (!message) {
      return { success: false, message: "Mesaj bulunamadı." };
    }

    if (!message.readAt) {
      await prisma.parentMessage.update({
        where: { id: message.id },
        data: { readAt: new Date() },
      });
    }

    revalidatePath("/panel/iletisim");
    revalidatePath("/panel");

    return { success: true, message: "Mesaj okundu olarak isaretlendi.", id: message.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveCoordinationMeetingAction(
  input: CoordinationMeetingInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (
      user.role !== UserRole.teacher &&
      user.role !== UserRole.parent &&
      !canManageInstitutionRecords(user.role) &&
      user.role !== UserRole.admin
    ) {
      return { success: false, message: "Bu modul yalnızca öğretmen, veli ve yönetim icindir." };
    }

    const parsed = coordinationMeetingSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Toplantı formu dogrulanamadi.",
      };
    }

    let studentId: string | null = null;
    let studentMeta:
      | { id: string; firstName: string; lastName: string; institutionId: string | null }
      | null = null;

    if (parsed.data.studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: parsed.data.studentId,
          ...getStudentAccessWhere(user),
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          institutionId: true,
        },
      });

      if (!student) {
        return { success: false, message: "Toplantı için öğrenci bulunamadı." };
      }

      studentId = student.id;
      studentMeta = student;
    }

    const scheduledAt = new Date(parsed.data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      return { success: false, message: "Toplantı tarihi geçersiz." };
    }

    const nextMeetingAt = parsed.data.nextMeetingAt
      ? new Date(parsed.data.nextMeetingAt)
      : null;

    if (parsed.data.nextMeetingAt && (!nextMeetingAt || Number.isNaN(nextMeetingAt.getTime()))) {
      return { success: false, message: "Sonraki toplantı tarihi geçersiz." };
    }

    const payload = {
      institutionId: studentMeta?.institutionId ?? user.institutionId ?? null,
      studentId,
      title: parsed.data.title.trim(),
      meetingType: parsed.data.meetingType,
      status: parsed.data.status,
      scheduledAt,
      location: parsed.data.location?.trim() || null,
      participants: parsed.data.participants?.trim() || null,
      summary: parsed.data.summary?.trim() || null,
      decisions: parsed.data.decisions?.trim() || null,
      followUpPlan: parsed.data.followUpPlan?.trim() || null,
      nextMeetingAt,
    };

    if (parsed.data.id) {
      const existing = await prisma.coordinationMeeting.findFirst({
        where: {
          id: parsed.data.id,
          ...getCoordinationMeetingAccessWhere(user),
        },
        select: {
          id: true,
          institutionId: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Toplantı kaydı bulunamadı." };
      }

      const meeting = await prisma.coordinationMeeting.update({
        where: { id: existing.id },
        data: {
          ...payload,
          actionItems: {
            deleteMany: {},
            create: parsed.data.actionItems.map((item) => ({
              sortOrder: item.sortOrder,
              title: item.title.trim(),
              ownerLabel: item.ownerLabel?.trim() || null,
              dueDate: item.dueDate ? parseDate(item.dueDate) : null,
              status: item.status,
              notes: item.notes?.trim() || null,
            })),
          },
        },
        select: {
          id: true,
          title: true,
          institutionId: true,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "coordination_meeting.updated",
        entityType: "coordinationMeeting",
        entityId: meeting.id,
        summary: `${meeting.title} toplantı kaydı guncellendi.`,
        metadata: {
          institutionId: meeting.institutionId,
          studentId,
          meetingType: parsed.data.meetingType,
        },
      });

      revalidatePath("/panel/toplantilar");
      revalidatePath("/panel");

      return { success: true, message: "Toplantı kaydı guncellendi.", id: meeting.id };
    }

    const meeting = await prisma.coordinationMeeting.create({
      data: {
        createdById: user.id,
        ...payload,
        actionItems: {
          create: parsed.data.actionItems.map((item) => ({
            sortOrder: item.sortOrder,
            title: item.title.trim(),
            ownerLabel: item.ownerLabel?.trim() || null,
            dueDate: item.dueDate ? parseDate(item.dueDate) : null,
            status: item.status,
            notes: item.notes?.trim() || null,
          })),
        },
      },
      select: {
        id: true,
        title: true,
        institutionId: true,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "coordination_meeting.created",
      entityType: "coordinationMeeting",
      entityId: meeting.id,
      summary: `${meeting.title} toplantı kaydı olusturuldu.`,
      metadata: {
        institutionId: meeting.institutionId,
        studentId,
        meetingType: parsed.data.meetingType,
      },
    });

    revalidatePath("/panel/toplantilar");
    revalidatePath("/panel");

    return { success: true, message: "Toplantı kaydı olusturuldu.", id: meeting.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteCoordinationMeetingAction(
  input: DeleteCoordinationMeetingInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = deleteCoordinationMeetingSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Toplantı silme isteği geçersiz.",
      };
    }

    const meeting = await prisma.coordinationMeeting.findFirst({
      where: {
        id: parsed.data.id,
        ...getCoordinationMeetingAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        createdById: true,
        institutionId: true,
      },
    });

    if (!meeting) {
      return { success: false, message: "Toplantı kaydı bulunamadı." };
    }

    const canDelete =
      user.role === UserRole.admin ||
      meeting.createdById === user.id ||
      (canManageInstitutionRecords(user.role) && meeting.institutionId === user.institutionId);

    if (!canDelete) {
      return { success: false, message: "Bu toplantı kaydini silemezsiniz." };
    }

    await prisma.coordinationMeeting.delete({
      where: { id: meeting.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "coordination_meeting.deleted",
      entityType: "coordinationMeeting",
      entityId: meeting.id,
      summary: `${meeting.title} toplantı kaydı silindi.`,
      metadata: {
        institutionId: meeting.institutionId,
      },
    });

    revalidatePath("/panel/toplantilar");
    revalidatePath("/panel");

    return { success: true, message: "Toplantı kaydı silindi.", id: meeting.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveZumreMeetingDocumentAction(
  input: ZumreMeetingDocumentInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (
      user.role !== UserRole.teacher &&
      !canManageInstitutionRecords(user.role)
    ) {
      return { success: false, message: "Bu modul yalnızca öğretmen ve yönetim hesaplari icindir." };
    }

    const parsed = zumreMeetingDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Zumre tutanağı dogrulanamadi.",
      };
    }

    const meetingDate = parseDate(parsed.data.meetingDate);
    if (!meetingDate) {
      return { success: false, message: "Toplantı tarihi geçersiz." };
    }

    const announcementDate = parsed.data.announcementDate
      ? parseDate(parsed.data.announcementDate)
      : null;

    if (parsed.data.announcementDate && !announcementDate) {
      return { success: false, message: "Duyuru tarihi geçersiz." };
    }

    const title =
      parsed.data.title.trim() ||
      buildZumreMeetingTitle({
        educationYear: parsed.data.educationYear,
        schoolName: parsed.data.schoolName,
        zumreName: parsed.data.zumreName,
        termLabel: parsed.data.termLabel,
        documentType: parsed.data.documentType,
      });

    const payload = {
      institutionId: user.institutionId ?? null,
      status: parsed.data.status,
      documentType: parsed.data.documentType.trim(),
      title,
      educationYear: parsed.data.educationYear.trim(),
      termLabel: parsed.data.termLabel.trim(),
      meetingNo: parsed.data.meetingNo.trim(),
      meetingDate,
      meetingTime: parsed.data.meetingTime.trim(),
      location: parsed.data.location.trim(),
      city: parsed.data.city?.trim() || null,
      district: parsed.data.district?.trim() || null,
      schoolName: parsed.data.schoolName.trim(),
      zumreName: parsed.data.zumreName.trim(),
      gradeLevel: parsed.data.gradeLevel?.trim() || null,
      meetingType: parsed.data.meetingType.trim(),
      chairpersonName: parsed.data.chairpersonName.trim(),
      recorderName: parsed.data.recorderName?.trim() || null,
      principalName: parsed.data.principalName.trim(),
      principalTitle: parsed.data.principalTitle?.trim() || null,
      participants: parsed.data.participants.trim(),
      announcementDate,
      complianceNotes: parsed.data.complianceNotes?.trim() || null,
    };

    const agendaItems = parsed.data.agendaItems.map((item, index) => ({
      sortOrder: index,
      title: item.title.trim(),
      discussionText: item.discussionText?.trim() || null,
      decisionText: item.decisionText?.trim() || null,
      responsible: null,
      followUpNote: null,
    }));

    if (parsed.data.id) {
      const existing = await prisma.zumreMeetingDocument.findFirst({
        where: {
          id: parsed.data.id,
          ...getZumreMeetingAccessWhere(user),
        },
        select: {
          id: true,
          title: true,
          institutionId: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Zumre tutanağı bulunamadı." };
      }

      const document = await prisma.zumreMeetingDocument.update({
        where: { id: existing.id },
        data: {
          ...payload,
          agendaItems: {
            deleteMany: {},
            create: agendaItems,
          },
        },
        select: {
          id: true,
          title: true,
          institutionId: true,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "zumre_meeting.updated",
        entityType: "zumreMeetingDocument",
        entityId: document.id,
        summary: `${document.title} zumre tutanağı guncellendi.`,
        metadata: {
          institutionId: document.institutionId,
          meetingType: parsed.data.meetingType,
        },
      });

      revalidatePath("/panel/tutanaklar/zumre");
      revalidatePath("/panel/tutanaklar/sok");
      revalidatePath("/panel/tutanaklar");
      revalidatePath("/panel/toplantilar");
      revalidatePath("/panel");

      return { success: true, message: "Zumre tutanağı guncellendi.", id: document.id };
    }

    const document = await prisma.zumreMeetingDocument.create({
      data: {
        createdById: user.id,
        ...payload,
        agendaItems: {
          create: agendaItems,
        },
      },
      select: {
        id: true,
        title: true,
        institutionId: true,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "zumre_meeting.created",
      entityType: "zumreMeetingDocument",
      entityId: document.id,
      summary: `${document.title} zumre tutanağı olusturuldu.`,
      metadata: {
        institutionId: document.institutionId,
        meetingType: parsed.data.meetingType,
      },
    });

    revalidatePath("/panel/tutanaklar/zumre");
    revalidatePath("/panel/tutanaklar/sok");
    revalidatePath("/panel/tutanaklar");
    revalidatePath("/panel/toplantilar");
    revalidatePath("/panel");

    return { success: true, message: "Zumre tutanağı olusturuldu.", id: document.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteZumreMeetingDocumentAction(
  input: DeleteZumreMeetingDocumentInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = deleteZumreMeetingDocumentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Zumre tutanağı silme isteği geçersiz.",
      };
    }

    const document = await prisma.zumreMeetingDocument.findFirst({
      where: {
        id: parsed.data.id,
        ...getZumreMeetingAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        createdById: true,
        institutionId: true,
      },
    });

    if (!document) {
      return { success: false, message: "Zumre tutanağı bulunamadı." };
    }

    const canDelete =
      user.role === UserRole.admin ||
      document.createdById === user.id ||
      (canManageInstitutionRecords(user.role) && document.institutionId === user.institutionId);

    if (!canDelete) {
      return { success: false, message: "Bu zumre tutanagini silemezsiniz." };
    }

    await prisma.zumreMeetingDocument.delete({
      where: { id: document.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "zumre_meeting.deleted",
      entityType: "zumreMeetingDocument",
      entityId: document.id,
      summary: `${document.title} zumre tutanağı silindi.`,
      metadata: {
        institutionId: document.institutionId,
      },
    });

    revalidatePath("/panel/tutanaklar/zumre");
    revalidatePath("/panel/tutanaklar/sok");
    revalidatePath("/panel/tutanaklar");
    revalidatePath("/panel/toplantilar");
    revalidatePath("/panel");

    return { success: true, message: "Zumre tutanağı silindi.", id: document.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveStudentFileFolderAction(
  input: StudentFileFolderInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = studentFileFolderSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Klasor formu dogrulanamadi.",
      };
    }

    if (!canManageStudentFiles(user.role)) {
      return { success: false, message: "Bu hesap klasor yonetemez." };
    }

    if (parsed.data.id) {
      const existing = await prisma.studentFileFolder.findFirst({
        where: {
          id: parsed.data.id,
          ...getStudentFileFolderWhere(user),
        },
        select: { id: true, institutionId: true },
      });

      if (!existing) {
        return { success: false, message: "Klasor bulunamadı." };
      }

      const folder = await prisma.studentFileFolder.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name.trim(),
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "student_file_folder.updated",
        entityType: "studentFileFolder",
        entityId: folder.id,
        summary: `${folder.name} klasoru guncellendi.`,
        metadata: {
          institutionId: folder.institutionId,
        },
      });

      revalidatePath("/panel/belgeler");
      return { success: true, message: "Klasor guncellendi.", id: folder.id };
    }

    const folder = await prisma.studentFileFolder.create({
      data: {
        name: parsed.data.name.trim(),
        createdById: user.id,
        institutionId: user.institutionId ?? null,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "student_file_folder.created",
      entityType: "studentFileFolder",
      entityId: folder.id,
      summary: `${folder.name} klasoru olusturuldu.`,
      metadata: {
        institutionId: folder.institutionId,
      },
    });

    revalidatePath("/panel/belgeler");
    return { success: true, message: "Klasor olusturuldu.", id: folder.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteStudentFileFolderAction(
  input: DeleteStudentFileFolderInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = deleteStudentFileFolderSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Klasor seçimi geçersiz.",
      };
    }

    if (!canManageStudentFiles(user.role)) {
      return { success: false, message: "Bu hesap klasor silemez." };
    }

    const folder = await prisma.studentFileFolder.findFirst({
      where: {
        id: parsed.data.id,
        ...getStudentFileFolderWhere(user),
      },
      select: {
        id: true,
        name: true,
        institutionId: true,
      },
    });

    if (!folder) {
      return { success: false, message: "Klasor bulunamadı." };
    }

    await prisma.studentFileFolder.delete({
      where: { id: folder.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "student_file_folder.deleted",
      entityType: "studentFileFolder",
      entityId: folder.id,
      summary: `${folder.name} klasoru silindi.`,
      metadata: {
        institutionId: folder.institutionId,
      },
    });

    revalidatePath("/panel/belgeler");
    return { success: true, message: "Klasor silindi.", id: folder.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveStudentFileAction(
  input: StudentFileInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = studentFileSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Belge formu dogrulanamadi.",
      };
    }

    if (!canManageStudentFiles(user.role)) {
      return { success: false, message: "Bu hesap belge yukleyemez." };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parsed.data.studentId,
        ...getStudentAccessWhere(user),
      },
      select: {
        id: true,
        institutionId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    const folderId: string | null = parsed.data.folderId?.trim() || null;
    if (folderId) {
      const folder = await prisma.studentFileFolder.findFirst({
        where: {
          id: folderId,
          ...getStudentFileFolderWhere(user),
        },
        select: { id: true },
      });

      if (!folder) {
        return { success: false, message: "Klasor seçimi geçersiz." };
      }
    }

    const uploadResult = decodeUploadedStudentFile(parsed.data.uploadedBase64, {
      fileName: parsed.data.uploadedFileName || parsed.data.fileName,
      mimeType: parsed.data.uploadedMimeType,
    });
    if (uploadResult && "error" in uploadResult) {
      return { success: false, message: uploadResult.error ?? "Dosya okunamadi." };
    }
    const upload = uploadResult && "buffer" in uploadResult ? uploadResult : null;

    const payload = {
      folderId,
      title: parsed.data.title.trim(),
      category: parsed.data.category,
      fileName: upload?.fileName ?? parsed.data.fileName?.trim() ?? null,
      fileUrl: parsed.data.fileUrl?.trim() || null,
      fileData: upload ? toPrismaBytes(upload.buffer) : undefined,
      mimeType: upload?.mimeType ?? null,
      fileSize: upload?.size ?? null,
      notes: parsed.data.notes?.trim() || null,
      documentDate: parseDate(parsed.data.documentDate),
      expiresAt: parseDate(parsed.data.expiresAt),
    };

    if (parsed.data.id) {
      const existing = await prisma.studentFile.findFirst({
        where: {
          id: parsed.data.id,
          ...getStudentFileAccessWhere(user),
        },
        select: {
          id: true,
          fileData: true,
          fileUrl: true,
          mimeType: true,
          fileSize: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Belge kaydı bulunamadı." };
      }

      if (!upload && !payload.fileUrl && !existing.fileData && !existing.fileUrl) {
        return {
          success: false,
          message: "Belge kaydı için dosya veya bağlantı eklemelisiniz.",
        };
      }

      const file = await prisma.studentFile.update({
        where: { id: existing.id },
        data: {
          ...payload,
          fileData: upload ? toPrismaBytes(upload.buffer) : existing.fileData,
          mimeType: upload ? payload.mimeType : existing.mimeType,
          fileSize: upload?.size ?? existing.fileSize,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "student_file.updated",
        entityType: "studentFile",
        entityId: file.id,
        summary: `${student.firstName} ${student.lastName} öğrencisi için belge kaydı guncellendi.`,
        metadata: {
          institutionId: student.institutionId,
          studentId: student.id,
          category: file.category,
          folderId: file.folderId,
        },
      });

      revalidatePath("/panel/belgeler");
      revalidatePath(`/panel/ogrenciler/${student.id}`);

      return { success: true, message: "Belge kaydı guncellendi.", id: file.id };
    }

    if (!upload && !payload.fileUrl) {
      return {
        success: false,
        message: "Yeni belge kaydı için dosya seçin veya bağlantı ekleyin.",
      };
    }

    const file = await prisma.studentFile.create({
      data: {
        studentId: student.id,
        institutionId: student.institutionId ?? user.institutionId ?? null,
        createdById: user.id,
        ...payload,
        fileData: upload ? toPrismaBytes(upload.buffer) : null,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "student_file.created",
      entityType: "studentFile",
      entityId: file.id,
      summary: `${student.firstName} ${student.lastName} öğrencisi için yeni belge kaydı olusturuldu.`,
      metadata: {
        institutionId: student.institutionId,
        studentId: student.id,
        category: file.category,
        folderId: file.folderId,
      },
    });

    revalidatePath("/panel/belgeler");
    revalidatePath(`/panel/ogrenciler/${student.id}`);

    return { success: true, message: "Belge kaydı olusturuldu.", id: file.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteStudentFileAction(input: { id: string }): Promise<ActionResult> {
  try {
    const user = await requireUser();

    if (!input.id) {
      return { success: false, message: "Belge seçimi zorunludur." };
    }

    if (!canManageStudentFiles(user.role)) {
      return { success: false, message: "Bu hesap belge silemez." };
    }

    const file = await prisma.studentFile.findFirst({
      where: {
        id: input.id,
        ...getStudentFileAccessWhere(user),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            institutionId: true,
          },
        },
      },
    });

    if (!file) {
      return { success: false, message: "Belge kaydı bulunamadı." };
    }

    await prisma.studentFile.delete({
      where: { id: file.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "student_file.deleted",
      entityType: "studentFile",
      entityId: file.id,
      summary: file.student
        ? `${file.student.firstName} ${file.student.lastName} ogrencisine ait belge kaydı silindi.`
        : "Belge kaydı silindi.",
      metadata: {
        institutionId: file.student?.institutionId ?? null,
        studentId: file.student?.id ?? null,
        category: file.category,
        folderId: file.folderId,
      },
    });

    revalidatePath("/panel/belgeler");
    if (file.student) {
      revalidatePath(`/panel/ogrenciler/${file.student.id}`);
    }

    return { success: true, message: "Belge kaydı silindi.", id: file.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateUserRoleAction(input: AdminUserRoleInput): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = adminUserRoleSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Rol guncelleme formu dogrulanamadi.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, role: true, email: true, institutionId: true },
    });

    if (!targetUser) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    if (targetUser.id === admin.id && parsed.data.role !== UserRole.admin) {
      return { success: false, message: "Kendi admin yetkinizi kaldiramazsiniz." };
    }

    if (targetUser.role === UserRole.admin && parsed.data.role !== UserRole.admin) {
      const otherActiveAdminCount = await getActiveAdminCount(targetUser.id);
      if (otherActiveAdminCount === 0) {
        return { success: false, message: "Sistemde en az bir aktif admin kalmalidir." };
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: { role: parsed.data.role },
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "user.role_updated",
      entityType: "user",
      entityId: updatedUser.id,
      summary: `${updatedUser.email} kullanicisinin rolu ${targetUser.role} yerine ${updatedUser.role} yapildi.`,
      metadata: {
        previousRole: targetUser.role,
        nextRole: updatedUser.role,
        institutionId: updatedUser.institutionId,
      },
    });

    revalidatePath("/panel/admin");
    revalidatePath("/panel");

    return { success: true, message: "Kullanıcı rolu guncellendi.", id: updatedUser.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateUserInstitutionAction(
  input: AdminUpdateUserInstitutionInput,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = adminUpdateUserInstitutionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kurum guncelleme formu dogrulanamadi.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, name: true, email: true, institutionId: true, role: true },
    });

    if (!targetUser) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: { institutionId: parsed.data.institutionId },
      include: {
        institution: {
          select: { name: true },
        },
      },
    });

    const previousInst = targetUser.institutionId
      ? await prisma.institution.findUnique({
          where: { id: targetUser.institutionId },
          select: { name: true },
        })
      : null;

    const summaryMsg = parsed.data.institutionId
      ? `${targetUser.email} kullanicisinin kurumu ${previousInst ? `'${previousInst.name}'` : 'bağimsiz'} yerine '${updatedUser.institution?.name}' yapildi.`
      : `${targetUser.email} kullanicisi ${previousInst ? `'${previousInst.name}'` : ''} kurumundan cikarilip bağimsiz yapildi.`;

    await writeAuditLog({
      actorId: admin.id,
      action: "user.institution_updated",
      entityType: "user",
      entityId: updatedUser.id,
      summary: summaryMsg,
      metadata: {
        previousInstitutionId: targetUser.institutionId,
        nextInstitutionId: updatedUser.institutionId,
      },
    });

    revalidatePath("/panel/admin");
    revalidatePath("/panel");

    return {
      success: true,
      message: parsed.data.institutionId
        ? "Kullanıcı kurumu başarıyla guncellendi."
        : "Kullanıcı kurumdan başarıyla cikarildi (bağimsiz yapildi).",
      id: updatedUser.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function createInstitutionAction(
  input: InstitutionCreateInput,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = institutionCreateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kurum formu dogrulanamadi.",
      };
    }

    const institution = await prisma.institution.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        type: parsed.data.type,
      },
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "institution.created",
      entityType: "institution",
      entityId: institution.id,
      summary: `${institution.name} kurumu olusturuldu.`,
      metadata: { institutionId: institution.id, slug: institution.slug, type: institution.type },
    });

    revalidatePath("/panel/admin");

    return { success: true, message: "Kurum olusturuldu.", id: institution.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveInstitutionAction(input: InstitutionSaveInput): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = institutionSaveSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kurum formu dogrulanamadi.",
      };
    }

    const payload = {
      name: parsed.data.name.trim(),
      slug: parsed.data.slug.trim(),
      type: parsed.data.type,
    };

    if (parsed.data.id) {
      const existing = await prisma.institution.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, name: true, slug: true, type: true },
      });

      if (!existing) {
        return { success: false, message: "Kurum kaydı bulunamadı." };
      }

      const institution = await prisma.institution.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: admin.id,
        action: "institution.updated",
        entityType: "institution",
        entityId: institution.id,
        summary: `${institution.name} kurumu guncellendi.`,
        metadata: {
          previousName: existing.name,
          previousSlug: existing.slug,
          previousType: existing.type,
          slug: institution.slug,
          type: institution.type,
          institutionId: institution.id,
        },
      });

      revalidatePath("/panel/admin");

      return { success: true, message: "Kurum guncellendi.", id: institution.id };
    }

    const institution = await prisma.institution.create({
      data: payload,
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "institution.created",
      entityType: "institution",
      entityId: institution.id,
      summary: `${institution.name} kurumu olusturuldu.`,
      metadata: { institutionId: institution.id, slug: institution.slug, type: institution.type },
    });

    revalidatePath("/panel/admin");

    return { success: true, message: "Kurum olusturuldu.", id: institution.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteInstitutionAction(
  input: DeleteInstitutionInput,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = deleteInstitutionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kurum silme isteği dogrulanamadi.",
      };
    }

    const institution = await prisma.institution.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            users: true,
            students: true,
            documents: true,
            sessions: true,
            invoices: true,
            ramReports: true,
            transportPlans: true,
            archiveRecords: true,
          },
        },
      },
    });

    if (!institution) {
      return { success: false, message: "Kurum kaydı bulunamadı." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.parentMessage.deleteMany({ where: { institutionId: institution.id } });
      await tx.coordinationMeeting.deleteMany({ where: { institutionId: institution.id } });
      await tx.calendarEvent.deleteMany({ where: { institutionId: institution.id } });
      await tx.auditLog.deleteMany({
        where: {
          OR: [
            { actor: { institutionId: institution.id } },
            { metadata: { path: "$.institutionId", equals: institution.id } },
          ],
        },
      });
      await tx.productFeedback.deleteMany({ where: { institutionId: institution.id } });
      await tx.bepGoalProgressEntry.deleteMany({ where: { institutionId: institution.id } });
      await tx.courseEvaluationDocument.deleteMany({ where: { institutionId: institution.id } });
      await tx.studentFile.deleteMany({ where: { institutionId: institution.id } });
      await tx.studentFileFolder.deleteMany({ where: { institutionId: institution.id } });
      await tx.bepDocument.deleteMany({ where: { institutionId: institution.id } });
      await tx.institutionSession.deleteMany({ where: { institutionId: institution.id } });
      await tx.sessionRoom.deleteMany({ where: { institutionId: institution.id } });
      await tx.sessionTimeSlot.deleteMany({ where: { institutionId: institution.id } });
      await tx.institutionInvoice.deleteMany({ where: { institutionId: institution.id } });
      await tx.institutionRamTracking.deleteMany({ where: { institutionId: institution.id } });
      await tx.institutionTransportPlan.deleteMany({ where: { institutionId: institution.id } });
      await tx.institutionArchiveRecord.deleteMany({ where: { institutionId: institution.id } });
      await tx.inviteCode.deleteMany({ where: { institutionId: institution.id } });
      await tx.institutionSettings.deleteMany({ where: { institutionId: institution.id } });
      await tx.student.deleteMany({ where: { institutionId: institution.id } });
      await tx.user.deleteMany({ where: { institutionId: institution.id } });
      await tx.institution.delete({ where: { id: institution.id } });
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "institution.deleted",
      entityType: "institution",
      entityId: institution.id,
      summary: `${institution.name} kurumu ve bağlı tum kayıtları silindi.`,
      metadata: {
        slug: institution.slug,
        deletedUsers: institution._count.users,
        deletedStudents: institution._count.students,
        deletedDocuments: institution._count.documents,
        deletedSessions: institution._count.sessions,
        deletedInvoices: institution._count.invoices,
        deletedRamReports: institution._count.ramReports,
        deletedTransportPlans: institution._count.transportPlans,
        deletedArchiveRecords: institution._count.archiveRecords,
      },
    });

    revalidatePath("/panel/admin");

    return {
      success: true,
      message: "Kurum ve bağlı tum kayıtlar silindi.",
      id: institution.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function createInviteCodeAction(
  input: InviteCodeCreateInput,
): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    await purgeExpiredRateLimits();
    const user = await requireManagementUser();
    const parsed = inviteCodeCreateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Davet kodu formu dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Davet kodu olusturmak için kuruma bağlı olmalisiniz." };
    }

    const inviteRateLimit = await enforceActionRateLimit({
      action: "institution.invite_code_create",
      key: `user:${user.id}`,
      limit: 20,
      windowMs: 1000 * 60 * 60,
      blockMs: 1000 * 60 * 30,
      actorId: user.id,
      metadata: { institutionId: user.institutionId },
      message: "Davet kodu olusturma siniri asildi. Lutfen daha sonra tekrar deneyin.",
    });
    if (inviteRateLimit) {
      return inviteRateLimit;
    }

    if (parsed.data.role === "parent" && !parsed.data.studentId) {
      return { success: false, message: "Veli daveti için öğrenci seçimi zorunludur." };
    }

    if (parsed.data.studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: parsed.data.studentId,
          institutionId: user.institutionId,
        },
        select: { id: true },
      });

      if (!student) {
        return { success: false, message: "Secilen öğrenci bulunamadı." };
      }
    }

    const inviteCode = await prisma.inviteCode.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        code: generateInviteCode(),
        role: parsed.data.role,
        email: parsed.data.email?.trim() ? parsed.data.email.toLowerCase() : null,
        studentId: parsed.data.studentId || null,
        expiresAt: new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000),
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "invite_code.created",
      entityType: "inviteCode",
      entityId: inviteCode.id,
      summary: `${inviteCode.role} rolu için davet kodu olusturuldu.`,
      metadata: {
        institutionId: inviteCode.institutionId,
        code: inviteCode.code,
        role: inviteCode.role,
        studentId: inviteCode.studentId,
      },
    });

    revalidatePath("/panel/davet-kodlari");
    revalidatePath("/panel");

    return {
      success: true,
      message: `Davet kodu olusturuldu: ${inviteCode.code}`,
      id: inviteCode.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteInviteCodeAction(
  input: DeleteInviteCodeInput,
): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireManagementUser();
    const parsed = deleteInviteCodeSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Davet kodu seçimi geçersiz.",
      };
    }

    const inviteCode = await prisma.inviteCode.findFirst({
      where: {
        id: parsed.data.id,
        ...(user.institutionId ? { institutionId: user.institutionId } : {}),
      },
      select: {
        id: true,
        code: true,
        role: true,
        institutionId: true,
        studentId: true,
      },
    });

    if (!inviteCode) {
      return { success: false, message: "Davet kodu bulunamadı." };
    }

    await prisma.inviteCode.delete({
      where: { id: inviteCode.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "invite_code.deleted",
      entityType: "inviteCode",
      entityId: inviteCode.id,
      summary: `${inviteCode.code} davet kodu silindi.`,
      metadata: {
        institutionId: inviteCode.institutionId,
        role: inviteCode.role,
        studentId: inviteCode.studentId,
      },
    });

    revalidatePath("/panel/davet-kodlari");
    revalidatePath("/panel");

    return { success: true, message: "Davet kodu silindi.", id: inviteCode.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function createUserByAdminAction(
  input: AdminCreateUserInput,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = adminCreateUserSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kullanıcı formu dogrulanamadi.",
      };
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email.toLowerCase() },
      select: { id: true },
    });

    if (existing) {
      return { success: false, message: "Bu e-posta ile kayitli kullanıcı zaten var." };
    }

    if (parsed.data.role !== "admin" && parsed.data.role !== "institution" && !parsed.data.institutionId) {
      return { success: false, message: "Bu rol için kurum seçimi zorunludur." };
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const createdUser = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email.toLowerCase(),
        passwordHash,
        role: parsed.data.role,
        institutionId: parsed.data.institutionId || null,
      },
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "user.created_by_admin",
      entityType: "user",
      entityId: createdUser.id,
      summary: `${createdUser.email} kullanicisi ${createdUser.role} roluyla olusturuldu.`,
      metadata: { role: createdUser.role, institutionId: createdUser.institutionId },
    });

    const adminCreatedEmail = buildAdminCreatedAccountEmail(createdUser.name);
    const adminCreatedEmailResult = await sendTransactionalEmail({
      to: createdUser.email,
      subject: adminCreatedEmail.subject,
      html: adminCreatedEmail.html,
      text: adminCreatedEmail.text,
      idempotencyKey: `user-created-by-admin/${createdUser.id}`,
      tags: [
        { name: "category", value: "admin_invite" },
        { name: "user_id", value: createdUser.id },
      ],
    });

    if (!adminCreatedEmailResult.success && !adminCreatedEmailResult.skipped) {
      await logEmailFailure(
        admin.id,
        createdUser.id,
        `${createdUser.email} için yonetici olusturma e-postasi gönderilemedi.`,
        adminCreatedEmailResult.message,
      );
    }

    revalidatePath("/panel/admin");

    return { success: true, message: "Kullanıcı olusturuldu.", id: createdUser.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateUserStateAction(
  input: AdminUserStateInput,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = adminUserStateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kullanıcı durumu dogrulanamadi.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: { id: true, name: true, email: true, isActive: true, role: true, institutionId: true },
    });

    if (!targetUser) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    if (targetUser.id === admin.id && !parsed.data.isActive) {
      return { success: false, message: "Kendi hesabinizi pasife alamazsiniz." };
    }

    if (targetUser.role === UserRole.admin && !parsed.data.isActive) {
      const otherActiveAdminCount = await getActiveAdminCount(targetUser.id);
      if (otherActiveAdminCount === 0) {
        return { success: false, message: "Sistemde en az bir aktif admin kalmalidir." };
      }
    }

    const suspendedUntilDate = (!parsed.data.isActive && parsed.data.suspendedUntil)
      ? new Date(parsed.data.suspendedUntil)
      : null;

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        isActive: parsed.data.isActive,
        suspendedUntil: suspendedUntilDate,
      },
    });

    // Send transactional mail notification to user
    try {
      const emailTemplate = buildUserSuspendedEmail(
        targetUser.name,
        parsed.data.isActive,
        suspendedUntilDate
      );
      await sendTransactionalEmail({
        to: targetUser.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
        idempotencyKey: `user-suspension/${targetUser.id}/${parsed.data.isActive}/${suspendedUntilDate ? suspendedUntilDate.getTime() : "permanent"}-${Date.now()}`,
      });
    } catch (mailError) {
      await logEmailFailure(
        targetUser.email,
        "Kullanıcı durum değişikliği mail bildirimi gönderilemedi.",
        mailError instanceof Error ? mailError.message : String(mailError)
      );
    }

    await writeAuditLog({
      actorId: admin.id,
      action: "user.state_updated",
      entityType: "user",
      entityId: targetUser.id,
      summary: `${targetUser.email} kullanicisi ${parsed.data.isActive ? "aktif" : "pasif"} duruma getirildi.`,
      metadata: {
        previousState: targetUser.isActive,
        nextState: parsed.data.isActive,
        suspendedUntil: suspendedUntilDate,
        institutionId: targetUser.institutionId,
      },
    });

    revalidatePath("/panel/admin");
    revalidatePath("/panel");

    return {
      success: true,
      message: parsed.data.isActive ? "Kullanıcı aktif edildi." : "Kullanıcı pasife alindi.",
      id: targetUser.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteUserByAdminAction(
  input: AdminDeleteUserInput,
): Promise<ActionResult> {
  try {
    const admin = await requireAdmin();
    const parsed = adminDeleteUserSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Silme isteği dogrulanamadi.",
      };
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: parsed.data.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        institutionId: true,
      },
    });

    if (!targetUser) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    if (targetUser.id === admin.id) {
      return { success: false, message: "Kendi hesabinizi silemezsiniz." };
    }

    if (targetUser.role === UserRole.admin) {
      const otherActiveAdminCount = await getActiveAdminCount(targetUser.id);
      if (otherActiveAdminCount === 0) {
        return { success: false, message: "Sistemde en az bir aktif admin kalmalidir." };
      }
    }

    // --- CASCADE DELETION TRANSACTION ---
    await prisma.$transaction(async (tx) => {
      const userId = targetUser.id;

      // 1. Kullanıcının sahip olduğu (oluşturduğu) öğrencileri bulalım
      const userStudents = await tx.student.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      const studentIds = userStudents.map((s) => s.id);

      if (studentIds.length > 0) {
        // Öğrencilere bağlı alt kayıtları silelim
        await tx.institutionRamTracking.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.institutionSession.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.courseEvaluationDocument.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.evaluationDocument.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.bepGoalProgressEntry.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.specialEducationReinforcer.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.sensoryRegulationMenuItem.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.specialEducationDailyDataEntry.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.dailyQuickEntry.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.institutionTransportPlan.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.familyEducationPlan.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.studentTransferInvite.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.reminder.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.studentFile.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.bepDocument.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.parentStudentLink.deleteMany({ where: { studentId: { in: studentIds } } });
        await tx.inviteCode.deleteMany({ where: { studentId: { in: studentIds } } });

        // Öğrencilerin kendilerini silelim
        await tx.student.deleteMany({ where: { id: { in: studentIds } } });
      }

      // 2. Kullanıcıya doğrudan bağlı diğer kayıtları temizleyelim
      await tx.personalNote.deleteMany({ where: { ownerId: userId } });
      await tx.supportTicketReply.deleteMany({ where: { userId } });
      await tx.supportTicket.deleteMany({ where: { userId } });
      
      // Kullanıcının oluşturduğu diğer genel kayıtları temizleyelim
      await tx.institutionRamTracking.deleteMany({ where: { createdById: userId } });
      await tx.notificationDismissal.deleteMany({ where: { userId } });
      await tx.appNotification.deleteMany({ where: { userId } });
      await tx.reminder.deleteMany({ where: { ownerId: userId } });
      await tx.inviteCode.deleteMany({ where: { OR: [{ createdById: userId }, { usedById: userId }] } });
      await tx.parentStudentLink.deleteMany({ where: { parentId: userId } });
      await tx.bepDocument.deleteMany({ where: { ownerId: userId } });
      await tx.courseEvaluationDocument.deleteMany({ where: { ownerId: userId } });
      await tx.evaluationDocument.deleteMany({ where: { ownerId: userId } });
      await tx.bepGoalProgressEntry.deleteMany({ where: { createdById: userId } });
      await tx.specialEducationReinforcer.deleteMany({ where: { createdById: userId } });
      await tx.sensoryRegulationMenuItem.deleteMany({ where: { createdById: userId } });
      await tx.specialEducationDailyDataEntry.deleteMany({ where: { createdById: userId } });
      await tx.dailyQuickEntry.deleteMany({ where: { createdById: userId } });
      await tx.familyEducationPlan.deleteMany({ where: { createdById: userId } });
      await tx.familyEducationNote.deleteMany({ where: { createdById: userId } });
      await tx.familyEducationResponse.deleteMany({ where: { createdById: userId } });
      await tx.bepTransferInvite.deleteMany({ where: { OR: [{ fromUserId: userId }, { acceptedById: userId }] } });
      await tx.studentTransferInvite.deleteMany({ where: { OR: [{ fromUserId: userId }, { acceptedById: userId }] } });

      // 3. Kullanıcıya bağlı oturum, şifre sıfırlama, vb. alt tabloları temizleyelim
      await tx.mobileRefreshToken.deleteMany({ where: { userId } });
      await tx.passwordResetToken.deleteMany({ where: { userId } });
      await tx.authIdentity.deleteMany({ where: { userId } });
      await tx.webSession.deleteMany({ where: { userId } });
      await tx.trustedWebDevice.deleteMany({ where: { userId } });
      await tx.mobileTrustedDevice.deleteMany({ where: { userId } });
      await tx.aiSuggestionLog.deleteMany({ where: { userId } });

      // 4. Son olarak kullanıcının kendisini silelim
      await tx.user.delete({
        where: { id: userId },
      });
    }, {
      timeout: 30000
    });

    await writeAuditLog({
      actorId: admin.id,
      action: "user.deleted",
      entityType: "user",
      entityId: targetUser.id,
      summary: `${targetUser.email} kullanicisi sistemden ve tüm ilişkili verilerden silindi.`,
      metadata: { institutionId: targetUser.institutionId },
    });

    // --- KVKK BİLGİLENDİRME E-POSTASI GÖNDERİMİ ---
    const emailData = buildAccountDeletedEmail(targetUser.name);
    sendTransactionalEmail({
      to: targetUser.email,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
      idempotencyKey: `delete-user-${targetUser.id}-${Date.now()}`,
    }).catch((emailErr) => {
      console.error(`Kullanıcı silinme e-postası gönderilemedi: ${targetUser.email}`, emailErr);
    });

    revalidatePath("/panel/admin");

    return { success: true, message: "Kullanıcı ve ilişkili tüm verileri silindi.", id: targetUser.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveInstitutionSettingsAction(
  input: InstitutionSettingsInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = institutionSettingsSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kurum ayarları dogrulanamadi.",
      };
    }

    const existing = await prisma.institutionSettings.findFirst({
      where: isInstitutionRole(user.role)
        ? { institutionId: user.institutionId }
        : { institutionId: null },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    let logoData: Buffer | undefined = undefined;
    let logoMimeType: string | null = null;
    let logoFileName: string | null = null;

    if (!parsed.data.removeLogo && parsed.data.logoBase64) {
      const decoded = decodeUploadedStudentFile(parsed.data.logoBase64, {
        fileName: parsed.data.logoFileName,
        mimeType: parsed.data.logoMimeType,
      });

      if (decoded && "error" in decoded) {
        return { success: false, message: decoded.error ?? "Logo dosyasi okunamadi." };
      }

      if (decoded) {
        const allowedImageTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
        if (!allowedImageTypes.includes(decoded.mimeType ?? "")) {
          return { success: false, message: "Lütfen gecerli bir resim dosyasi yükleyin (PNG, JPG, JPEG, WEBP)." };
        }
        if (decoded.size > 2 * 1024 * 1024) {
          return { success: false, message: "Logo dosya boyutu en fazla 2MB olabilir." };
        }

        logoData = decoded.buffer;
        logoMimeType = decoded.mimeType ?? null;
        logoFileName = decoded.fileName ?? parsed.data.logoFileName ?? "logo";
      }
    }

    const payload: Prisma.InstitutionSettingsUncheckedCreateInput = {
      institutionId: isInstitutionRole(user.role) ? user.institutionId ?? null : null,
      schoolName: parsed.data.schoolName || null,
      district: parsed.data.district || null,
      city: parsed.data.city || null,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      principalName: parsed.data.principalName || null,
      principalTitle: parsed.data.principalTitle || null,
      defaultManagerName: parsed.data.defaultManagerName || null,
      defaultManagerTitle: parsed.data.defaultManagerTitle || null,
      legalName: parsed.data.legalName || null,
      taxOffice: parsed.data.taxOffice || null,
      taxNumber: parsed.data.taxNumber || null,
      mersisNumber: parsed.data.mersisNumber || null,
      iban: parsed.data.iban || null,
      invoicePrefix: parsed.data.invoicePrefix || null,
      notes: parsed.data.notes || null,
      updatedById: user.id,
    };

    if (parsed.data.removeLogo) {
      payload.logoData = null;
      payload.logoMimeType = null;
      payload.logoFileName = null;
    } else if (logoData) {
      payload.logoData = toPrismaBytes(logoData);
      payload.logoMimeType = logoMimeType;
      payload.logoFileName = logoFileName;
    }

    const settings = existing
      ? await prisma.institutionSettings.update({
          where: { id: existing.id },
          data: payload,
        })
      : await prisma.institutionSettings.create({
          data: payload,
        });

    await writeAuditLog({
      actorId: user.id,
      action: existing ? "institution.updated" : "institution.created",
      entityType: "institutionSettings",
      entityId: settings.id,
      summary: "Kurum ayarları guncellendi.",
      metadata: {
        schoolName: settings.schoolName,
        institutionId: settings.institutionId,
      },
    });

    revalidatePath("/panel/admin");
    revalidatePath("/panel/kurum");
    revalidatePath("/panel");

    return { success: true, message: "Kurum ayarları kaydedildi.", id: settings.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function savePlatformMaintenanceSettingsAction(
  input: PlatformMaintenanceSettingsInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const normalizedInput = {
      ...input,
      maintenanceEndsAt:
        input.maintenanceEnabled && !input.maintenanceEndsAt?.trim()
          ? new Date(Date.now() + 60 * 60 * 1000).toISOString()
          : input.maintenanceEndsAt,
    };
    const parsed = platformMaintenanceSettingsSchema.safeParse(normalizedInput);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Bakım ayarları doğrulanamadı.",
      };
    }

    const endsAt = parsed.data.maintenanceEndsAt?.trim()
      ? new Date(parsed.data.maintenanceEndsAt)
      : null;

    const settings = await prisma.platformRuntimeSettings.upsert({
      where: { id: PLATFORM_RUNTIME_SETTINGS_ID },
      update: {
        maintenanceEnabled: parsed.data.maintenanceEnabled,
        maintenanceEndsAt: parsed.data.maintenanceEnabled ? endsAt : null,
        maintenanceMessage: parsed.data.maintenanceMessage?.trim() || null,
        updatedById: user.id,
      },
      create: {
        id: PLATFORM_RUNTIME_SETTINGS_ID,
        maintenanceEnabled: parsed.data.maintenanceEnabled,
        maintenanceEndsAt: parsed.data.maintenanceEnabled ? endsAt : null,
        maintenanceMessage: parsed.data.maintenanceMessage?.trim() || null,
        updatedById: user.id,
      },
    });
    invalidatePlatformRuntimeSettingsCache();
    invalidateSystemHealthCache();

    await writeAuditLog({
      actorId: user.id,
      action: "platform_maintenance.updated",
      entityType: "platformRuntimeSettings",
      entityId: settings.id,
      summary: parsed.data.maintenanceEnabled
        ? "Bakım modu aktif edildi veya güncellendi."
        : "Bakım modu pasif hale getirildi.",
      metadata: {
        maintenanceEnabled: settings.maintenanceEnabled,
        maintenanceEndsAt: settings.maintenanceEndsAt?.toISOString() ?? null,
      },
    });

    revalidatePath("/");
    revalidatePath("/bakim");
    revalidatePath("/durum");
    revalidatePath("/giris");
    revalidatePath("/panel");
    revalidatePath("/panel/admin");

    return {
      success: true,
      message: settings.maintenanceEnabled ? "Bakım modu güncellendi." : "Bakım modu kapatıldı.",
      id: settings.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function createMaintenanceWindowAction(
  input: MaintenanceWindowInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = maintenanceWindowSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Bakım penceresi doğrulanamadı.",
      };
    }

    const start = new Date(parsed.data.startsAt);
    const end = new Date(parsed.data.endsAt);

    const window = await prisma.maintenanceWindow.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description || null,
        startsAt: start,
        endsAt: end,
        autoActivate: parsed.data.autoActivate,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_maintenance.updated",
      entityType: "maintenanceWindow",
      entityId: window.id,
      summary: `Bakım penceresi planlandı: ${window.title}`,
    });
    invalidatePlatformRuntimeSettingsCache();
    invalidateSystemHealthCache();

    revalidatePath("/bakim");
    revalidatePath("/durum");
    revalidatePath("/giris");
    revalidatePath("/panel");
    revalidatePath("/panel/admin/bakim");

    return {
      success: true,
      message: "Bakım penceresi oluşturuldu. Bilgilendirme e-postasını hazır olduğunuzda listeden gönderebilirsiniz.",
      id: window.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

async function sendMaintenanceWindowNotificationEmails(window: {
  id: string;
  title: string;
  description: string | null;
  startsAt: Date;
  endsAt: Date;
  updatedAt: Date;
}) {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
    },
    select: { email: true, name: true },
  });

  const formattedStart = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(window.startsAt);

  const formattedEnd = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(window.endsAt);

  const recipients = users.filter((u) => Boolean(u.email));
  const results = await Promise.allSettled(
    recipients.map((u) => {
      const email = u.email;
      if (!email) {
        return Promise.resolve({ success: false, skipped: true });
      }

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
          <h2 style="color: #d97706; margin-bottom: 20px;">Planlı Bakım Çalışması Bilgilendirmesi</h2>
          <p>Merhaba <strong>${u.name}</strong>,</p>
          <p>Sizlere daha iyi bir deneyim sunabilmek amaçıyla Specia platformunda planlı bir bakım çalışması gerçekleştireceğiz.</p>
          <p style="margin-top: 15px; margin-bottom: 15px;"><strong>Çalışma Konusu:</strong> ${window.title}</p>
          ${window.description ? `<p style="margin-bottom: 15px;"><strong>Açıklama:</strong> ${window.description}</p>` : ""}
          <p><strong>Başlangıç Zamanı:</strong> ${formattedStart}</p>
          <p><strong>Tahmini Bitiş Zamanı:</strong> ${formattedEnd}</p>
          <div style="margin-top: 20px; padding: 12px; background-color: #fffbeb; border-left: 4px solid #f59e0b; color: #78350f; font-size: 14px; border-radius: 4px;">
            Bakım süresi boyunca platform erişiminde kısa süreli kesintiler veya yavaşlamalar yaşanabilir.
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #888; border-top: 1px solid #eee; padding-top: 15px;">
            Saygılarımızla,<br/><strong>Specia Ekibi</strong>
          </p>
        </div>
      `;

      const text = `Merhaba ${u.name},\n\nSizlere daha iyi bir deneyim sunabilmek amaçıyla Specia platformunda planlı bir bakım çalışması gerçekleştireceğiz.\n\nÇalışma Konusu: ${window.title}\n${window.description ? `Açıklama: ${window.description}\n` : ""}Başlangıç Zamanı: ${formattedStart}\nTahmini Bitiş Zamanı: ${formattedEnd}\n\nBakım süresi boyunca platform erişiminde kısa süreli kesintiler veya yavaşlamalar yaşanabilir.\n\nSaygılarımızla,\nSpecia Ekibi`;

      return sendTransactionalEmail({
        to: email,
        subject: `Planlı Bakım Çalışması: ${window.title}`,
        html,
        text,
        idempotencyKey: `maint-${window.id}-${window.updatedAt.getTime()}-${email}`,
      });
    }),
  );

  return {
    recipientCount: recipients.length,
    successCount: results.filter((result) => result.status === "fulfilled" && result.value.success).length,
    skippedCount: results.filter((result) => result.status === "fulfilled" && result.value.skipped).length,
    failedCount: results.filter((result) => result.status === "rejected" || (result.status === "fulfilled" && !result.value.success && !result.value.skipped)).length,
  };
}

export async function sendMaintenanceWindowNotificationAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const window = await prisma.maintenanceWindow.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        updatedAt: true,
        status: true,
      },
    });

    if (!window) {
      return {
        success: false,
        message: "Bakım penceresi bulunamadı.",
      };
    }

    if (window.status === "cancelled") {
      return {
        success: false,
        message: "İptal edilmiş bakım penceresi için e-posta gönderilemez.",
      };
    }

    const delivery = await sendMaintenanceWindowNotificationEmails(window);

    await writeAuditLog({
      actorId: user.id,
      action: "platform_maintenance.updated",
      entityType: "maintenanceWindow",
      entityId: window.id,
      summary: `Bakım penceresi e-postası gönderildi: ${window.title}`,
      metadata: delivery,
    });

    return {
      success: delivery.failedCount === 0 && delivery.skippedCount === 0,
      message:
        delivery.failedCount > 0
          ? `${delivery.successCount} kullanıcıya e-posta gönderildi, ${delivery.failedCount} gönderim başarısız oldu.`
          : delivery.skippedCount > 0
            ? "E-posta sağlayıcısı yapılandırılmadığı için gönderim yapılamadı."
            : `${delivery.successCount} kullanıcıya bakım bilgilendirme e-postası gönderildi.`,
      id: window.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateMaintenanceWindowStatusAction(
  id: string,
  status: "scheduled" | "in_progress" | "completed" | "cancelled",
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();

    const window = await prisma.maintenanceWindow.update({
      where: { id },
      data: { status },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_maintenance.updated",
      entityType: "maintenanceWindow",
      entityId: window.id,
      summary: `Bakım penceresi durumu güncellendi: ${window.title} (${status})`,
    });
    invalidatePlatformRuntimeSettingsCache();
    invalidateSystemHealthCache();

    revalidatePath("/bakim");
    revalidatePath("/durum");
    revalidatePath("/giris");
    revalidatePath("/panel");
    revalidatePath("/panel/admin/bakim");

    return {
      success: true,
      message: "Bakım penceresi durumu güncellendi.",
      id: window.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteMaintenanceWindowAction(id: string): Promise<ActionResult> {
  try {
    const user = await requireAdmin();

    const window = await prisma.maintenanceWindow.delete({
      where: { id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_maintenance.updated",
      entityType: "maintenanceWindow",
      entityId: window.id,
      summary: `Bakım penceresi silindi: ${window.title}`,
    });
    invalidatePlatformRuntimeSettingsCache();
    invalidateSystemHealthCache();

    revalidatePath("/bakim");
    revalidatePath("/durum");
    revalidatePath("/giris");
    revalidatePath("/panel");
    revalidatePath("/panel/admin/bakim");

    return {
      success: true,
      message: "Bakım penceresi silindi.",
      id: window.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function quickPlatformMaintenanceAction(
  enable: boolean,
  durationHours = 1,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();

    const endsAt = enable
      ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
      : null;

    const message = enable ? "Acil sistem bakım çalışması yapılıyor." : null;

    const settings = await prisma.platformRuntimeSettings.upsert({
      where: { id: PLATFORM_RUNTIME_SETTINGS_ID },
      update: {
        maintenanceEnabled: enable,
        maintenanceEndsAt: endsAt,
        maintenanceMessage: message,
        updatedById: user.id,
      },
      create: {
        id: PLATFORM_RUNTIME_SETTINGS_ID,
        maintenanceEnabled: enable,
        maintenanceEndsAt: endsAt,
        maintenanceMessage: message,
        updatedById: user.id,
      },
    });

    invalidatePlatformRuntimeSettingsCache();
    invalidateSystemHealthCache();

    await writeAuditLog({
      actorId: user.id,
      action: "platform_maintenance.updated",
      entityType: "platformRuntimeSettings",
      entityId: settings.id,
      summary: enable
        ? `Hızlı acil bakım aktif edildi (${durationHours} saat).`
        : "Acil bakım devredışı bırakıldı.",
    });

    revalidatePath("/");
    revalidatePath("/bakim");
    revalidatePath("/durum");
    revalidatePath("/panel/admin/bakim");
    revalidatePath("/panel/admin");

    return {
      success: true,
      message: enable ? "Acil bakım başlatıldı." : "Bakım sonlandırıldı.",
      id: settings.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function upsertAppVersionInfoAction(
  input: AppVersionInfoInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = appVersionInfoSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Mobil sürüm bilgisi doğrulanamadı.",
      };
    }

    const data = {
      currentVersion: parsed.data.currentVersion,
      minRequiredVersion: parsed.data.minRequiredVersion,
      forceUpdate: parsed.data.forceUpdate,
      message: parsed.data.message?.trim() || null,
      appStoreUrl: parsed.data.appStoreUrl?.trim() || null,
      updatedById: user.id,
    };

    const record = await prisma.appVersionInfo.upsert({
      where: { platform: parsed.data.platform },
      update: data,
      create: { platform: parsed.data.platform, ...data },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "app_version_info.updated",
      entityType: "appVersionInfo",
      entityId: record.id,
      summary: `${parsed.data.platform === "ios" ? "iOS" : "Android"} mobil sürüm bilgisi güncellendi: ${record.currentVersion}`,
      metadata: {
        platform: record.platform,
        currentVersion: record.currentVersion,
        minRequiredVersion: record.minRequiredVersion,
        forceUpdate: record.forceUpdate,
      },
    });

    revalidatePath("/panel/admin/mobil-surum");
    revalidatePath("/panel/admin");

    return {
      success: true,
      message: "Mobil sürüm bilgisi güncellendi.",
      id: record.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function sendAdminNotificationAction(
  input: AdminNotificationInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = adminNotificationSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Bildirim doğrulanamadı.",
      };
    }

    let recipientIds: string[] = [];
    if (parsed.data.target === "all") {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });
      recipientIds = users.map((u) => u.id);
    } else if (parsed.data.target === "role") {
      const users = await prisma.user.findMany({
        where: { isActive: true, role: parsed.data.role },
        select: { id: true },
      });
      recipientIds = users.map((u) => u.id);
    } else if (parsed.data.target === "institution") {
      const users = await prisma.user.findMany({
        where: { isActive: true, institutionId: parsed.data.institutionId },
        select: { id: true },
      });
      recipientIds = users.map((u) => u.id);
    } else {
      const target = await prisma.user.findUnique({
        where: { email: parsed.data.userEmail },
        select: { id: true, isActive: true },
      });
      if (target && target.isActive) {
        recipientIds = [target.id];
      }
    }

    if (recipientIds.length === 0) {
      return {
        success: false,
        message: "Seçilen kritere uyan kullanıcı bulunamadı.",
      };
    }

    const title = parsed.data.title.trim();
    const body = parsed.data.body.trim();
    const result = await notifyUsers(recipientIds, {
      type: "admin_broadcast",
      title,
      body,
      data: { type: "admin_broadcast" },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "admin_notification.sent",
      entityType: "appNotification",
      entityId: user.id,
      summary: `Admin bildirimi gönderildi: ${title} (${recipientIds.length} kullanıcı)`,
      metadata: {
        target: parsed.data.target,
        recipientCount: recipientIds.length,
        pushSent: result.sent,
        pushFailed: result.failed,
      },
    });

    return {
      success: true,
      message: `${recipientIds.length} kullanıcıya bildirim gönderildi (${result.sent} push başarılı).`,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateStaffProfileAction(
  input: StaffProfileInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = staffProfileSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Personel formu dogrulanamadi.",
      };
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: parsed.data.userId,
        ...getUserManagementWhere(user),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institutionId: true,
      },
    });

    if (!targetUser) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        branch: parsed.data.branch?.trim() || null,
        employmentType: parsed.data.employmentType || null,
        allowedModules: parsed.data.allowedModules,
      },
      select: {
        id: true,
        institutionId: true,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "user.staff_profile_updated",
      entityType: "user",
      entityId: updatedUser.id,
      summary: `${targetUser.email} için personel profili guncellendi.`,
      metadata: {
        institutionId: updatedUser.institutionId,
        role: targetUser.role,
        allowedModules: parsed.data.allowedModules,
      },
    });

    revalidatePath("/panel/uyeler");
    revalidatePath("/panel");

    return { success: true, message: "Personel profili guncellendi.", id: updatedUser.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateInstitutionMemberStateAction(
  input: InstitutionMemberStateInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = institutionMemberStateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kullanıcı durumu dogrulanamadi.",
      };
    }

    if (parsed.data.userId === user.id && !parsed.data.isActive) {
      return { success: false, message: "Kendi hesabinizi pasife alamazsiniz." };
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: parsed.data.userId,
        ...getUserManagementWhere(user),
      },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        institutionId: true,
      },
    });

    if (!targetUser) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    if (targetUser.role === UserRole.institution && !parsed.data.isActive) {
      return { success: false, message: "Kurum yoneticisi hesabi pasife alinamaz." };
    }

    await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        isActive: parsed.data.isActive,
        suspendedUntil: null,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution.member_state_updated",
      entityType: "user",
      entityId: targetUser.id,
      summary: `${targetUser.email} kullanicisi ${parsed.data.isActive ? "aktif" : "pasif"} duruma getirildi.`,
      metadata: {
        previousState: targetUser.isActive,
        nextState: parsed.data.isActive,
        institutionId: targetUser.institutionId,
      },
    });

    revalidatePath("/panel/uyeler");
    revalidatePath("/panel");

    return {
      success: true,
      message: parsed.data.isActive ? "Kullanıcı aktif edildi." : "Kullanıcı pasife alindi.",
      id: targetUser.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function removeInstitutionMemberAction(
  input: RemoveInstitutionMemberInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = removeInstitutionMemberSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Kullanıcı seçimi dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Bu islem için kuruma bağlı olmalisiniz." };
    }
    const institutionId = user.institutionId;

    if (parsed.data.userId === user.id) {
      return { success: false, message: "Kendi hesabinizi kurumdan cikarmazsiniz." };
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: parsed.data.userId,
        ...getUserManagementWhere(user),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        institutionId: true,
      },
    });

    if (!targetUser) {
      return { success: false, message: "Kullanıcı bulunamadı." };
    }

    if (!["teacher", "parent"].includes(targetUser.role)) {
      return {
        success: false,
        message: "Yalnızca öğretmen ve veli hesaplari kurumdan cikarilabilir.",
      };
    }

    await prisma.$transaction(async (tx) => {
      if (targetUser.role === UserRole.parent) {
        await tx.parentStudentLink.deleteMany({
          where: {
            parentId: targetUser.id,
            student: {
              institutionId,
            },
          },
        });
      }

      if (targetUser.role === UserRole.teacher) {
        await Promise.all([
          tx.student.updateMany({
            where: {
              ownerId: targetUser.id,
              institutionId,
            },
            data: {
              ownerId: user.id,
            },
          }),
          tx.bepDocument.updateMany({
            where: {
              ownerId: targetUser.id,
              institutionId,
            },
            data: {
              ownerId: user.id,
            },
          }),
          tx.courseEvaluationDocument.updateMany({
            where: {
              ownerId: targetUser.id,
              institutionId,
            },
            data: {
              ownerId: user.id,
            },
          }),
          tx.coordinationMeeting.updateMany({
            where: {
              createdById: targetUser.id,
              institutionId,
            },
            data: {
              createdById: user.id,
            },
          }),
          tx.familyEducationPlan.updateMany({
            where: {
              createdById: targetUser.id,
              institutionId,
            },
            data: {
              createdById: user.id,
            },
          }),
          tx.familyEducationNote.updateMany({
            where: {
              createdById: targetUser.id,
              plan: {
                institutionId,
              },
            },
            data: {
              createdById: user.id,
            },
          }),
          tx.institutionSession.updateMany({
            where: {
              institutionId,
              teacherId: targetUser.id,
            },
            data: {
              teacherId: null,
            },
          }),
          tx.calendarEvent.updateMany({
            where: {
              institutionId,
              ownerId: targetUser.id,
            },
            data: {
              ownerId: user.id,
              assignedUserId: null,
            },
          }),
          tx.calendarEvent.updateMany({
            where: {
              institutionId,
              assignedUserId: targetUser.id,
            },
            data: {
              assignedUserId: null,
            },
          }),
        ]);
      }

      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          institutionId: null,
          allowedModules: [],
        },
      });
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_member.removed",
      entityType: "user",
      entityId: targetUser.id,
      summary: `${targetUser.email} kurum uyeliginden cikarildi.`,
      metadata: {
        institutionId,
        targetRole: targetUser.role,
      },
    });

    revalidatePath("/panel/uyeler");
    revalidatePath("/panel");
    revalidatePath("/panel/iletisim");
    revalidatePath("/panel/veli-eslestirme");
    revalidatePath("/panel/cocuklarim");
    revalidatePath("/panel/ogrenciler");
    revalidatePath("/panel/seans-programi");
    revalidatePath("/panel/takvim");
    revalidatePath("/panel/aile-egitimi");
    revalidatePath("/panel/egitsel-analiz");

    return {
      success: true,
      message:
        targetUser.role === UserRole.parent
          ? "Veli hesabi kurumdan cikarildi ve öğrenci eşleşmeleri temizlendi."
          : "Öğretmen hesabi kurumdan cikarildi.",
      id: targetUser.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveInstitutionInvoiceAction(
  input: InstitutionInvoiceInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = institutionInvoiceSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Fatura formu dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Fatura olusturmak için bir kuruma bağlı olmalisiniz." };
    }

    const issueDate = parseDate(parsed.data.issueDate);
    if (!issueDate) {
      return { success: false, message: "Fatura tarihi geçersiz." };
    }

    const dueDate = parseDate(parsed.data.dueDate);
    const settings = await prisma.institutionSettings.findFirst({
      where: { institutionId: user.institutionId },
      select: { invoicePrefix: true },
    });

    const payload = {
      customerType: parsed.data.customerType,
      status: parsed.data.status,
      issueDate,
      dueDate,
      customerName: parsed.data.customerName.trim(),
      customerTitle: parsed.data.customerTitle?.trim() || null,
      customerIdentityNo: parsed.data.customerIdentityNo?.trim() || null,
      customerTaxOffice: parsed.data.customerTaxOffice?.trim() || null,
      customerTaxNumber: parsed.data.customerTaxNumber?.trim() || null,
      customerEmail: parsed.data.customerEmail?.trim() || null,
      customerPhone: parsed.data.customerPhone?.trim() || null,
      billingAddress: parsed.data.billingAddress?.trim() || null,
      serviceTitle: parsed.data.serviceTitle.trim(),
      serviceDescription: parsed.data.serviceDescription?.trim() || null,
      servicePeriod: parsed.data.servicePeriod?.trim() || null,
      quantity: parsed.data.quantity,
      unitPrice: parsed.data.unitPrice,
      taxRate: parsed.data.taxRate,
      notes: parsed.data.notes?.trim() || null,
    };

    if (parsed.data.id) {
      const existing = await prisma.institutionInvoice.findFirst({
        where: {
          id: parsed.data.id,
          institutionId: user.institutionId,
        },
        select: {
          id: true,
          institutionId: true,
          invoiceNumber: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Fatura kaydı bulunamadı." };
      }

      const invoice = await prisma.institutionInvoice.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "institution_invoice.updated",
        entityType: "institutionInvoice",
        entityId: invoice.id,
        summary: `${invoice.invoiceNumber} numarali fatura guncellendi.`,
        metadata: {
          institutionId: invoice.institutionId,
          customerType: invoice.customerType,
          status: invoice.status,
        },
      });

      revalidatePath("/panel/kurum");

      return { success: true, message: "Fatura guncellendi.", id: invoice.id };
    }

    const invoiceCount = await prisma.institutionInvoice.count({
      where: { institutionId: user.institutionId },
    });

    const invoiceNumber = buildInvoiceNumber(settings?.invoicePrefix, invoiceCount + 1, issueDate);

    const invoice = await prisma.institutionInvoice.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        invoiceNumber,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_invoice.created",
      entityType: "institutionInvoice",
      entityId: invoice.id,
      summary: `${invoice.invoiceNumber} numarali fatura olusturuldu.`,
      metadata: {
        institutionId: invoice.institutionId,
        customerType: invoice.customerType,
        status: invoice.status,
      },
    });

    revalidatePath("/panel/kurum");

    return { success: true, message: "Fatura olusturuldu.", id: invoice.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function generateEntitlementInvoiceDraftsAction(
  input: GenerateEntitlementInvoiceDraftsInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = generateEntitlementInvoiceDraftsSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Hak edis donemi dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Hak edis olusturmak için kuruma bağlı olmalisiniz." };
    }

    const period = resolveInvoicePeriod(parsed.data.period);
    const [settings, sessions, existingInvoices, invoiceCount] = await Promise.all([
      prisma.institutionSettings.findFirst({
        where: { institutionId: user.institutionId },
        select: { invoicePrefix: true },
      }),
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
        include: {
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
      prisma.institutionInvoice.findMany({
        where: {
          institutionId: user.institutionId,
          billingPeriod: period.key,
          billingStudentId: { not: null },
        },
        select: { billingStudentId: true },
      }),
      prisma.institutionInvoice.count({ where: { institutionId: user.institutionId } }),
    ]);

    const existingStudentIds = new Set(existingInvoices.map((invoice) => invoice.billingStudentId).filter(Boolean));
    const grouped = new Map<string, { student: (typeof sessions)[number]["student"]; total: number; individual: number; group: number; makeup: number }>();

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
      grouped.set(session.student.id, current);
    });

    const draftRows = Array.from(grouped.values()).filter((row) => !existingStudentIds.has(row.student.id));

    if (draftRows.length === 0) {
      return { success: false, message: "Bu dönem için taslak olusturulacak yeni hak edis bulunmuyor." };
    }

    const issueDate = new Date();
    let sequence = invoiceCount;
    await prisma.$transaction(
      draftRows.map((row) => {
        sequence += 1;
        const studentName = `${row.student.firstName} ${row.student.lastName}`.trim();
        return prisma.institutionInvoice.create({
          data: {
            institutionId: user.institutionId!,
            createdById: user.id,
            invoiceNumber: buildInvoiceNumber(settings?.invoicePrefix, sequence, issueDate),
            customerType: "corporate",
            status: "draft",
            issueDate,
            dueDate: null,
            customerName: "Milli Eğitim Bakanligi",
            customerTitle: studentName,
            serviceTitle: `${studentName} aylik özel eğitim hak edisi`,
            serviceDescription: `Tamamlanan seans: ${row.total}. Bireysel/Telafi: ${row.individual}, Grup: ${row.group}, Telafi: ${row.makeup}.`,
            servicePeriod: period.label,
            billingStudentId: row.student.id,
            billingPeriod: period.key,
            billingSource: "entitlement",
            quantity: row.total,
            unitPrice: parsed.data.unitPrice,
            taxRate: parsed.data.taxRate,
            notes: "e-Fatura entegrasyonu için hazirlanan hak edis taslagidir.",
          },
        });
      }),
    );

    await writeAuditLog({
      actorId: user.id,
      action: "entitlement_invoice_drafts.created",
      entityType: "institutionInvoice",
      summary: `${period.label} donemi için ${draftRows.length} hak edis taslagi olusturuldu.`,
      metadata: {
        institutionId: user.institutionId,
        period: period.key,
        count: draftRows.length,
      },
    });

    revalidatePath("/panel/hak-edis");
    revalidatePath("/panel/kurum");
    revalidatePath("/panel/raporlar");

    return {
      success: true,
      message: `${draftRows.length} hak edis fatura taslagi olusturuldu.`,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateEntitlementInvoiceStatusAction(
  input: UpdateEntitlementInvoiceStatusInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = updateEntitlementInvoiceStatusSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Fatura durumu dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Fatura durumu için kuruma bağlı olmalisiniz." };
    }

    const invoice = await prisma.institutionInvoice.findFirst({
      where: {
        id: parsed.data.id,
        institutionId: user.institutionId,
        billingSource: { in: ["entitlement", "difference"] },
      },
      select: { id: true, invoiceNumber: true, status: true, institutionId: true },
    });

    if (!invoice) {
      return { success: false, message: "Hak edis faturasi bulunamadı." };
    }

    const updated = await prisma.institutionInvoice.update({
      where: { id: invoice.id },
      data: { status: parsed.data.status },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "entitlement_invoice.status_updated",
      entityType: "institutionInvoice",
      entityId: updated.id,
      summary: `${updated.invoiceNumber} durumu ${parsed.data.status} olarak guncellendi.`,
      metadata: {
        institutionId: updated.institutionId,
        previousStatus: invoice.status,
        status: updated.status,
      },
    });

    revalidatePath("/panel/hak-edis");
    revalidatePath("/panel/kurum");
    revalidatePath("/panel/raporlar");
    revalidatePath("/panel/finans/raporlar");

    return { success: true, message: "Fatura durumu guncellendi.", id: updated.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function reviewInstitutionApplicationAction(
  input: InstitutionApplicationReviewInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = institutionApplicationReviewSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Başvuru değerlendirmesi dogrulanamadi.",
      };
    }

    const application = await prisma.institutionApplication.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        institutionName: true,
        contactName: true,
        email: true,
        status: true,
      },
    });

    if (!application) {
      return { success: false, message: "Başvuru kaydı bulunamadı." };
    }

    const updated = await prisma.institutionApplication.update({
      where: { id: application.id },
      data: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes?.trim() || null,
        reviewedAt: new Date(),
        reviewedById: user.id,
      },
      select: {
        id: true,
        institutionName: true,
        contactName: true,
        email: true,
        status: true,
        adminNotes: true,
        reviewedAt: true,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_application.reviewed",
      entityType: "institutionApplication",
      entityId: updated.id,
      summary: `${updated.institutionName} basvurusu ${updated.status} olarak guncellendi.`,
      metadata: {
        status: updated.status,
      },
    });

    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/kurum-basvurulari");

    if (parsed.data.sendEmail && updated.status !== "new") {
      const statusEmail = buildInstitutionApplicationStatusEmail({
        contactName: updated.contactName,
        institutionName: updated.institutionName,
        status: updated.status as "approved" | "rejected" | "reviewing",
        adminNotes: updated.adminNotes,
      });
      const statusEmailResult = await sendTransactionalEmail({
        to: updated.email,
        subject: statusEmail.subject,
        html: statusEmail.html,
        text: statusEmail.text,
        idempotencyKey: `institution-application-status/${updated.id}-${updated.status}-${updated.reviewedAt?.getTime() ?? Date.now()}`,
        tags: [
          { name: "category", value: "institution_application_status" },
          { name: "application_id", value: updated.id },
          { name: "status", value: updated.status },
        ],
      });

      if (!statusEmailResult.success) {
        if (!statusEmailResult.skipped) {
          await writeAuditLog({
            actorId: user.id,
            action: "institution_application.status_email_failed",
            entityType: "institutionApplication",
            entityId: updated.id,
            summary: `${updated.institutionName} kurum basvurusu için durum e-postasi gönderilemedi.`,
            metadata: statusEmailResult.message
              ? {
                  email: updated.email,
                  status: updated.status,
                  message: statusEmailResult.message,
                }
              : {
                  email: updated.email,
                  status: updated.status,
                },
          });
        }

        return {
          success: true,
          message: statusEmailResult.skipped
            ? "Başvuru durumu guncellendi. E-posta ayarları eksik oldugu için bildirim gönderilemedi."
            : "Başvuru durumu guncellendi, ancak bildirim e-postasi gönderilemedi.",
          id: updated.id,
        };
      }

      await writeAuditLog({
        actorId: user.id,
        action: "institution_application.status_email_sent",
        entityType: "institutionApplication",
        entityId: updated.id,
        summary: `${updated.institutionName} kurum basvurusu için durum e-postasi gönderildi.`,
        metadata: {
          email: updated.email,
          status: updated.status,
        },
      });

      return {
        success: true,
        message: "Başvuru durumu guncellendi ve bildirim e-postasi gönderildi.",
        id: updated.id,
      };
    }

    return {
      success: true,
      message: "Başvuru durumu guncellendi.",
      id: updated.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteInstitutionApplicationAction(
  input: DeleteInstitutionApplicationInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = deleteInstitutionApplicationSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Başvuru silme isteği dogrulanamadi.",
      };
    }

    const application = await prisma.institutionApplication.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        institutionName: true,
        contactName: true,
        email: true,
        status: true,
      },
    });

    if (!application) {
      return { success: false, message: "Başvuru kaydı bulunamadı." };
    }

    await prisma.institutionApplication.delete({
      where: { id: application.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_application.deleted",
      entityType: "institutionApplication",
      entityId: application.id,
      summary: `${application.institutionName} kurum basvurusu silindi.`,
      metadata: {
        contactName: application.contactName,
        email: application.email,
        status: application.status,
      },
    });

    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/kurum-basvurulari");

    return {
      success: true,
      message: "Kurum basvurusu silindi.",
      id: application.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function savePlatformAnnouncementAction(
  input: PlatformAnnouncementInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = platformAnnouncementSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Duyuru formu dogrulanamadi.",
      };
    }

    const payload = {
      title: parsed.data.title.trim(),
      summary: parsed.data.summary?.trim() || null,
      content: parsed.data.content.trim(),
      isActive: parsed.data.isActive,
      showAsPopup: parsed.data.showAsPopup,
      publishedAt: new Date(),
      updatedById: user.id,
    };

    if (parsed.data.id) {
      const existing = await prisma.platformAnnouncement.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, title: true },
      });

      if (!existing) {
        return { success: false, message: "Duyuru kaydı bulunamadı." };
      }

      const announcement = await prisma.platformAnnouncement.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "platform_announcement.updated",
        entityType: "platformAnnouncement",
        entityId: announcement.id,
        summary: `${announcement.title} duyurusu guncellendi.`,
        metadata: {
          isActive: announcement.isActive,
          showAsPopup: announcement.showAsPopup,
        },
      });

      revalidatePath("/panel");
      revalidatePath("/panel/admin");
      revalidatePath("/panel/admin/duyurular");

      return {
        success: true,
        message: "Duyuru guncellendi.",
        id: announcement.id,
      };
    }

    const announcement = await prisma.platformAnnouncement.create({
      data: {
        ...payload,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_announcement.created",
      entityType: "platformAnnouncement",
      entityId: announcement.id,
      summary: `${announcement.title} duyurusu olusturuldu.`,
      metadata: {
        isActive: announcement.isActive,
        showAsPopup: announcement.showAsPopup,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/duyurular");

    return {
      success: true,
      message: "Duyuru olusturuldu.",
      id: announcement.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function savePlatformStatusIncidentAction(
  input: PlatformStatusIncidentInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = platformStatusIncidentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Incident formu dogrulanamadi.",
      };
    }

    const startedAt = parseDate(parsed.data.startedAt);
    if (!startedAt) {
      return { success: false, message: "Başlangıç tarihi geçersiz." };
    }

    const resolvedAt = parseDate(parsed.data.resolvedAt);
    const isResolved = parsed.data.status === "resolved";
    const payload = {
      title: parsed.data.title.trim(),
      summary: parsed.data.summary?.trim() || null,
      serviceLabel: parsed.data.serviceLabel?.trim() || null,
      status: parsed.data.status,
      isActive: isResolved ? false : parsed.data.isActive,
      startedAt,
      resolvedAt: isResolved ? resolvedAt ?? new Date() : null,
      updatedById: user.id,
    };

    if (parsed.data.id) {
      const existing = await prisma.platformStatusIncident.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, title: true },
      });

      if (!existing) {
        return { success: false, message: "Incident kaydı bulunamadı." };
      }

      const incident = await prisma.platformStatusIncident.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "platform_status_incident.updated",
        entityType: "platformStatusIncident",
        entityId: incident.id,
        summary: `${incident.title} incident kaydı guncellendi.`,
        metadata: {
          status: incident.status,
          isActive: incident.isActive,
        },
      });

      revalidatePath("/durum");
      revalidatePath("/panel/admin");
      revalidatePath("/panel/admin/durum-merkezi");

      return { success: true, message: "Incident guncellendi.", id: incident.id };
    }

    const incident = await prisma.platformStatusIncident.create({
      data: {
        ...payload,
        createdById: user.id,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_status_incident.created",
      entityType: "platformStatusIncident",
      entityId: incident.id,
      summary: `${incident.title} incident kaydı olusturuldu.`,
      metadata: {
        status: incident.status,
        isActive: incident.isActive,
      },
    });

    revalidatePath("/durum");
    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/durum-merkezi");

    return { success: true, message: "Incident olusturuldu.", id: incident.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

async function syncPlatformStatusIncidentFromLatestUpdate(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  incidentId: string,
  updatedById: string,
) {
  const latestUpdate = await tx.platformStatusIncidentUpdate.findFirst({
    where: { incidentId },
    orderBy: [{ createdAt: "desc" }],
    select: { status: true, createdAt: true },
  });

  if (!latestUpdate) {
    return;
  }

  await tx.platformStatusIncident.update({
    where: { id: incidentId },
    data: {
      status: latestUpdate.status,
      isActive: latestUpdate.status === "resolved" ? false : true,
      resolvedAt: latestUpdate.status === "resolved" ? latestUpdate.createdAt : null,
      updatedById,
    },
  });
}

export async function savePlatformStatusIncidentUpdateAction(
  input: PlatformStatusIncidentUpdateInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = platformStatusIncidentUpdateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Incident guncellemesi dogrulanamadi.",
      };
    }

    const incident = await prisma.platformStatusIncident.findUnique({
      where: { id: parsed.data.incidentId },
      select: { id: true, title: true },
    });

    if (!incident) {
      return { success: false, message: "Incident kaydı bulunamadı." };
    }

    if (parsed.data.id) {
      const existingUpdate = await prisma.platformStatusIncidentUpdate.findUnique({
        where: { id: parsed.data.id },
        select: { id: true, incidentId: true },
      });

      if (!existingUpdate || existingUpdate.incidentId !== incident.id) {
        return { success: false, message: "Incident guncellemesi bulunamadı." };
      }

      await prisma.$transaction(async (tx) => {
        await tx.platformStatusIncidentUpdate.update({
          where: { id: existingUpdate.id },
          data: {
            status: parsed.data.status,
            message: parsed.data.message.trim(),
          },
        });

        await syncPlatformStatusIncidentFromLatestUpdate(tx, incident.id, user.id);
      });

      await writeAuditLog({
        actorId: user.id,
        action: "platform_status_incident_update.updated",
        entityType: "platformStatusIncidentUpdate",
        entityId: existingUpdate.id,
        summary: `${incident.title} için durum guncellemesi yenilendi.`,
        metadata: {
          incidentId: incident.id,
          status: parsed.data.status,
        },
      });

      revalidatePath("/durum");
      revalidatePath("/panel/admin");
      revalidatePath("/panel/admin/durum-merkezi");

      return { success: true, message: "Incident guncellemesi guncellendi.", id: incident.id };
    }

    const createdUpdate = await prisma.$transaction(async (tx) => {
      const update = await tx.platformStatusIncidentUpdate.create({
        data: {
          incidentId: incident.id,
          status: parsed.data.status,
          message: parsed.data.message.trim(),
          createdById: user.id,
        },
      });

      await syncPlatformStatusIncidentFromLatestUpdate(tx, incident.id, user.id);
      return update;
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_status_incident_update.created",
      entityType: "platformStatusIncidentUpdate",
      entityId: createdUpdate.id,
      summary: `${incident.title} için durum guncellemesi eklendi.`,
      metadata: {
        incidentId: incident.id,
        status: parsed.data.status,
      },
    });

    revalidatePath("/durum");
    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/durum-merkezi");

    return { success: true, message: "Incident guncellemesi eklendi.", id: incident.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function togglePlatformAnnouncementAction(
  input: TogglePlatformAnnouncementInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = togglePlatformAnnouncementSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Duyuru durumu dogrulanamadi.",
      };
    }

    const announcement = await prisma.platformAnnouncement.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, title: true },
    });

    if (!announcement) {
      return { success: false, message: "Duyuru kaydı bulunamadı." };
    }

    const updated = await prisma.platformAnnouncement.update({
      where: { id: announcement.id },
      data: {
        isActive: parsed.data.isActive,
        updatedById: user.id,
        publishedAt: new Date(),
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_announcement.toggled",
      entityType: "platformAnnouncement",
      entityId: updated.id,
      summary: `${updated.title} duyurusu ${updated.isActive ? "aktif" : "pasif"} hale getirildi.`,
      metadata: {
        isActive: updated.isActive,
        showAsPopup: updated.showAsPopup,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/duyurular");

    return {
      success: true,
      message: updated.isActive ? "Duyuru aktif edildi." : "Duyuru pasif hale getirildi.",
      id: updated.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deletePlatformStatusIncidentUpdateAction(
  input: DeletePlatformStatusIncidentUpdateInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = deletePlatformStatusIncidentUpdateSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Incident guncellemesi seçimi geçersiz.",
      };
    }

    const existingUpdate = await prisma.platformStatusIncidentUpdate.findUnique({
      where: { id: parsed.data.id },
      select: {
        id: true,
        incidentId: true,
        message: true,
        incident: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!existingUpdate) {
      return { success: false, message: "Incident guncellemesi bulunamadı." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.platformStatusIncidentUpdate.delete({
        where: { id: existingUpdate.id },
      });

      await syncPlatformStatusIncidentFromLatestUpdate(tx, existingUpdate.incidentId, user.id);
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_status_incident_update.deleted",
      entityType: "platformStatusIncidentUpdate",
      entityId: existingUpdate.id,
      summary: `${existingUpdate.incident.title} için durum guncellemesi silindi.`,
      metadata: {
        incidentId: existingUpdate.incident.id,
      },
    });

    revalidatePath("/durum");
    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/durum-merkezi");

    return { success: true, message: "Incident guncellemesi silindi.", id: existingUpdate.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deletePlatformStatusIncidentAction(
  input: DeletePlatformStatusIncidentInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = deletePlatformStatusIncidentSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Incident seçimi geçersiz.",
      };
    }

    const incident = await prisma.platformStatusIncident.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, title: true },
    });

    if (!incident) {
      return { success: false, message: "Incident kaydı bulunamadı." };
    }

    await prisma.platformStatusIncident.delete({
      where: { id: incident.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_status_incident.deleted",
      entityType: "platformStatusIncident",
      entityId: incident.id,
      summary: `${incident.title} incident kaydı silindi.`,
    });

    revalidatePath("/durum");
    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/durum-merkezi");

    return { success: true, message: "Incident silindi.", id: incident.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deletePlatformAnnouncementAction(
  input: DeletePlatformAnnouncementInput,
): Promise<ActionResult> {
  try {
    const user = await requireAdmin();
    const parsed = deletePlatformAnnouncementSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Duyuru seçimi geçersiz.",
      };
    }

    const announcement = await prisma.platformAnnouncement.findUnique({
      where: { id: parsed.data.id },
      select: { id: true, title: true },
    });

    if (!announcement) {
      return { success: false, message: "Duyuru kaydı bulunamadı." };
    }

    await prisma.platformAnnouncement.delete({
      where: { id: announcement.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "platform_announcement.deleted",
      entityType: "platformAnnouncement",
      entityId: announcement.id,
      summary: `${announcement.title} duyurusu silindi.`,
    });

    revalidatePath("/panel");
    revalidatePath("/panel/admin");
    revalidatePath("/panel/admin/duyurular");

    return {
      success: true,
      message: "Duyuru silindi.",
      id: announcement.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteIssuedPdfDocumentAction(input: {
  id: string;
}): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    
    if (!user.institutionId) {
      return { success: false, message: "Rapor silmek için bir kuruma bağlı olmalısınız." };
    }

    const record = await prisma.issuedPdfDocument.findFirst({
      where: {
        id: input.id,
        institutionId: user.institutionId,
      },
    });

    if (!record) {
      return { success: false, message: "Rapor arşiv kaydı bulunamadı." };
    }

    await prisma.issuedPdfDocument.delete({
      where: { id: record.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "issued_pdf_document.deleted",
      entityType: "issuedPdfDocument",
      entityId: record.id,
      summary: `${record.title} rapor arşivi silindi.`,
      metadata: {
        institutionId: record.institutionId,
        title: record.title,
        fileName: record.fileName,
      },
    });

    revalidatePath("/panel/raporlar");

    return {
      success: true,
      message: "Rapor arşivden silindi.",
      id: record.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteInstitutionInvoiceAction(
  input: DeleteInstitutionInvoiceInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = deleteInstitutionInvoiceSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Fatura silme isteği dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Fatura silmek için bir kuruma bağlı olmalisiniz." };
    }

    const invoice = await prisma.institutionInvoice.findFirst({
      where: {
        id: parsed.data.id,
        institutionId: user.institutionId,
      },
      select: {
        id: true,
        invoiceNumber: true,
        institutionId: true,
        status: true,
      },
    });

    if (!invoice) {
      return { success: false, message: "Fatura kaydı bulunamadı." };
    }

    await prisma.institutionInvoice.delete({
      where: { id: invoice.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_invoice.deleted",
      entityType: "institutionInvoice",
      entityId: invoice.id,
      summary: `${invoice.invoiceNumber} numaralı fatura kalıcı olarak silindi.`,
      metadata: {
        institutionId: invoice.institutionId,
        previousStatus: invoice.status,
      },
    });

    revalidatePath("/panel/kurum");
    revalidatePath("/panel/hak-edis");

    return {
      success: true,
      message: "Fatura kalıcı olarak silindi.",
      id: invoice.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveFinancialTariffAction(
  input: FinancialTariffInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = financialTariffSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Tarife formu dogrulanamadi.",
      };
    }
    if (!user.institutionId) {
      return { success: false, message: "Tarife kaydı için kuruma bağlı olmalisiniz." };
    }

    const startDate = parseDate(parsed.data.startDate);
    const endDate = parsed.data.endDate ? parseDate(parsed.data.endDate) : null;
    if (!startDate || (parsed.data.endDate && !endDate)) {
      return { success: false, message: "Tarife tarihleri geçersiz." };
    }
    if (endDate && endDate < startDate) {
      return { success: false, message: "Bitis tarihi başlangıç tarihinden once olamaz." };
    }

    const payload = {
      educationType: parsed.data.educationType,
      startDate,
      endDate,
      amount: parsed.data.amount,
      monthlyAmount: parsed.data.monthlyAmount ?? null,
      monthlyHours: parsed.data.monthlyHours ?? null,
      taxRate: parsed.data.taxRate,
      officialBasis: parsed.data.officialBasis.trim(),
      isActive: parsed.data.isActive,
    };

    const tariff = parsed.data.id
      ? await prisma.financialTariff.update({
          where: {
            id: (
              await prisma.financialTariff.findFirstOrThrow({
                where: { id: parsed.data.id, institutionId: user.institutionId },
                select: { id: true },
              })
            ).id,
          },
          data: payload,
        })
      : await prisma.financialTariff.create({
          data: {
            institutionId: user.institutionId,
            createdById: user.id,
            ...payload,
          },
        });

    await writeAuditLog({
      actorId: user.id,
      action: parsed.data.id ? "financial_tariff.updated" : "financial_tariff.created",
      entityType: "financialTariff",
      entityId: tariff.id,
      summary: `${tariff.educationType} tarifesi kaydedildi.`,
      metadata: { institutionId: tariff.institutionId, amount: Number(tariff.amount) },
    });

    revalidatePath("/panel/hak-edis");
    return { success: true, message: "Tarife kaydedildi.", id: tariff.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function deleteFinancialTariffAction(
  input: DeleteFinancialTariffInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = deleteFinancialTariffSchema.safeParse(input);
    if (!parsed.success || !user.institutionId) {
      return { success: false, message: "Tarife seçimi geçersiz." };
    }

    const tariff = await prisma.financialTariff.findFirst({
      where: { id: parsed.data.id, institutionId: user.institutionId },
      select: { id: true, institutionId: true, educationType: true },
    });
    if (!tariff) return { success: false, message: "Tarife bulunamadı." };

    await prisma.financialTariff.delete({ where: { id: tariff.id } });
    await writeAuditLog({
      actorId: user.id,
      action: "financial_tariff.deleted",
      entityType: "financialTariff",
      entityId: tariff.id,
      summary: `${tariff.educationType} tarifesi silindi.`,
      metadata: { institutionId: tariff.institutionId },
    });
    revalidatePath("/panel/hak-edis");
    return { success: true, message: "Tarife silindi.", id: tariff.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function calculateEntitlementClaimAction(
  input: CalculateEntitlementClaimInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = calculateEntitlementClaimSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Dönem geçersiz." };
    }
    if (!user.institutionId) {
      return { success: false, message: "Hak edis hesabi için kuruma bağlı olmalisiniz." };
    }

    const period = resolveInvoicePeriod(parsed.data.period);
    const [sessions, rams, tariffs] = await Promise.all([
      prisma.institutionSession.findMany({
        where: {
          institutionId: user.institutionId,
          deletedAt: null,
          status: "completed",
          sessionDate: { gte: period.start, lt: period.end },
          student: { OR: [{ classroom: null }, { classroom: { not: "Sistem" } }] },
        },
        select: {
          id: true,
          studentId: true,
          sessionDate: true,
          sessionType: true,
          attendanceVerified: true,
          attendanceVerificationReference: true,
          makeupReference: true,
          makeupEducationType: true,
        },
      }),
      prisma.institutionRamTracking.findMany({
        where: {
          institutionId: user.institutionId,
          studentId: { not: null },
          status: { in: ["active", "review_due"] },
          reportDate: { lt: period.end },
        },
        select: {
          id: true,
          studentId: true,
          reportDate: true,
          validUntil: true,
          weeklyIndividualHours: true,
          weeklyGroupHours: true,
          monthlyIndividualHours: true,
          monthlyGroupHours: true,
          monthlyMakeupHours: true,
        },
      }),
      prisma.financialTariff.findMany({
        where: {
          institutionId: user.institutionId,
          isActive: true,
          educationType: { in: ["individual", "group", "makeup"] },
          startDate: { lt: period.end },
          OR: [{ endDate: null }, { endDate: { gte: period.start } }],
        },
        select: {
          id: true,
          educationType: true,
          startDate: true,
          endDate: true,
          amount: true,
          taxRate: true,
          officialBasis: true,
        },
      }),
    ]);

    if (tariffs.length === 0) {
      return {
        success: false,
        message: "Bu dönem için yururlukte aktif tarife bulunmuyor.",
      };
    }

    const result = calculateEntitlementClaim({
      sessions: sessions.map((session) => ({
        ...session,
        makeupEducationType:
          session.makeupEducationType === "individual" || session.makeupEducationType === "group"
            ? session.makeupEducationType
            : null,
      })),
      rams: rams
        .filter((ram): ram is typeof ram & { studentId: string } => Boolean(ram.studentId))
        .map((ram) => ({ ...ram, studentId: ram.studentId })),
      tariffs: tariffs.map((tariff) => ({
        ...tariff,
        educationType: tariff.educationType as "individual" | "group" | "makeup",
        amount: Number(tariff.amount),
        taxRate: Number(tariff.taxRate),
      })),
    });

    const claim = await prisma.$transaction(async (tx) => {
      const saved = await tx.entitlementClaim.upsert({
        where: {
          institutionId_period: {
            institutionId: user.institutionId!,
            period: period.key,
          },
        },
        update: {
          periodStart: period.start,
          periodEnd: new Date(period.end.getTime() - 1),
          status: "preliminary",
          calculatedAmount: result.calculatedAmount,
          calculatedAt: new Date(),
          reconciledAt: null,
        },
        create: {
          institutionId: user.institutionId!,
          createdById: user.id,
          period: period.key,
          periodStart: period.start,
          periodEnd: new Date(period.end.getTime() - 1),
          calculatedAmount: result.calculatedAmount,
        },
      });

      await tx.entitlementClaimLine.deleteMany({ where: { claimId: saved.id } });
      if (result.lines.length) {
        await tx.entitlementClaimLine.createMany({
          data: result.lines.map((line) => ({
            claimId: saved.id,
            studentId: line.studentId,
            educationType: line.educationType,
            tariffId: line.tariffId,
            scheduledCount: line.scheduledCount,
            verifiedCount: line.verifiedCount,
            eligibleCount: line.eligibleCount,
            rejectedCount: line.rejectedCount,
            ramMonthlyLimit: line.ramMonthlyLimit,
            unitPrice: line.unitPrice,
            taxRate: line.taxRate,
            subtotal: line.subtotal,
            taxAmount: line.taxAmount,
            totalAmount: line.totalAmount,
            discrepancyReason: line.rejectionReasons.join(" ") || null,
          })),
        });
      }
      return saved;
    });

    await writeAuditLog({
      actorId: user.id,
      action: "entitlement_claim.calculated",
      entityType: "entitlementClaim",
      entityId: claim.id,
      summary: `${period.label} hak edisi hesaplandi.`,
      metadata: {
        institutionId: user.institutionId,
        calculatedAmount: result.calculatedAmount,
        exclusions: result.exclusions.length,
      },
    });
    revalidatePath("/panel/hak-edis");
    return {
      success: true,
      message: `${result.lines.length} hak edis satiri hesaplandi; ${result.exclusions.length} seans dislandi.`,
      id: claim.id,
    };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function updateEntitlementClaimStatusAction(
  input: UpdateEntitlementClaimStatusInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = updateEntitlementClaimStatusSchema.safeParse(input);
    if (!parsed.success || !user.institutionId) {
      return { success: false, message: "Hak edis durumu geçersiz." };
    }
    const existing = await prisma.entitlementClaim.findFirst({
      where: { id: parsed.data.id, institutionId: user.institutionId },
      select: { id: true },
    });
    if (!existing) return { success: false, message: "Hak edis kaydı bulunamadı." };

    const claim = await prisma.entitlementClaim.update({
      where: { id: existing.id },
      data: {
        status: parsed.data.status,
        reconciledAt: ["reconciled", "ready_to_invoice", "invoiced"].includes(parsed.data.status)
          ? new Date()
          : null,
      },
    });
    revalidatePath("/panel/hak-edis");
    return { success: true, message: "Hak edis durumu guncellendi.", id: claim.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function updateMebSubmissionStatusAction(
  input: UpdateMebSubmissionStatusInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = updateMebSubmissionStatusSchema.safeParse(input);
    if (!parsed.success || !user.institutionId) {
      return { success: false, message: "MEB gönderim durumu geçersiz." };
    }

    if (
      (parsed.data.mebSubmissionStatus === "rejected" ||
        parsed.data.mebSubmissionStatus === "missing_documents") &&
      !parsed.data.reason?.trim()
    ) {
      return {
        success: false,
        message:
          parsed.data.mebSubmissionStatus === "rejected"
            ? "Red nedeni belirtilmelidir."
            : "Eksik evrak nedeni belirtilmelidir.",
      };
    }

    const existing = await prisma.entitlementClaim.findFirst({
      where: { id: parsed.data.id, institutionId: user.institutionId },
      select: { id: true, period: true },
    });
    if (!existing) return { success: false, message: "Hak edis kaydı bulunamadı." };

    const now = new Date();
    const data: Prisma.EntitlementClaimUpdateInput = {
      mebSubmissionStatus: parsed.data.mebSubmissionStatus,
    };

    if (parsed.data.mebSubmissionStatus === "submitted") {
      data.mebSubmittedAt = now;
    } else if (parsed.data.mebSubmissionStatus === "approved") {
      data.mebApprovedAt = now;
    } else if (parsed.data.mebSubmissionStatus === "rejected") {
      data.mebRejectedAt = now;
      data.mebRejectionReason = parsed.data.reason?.trim() || null;
    } else if (parsed.data.mebSubmissionStatus === "missing_documents") {
      data.missingDocumentReason = parsed.data.reason?.trim() || null;
    } else if (parsed.data.mebSubmissionStatus === "resubmitted") {
      data.mebResubmittedAt = now;
    }

    const claim = await prisma.entitlementClaim.update({
      where: { id: existing.id },
      data,
    });

    await writeAuditLog({
      actorId: user.id,
      action: "entitlement_claim.meb_submission_updated",
      entityType: "entitlementClaim",
      entityId: claim.id,
      summary: `${existing.period} hak edisi için MEB gönderim durumu guncellendi.`,
      metadata: {
        institutionId: user.institutionId,
        mebSubmissionStatus: parsed.data.mebSubmissionStatus,
      },
    });

    revalidatePath("/panel/hak-edis");
    return { success: true, message: "MEB gönderim durumu guncellendi.", id: claim.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

async function syncInvoicePaymentStatus(invoiceId: string) {
  const invoice = await prisma.institutionInvoice.findUnique({
    where: { id: invoiceId },
    include: {
      items: { select: { quantity: true, unitPrice: true, taxRate: true } },
      payments: { select: { amount: true, kind: true } },
    },
  });
  if (!invoice) return;

  const total = invoice.items.length
    ? invoice.items.reduce((sum, item) => {
        const subtotal = Number(item.quantity) * Number(item.unitPrice);
        return sum + subtotal + subtotal * (Number(item.taxRate) / 100);
      }, 0)
    : Number(invoice.quantity) *
      Number(invoice.unitPrice) *
      (1 + Number(invoice.taxRate) / 100);
  const paymentState = calculateInvoicePaymentState({
    invoiceTotal: total,
    payments: invoice.payments.map((payment) => ({
      amount: Number(payment.amount),
      kind: payment.kind as "collection" | "refund",
    })),
  });
  const nextStatus =
    paymentState.state === "paid"
      ? "paid"
      : paymentState.state === "refunded"
        ? "refunded"
        : invoice.status === "paid" || invoice.status === "refunded"
          ? "issued"
          : invoice.status;
  await prisma.institutionInvoice.update({
    where: { id: invoice.id },
    data: { status: nextStatus },
  });
}

export async function saveInstitutionInvoicePaymentAction(
  input: InstitutionInvoicePaymentInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = institutionInvoicePaymentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, message: parsed.error.issues[0]?.message ?? "Ödeme dogrulanamadi." };
    }
    if (!user.institutionId) {
      return { success: false, message: "Ödeme kaydı için kuruma bağlı olmalisiniz." };
    }
    const invoice = await prisma.institutionInvoice.findFirst({
      where: { id: parsed.data.invoiceId, institutionId: user.institutionId },
      select: { id: true, invoiceNumber: true, status: true },
    });
    const paymentDate = parseDate(parsed.data.paymentDate);
    if (!invoice || !paymentDate) {
      return { success: false, message: "Fatura veya ödeme tarihi geçersiz." };
    }
    if (invoice.status === "draft" || invoice.status === "cancelled") {
      return { success: false, message: "Taslak veya iptal faturaya ödeme hareketi eklenemez." };
    }

    const payment = await prisma.institutionInvoicePayment.create({
      data: {
        institutionId: user.institutionId,
        invoiceId: invoice.id,
        createdById: user.id,
        paymentDate,
        amount: parsed.data.amount,
        method: parsed.data.method,
        kind: parsed.data.kind,
        reference: parsed.data.reference?.trim() || null,
        notes: parsed.data.notes?.trim() || null,
      },
    });
    await syncInvoicePaymentStatus(invoice.id);
    await writeAuditLog({
      actorId: user.id,
      action: "institution_invoice_payment.created",
      entityType: "institutionInvoicePayment",
      entityId: payment.id,
      summary: `${invoice.invoiceNumber} için ödeme hareketi eklendi.`,
      metadata: { institutionId: user.institutionId, kind: payment.kind, amount: Number(payment.amount) },
    });
    revalidatePath("/panel/finans");
    revalidatePath("/panel/hak-edis");
    return { success: true, message: "Ödeme hareketi kaydedildi.", id: payment.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function deleteInstitutionInvoicePaymentAction(
  input: DeleteInstitutionInvoicePaymentInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = deleteInstitutionInvoicePaymentSchema.safeParse(input);
    if (!parsed.success || !user.institutionId) {
      return { success: false, message: "Ödeme kaydı seçimi geçersiz." };
    }
    const payment = await prisma.institutionInvoicePayment.findFirst({
      where: { id: parsed.data.id, institutionId: user.institutionId },
      select: { id: true, invoiceId: true },
    });
    if (!payment) return { success: false, message: "Ödeme kaydı bulunamadı." };
    await prisma.institutionInvoicePayment.delete({ where: { id: payment.id } });
    await syncInvoicePaymentStatus(payment.invoiceId);
    revalidatePath("/panel/finans");
    revalidatePath("/panel/hak-edis");
    return { success: true, message: "Ödeme hareketi silindi.", id: payment.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function saveStaffExpenseAction(input: StaffExpenseInput): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = staffExpenseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Gider formu dogrulanamadi.",
      };
    }
    if (!user.institutionId) {
      return { success: false, message: "Gider kaydı için bir kuruma bağlı olmalisiniz." };
    }

    let staffName = parsed.data.staffName?.trim() ?? "";
    let staffRole = parsed.data.staffRole?.trim() || null;

    if (parsed.data.staffUserId) {
      const staffUser = await prisma.user.findFirst({
        where: { id: parsed.data.staffUserId, institutionId: user.institutionId },
        select: { name: true, branch: true },
      });
      if (!staffUser) {
        return { success: false, message: "Secilen personel bulunamadı." };
      }
      staffName = staffUser.name;
      staffRole = staffRole || staffUser.branch;
    }

    const paymentDate = parsed.data.paymentDate ? parseDate(parsed.data.paymentDate) : null;
    const payload = {
      staffUserId: parsed.data.staffUserId || null,
      staffName,
      staffRole,
      category: parsed.data.category,
      status: parsed.data.status,
      period: parsed.data.period,
      amount: parsed.data.amount,
      paymentDate,
      paymentMethod: parsed.data.paymentMethod ?? null,
      notes: parsed.data.notes?.trim() || null,
    };

    if (parsed.data.id) {
      const existing = await prisma.staffExpense.findFirst({
        where: { id: parsed.data.id, institutionId: user.institutionId },
        select: { id: true },
      });
      if (!existing) {
        return { success: false, message: "Gider kaydı bulunamadı." };
      }

      const expense = await prisma.staffExpense.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "staff_expense.updated",
        entityType: "staffExpense",
        entityId: expense.id,
        summary: `${expense.staffName} için gider kaydı guncellendi.`,
        metadata: { institutionId: user.institutionId, category: expense.category, period: expense.period },
      });

      revalidatePath("/panel/finans/giderler");
      revalidatePath("/panel/finans/raporlar");
      return { success: true, message: "Gider kaydı guncellendi.", id: expense.id };
    }

    const expense = await prisma.staffExpense.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "staff_expense.created",
      entityType: "staffExpense",
      entityId: expense.id,
      summary: `${expense.staffName} için yeni gider kaydı olusturuldu.`,
      metadata: { institutionId: user.institutionId, category: expense.category, period: expense.period },
    });

    revalidatePath("/panel/finans/giderler");
    revalidatePath("/panel/finans/raporlar");
    return { success: true, message: "Gider kaydı olusturuldu.", id: expense.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function deleteStaffExpenseAction(input: DeleteStaffExpenseInput): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = deleteStaffExpenseSchema.safeParse(input);
    if (!parsed.success || !user.institutionId) {
      return { success: false, message: "Gider kaydı seçimi geçersiz." };
    }
    const expense = await prisma.staffExpense.findFirst({
      where: { id: parsed.data.id, institutionId: user.institutionId },
      select: { id: true, staffName: true },
    });
    if (!expense) return { success: false, message: "Gider kaydı bulunamadı." };

    await prisma.staffExpense.delete({ where: { id: expense.id } });

    await writeAuditLog({
      actorId: user.id,
      action: "staff_expense.deleted",
      entityType: "staffExpense",
      entityId: expense.id,
      summary: `${expense.staffName} için gider kaydı silindi.`,
      metadata: { institutionId: user.institutionId },
    });

    revalidatePath("/panel/finans/giderler");
    revalidatePath("/panel/finans/raporlar");
    return { success: true, message: "Gider kaydı silindi.", id: expense.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function saveGeneralExpenseAction(input: GeneralExpenseInput): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = generalExpenseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Gider formu dogrulanamadi.",
      };
    }
    if (!user.institutionId) {
      return { success: false, message: "Gider kaydı için bir kuruma bağlı olmalisiniz." };
    }

    const receipt = decodeUploadedStudentFile(parsed.data.uploadedBase64, {
      fileName: parsed.data.uploadedFileName,
      mimeType: parsed.data.uploadedMimeType,
    });
    if (receipt && "error" in receipt) {
      return { success: false, message: receipt.error ?? "Dosya okunamadi." };
    }

    const paymentDate = parsed.data.paymentDate ? parseDate(parsed.data.paymentDate) : null;
    const payload = {
      title: parsed.data.title.trim(),
      vendorName: parsed.data.vendorName?.trim() || null,
      category: parsed.data.category,
      status: parsed.data.status,
      period: parsed.data.period,
      amount: parsed.data.amount,
      paymentDate,
      paymentMethod: parsed.data.paymentMethod ?? null,
      notes: parsed.data.notes?.trim() || null,
      ocrRawText: parsed.data.ocrRawText?.trim() || null,
      ...(receipt
        ? {
            receiptFileName: receipt.fileName,
            receiptMimeType: receipt.mimeType,
            receiptData: toPrismaBytes(receipt.buffer),
          }
        : parsed.data.removeReceipt
          ? { receiptFileName: null, receiptMimeType: null, receiptData: null }
          : {}),
    };

    if (parsed.data.id) {
      const existing = await prisma.generalExpense.findFirst({
        where: { id: parsed.data.id, institutionId: user.institutionId },
        select: { id: true },
      });
      if (!existing) {
        return { success: false, message: "Gider kaydı bulunamadı." };
      }

      const expense = await prisma.generalExpense.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "general_expense.updated",
        entityType: "generalExpense",
        entityId: expense.id,
        summary: `${expense.title} için genel gider kaydı guncellendi.`,
        metadata: { institutionId: user.institutionId, category: expense.category, period: expense.period },
      });

      revalidatePath("/panel/finans/genel-giderler");
      revalidatePath("/panel/finans/raporlar");
      return { success: true, message: "Gider kaydı guncellendi.", id: expense.id };
    }

    const expense = await prisma.generalExpense.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "general_expense.created",
      entityType: "generalExpense",
      entityId: expense.id,
      summary: `${expense.title} için yeni genel gider kaydı olusturuldu.`,
      metadata: { institutionId: user.institutionId, category: expense.category, period: expense.period },
    });

    revalidatePath("/panel/finans/genel-giderler");
    revalidatePath("/panel/finans/raporlar");
    return { success: true, message: "Gider kaydı olusturuldu.", id: expense.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function deleteGeneralExpenseAction(input: DeleteGeneralExpenseInput): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = deleteGeneralExpenseSchema.safeParse(input);
    if (!parsed.success || !user.institutionId) {
      return { success: false, message: "Gider kaydı seçimi geçersiz." };
    }
    const expense = await prisma.generalExpense.findFirst({
      where: { id: parsed.data.id, institutionId: user.institutionId },
      select: { id: true, title: true },
    });
    if (!expense) return { success: false, message: "Gider kaydı bulunamadı." };

    await prisma.generalExpense.delete({ where: { id: expense.id } });

    await writeAuditLog({
      actorId: user.id,
      action: "general_expense.deleted",
      entityType: "generalExpense",
      entityId: expense.id,
      summary: `${expense.title} için genel gider kaydı silindi.`,
      metadata: { institutionId: user.institutionId },
    });

    revalidatePath("/panel/finans/genel-giderler");
    revalidatePath("/panel/finans/raporlar");
    return { success: true, message: "Gider kaydı silindi.", id: expense.id };
  } catch (error) {
    return { success: false, message: getReadableDbError(error) };
  }
}

export async function saveInstitutionRamTrackingAction(
  input: InstitutionRamTrackingInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = institutionRamTrackingSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "RAM kaydı dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "RAM takibi için kuruma bağlı olmalisiniz." };
    }

    const reportDate = parseDate(parsed.data.reportDate);
    if (!reportDate) {
      return { success: false, message: "Rapor tarihi geçersiz." };
    }

    const validUntil = parsed.data.validUntil ? parseDate(parsed.data.validUntil) : null;
    const reviewDate = parsed.data.reviewDate ? parseDate(parsed.data.reviewDate) : null;
    if (parsed.data.validUntil && !validUntil) {
      return { success: false, message: "Geçerlilik tarihi geçersiz." };
    }
    if (parsed.data.reviewDate && !reviewDate) {
      return { success: false, message: "Takip tarihi geçersiz." };
    }

    const studentId = parsed.data.studentId?.trim() || null;
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          institutionId: user.institutionId,
        },
        select: { id: true },
      });

      if (!student) {
        return { success: false, message: "Öğrenci bu kurumda bulunamadı." };
      }
    }

    const payload = {
      studentId,
      title: parsed.data.title.trim(),
      reportNumber: parsed.data.reportNumber?.trim() || null,
      supportCategory: parsed.data.supportCategory?.trim() || null,
      reportDate,
      validUntil,
      weeklyIndividualHours: parsed.data.weeklyIndividualHours,
      weeklyGroupHours: parsed.data.weeklyGroupHours,
      monthlyIndividualHours: parsed.data.monthlyIndividualHours ?? null,
      monthlyGroupHours: parsed.data.monthlyGroupHours ?? null,
      monthlyMakeupHours: parsed.data.monthlyMakeupHours,
      reviewDate,
      notes: parsed.data.notes?.trim() || null,
      status: parsed.data.status,
    };

    if (parsed.data.id) {
      const existing = await prisma.institutionRamTracking.findFirst({
        where: {
          id: parsed.data.id,
          institutionId: user.institutionId,
        },
        select: { id: true, institutionId: true },
      });

      if (!existing) {
        return { success: false, message: "RAM kaydı bulunamadı." };
      }

      const record = await prisma.institutionRamTracking.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "institution_ram_tracking.updated",
        entityType: "institutionRamTracking",
        entityId: record.id,
        summary: `${record.title} RAM kaydı guncellendi.`,
        metadata: {
          institutionId: record.institutionId,
          studentId: record.studentId,
        },
      });

      revalidatePath("/panel/ram-takip");
      revalidatePath("/panel/kurum");
      return { success: true, message: "RAM kaydı guncellendi.", id: record.id };
    }

    const record = await prisma.institutionRamTracking.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_ram_tracking.created",
      entityType: "institutionRamTracking",
      entityId: record.id,
      summary: `${record.title} RAM kaydı eklendi.`,
      metadata: {
        institutionId: record.institutionId,
        studentId: record.studentId,
      },
    });

    revalidatePath("/panel/ram-takip");
    revalidatePath("/panel/kurum");
    return { success: true, message: "RAM kaydı eklendi.", id: record.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteInstitutionRamTrackingAction(
  input: DeleteInstitutionRamTrackingInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = deleteInstitutionRamTrackingSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "RAM kaydı seçimi geçersiz.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "RAM kaydı silmek için kuruma bağlı olmalisiniz." };
    }

    const record = await prisma.institutionRamTracking.findFirst({
      where: {
        id: parsed.data.id,
        institutionId: user.institutionId,
      },
      select: {
        id: true,
        title: true,
        institutionId: true,
      },
    });

    if (!record) {
      return { success: false, message: "RAM kaydı bulunamadı." };
    }

    await prisma.institutionRamTracking.delete({
      where: { id: record.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_ram_tracking.deleted",
      entityType: "institutionRamTracking",
      entityId: record.id,
      summary: `${record.title} RAM kaydı silindi.`,
      metadata: {
        institutionId: record.institutionId,
      },
    });

    revalidatePath("/panel/ram-takip");
    revalidatePath("/panel/kurum");
    return { success: true, message: "RAM kaydı silindi.", id: record.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveInstitutionTransportPlanAction(
  input: InstitutionTransportPlanInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = institutionTransportPlanSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Plan bilgisi dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Plan kaydı için kuruma bağlı olmalisiniz." };
    }

    const reviewDate = parsed.data.reviewDate ? parseDate(parsed.data.reviewDate) : null;
    if (parsed.data.reviewDate && !reviewDate) {
      return { success: false, message: "Takip tarihi geçersiz." };
    }

    const studentId = parsed.data.studentId?.trim() || null;
    if (studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: studentId,
          institutionId: user.institutionId,
        },
        select: { id: true },
      });

      if (!student) {
        return { success: false, message: "Öğrenci bu kurumda bulunamadı." };
      }
    }

    const payload = {
      studentId,
      title: parsed.data.title.trim(),
      serviceType: parsed.data.serviceType.trim(),
      routeName: parsed.data.routeName?.trim() || null,
      pickupAddress: parsed.data.pickupAddress?.trim() || null,
      dropoffAddress: parsed.data.dropoffAddress?.trim() || null,
      daysLabel: parsed.data.daysLabel?.trim() || null,
      timeLabel: parsed.data.timeLabel?.trim() || null,
      vehicleLabel: parsed.data.vehicleLabel?.trim() || null,
      companionName: parsed.data.companionName?.trim() || null,
      companionPhone: parsed.data.companionPhone?.trim() || null,
      reviewDate,
      notes: parsed.data.notes?.trim() || null,
      status: parsed.data.status,
    };

    if (parsed.data.id) {
      const existing = await prisma.institutionTransportPlan.findFirst({
        where: {
          id: parsed.data.id,
          institutionId: user.institutionId,
        },
        select: { id: true, institutionId: true },
      });

      if (!existing) {
        return { success: false, message: "Plan kaydı bulunamadı." };
      }

      const record = await prisma.institutionTransportPlan.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "institution_transport_plan.updated",
        entityType: "institutionTransportPlan",
        entityId: record.id,
        summary: `${record.title} taşıma plani guncellendi.`,
        metadata: {
          institutionId: record.institutionId,
          studentId: record.studentId,
        },
      });

      revalidatePath("/panel/tasima-servis");
      revalidatePath("/panel/kurum");
      return { success: true, message: "Plan guncellendi.", id: record.id };
    }

    const record = await prisma.institutionTransportPlan.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_transport_plan.created",
      entityType: "institutionTransportPlan",
      entityId: record.id,
      summary: `${record.title} taşıma plani eklendi.`,
      metadata: {
        institutionId: record.institutionId,
        studentId: record.studentId,
      },
    });

    revalidatePath("/panel/tasima-servis");
    revalidatePath("/panel/kurum");
    return { success: true, message: "Plan eklendi.", id: record.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteInstitutionTransportPlanAction(
  input: DeleteInstitutionTransportPlanInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = deleteInstitutionTransportPlanSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Plan seçimi geçersiz.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Plan silmek için kuruma bağlı olmalisiniz." };
    }

    const record = await prisma.institutionTransportPlan.findFirst({
      where: {
        id: parsed.data.id,
        institutionId: user.institutionId,
      },
      select: {
        id: true,
        title: true,
        institutionId: true,
      },
    });

    if (!record) {
      return { success: false, message: "Plan kaydı bulunamadı." };
    }

    await prisma.institutionTransportPlan.delete({
      where: { id: record.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_transport_plan.deleted",
      entityType: "institutionTransportPlan",
      entityId: record.id,
      summary: `${record.title} taşıma plani silindi.`,
      metadata: {
        institutionId: record.institutionId,
      },
    });

    revalidatePath("/panel/tasima-servis");
    revalidatePath("/panel/kurum");
    return { success: true, message: "Plan silindi.", id: record.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveFamilyEducationPlanAction(
  input: FamilyEducationPlanInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canAccessFamilyEducation(user.role)) {
      return { success: false, message: "Bu modulu kullanamazsiniz." };
    }

    const parsed = familyEducationPlanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Aile eğitimi plani dogrulanamadi.",
      };
    }

    const student = await prisma.student.findFirst({
      where: {
        id: parsed.data.studentId,
        ...getStudentAccessWhere(user),
      },
      select: {
        id: true,
        institutionId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    const sharedAt = parsed.data.sharedAt ? parseDate(parsed.data.sharedAt) : null;
    const dueDate = parsed.data.dueDate ? parseDate(parsed.data.dueDate) : null;
    const followUpDate = parsed.data.followUpDate ? parseDate(parsed.data.followUpDate) : null;

    if (parsed.data.sharedAt && !sharedAt) {
      return { success: false, message: "Paylasim tarihi geçersiz." };
    }
    if (parsed.data.dueDate && !dueDate) {
      return { success: false, message: "Uygulama tarihi geçersiz." };
    }
    if (parsed.data.followUpDate && !followUpDate) {
      return { success: false, message: "Takip tarihi geçersiz." };
    }

    const payload = {
      studentId: student.id,
      institutionId: student.institutionId ?? user.institutionId ?? null,
      title: parsed.data.title.trim(),
      cadence: parsed.data.cadence,
      weeklyFocus: parsed.data.weeklyFocus?.trim() || null,
      homeActivity: parsed.data.homeActivity?.trim() || null,
      familySuggestion: parsed.data.familySuggestion?.trim() || null,
      deliveryMethod: parsed.data.deliveryMethod?.trim() || null,
      sharedAt,
      dueDate,
      followUpDate,
      status: parsed.data.status,
      implementationNote: parsed.data.implementationNote?.trim() || null,
      familyFeedback: parsed.data.familyFeedback?.trim() || null,
      teacherNote: parsed.data.teacherNote?.trim() || null,
    };

    if (parsed.data.id) {
      const existing = await prisma.familyEducationPlan.findFirst({
        where: {
          id: parsed.data.id,
          student: getStudentAccessWhere(user),
        },
        select: {
          id: true,
          institutionId: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Aile eğitimi plani bulunamadı." };
      }

      const plan = await prisma.familyEducationPlan.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "family_education_plan.updated",
        entityType: "familyEducationPlan",
        entityId: plan.id,
        summary: `${plan.title} aile eğitimi plani guncellendi.`,
        metadata: {
          institutionId: plan.institutionId,
          studentId: plan.studentId,
          status: plan.status,
        },
      });

      revalidatePath("/panel/aile-egitimi");
      revalidatePath("/panel/gorev-merkezi");
      revalidatePath("/panel/cocuklarim");
      return { success: true, message: "Aile eğitimi plani guncellendi.", id: plan.id };
    }

    const plan = await prisma.familyEducationPlan.create({
      data: {
        createdById: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "family_education_plan.created",
      entityType: "familyEducationPlan",
      entityId: plan.id,
      summary: `${plan.title} aile eğitimi plani eklendi.`,
      metadata: {
        institutionId: plan.institutionId,
        studentId: plan.studentId,
        status: plan.status,
      },
    });

    revalidatePath("/panel/aile-egitimi");
    revalidatePath("/panel/gorev-merkezi");
    revalidatePath("/panel/cocuklarim");
    return { success: true, message: "Aile eğitimi plani eklendi.", id: plan.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteFamilyEducationPlanAction(
  input: DeleteFamilyEducationPlanInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canAccessFamilyEducation(user.role)) {
      return { success: false, message: "Bu modulu kullanamazsiniz." };
    }

    const parsed = deleteFamilyEducationPlanSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Plan seçimi geçersiz.",
      };
    }

    const plan = await prisma.familyEducationPlan.findFirst({
      where: {
        id: parsed.data.id,
        student: getStudentAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        institutionId: true,
      },
    });

    if (!plan) {
      return { success: false, message: "Aile eğitimi plani bulunamadı." };
    }

    await prisma.familyEducationPlan.delete({
      where: { id: plan.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "family_education_plan.deleted",
      entityType: "familyEducationPlan",
      entityId: plan.id,
      summary: `${plan.title} aile eğitimi plani silindi.`,
      metadata: {
        institutionId: plan.institutionId,
      },
    });

    revalidatePath("/panel/aile-egitimi");
    revalidatePath("/panel/gorev-merkezi");
    revalidatePath("/panel/cocuklarim");
    return { success: true, message: "Aile eğitimi plani silindi.", id: plan.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveFamilyEducationNoteAction(
  input: FamilyEducationNoteInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canAccessFamilyEducation(user.role)) {
      return { success: false, message: "Bu modulu kullanamazsiniz." };
    }

    const parsed = familyEducationNoteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Plan notu dogrulanamadi.",
      };
    }

    const plan = await prisma.familyEducationPlan.findFirst({
      where: {
        id: parsed.data.planId,
        student: getStudentAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        institutionId: true,
        studentId: true,
      },
    });

    if (!plan) {
      return { success: false, message: "Bağlı aile eğitimi plani bulunamadı." };
    }

    const note = await prisma.familyEducationNote.create({
      data: {
        planId: plan.id,
        createdById: user.id,
        noteType: parsed.data.noteType,
        title: parsed.data.title?.trim() || null,
        content: parsed.data.content.trim(),
        nextStep: parsed.data.nextStep?.trim() || null,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "family_education_note.created",
      entityType: "familyEducationNote",
      entityId: note.id,
      summary: `${plan.title} plani için yeni takip notu eklendi.`,
      metadata: {
        institutionId: plan.institutionId,
        studentId: plan.studentId,
        planId: plan.id,
        noteType: note.noteType,
      },
    });

    revalidatePath("/panel/aile-egitimi");
    revalidatePath("/panel/gorev-merkezi");
    return { success: true, message: "Takip notu eklendi.", id: note.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteFamilyEducationNoteAction(
  input: DeleteFamilyEducationNoteInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!canAccessFamilyEducation(user.role)) {
      return { success: false, message: "Bu modulu kullanamazsiniz." };
    }

    const parsed = deleteFamilyEducationNoteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Not seçimi geçersiz.",
      };
    }

    const note = await prisma.familyEducationNote.findFirst({
      where: {
        id: parsed.data.id,
        plan: {
          student: getStudentAccessWhere(user),
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            title: true,
            institutionId: true,
            studentId: true,
          },
        },
      },
    });

    if (!note) {
      return { success: false, message: "Takip notu bulunamadı." };
    }

    await prisma.familyEducationNote.delete({
      where: { id: note.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "family_education_note.deleted",
      entityType: "familyEducationNote",
      entityId: note.id,
      summary: `${note.plan.title} planindaki takip notu silindi.`,
      metadata: {
        institutionId: note.plan.institutionId,
        studentId: note.plan.studentId,
        planId: note.plan.id,
      },
    });

    revalidatePath("/panel/aile-egitimi");
    revalidatePath("/panel/gorev-merkezi");
    return { success: true, message: "Takip notu silindi.", id: note.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveFamilyEducationResponseAction(
  input: FamilyEducationResponseInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!isParentRole(user.role)) {
      return { success: false, message: "Bu islem yalnızca veli hesaplari icindir." };
    }

    const parsed = familyEducationResponseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Yanit dogrulanamadi.",
      };
    }

    // Velinin yalnizca kendi cocuguna ait, ogretmen tarafindan paylasilan
    // yonlendirmeye yanit ekleyebildigini dogrula (IDOR korumasi).
    const plan = await prisma.familyEducationPlan.findFirst({
      where: {
        id: parsed.data.planId,
        ...getFamilyEducationPlanAccessWhere(user),
      },
      select: { id: true, title: true, studentId: true, institutionId: true },
    });

    if (!plan) {
      return { success: false, message: "Yonlendirme bulunamadı." };
    }

    const upload = decodeUploadedStudentFile(parsed.data.uploadedBase64, {
      fileName: parsed.data.uploadedFileName,
      mimeType: parsed.data.uploadedMimeType,
    });

    if (upload && "error" in upload) {
      return { success: false, message: upload.error ?? "Görsel okunamadı." };
    }

    const content = parsed.data.content?.trim() || null;

    const imagePayload = upload
      ? {
          imageData: toPrismaBytes(upload.buffer),
          imageMimeType: upload.mimeType,
          imageName: upload.fileName,
        }
      : {};

    if (parsed.data.id) {
      const existing = await prisma.familyEducationResponse.findFirst({
        where: { id: parsed.data.id, createdById: user.id, planId: plan.id },
        select: { id: true },
      });

      if (!existing) {
        return { success: false, message: "Duzenlenecek yanit bulunamadı." };
      }

      const response = await prisma.familyEducationResponse.update({
        where: { id: existing.id },
        data: {
          status: parsed.data.status,
          content,
          ...imagePayload,
        },
        select: { id: true },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "family_education_response.updated",
        entityType: "familyEducationResponse",
        entityId: response.id,
        summary: `${plan.title} yonlendirmesine veli yaniti guncellendi.`,
        metadata: { planId: plan.id, studentId: plan.studentId },
      });

      revalidatePath("/panel/aile-egitimi");
      revalidatePath("/panel/cocuklarim");
      return { success: true, message: "Yanitiniz guncellendi.", id: response.id };
    }

    const response = await prisma.familyEducationResponse.create({
      data: {
        planId: plan.id,
        createdById: user.id,
        status: parsed.data.status,
        content,
        ...imagePayload,
      },
      select: { id: true },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "family_education_response.created",
      entityType: "familyEducationResponse",
      entityId: response.id,
      summary: `${plan.title} yonlendirmesine veli yaniti eklendi.`,
      metadata: { planId: plan.id, studentId: plan.studentId },
    });

    revalidatePath("/panel/aile-egitimi");
    revalidatePath("/panel/cocuklarim");
    return { success: true, message: "Yanitiniz kaydedildi.", id: response.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteFamilyEducationResponseAction(
  input: DeleteFamilyEducationResponseInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (!isParentRole(user.role)) {
      return { success: false, message: "Bu islem yalnızca veli hesaplari icindir." };
    }

    const parsed = deleteFamilyEducationResponseSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Yanit seçimi geçersiz.",
      };
    }

    const existing = await prisma.familyEducationResponse.findFirst({
      where: { id: parsed.data.id, createdById: user.id },
      select: { id: true, planId: true },
    });

    if (!existing) {
      return { success: false, message: "Silinecek yanit bulunamadı." };
    }

    await prisma.familyEducationResponse.delete({ where: { id: existing.id } });

    await writeAuditLog({
      actorId: user.id,
      action: "family_education_response.deleted",
      entityType: "familyEducationResponse",
      entityId: existing.id,
      summary: "Veli yaniti silindi.",
      metadata: { planId: existing.planId },
    });

    revalidatePath("/panel/aile-egitimi");
    revalidatePath("/panel/cocuklarim");
    return { success: true, message: "Yanitiniz silindi.", id: existing.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveInstitutionArchiveRecordAction(
  input: InstitutionArchiveRecordInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = institutionArchiveRecordSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Evrak bilgisi dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Evrak arşivi için kuruma bağlı olmalisiniz." };
    }

    const issuedAt = parsed.data.issuedAt ? parseDate(parsed.data.issuedAt) : null;
    const reviewDate = parsed.data.reviewDate ? parseDate(parsed.data.reviewDate) : null;
    if (parsed.data.issuedAt && !issuedAt) {
      return { success: false, message: "Belge tarihi geçersiz." };
    }
    if (parsed.data.reviewDate && !reviewDate) {
      return { success: false, message: "Gozden gecirme tarihi geçersiz." };
    }

    const uploadedFile = decodeUploadedStudentFile(parsed.data.uploadedBase64, {
      fileName: parsed.data.uploadedFileName || parsed.data.fileName,
      mimeType: parsed.data.uploadedMimeType,
    });
    if (uploadedFile && "error" in uploadedFile) {
      return { success: false, message: uploadedFile.error ?? "Dosya okunamadi." };
    }

    const payload = {
      title: parsed.data.title.trim(),
      section: parsed.data.section,
      category: parsed.data.category.trim(),
      documentNumber: parsed.data.documentNumber?.trim() || null,
      responsibleUnit: parsed.data.responsibleUnit?.trim() || null,
      issuedAt,
      reviewDate,
      fileUrl: parsed.data.fileUrl?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
    };

    if (parsed.data.id) {
      const existing = await prisma.institutionArchiveRecord.findFirst({
        where: {
          id: parsed.data.id,
          institutionId: user.institutionId,
        },
        select: {
          id: true,
          institutionId: true,
          fileName: true,
          fileData: true,
          mimeType: true,
          fileSize: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Evrak kaydı bulunamadı." };
      }

      const record = await prisma.institutionArchiveRecord.update({
        where: { id: existing.id },
        data: {
          ...payload,
          fileName: uploadedFile ? uploadedFile.fileName : existing.fileName,
          fileData: uploadedFile ? toPrismaBytes(uploadedFile.buffer) : existing.fileData,
          mimeType: uploadedFile ? uploadedFile.mimeType : existing.mimeType,
          fileSize: uploadedFile ? uploadedFile.size : existing.fileSize,
        },
      });

      await writeAuditLog({
        actorId: user.id,
        action: "institution_archive_record.updated",
        entityType: "institutionArchiveRecord",
        entityId: record.id,
        summary: `${record.title} evrak kaydı guncellendi.`,
        metadata: {
          institutionId: record.institutionId,
          section: record.section,
        },
      });

      revalidatePath("/panel/kurum-evrak-arsivi");
      revalidatePath("/panel/kurum");
      return { success: true, message: "Evrak kaydı guncellendi.", id: record.id };
    }

    const record = await prisma.institutionArchiveRecord.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        ...payload,
        fileName: uploadedFile ? uploadedFile.fileName : parsed.data.fileName?.trim() || null,
        fileData: uploadedFile ? toPrismaBytes(uploadedFile.buffer) : null,
        mimeType: uploadedFile ? uploadedFile.mimeType : null,
        fileSize: uploadedFile ? uploadedFile.size : null,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_archive_record.created",
      entityType: "institutionArchiveRecord",
      entityId: record.id,
      summary: `${record.title} evrak kaydı eklendi.`,
      metadata: {
        institutionId: record.institutionId,
        section: record.section,
      },
    });

    revalidatePath("/panel/kurum-evrak-arsivi");
    revalidatePath("/panel/kurum");
    return { success: true, message: "Evrak kaydı eklendi.", id: record.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteInstitutionArchiveRecordAction(
  input: DeleteInstitutionArchiveRecordInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const parsed = deleteInstitutionArchiveRecordSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Evrak seçimi geçersiz.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Evrak silmek için kuruma bağlı olmalisiniz." };
    }

    const record = await prisma.institutionArchiveRecord.findFirst({
      where: {
        id: parsed.data.id,
        institutionId: user.institutionId,
      },
      select: {
        id: true,
        title: true,
        institutionId: true,
      },
    });

    if (!record) {
      return { success: false, message: "Evrak kaydı bulunamadı." };
    }

    await prisma.institutionArchiveRecord.delete({
      where: { id: record.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "institution_archive_record.deleted",
      entityType: "institutionArchiveRecord",
      entityId: record.id,
      summary: `${record.title} evrak kaydı silindi.`,
      metadata: {
        institutionId: record.institutionId,
      },
    });

    revalidatePath("/panel/kurum-evrak-arsivi");
    revalidatePath("/panel/kurum");
    return { success: true, message: "Evrak kaydı silindi.", id: record.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveSessionRoomAction(input: SessionRoomInput): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = sessionRoomSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Oda formu dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Oda yönetimi için kuruma bağlı olmalisiniz." };
    }

    const payload = {
      name: parsed.data.name.trim(),
      color: parsed.data.color?.trim() || null,
      isActive: true,
      archivedAt: null,
    };

    if (parsed.data.id) {
      const existing = await prisma.sessionRoom.findFirst({
        where: {
          id: parsed.data.id,
          ...getSessionRoomAccessWhere(user),
        },
        select: { id: true, institutionId: true },
      });

      if (!existing) {
        return { success: false, message: "Oda kaydı bulunamadı." };
      }

      const room = await prisma.sessionRoom.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "session_room.updated",
        entityType: "sessionRoom",
        entityId: room.id,
        summary: `${room.name} odasi guncellendi.`,
        metadata: { institutionId: room.institutionId },
      });

      revalidatePath("/panel/seans-programi");
      revalidatePath("/panel/raporlar");
      revalidatePath("/panel");
      revalidatePath("/panel/cocuklarim");

      return { success: true, message: "Oda guncellendi.", id: room.id };
    }

    const room = await prisma.sessionRoom.create({
      data: {
        institutionId: user.institutionId,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "session_room.created",
      entityType: "sessionRoom",
      entityId: room.id,
      summary: `${room.name} odasi eklendi.`,
      metadata: { institutionId: room.institutionId },
    });

    revalidatePath("/panel/seans-programi");
    revalidatePath("/panel/raporlar");
    revalidatePath("/panel");
    revalidatePath("/panel/cocuklarim");

    return { success: true, message: "Oda eklendi.", id: room.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteSessionRoomAction(
  input: DeleteSessionRoomInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = deleteSessionRoomSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Oda silme isteği dogrulanamadi.",
      };
    }

    const room = await prisma.sessionRoom.findFirst({
      where: {
        id: parsed.data.id,
        ...getSessionRoomAccessWhere(user),
      },
      select: {
        id: true,
        name: true,
        institutionId: true,
      },
    });

    if (!room) {
      return { success: false, message: "Oda kaydı bulunamadı." };
    }

    await prisma.sessionRoom.update({
      where: { id: room.id },
      data: {
        isActive: false,
        archivedAt: new Date(),
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "session_room.archived",
      entityType: "sessionRoom",
      entityId: room.id,
      summary: `${room.name} odasi arşive alindi.`,
      metadata: { institutionId: room.institutionId },
    });

    revalidatePath("/panel/seans-programi");
    revalidatePath("/panel/raporlar");
    revalidatePath("/panel");
    revalidatePath("/panel/cocuklarim");

    return { success: true, message: "Oda arşive alindi.", id: room.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveSessionTimeSlotAction(
  input: SessionTimeSlotInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = sessionTimeSlotSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Ders saati formu dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Ders saati tanimlamak için kuruma bağlı olmalisiniz." };
    }

    const payload = {
      name: parsed.data.name.trim(),
      startTime: parsed.data.startTime,
      durationMinutes: parsed.data.durationMinutes,
      sortOrder: parsed.data.sortOrder,
      isActive: true,
    };

    if (parsed.data.id) {
      const existing = await prisma.sessionTimeSlot.findFirst({
        where: {
          id: parsed.data.id,
          institutionId: user.institutionId,
        },
        select: { id: true, institutionId: true },
      });

      if (!existing) {
        return { success: false, message: "Ders saati kaydı bulunamadı." };
      }

      const timeSlot = await prisma.sessionTimeSlot.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "session_time_slot.updated",
        entityType: "sessionTimeSlot",
        entityId: timeSlot.id,
        summary: `${timeSlot.name} ders saati guncellendi.`,
        metadata: { institutionId: timeSlot.institutionId },
      });

      revalidatePath("/panel/seans-programi");
      revalidatePath("/panel");
      revalidatePath("/panel/cocuklarim");

      return { success: true, message: "Ders saati guncellendi.", id: timeSlot.id };
    }

    const timeSlot = await prisma.sessionTimeSlot.create({
      data: {
        institutionId: user.institutionId,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "session_time_slot.created",
      entityType: "sessionTimeSlot",
      entityId: timeSlot.id,
      summary: `${timeSlot.name} ders saati eklendi.`,
      metadata: { institutionId: timeSlot.institutionId },
    });

    revalidatePath("/panel/seans-programi");
    revalidatePath("/panel");
    revalidatePath("/panel/cocuklarim");

    return { success: true, message: "Ders saati eklendi.", id: timeSlot.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteSessionTimeSlotAction(
  input: DeleteSessionTimeSlotInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = deleteSessionTimeSlotSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Ders saati silme isteği dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Ders saati yönetimi için kuruma bağlı olmalisiniz." };
    }

    const timeSlot = await prisma.sessionTimeSlot.findFirst({
      where: {
        id: parsed.data.id,
        institutionId: user.institutionId,
      },
      select: {
        id: true,
        name: true,
        institutionId: true,
      },
    });

    if (!timeSlot) {
      return { success: false, message: "Ders saati kaydı bulunamadı." };
    }

    await prisma.sessionTimeSlot.update({
      where: { id: timeSlot.id },
      data: {
        isActive: false,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "session_time_slot.archived",
      entityType: "sessionTimeSlot",
      entityId: timeSlot.id,
      summary: `${timeSlot.name} ders saati arşive alindi.`,
      metadata: { institutionId: timeSlot.institutionId },
    });

    revalidatePath("/panel/seans-programi");
    revalidatePath("/panel");
    revalidatePath("/panel/cocuklarim");

    return { success: true, message: "Ders saati arşive alindi.", id: timeSlot.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveInstitutionSessionAction(
  input: InstitutionSessionInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = institutionSessionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Seans formu dogrulanamadi.",
      };
    }

    if (!user.institutionId) {
      return { success: false, message: "Seans planlamak için kuruma bağlı olmalisiniz." };
    }

    const sessionDate = parseDate(parsed.data.sessionDate);
    if (!sessionDate) {
      return { success: false, message: "Seans tarihi geçersiz." };
    }
    sessionDate.setHours(0, 0, 0, 0);

    let targetStudentId = parsed.data.studentId;
    if (targetStudentId === "virtual-empty" || targetStudentId === "virtual-signature") {
      const isEmpty = targetStudentId === "virtual-empty";
      const fName = isEmpty ? "Boş" : "İmza";
      const lName = isEmpty ? "Seans" : "Seansı";

      let dbStudent = await prisma.student.findFirst({
        where: {
          institutionId: user.institutionId,
          firstName: fName,
          lastName: lName,
          classroom: "Sistem",
        },
        select: { id: true },
      });

      if (!dbStudent) {
        dbStudent = await prisma.student.create({
          data: {
            institutionId: user.institutionId,
            ownerId: user.id,
            firstName: fName,
            lastName: lName,
            classroom: "Sistem",
          },
          select: { id: true },
        });
      }
      targetStudentId = dbStudent.id;
    }

    const studentWhere = {
      id: targetStudentId,
      ...getStudentAccessWhere(user),
    };
    const student = await (async () => {
      try {
        return await prisma.student.findFirst({
          where: studentWhere,
          select: {
            id: true,
            institutionId: true,
            firstName: true,
            lastName: true,
            classroom: true,
            enrollmentType: true,
            isActive: true,
            enrollmentStartDate: true,
            enrollmentEndDate: true,
          },
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2022"
        ) {
          throw error;
        }

        const legacyStudent = await prisma.student.findFirst({
          where: studentWhere,
          select: {
            id: true,
            institutionId: true,
            firstName: true,
            lastName: true,
            classroom: true,
          },
        });

        return legacyStudent
          ? {
              ...legacyStudent,
              enrollmentType: "regular" as const,
              isActive: true,
              enrollmentStartDate: null,
              enrollmentEndDate: null,
            }
          : null;
      }
    })();

    if (!student || student.institutionId !== user.institutionId) {
      return { success: false, message: "Öğrenci bu kurum içinde bulunamadı." };
    }

    if (
      student.classroom !== "Sistem" &&
      !isStudentAvailableOnDate(student as Parameters<typeof isStudentAvailableOnDate>[0], sessionDate)
    ) {
      return {
        success: false,
        message: "Öğrenci secilen tarihte kurumun aktif öğrenci listesinde değil.",
      };
    }

    const teacherId = parsed.data.teacherId?.trim() || null;
    if (teacherId) {
      const teacher = await prisma.user.findFirst({
        where: {
          id: teacherId,
          institutionId: user.institutionId,
          role: UserRole.teacher,
          isActive: true,
        },
        select: { id: true },
      });

      if (!teacher) {
        return { success: false, message: "Öğretmen seçimi geçersiz." };
      }
    }

    const timeSlotId = parsed.data.timeSlotId.trim();
    const timeSlot = await prisma.sessionTimeSlot.findFirst({
      where: {
        id: timeSlotId,
        institutionId: user.institutionId,
        isActive: true,
      },
      select: {
        id: true,
        startTime: true,
        durationMinutes: true,
      },
    });

    if (!timeSlot) {
      return { success: false, message: "Ders saati seçimi geçersiz." };
    }

    const startTime = timeSlot.startTime;
    const durationMinutes = timeSlot.durationMinutes;
    const isVirtualStudent = student.classroom === "Sistem";

    const overlappingSessions = await prisma.institutionSession.findMany({
      where: {
        institutionId: user.institutionId,
        sessionDate,
        deletedAt: null,
        ...(parsed.data.id ? { id: { not: parsed.data.id } } : {}),
        OR: [
          ...(isVirtualStudent ? [] : [{ studentId: student.id }]),
          ...(teacherId ? [{ teacherId }] : []),
        ],
      },
      select: {
        id: true,
        studentId: true,
        teacherId: true,
        roomId: true,
        startTime: true,
        durationMinutes: true,
      },
    });

    const conflictingSession = overlappingSessions.find((session) =>
      doTimesOverlap(startTime, durationMinutes, session.startTime, session.durationMinutes),
    );

    if (conflictingSession) {
      const conflictRange = `${conflictingSession.startTime} - ${buildSessionEndTime(
        conflictingSession.startTime,
        conflictingSession.durationMinutes,
      )}`;

      if (!isVirtualStudent && conflictingSession.studentId === student.id) {
        return {
          success: false,
          message: `Öğrenci ayni gun ${conflictRange} araliginda baska bir seansa atanmis.`,
        };
      }

      if (teacherId && conflictingSession.teacherId === teacherId) {
        return {
          success: false,
          message: `Öğretmen ${conflictRange} araliginda baska bir seansa atanmis.`,
        };
      }
    }

    if (parsed.data.sessionType === "makeup" && !parsed.data.makeupEducationType) {
      return {
        success: false,
        message: "Telafi dersi icin bireysel/grup turu secilmelidir.",
      };
    }

    const DAILY_SESSION_LIMIT = 3;
    if (!isVirtualStudent) {
      const sameDaySessionCount = await prisma.institutionSession.count({
        where: {
          institutionId: user.institutionId,
          studentId: student.id,
          sessionDate,
          status: { not: "cancelled" },
          deletedAt: null,
          ...(parsed.data.id ? { id: { not: parsed.data.id } } : {}),
        },
      });

      if (sameDaySessionCount >= DAILY_SESSION_LIMIT) {
        return {
          success: false,
          message: `Ogrenci icin ayni gun destek/telafi dahil en fazla ${DAILY_SESSION_LIMIT} ders planlanabilir.`,
        };
      }
    }

    const payload = {
      studentId: student.id,
      teacherId,
      roomId: null,
      timeSlotId,
      sessionDate,
      startTime,
      durationMinutes,
      sessionType: parsed.data.sessionType,
      status: parsed.data.status,
      attendanceVerified: parsed.data.attendanceVerified,
      attendanceVerificationReference:
        parsed.data.attendanceVerificationReference?.trim() || null,
      attendanceVerifiedAt: parsed.data.attendanceVerified ? new Date() : null,
      attendanceOutcome: parsed.data.attendanceOutcome ?? null,
      makeupReference: parsed.data.makeupReference?.trim() || null,
      makeupEducationType:
        parsed.data.sessionType === "makeup" ? parsed.data.makeupEducationType ?? null : null,
      notes: parsed.data.notes?.trim() || null,
      updatedById: user.id,
      deletedAt: null,
      deletedById: null,
    };

    if (parsed.data.id) {
      const existing = await prisma.institutionSession.findFirst({
        where: {
          id: parsed.data.id,
          ...getSessionAccessWhere(user),
          deletedAt: null,
        },
        select: { id: true, institutionId: true },
      });

      if (!existing) {
        return { success: false, message: "Seans kaydı bulunamadı." };
      }

      const session = await prisma.institutionSession.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "session.updated",
        entityType: "institutionSession",
        entityId: session.id,
        summary: `${student.firstName} ${student.lastName} için seans guncellendi.`,
        metadata: {
          institutionId: session.institutionId,
          studentId: student.id,
          teacherId: session.teacherId,
          roomId: session.roomId,
          timeSlotId: session.timeSlotId,
        },
      });

      revalidatePath("/panel/seans-programi");
      revalidatePath("/panel/raporlar");
      revalidatePath("/panel");
      revalidatePath("/panel/cocuklarim");

      return { success: true, message: "Seans guncellendi.", id: session.id };
    }

    const session = await prisma.institutionSession.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "session.created",
      entityType: "institutionSession",
      entityId: session.id,
      summary: `${student.firstName} ${student.lastName} için yeni seans planlandi.`,
      metadata: {
        institutionId: session.institutionId,
        studentId: student.id,
        teacherId: session.teacherId,
        roomId: session.roomId,
        timeSlotId: session.timeSlotId,
      },
    });

    revalidatePath("/panel/seans-programi");
    revalidatePath("/panel/raporlar");
    revalidatePath("/panel");
    revalidatePath("/panel/cocuklarim");

    return { success: true, message: "Seans eklendi.", id: session.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteInstitutionSessionAction(
  input: DeleteInstitutionSessionInput,
): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    const parsed = deleteInstitutionSessionSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Seans silme isteği dogrulanamadi.",
      };
    }

    const session = await prisma.institutionSession.findFirst({
      where: {
        id: parsed.data.id,
        ...getSessionAccessWhere(user),
        deletedAt: null,
      },
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

    if (!session) {
      return { success: false, message: "Seans kaydı bulunamadı." };
    }

    await prisma.institutionSession.update({
      where: { id: session.id },
      data: {
        deletedAt: new Date(),
        deletedById: user.id,
        updatedById: user.id,
        status: "cancelled",
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "session.archived",
      entityType: "institutionSession",
      entityId: session.id,
      summary: `${session.student.firstName} ${session.student.lastName} için planli seans arşive alindi.`,
      metadata: {
        institutionId: session.institutionId,
        studentId: session.studentId,
        teacherId: session.teacherId,
      },
    });

    revalidatePath("/panel/seans-programi");
    revalidatePath("/panel/raporlar");
    revalidatePath("/panel");
    revalidatePath("/panel/cocuklarim");

    return { success: true, message: "Seans arşive alindi.", id: session.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveQuickSessionNoteAction(
  input: QuickSessionNoteInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    if (user.role === UserRole.parent) {
      return { success: false, message: "Veli hesabi seans notu duzenleyemez." };
    }

    const parsed = quickSessionNoteSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Seans notu dogrulanamadi.",
      };
    }

    const teacherScopedWhere =
      user.role === UserRole.teacher
        ? {
            ...(user.institutionId ? { institutionId: user.institutionId } : {}),
            OR: [{ teacherId: user.id }, { createdById: user.id }],
          }
        : getSessionAccessWhere(user);

    const session = await prisma.institutionSession.findFirst({
      where: {
        id: parsed.data.id,
        ...teacherScopedWhere,
        deletedAt: null,
      },
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

    if (!session) {
      return { success: false, message: "Seans kaydı bulunamadı." };
    }

    const normalizedNotes = parsed.data.notes?.trim() || null;

    await prisma.institutionSession.update({
      where: { id: session.id },
      data: {
        status: parsed.data.status,
        notes: normalizedNotes,
        updatedById: user.id,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "session.quick_note_updated",
      entityType: "institutionSession",
      entityId: session.id,
      summary: `${session.student.firstName} ${session.student.lastName} seansi için hızlı not guncellendi.`,
      metadata: {
        institutionId: session.institutionId,
        studentId: session.studentId,
        teacherId: session.teacherId,
        status: parsed.data.status,
      },
    });

    revalidatePath("/panel/seans-programi");
    revalidatePath("/panel/raporlar");
    revalidatePath("/panel");
    revalidatePath("/panel/cocuklarim");

    return { success: true, message: "Seans notu kaydedildi.", id: session.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function saveCalendarEventAction(
  input: CalendarEventInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role === UserRole.parent) {
      return { success: false, message: "Veli hesabi takvim kaydı olusturamaz." };
    }
    const parsed = calendarEventSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Takvim formu dogrulanamadi.",
      };
    }

    const startAt = new Date(parsed.data.startAt);
    const endAt = new Date(parsed.data.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      return { success: false, message: "Takvim tarihi geçersiz." };
    }

    const canCreateInstitutionEvent =
      !!user.institutionId &&
      (canManageInstitutionRecords(user.role) || user.role === UserRole.teacher);

    if (parsed.data.scope === "institution" && !canCreateInstitutionEvent) {
      return { success: false, message: "Kurum ortak takvimine etkinlik ekleyemezsiniz." };
    }

    let assignedUserId: string | null = user.id;
    if (parsed.data.scope === "institution") {
      assignedUserId = null;
    } else if (
      parsed.data.assignedUserId &&
      canManageInstitutionRecords(user.role) &&
      user.institutionId
    ) {
      const assignedUser = await prisma.user.findFirst({
        where: {
          id: parsed.data.assignedUserId,
          institutionId: user.institutionId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!assignedUser) {
        return { success: false, message: "Atanan kullanıcı bulunamadı." };
      }

      assignedUserId = assignedUser.id;
    }

    let studentId: string | null = null;
    if (parsed.data.studentId) {
      const student = await prisma.student.findFirst({
        where: {
          id: parsed.data.studentId,
          ...getStudentAccessWhere(user),
        },
        select: { id: true },
      });

      if (!student) {
        return { success: false, message: "Bağlı öğrenci bulunamadı." };
      }

      studentId = student.id;
    }

    const payload = {
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      scope: parsed.data.scope,
      institutionId: user.institutionId ?? null,
      assignedUserId,
      studentId,
      startAt,
      endAt,
    };

    if (parsed.data.id) {
      const existing = await prisma.calendarEvent.findFirst({
        where: {
          id: parsed.data.id,
          ...getCalendarEventAccessWhere(user),
        },
        select: {
          id: true,
          title: true,
          ownerId: true,
          institutionId: true,
        },
      });

      if (!existing) {
        return { success: false, message: "Takvim kaydı bulunamadı." };
      }

      const canEdit =
        user.role === UserRole.admin ||
        existing.ownerId === user.id ||
        (canManageInstitutionRecords(user.role) && existing.institutionId === user.institutionId);

      if (!canEdit) {
        return { success: false, message: "Bu takvim kaydini duzenleyemezsiniz." };
      }

      const event = await prisma.calendarEvent.update({
        where: { id: existing.id },
        data: payload,
      });

      await writeAuditLog({
        actorId: user.id,
        action: "calendar_event.updated",
        entityType: "calendarEvent",
        entityId: event.id,
        summary: `${event.title} takvim kaydı guncellendi.`,
        metadata: {
          institutionId: event.institutionId,
          scope: event.scope,
          assignedUserId: event.assignedUserId,
          studentId: event.studentId,
        },
      });

      revalidatePath("/panel/takvim");
      revalidatePath("/panel");

      return { success: true, message: "Takvim kaydı guncellendi.", id: event.id };
    }

    const event = await prisma.calendarEvent.create({
      data: {
        ownerId: user.id,
        ...payload,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "calendar_event.created",
      entityType: "calendarEvent",
      entityId: event.id,
      summary: `${event.title} takvim kaydı olusturuldu.`,
      metadata: {
        institutionId: event.institutionId,
        scope: event.scope,
        assignedUserId: event.assignedUserId,
        studentId: event.studentId,
      },
    });

    revalidatePath("/panel/takvim");
    revalidatePath("/panel");

    return { success: true, message: "Takvim kaydı olusturuldu.", id: event.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteCalendarEventAction(
  input: DeleteCalendarEventInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    if (user.role === UserRole.parent) {
      return { success: false, message: "Veli hesabi takvim kaydı silemez." };
    }
    const parsed = deleteCalendarEventSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Takvim kaydı seçimi geçersiz.",
      };
    }

    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: parsed.data.id,
        ...getCalendarEventAccessWhere(user),
      },
      select: {
        id: true,
        title: true,
        ownerId: true,
        institutionId: true,
        scope: true,
      },
    });

    if (!event) {
      return { success: false, message: "Takvim kaydı bulunamadı." };
    }

    const canDelete =
      user.role === UserRole.admin ||
      event.ownerId === user.id ||
      (canManageInstitutionRecords(user.role) && event.institutionId === user.institutionId);

    if (!canDelete) {
      return { success: false, message: "Bu takvim kaydini silemezsiniz." };
    }

    await prisma.calendarEvent.delete({
      where: { id: event.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "calendar_event.deleted",
      entityType: "calendarEvent",
      entityId: event.id,
      summary: `${event.title} takvim kaydı silindi.`,
      metadata: {
        institutionId: event.institutionId,
        scope: event.scope,
      },
    });

    revalidatePath("/panel/takvim");
    revalidatePath("/panel");

    return { success: true, message: "Takvim kaydı silindi.", id: event.id };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function createSupportTicketAction(input: SupportTicketInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const parsed = supportTicketSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Girdi doğrulanamadı.",
      };
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        userId: user.id,
        name: user.name,
        email: user.email,
        subject: parsed.data.subject,
        message: parsed.data.message,
        source: "web",
        priority: "normal",
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "support_ticket.created",
      entityType: "support_ticket",
      entityId: ticket.id,
      summary: `Yeni destek talebi oluşturuldu: ${parsed.data.subject}`,
      metadata: { userId: user.id },
    });

    const admins = await prisma.user.findMany({
      where: {
        role: UserRole.admin,
        isActive: true,
      },
      select: { id: true },
    });

    await notifyUsers(admins.map((admin) => admin.id), {
      type: "support_ticket",
      title: "Yeni destek talebi",
      body: parsed.data.subject,
      data: {
        type: "support_ticket",
        ticketId: ticket.id,
      },
    });

    revalidatePath("/destek");
    revalidatePath("/panel/destek");
    revalidatePath("/panel/admin/destek-talepleri");

    return {
      success: true,
      message: "Destek talebiniz başarıyla iletildi.",
      id: ticket.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function replySupportTicketAction(input: SupportTicketReplyInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const parsed = supportTicketReplySchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Girdi doğrulanamadı.",
      };
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: parsed.data.ticketId },
    });

    if (!ticket) {
      return {
        success: false,
        message: "Destek talebi bulunamadı.",
      };
    }

    const isAdmin = isAdminRole(user.role);
    if (!isAdmin && ticket.userId !== user.id) {
      return {
        success: false,
        message: "Bu işlem için yetkiniz yok.",
      };
    }

    const reply = await prisma.supportTicketReply.create({
      data: {
        ticketId: ticket.id,
        userId: user.id,
        name: user.name,
        message: parsed.data.message,
        isStaff: isAdmin,
      },
    });

    // Update ticket status
    let newStatus = ticket.status;
    if (isAdmin && ticket.status === "open") {
      newStatus = "in_progress";
    } else if (!isAdmin && (ticket.status === "resolved" || ticket.status === "closed")) {
      newStatus = "open";
    }

    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: newStatus,
      },
    });

    if (isAdmin && ticket.userId) {
      await notifyUsers([ticket.userId], {
        type: "support_ticket_reply",
        title: "Destek talebinize yanıt geldi",
        body: ticket.subject,
        data: {
          type: "support_ticket_reply",
          ticketId: ticket.id,
          replyId: reply.id,
        },
      });
    } else if (!isAdmin) {
      const admins = await prisma.user.findMany({
        where: {
          role: UserRole.admin,
          isActive: true,
        },
        select: { id: true },
      });

      await notifyUsers(admins.map((admin) => admin.id), {
        type: "support_ticket_reply",
        title: "Destek talebine yeni yanıt",
        body: ticket.subject,
        data: {
          type: "support_ticket_reply",
          ticketId: ticket.id,
          replyId: reply.id,
        },
      });
    }

    revalidatePath(`/panel/destek/${ticket.id}`);
    revalidatePath(`/panel/admin/destek-talepleri/${ticket.id}`);
    revalidatePath("/panel/admin/destek-talepleri");

    return {
      success: true,
      message: "Yanıtınız başarıyla eklendi.",
      id: reply.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function updateSupportTicketStatusAction(input: SupportTicketStatusInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    
    if (!isAdminRole(user.role)) {
      return {
        success: false,
        message: "Bu işlem sadece yöneticiler tarafından yapılabilir.",
      };
    }

    const parsed = supportTicketStatusSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Girdi doğrulanamadı.",
      };
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: parsed.data.ticketId },
    });

    if (!ticket) {
      return {
        success: false,
        message: "Destek talebi bulunamadı.",
      };
    }

    const isClosing = parsed.data.status === "closed" || parsed.data.status === "resolved";

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: parsed.data.status,
        closedAt: isClosing ? new Date() : null,
        closedById: isClosing ? user.id : null,
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "support_ticket.status_updated",
      entityType: "support_ticket",
      entityId: ticket.id,
      summary: `Destek talebi durumu güncellendi: ${parsed.data.status}`,
      metadata: { status: parsed.data.status },
    });

    revalidatePath(`/panel/destek/${ticket.id}`);
    revalidatePath(`/panel/admin/destek-talepleri/${ticket.id}`);
    revalidatePath("/panel/admin/destek-talepleri");

    return {
      success: true,
      message: `Talep durumu başarıyla güncellendi: ${parsed.data.status}`,
      id: updatedTicket.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function deleteSupportTicketAction(input: DeleteSupportTicketInput): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const parsed = deleteSupportTicketSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Girdi doğrulanamadı.",
      };
    }

    const ticket = await prisma.supportTicket.findUnique({
      where: { id: parsed.data.ticketId },
    });

    if (!ticket) {
      return {
        success: false,
        message: "Destek talebi bulunamadı.",
      };
    }

    const isAdmin = isAdminRole(user.role);
    if (!isAdmin && ticket.userId !== user.id) {
      return {
        success: false,
        message: "Bu işlem için yetkiniz yok.",
      };
    }

    await prisma.supportTicket.delete({
      where: { id: ticket.id },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "support_ticket.deleted",
      entityType: "support_ticket",
      entityId: ticket.id,
      summary: `Destek talebi silindi: ${ticket.subject}`,
      metadata: { ticketId: ticket.id, deletedBy: user.id },
    });

    revalidatePath("/panel/destek");
    revalidatePath(`/panel/destek/${ticket.id}`);
    revalidatePath("/panel/admin/destek-talepleri");
    revalidatePath(`/panel/admin/destek-talepleri/${ticket.id}`);

    return {
      success: true,
      message: "Destek talebi başarıyla silindi.",
      id: ticket.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function generateDifferenceInvoiceAction(input: {
  studentId: string;
  period: string;
  unitPrice: number;
  taxRate?: number;
}): Promise<ActionResult> {
  try {
    const user = await requireManagementUser();
    const denied = operationalModuleDenied(user);
    if (denied) return denied;
    if (!user.institutionId) {
      return { success: false, message: "Hak ediş oluşturmak için kuruma bağlı olmalısınız." };
    }

    const studentId = input.studentId;
    const periodStr = input.period;
    const unitPrice = Number(input.unitPrice);
    const taxRate = Number(input.taxRate ?? 20);

    if (!studentId || !periodStr || isNaN(unitPrice) || unitPrice <= 0) {
      return { success: false, message: "Geçersiz parametreler sağlandı." };
    }

    const period = resolveInvoicePeriod(periodStr);

    const sessionsCount = await prisma.institutionSession.count({
      where: {
        studentId,
        institutionId: user.institutionId,
        deletedAt: null,
        status: "completed",
        sessionDate: {
          gte: period.start,
          lt: period.end,
        },
      },
    });

    if (sessionsCount === 0) {
      return { success: false, message: "Bu öğrenci için seçili dönemde tamamlanmış seans bulunmamaktadır." };
    }

    const diffPeriodKey = `diff-${period.key}`;
    const existing = await prisma.institutionInvoice.findFirst({
      where: {
        institutionId: user.institutionId,
        billingStudentId: studentId,
        billingPeriod: diffPeriodKey,
      },
    });

    if (existing) {
      return { success: false, message: "Bu öğrenci için bu dönemde veli fark faturası zaten oluşturulmuş." };
    }

    const [settings, student, invoiceCount] = await Promise.all([
      prisma.institutionSettings.findFirst({
        where: { institutionId: user.institutionId },
        select: { invoicePrefix: true },
      }),
      prisma.student.findUnique({
        where: { id: studentId },
        include: {
          parentStudentLinks: {
            include: {
              parent: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.institutionInvoice.count({ where: { institutionId: user.institutionId } }),
    ]);

    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    const studentName = `${student.firstName} ${student.lastName}`.trim();
    const parent = student.parentStudentLinks[0]?.parent;
    const customerName = parent?.name || studentName;
    const customerEmail = parent?.email || null;

    const issueDate = new Date();
    const sequence = invoiceCount + 1;

    const invoice = await prisma.institutionInvoice.create({
      data: {
        institutionId: user.institutionId,
        createdById: user.id,
        invoiceNumber: buildInvoiceNumber(settings?.invoicePrefix, sequence, issueDate),
        customerType: "individual",
        status: "draft",
        issueDate,
        dueDate: null,
        customerName,
        customerTitle: studentName,
        customerEmail,
        serviceTitle: "Veli Fark Ücreti",
        serviceDescription: `Veli fark ücreti: ${sessionsCount} seans x ${unitPrice} TL.`,
        servicePeriod: period.label,
        billingStudentId: studentId,
        billingPeriod: diffPeriodKey,
        billingSource: "difference",
        quantity: sessionsCount,
        unitPrice: unitPrice,
        taxRate: taxRate,
        notes: "Veli seans fark ücreti tahakkuku.",
      },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "difference_invoice.created",
      entityType: "institutionInvoice",
      entityId: invoice.id,
      summary: `${studentName} için ${period.label} dönemi veli fark faturası oluşturuldu.`,
      metadata: {
        institutionId: user.institutionId,
        studentId,
        period: period.key,
      },
    });

    revalidatePath("/panel/hak-edis");

    return {
      success: true,
      message: "Veli fark faturası başarıyla oluşturuldu.",
      id: invoice.id,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function revokeWebSessionAction(
  sessionId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const session = await prisma.webSession.findFirst({
      where: {
        id: sessionId,
        userId: user.id,
      },
    });

    if (!session) {
      return { success: false, message: "Oturum bulunamadı veya yetkiniz yok." };
    }

    // Ayni cihaza (ayni userAgent) ait tekrar eden tum oturumlari birlikte
    // sonlandir; boylece liste tek cihaz icin tek satira iner. Mevcut
    // oturumun yanlislikla kapanmamasi icin onu haric tut.
    const currentSession = await getSession();
    const currentSessionId = currentSession?.user?.sessionId;

    const { count } = await prisma.webSession.deleteMany({
      where: {
        userId: user.id,
        userAgent: session.userAgent,
        ...(currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
    });

    if (count === 0) {
      return { success: false, message: "Sonlandirilacak oturum bulunamadı." };
    }

    await writeAuditLog({
      actorId: user.id,
      action: "web_session.revoked",
      entityType: "webSession",
      entityId: sessionId,
      summary: "Aktif bir web oturumu uzaktan sonlandirildi.",
      metadata: {
        userId: user.id,
        sessionId,
        userAgent: session.userAgent,
        revokedCount: count,
      },
    });

    revalidatePath("/panel/profil");

    return { success: true, message: "Oturum sonlandirildi." };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function revokeTrustedWebDeviceAction(
  deviceId: string,
): Promise<ActionResult> {
  try {
    const user = await requireUser();

    const device = await prisma.trustedWebDevice.findFirst({
      where: { id: deviceId, userId: user.id },
    });

    if (!device) {
      return { success: false, message: "Cihaz bulunamadı veya yetkiniz yok." };
    }

    await prisma.trustedWebDevice.delete({ where: { id: device.id } });

    await writeAuditLog({
      actorId: user.id,
      action: "web_trusted_device.revoked",
      entityType: "trustedWebDevice",
      entityId: device.id,
      summary: "Guvenilir bir tarayici cihazi kaldirildi.",
      metadata: { userId: user.id, deviceId: device.id },
    });

    revalidatePath("/panel/profil");

    return { success: true, message: "Cihaz artik guvenilir listesinde değil." };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function createStudentTransferInviteAction(
  input: CreateStudentTransferInviteInput,
): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const parsed = createStudentTransferInviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Öğrenci seçimi dogrulanamadi.",
      };
    }

    const student = await prisma.student.findUnique({
      where: { id: parsed.data.studentId },
      select: { id: true, firstName: true, lastName: true, ownerId: true, institutionId: true },
    });

    if (!student) {
      return { success: false, message: "Öğrenci bulunamadı." };
    }

    if (student.ownerId !== user.id) {
      return { success: false, message: "Bu öğrenciyi yalnızca sahibi devredebilir." };
    }

    const token = createBepTransferToken();
    const tokenHash = hashBepTransferToken(token);

    const invite = await prisma.$transaction(async (tx) => {
      await tx.studentTransferInvite.updateMany({
        where: {
          studentId: student.id,
          status: "pending",
        },
        data: {
          status: "canceled",
          canceledAt: new Date(),
        },
      });

      return tx.studentTransferInvite.create({
        data: {
          studentId: student.id,
          fromUserId: user.id,
          tokenHash,
          previousOwnerId: student.ownerId,
          previousInstitutionId: student.institutionId,
          expiresAt: getBepTransferInviteExpiresAt(),
        },
      });
    });

    await writeAuditLog({
      actorId: user.id,
      action: "student.transfer_invite.created",
      entityType: "student",
      entityId: student.id,
      summary: `${student.firstName} ${student.lastName} öğrencisi için devir bağlantısı olusturuldu.`,
      metadata: {
        inviteId: invite.id,
        studentId: student.id,
        institutionId: student.institutionId,
      },
    });

    revalidatePath(`/panel/ogrenciler/${student.id}`);

    return {
      success: true,
      message: "Öğrenci devir bağlantısı olusturuldu.",
      id: invite.id,
      sharePath: `/panel/ogrenciler/devral/${token}`,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function acceptStudentTransferInviteAction(
  input: AcceptStudentTransferInviteInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = acceptStudentTransferInviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Öğrenci devir bağlantısı dogrulanamadi.",
      };
    }

    if (user.role !== UserRole.teacher && user.role !== UserRole.institution) {
      return { success: false, message: "Öğrenci devrini yalnızca öğretmen veya kurum hesabi kabul edebilir." };
    }

    const invite = await prisma.studentTransferInvite.findUnique({
      where: {
        tokenHash: hashBepTransferToken(parsed.data.token),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            ownerId: true,
            institutionId: true,
          },
        },
        fromUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    if (!invite || invite.status !== "pending" || invite.expiresAt.getTime() < Date.now()) {
      return { success: false, message: "Öğrenci devir bağlantısı geçersiz veya süresi dolmuş." };
    }

    if (invite.fromUserId === user.id) {
      return { success: false, message: "Kendi olusturdugunuz devir baglantisini kabul edemezsiniz." };
    }

    if (invite.student.ownerId !== invite.previousOwnerId) {
      await prisma.studentTransferInvite.update({
        where: { id: invite.id },
        data: {
          status: "canceled",
          canceledAt: new Date(),
        },
      });
      return { success: false, message: "Öğrenci sahibi degistigi için bu devir bağlantısı iptal edildi." };
    }

    const acceptedAt = new Date();
    const undoUntil = getBepTransferUndoUntil(acceptedAt);

    await prisma.$transaction([
      prisma.student.update({
        where: { id: invite.studentId },
        data: {
          ownerId: user.id,
          institutionId: user.institutionId ?? null,
        },
      }),
      prisma.bepDocument.updateMany({
        where: { studentId: invite.studentId },
        data: {
          ownerId: user.id,
          institutionId: user.institutionId ?? null,
        },
      }),
      prisma.courseEvaluationDocument.updateMany({
        where: { studentId: invite.studentId },
        data: {
          ownerId: user.id,
          institutionId: user.institutionId ?? null,
        },
      }),
      prisma.evaluationDocument.updateMany({
        where: { studentId: invite.studentId },
        data: {
          ownerId: user.id,
          institutionId: user.institutionId ?? null,
        },
      }),
      prisma.studentFile.updateMany({
        where: { studentId: invite.studentId },
        data: {
          institutionId: user.institutionId ?? null,
        },
      }),
      prisma.familyEducationPlan.updateMany({
        where: { studentId: invite.studentId },
        data: {
          institutionId: user.institutionId ?? null,
        },
      }),
      // Üretilmiş PDF'lerin institutionId/issuedById'i de taşınır; aksi halde
      // belge doğrulama güvenlik kodu eski sahibin tohumuna bağlı kalır.
      prisma.issuedPdfDocument.updateMany({
        where: { studentId: invite.studentId },
        data: {
          institutionId: user.institutionId ?? null,
          issuedById: user.id,
        },
      }),
      prisma.studentTransferInvite.update({
        where: { id: invite.id },
        data: {
          status: "accepted",
          acceptedById: user.id,
          acceptedAt,
          undoUntil,
        },
      }),
      prisma.studentTransferInvite.updateMany({
        where: {
          studentId: invite.studentId,
          id: { not: invite.id },
          status: "pending",
        },
        data: {
          status: "canceled",
          canceledAt: acceptedAt,
        },
      }),
    ]);

    await writeAuditLog({
      actorId: user.id,
      action: "student.transferred",
      entityType: "student",
      entityId: invite.studentId,
      summary: `${invite.student.firstName} ${invite.student.lastName} öğrencisi devir bağlantısı ile ${user.email} kullanicisina tasindi.`,
      metadata: {
        inviteId: invite.id,
        previousOwnerId: invite.previousOwnerId,
        nextOwnerId: user.id,
        studentId: invite.studentId,
        undoUntil: undoUntil.toISOString(),
        institutionId: user.institutionId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/ogrenciler");
    revalidatePath(`/panel/ogrenciler/${invite.studentId}`);
    revalidatePath("/panel/bep");

    return {
      success: true,
      message: `${invite.student.firstName} ${invite.student.lastName} öğrencisi ve ilgili kayıtları hesabiniza tasindi. 15 dakika içinde geri alinabilir.`,
      id: invite.id,
      undoUntil: undoUntil.toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function undoStudentTransferInviteAction(
  input: UndoStudentTransferInviteInput,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = undoStudentTransferInviteSchema.safeParse(input);

    if (!parsed.success) {
      return {
        success: false,
        message: parsed.error.issues[0]?.message ?? "Öğrenci devir geri alma isteği dogrulanamadi.",
      };
    }

    const invite = await prisma.studentTransferInvite.findUnique({
      where: { id: parsed.data.inviteId },
      include: {
        student: true,
      },
    });

    if (!invite || invite.status !== "accepted" || !invite.undoUntil) {
      return { success: false, message: "Geri alinabilecek aktif bir öğrenci devri bulunamadı." };
    }

    const canUndo =
      invite.fromUserId === user.id ||
      invite.acceptedById === user.id ||
      user.role === UserRole.admin ||
      (canManageInstitutionRecords(user.role) &&
        Boolean(user.institutionId) &&
        user.institutionId === invite.previousInstitutionId);

    if (!canUndo) {
      return { success: false, message: "Bu öğrenci devrini geri alma yetkiniz yok." };
    }

    if (invite.undoUntil.getTime() < Date.now()) {
      return { success: false, message: "15 dakikalik geri alma süresi dolmuş." };
    }

    await prisma.$transaction([
      prisma.student.update({
        where: { id: invite.studentId },
        data: {
          ownerId: invite.previousOwnerId,
          institutionId: invite.previousInstitutionId,
        },
      }),
      prisma.bepDocument.updateMany({
        where: { studentId: invite.studentId, ownerId: invite.acceptedById || "" },
        data: {
          ownerId: invite.previousOwnerId,
          institutionId: invite.previousInstitutionId,
        },
      }),
      prisma.courseEvaluationDocument.updateMany({
        where: { studentId: invite.studentId, ownerId: invite.acceptedById || "" },
        data: {
          ownerId: invite.previousOwnerId,
          institutionId: invite.previousInstitutionId,
        },
      }),
      prisma.evaluationDocument.updateMany({
        where: { studentId: invite.studentId, ownerId: invite.acceptedById || "" },
        data: {
          ownerId: invite.previousOwnerId,
          institutionId: invite.previousInstitutionId,
        },
      }),
      prisma.studentFile.updateMany({
        where: { studentId: invite.studentId },
        data: {
          institutionId: invite.previousInstitutionId,
        },
      }),
      prisma.familyEducationPlan.updateMany({
        where: { studentId: invite.studentId },
        data: {
          institutionId: invite.previousInstitutionId,
        },
      }),
      prisma.issuedPdfDocument.updateMany({
        where: { studentId: invite.studentId, issuedById: invite.acceptedById || "" },
        data: {
          institutionId: invite.previousInstitutionId,
          issuedById: invite.previousOwnerId,
        },
      }),
      prisma.studentTransferInvite.update({
        where: { id: invite.id },
        data: {
          status: "undone",
          canceledAt: new Date(),
        },
      }),
    ]);

    await writeAuditLog({
      actorId: user.id,
      action: "student.transfer_undone",
      entityType: "student",
      entityId: invite.studentId,
      summary: `${invite.student.firstName} ${invite.student.lastName} öğrenci devri geri alindi.`,
      metadata: {
        inviteId: invite.id,
        restoredOwnerId: invite.previousOwnerId,
        acceptedById: invite.acceptedById,
        studentId: invite.studentId,
      },
    });

    revalidatePath("/panel");
    revalidatePath("/panel/ogrenciler");
    revalidatePath(`/panel/ogrenciler/${invite.studentId}`);
    revalidatePath("/panel/bep");

    return {
      success: true,
      message: "Öğrenci devri geri alindi.",
      id: invite.studentId,
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function sendTwoFactorCodeAction(): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const normalizedEmail = user.email.toLowerCase();

    const code = crypto.randomInt(100000, 1000000).toString().padStart(6, "0");
    const codeHash = crypto.createHash("sha256").update(code).digest("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 5); // 5 minutes

    await prisma.twoFactorCode.upsert({
      where: { email: normalizedEmail },
      update: {
        codeHash,
        expiresAt,
        attempts: 0,
      },
      create: {
        email: normalizedEmail,
        codeHash,
        expiresAt,
      },
    });

    const emailContent = buildTwoFactorVerificationEmail(user.name, code);
    const emailResult = await sendTransactionalEmail({
      to: normalizedEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
      idempotencyKey: `2fa-setup-code/${normalizedEmail}/${expiresAt.getTime()}`,
    });

    if (!emailResult.success) {
      await prisma.twoFactorCode.deleteMany({
        where: { email: normalizedEmail },
      });
      return {
        success: false,
        message: "Doğrulama kodu gönderilemedi. Lutfen e-posta servis ayarlarini kontrol edin.",
      };
    }

    return {
      success: true,
      message: "6 haneli guvenlik kodu e-posta adresinize gönderildi.",
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function verifyAndEnableTwoFactorAction(code: string): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const normalizedEmail = user.email.toLowerCase();
    const trimmedCode = code.trim();

    if (!trimmedCode || trimmedCode.length !== 6) {
      return { success: false, message: "Lutfen 6 haneli doğrulama kodunu eksiksiz girin." };
    }

    const record = await prisma.twoFactorCode.findUnique({
      where: { email: normalizedEmail },
    });

    if (!record || record.expiresAt < new Date()) {
      return { success: false, message: "Doğrulama kodunun süresi dolmuş veya kod hic uretilmemis." };
    }

    const matches = record.codeHash === crypto.createHash("sha256").update(trimmedCode).digest("hex");
    if (!matches) {
      const nextAttempts = record.attempts + 1;
      if (nextAttempts >= 3) {
        await prisma.twoFactorCode.delete({ where: { email: normalizedEmail } });
        return { success: false, message: "Cok fazla hatali deneme yapildi. Lutfen yeni bir kod isteyin." };
      }

      await prisma.twoFactorCode.update({
        where: { email: normalizedEmail },
        data: { attempts: nextAttempts },
      });

      return { success: false, message: "Girilen guvenlik kodu hatali." };
    }

    // Success -> delete OTP code and enable 2FA
    await prisma.twoFactorCode.delete({ where: { email: normalizedEmail } });
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: true },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "auth.two_factor_enabled",
      entityType: "user",
      entityId: user.id,
      summary: `${user.email} iki adimli doğrulamayı (2FA) aktiflestirdi.`,
      metadata: { email: user.email, ip: await getRequestIp() },
    });

    return {
      success: true,
      message: "Iki adimli doğrulama (2FA) basariyla aktiflestirildi.",
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}

export async function verifyAndDisableTwoFactorAction(code: string): Promise<ActionResult> {
  try {
    await assertTrustedActionOrigin();
    const user = await requireUser();
    const normalizedEmail = user.email.toLowerCase();
    const trimmedCode = code.trim();

    if (!trimmedCode || trimmedCode.length !== 6) {
      return { success: false, message: "Lutfen 6 haneli doğrulama kodunu eksiksiz girin." };
    }

    const record = await prisma.twoFactorCode.findUnique({
      where: { email: normalizedEmail },
    });

    if (!record || record.expiresAt < new Date()) {
      return { success: false, message: "Doğrulama kodunun süresi dolmuş veya kod hic uretilmemis." };
    }

    const matches = record.codeHash === crypto.createHash("sha256").update(trimmedCode).digest("hex");
    if (!matches) {
      const nextAttempts = record.attempts + 1;
      if (nextAttempts >= 3) {
        await prisma.twoFactorCode.delete({ where: { email: normalizedEmail } });
        return { success: false, message: "Cok fazla hatali deneme yapildi. Lutfen yeni bir kod isteyin." };
      }

      await prisma.twoFactorCode.update({
        where: { email: normalizedEmail },
        data: { attempts: nextAttempts },
      });

      return { success: false, message: "Girilen guvenlik kodu hatali." };
    }

    // Success -> delete OTP code and disable 2FA
    await prisma.twoFactorCode.delete({ where: { email: normalizedEmail } });
    await prisma.user.update({
      where: { id: user.id },
      data: { twoFactorEnabled: false },
    });

    await writeAuditLog({
      actorId: user.id,
      action: "auth.two_factor_disabled",
      entityType: "user",
      entityId: user.id,
      summary: `${user.email} iki adimli doğrulamayı (2FA) devre disi birakti.`,
      metadata: { email: user.email, ip: await getRequestIp() },
    });

    return {
      success: true,
      message: "Iki adimli doğrulama (2FA) devre disi birakildi.",
    };
  } catch (error) {
    return {
      success: false,
      message: getReadableDbError(error),
    };
  }
}
