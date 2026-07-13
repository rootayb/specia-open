import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "institution", "teacher", "parent"]);
export const staffEmploymentTypeSchema = z.enum(["full_time", "part_time", "consultant"]);
export const staffModulePermissionSchema = z.enum([
  "all",
  "overview",
  "students",
  "bep",
  "approvals",
  "documents",
  "invites",
  "institution",
  "reports",
  "schedule",
]);
export const sessionTypeSchema = z.enum([
  "individual",
  "group",
  "speech",
  "occupational",
  "psychomotor",
  "resource_room",
  "makeup",
  "parent_meeting",
]);
export const sessionStatusSchema = z.enum(["planned", "completed", "cancelled"]);
export const attendanceOutcomeSchema = z.enum([
  "attended",
  "absent",
  "excused",
  "to_makeup",
  "cancelled",
]);
export const makeupEducationTypeSchema = z.enum(["individual", "group"]);
export const calendarEventScopeSchema = z.enum(["institution", "personal"]);
export const coordinationMeetingTypeSchema = z.enum([
  "parent_meeting",
  "ram_meeting",
  "coordination",
  "other",
]);
export const coordinationMeetingStatusSchema = z.enum(["planned", "completed", "cancelled"]);
export const coordinationActionStatusSchema = z.enum(["open", "completed", "cancelled"]);
export const zumreMeetingStatusSchema = z.enum(["draft", "completed"]);
export const invoiceCustomerTypeSchema = z.enum(["individual", "corporate"]);
export const invoiceStatusSchema = z.enum(["draft", "approved", "issued", "paid", "cancelled", "refunded"]);
export const institutionTypeSchema = z.enum([
  "rehabilitation_center",
  "public_special_education_practice_school",
]);
export const ramReportStatusSchema = z.enum(["active", "review_due", "expired", "archived"]);
export const transportPlanStatusSchema = z.enum(["active", "paused", "completed"]);
export const archiveSectionSchema = z.enum(["inspection_file", "institution_archive"]);
export const familyEducationPlanStatusSchema = z.enum([
  "draft",
  "shared",
  "applied",
  "not_applied",
  "review_due",
  "completed",
]);
export const familyEducationCadenceSchema = z.enum(["daily", "weekly", "monthly"]);
export const familyEducationNoteTypeSchema = z.enum([
  "meeting_note",
  "family_feedback",
  "teacher_note",
  "home_program",
]);
export const goalProgressStatusSchema = z.enum([
  "not_started",
  "in_progress",
  "completed",
  "needs_support",
]);
export const learningPhaseSchema = z.enum([
  "acquisition",
  "fluency",
  "maintenance",
  "generalization",
]);
export const institutionApplicationStatusSchema = z.enum([
  "new",
  "reviewing",
  "approved",
  "rejected",
]);
export const platformIncidentStatusSchema = z.enum([
  "investigating",
  "identified",
  "monitoring",
  "resolved",
]);

export const registerSchema = z.object({
  name: z.string().min(2, "Ad soyad zorunludur."),
  email: z.string().email("Gecerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalidir."),
  inviteCode: z.string().optional(),
});

export const verifyRegistrationCodeSchema = z.object({
  email: z.string().email("Gecerli bir e-posta girin."),
  code: z.string().regex(/^\d{6}$/, "6 haneli kod girin."),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Gecerli bir e-posta girin."),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Sifirlama bağlantısı geçersiz."),
    password: z.string().min(8, "Şifre en az 8 karakter olmalidir."),
    confirmPassword: z.string().min(8, "Şifre tekrari en az 8 karakter olmalidir."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler ayni olmalidir.",
    path: ["confirmPassword"],
  });

const studentBaseSchema = z.object({
  id: z.string().optional(),
  enrollmentType: z.enum(["regular", "periodic"]).default("regular"),
  isActive: z.boolean().default(true),
  enrollmentStartDate: z.string().optional(),
  enrollmentEndDate: z.string().optional(),
  firstName: z.string().min(1, "Öğrenci adı zorunludur."),
  lastName: z.string().min(1, "Öğrenci soyadi zorunludur."),
  kademe: z.string().optional(),
  classroom: z.string().optional(),
  schoolNumber: z.string().optional(),
  schoolName: z.string().optional(),
  birthDate: z.string().optional(),
  district: z.string().optional(),
  placementDecision: z.string().optional(),
  diagnosis: z.string().optional(),
  previousSupport: z.string().optional(),
  currentSupport: z.string().optional(),
  supportMaterials: z.string().optional(),
  healthNotes: z.string().optional(),
  educationAdjustments: z.string().optional(),
  bepStartDate: z.string().optional(),
  bepEndDate: z.string().optional(),
  motherName: z.string().optional(),
  motherPhone: z.string().optional(),
  fatherName: z.string().optional(),
  fatherPhone: z.string().optional(),
  guardianName: z.string().optional(),
  guardianPhone: z.string().optional(),
  motherHomeAddress: z.string().optional(),
  fatherHomeAddress: z.string().optional(),
  guardianHomeAddress: z.string().optional(),
  homeAddress: z.string().optional(),
  motherWorkAddress: z.string().optional(),
  fatherWorkAddress: z.string().optional(),
  guardianWorkAddress: z.string().optional(),
  workAddress: z.string().optional(),
  developmentHistory: z.string().optional(),
  strengths: z.string().optional(),
  improvementAreas: z.string().optional(),
  behaviorNotes: z.string().optional(),
});

function validateStudentEnrollment(
  data: z.infer<typeof studentBaseSchema>,
  context: z.RefinementCtx,
) {
  if (data.enrollmentType !== "periodic") {
    return;
  }

  if (!data.enrollmentStartDate) {
    context.addIssue({
      code: "custom",
      message: "Donemsel öğrenci için katilim başlangıçı zorunludur.",
      path: ["enrollmentStartDate"],
    });
  }

  if (!data.enrollmentEndDate) {
    context.addIssue({
      code: "custom",
      message: "Donemsel öğrenci için katilim bitisi zorunludur.",
      path: ["enrollmentEndDate"],
    });
  }

  if (
    data.enrollmentStartDate &&
    data.enrollmentEndDate &&
    new Date(data.enrollmentEndDate).getTime() < new Date(data.enrollmentStartDate).getTime()
  ) {
    context.addIssue({
      code: "custom",
      message: "Katilim bitis tarihi başlangıç tarihinden once olamaz.",
      path: ["enrollmentEndDate"],
    });
  }
}

export const studentSchema = studentBaseSchema.superRefine(validateStudentEnrollment);

export const bulkStudentImportSchema = z.object({
  rows: z
    .array(studentBaseSchema.omit({ id: true }).superRefine(validateStudentEnrollment))
    .min(1, "En az bir öğrenci satiri ekleyin."),
});

export const setStudentActiveSchema = z.object({
  id: z.string().min(1, "Öğrenci seçimi geçersiz."),
  isActive: z.boolean(),
});

export const performanceEntrySchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  courseName: z.string().min(1, "Ders adı zorunludur."),
  performanceLevel: z.string().min(1, "Performans duzeyi zorunludur."),
});

export const processComponentScheduleSchema = z.object({
  label: z.string().min(1, "Surec bileseni zorunludur."),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  evaluationDate: z.string().optional().default(""),
});

export const planRowSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  courseId: z.string().optional(),
  themeName: z.string().optional(),
  outcomeCode: z.string().optional(),
  courseName: z.string().min(1, "Ders adı zorunludur."),
  learningArea: z.string().min(1, "Ogrenme alani zorunludur."),
  learningOutcome: z.string().min(1, "Ogrenme çıktısı zorunludur."),
  processComponents: z.array(z.string()).default([]),
  processComponentSchedules: z.array(processComponentScheduleSchema).default([]),
  criterion: z.string().optional(),
  methodTechnique: z.string().optional(),
  materials: z.string().optional(),
  tendencies: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  evaluationMethods: z.string().optional(),
  evaluationDates: z.array(z.string()).default([]),
  performanceResult: z.string().optional(),
  isManualEntry: z.boolean().default(false),
});

export const bulkBepPlanRowSchema = planRowSchema.omit({
  id: true,
  sortOrder: true,
});

export const decisionEntrySchema = z.object({
  id: z.string().optional(),
  category: z.enum(["school_service", "family_process", "other"]),
  sortOrder: z.number().int().nonnegative(),
  title: z.string().min(1, "Baslik zorunludur."),
  value: z.string().min(1, "Içerik zorunludur."),
});

export const bepSupportServiceEntrySchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  serviceType: z.string().min(1, "Hizmet türü zorunludur."),
  courseName: z.string().optional(),
  weeklyDuration: z.string().optional(),
  responsiblePeople: z.string().optional(),
});

export const committeeMemberSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  role: z.string().min(1, "Rol zorunludur."),
  title: z.string().optional(),
  fullName: z.string().optional(),
  branch: z.string().optional(),
});

export const subjectTeacherSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  courseName: z.string().optional(),
  fullName: z.string().optional(),
});

export const courseEvaluationRowSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  courseId: z.string().min(1, "Ders seçimi zorunludur."),
  courseName: z.string().min(1, "Ders adı zorunludur."),
  unitName: z.string().min(1, "Unite bilgisi zorunludur."),
  learningArea: z.string().min(1, "Ogrenme alani zorunludur."),
  learningOutcome: z.string().min(1, "Ogrenme çıktısı zorunludur."),
  processComponent: z.string().optional(),
  result: z.union([z.literal("+"), z.literal("-"), z.literal("")]).default(""),
});

export const courseEvaluationDocumentSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  title: z.string().min(1, "Belge basligi zorunludur."),
  courseId: z.string().min(1, "Ders seçimi zorunludur."),
  courseName: z.string().min(1, "Ders adı zorunludur."),
  selectedCourseIds: z.array(z.string().min(1)).min(1, "En az bir ders seçin."),
  evaluatorName: z.string().optional(),
  evaluationDate: z.string().optional(),
  rows: z.array(courseEvaluationRowSchema).default([]),
});

export const bepApprovalStatusSchema = z.enum(["approved", "pending", "rejected"]);

export const bepDocumentSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  title: z.string().min(1, "Belge basligi zorunludur."),
  status: z.enum(["draft", "completed"]).default("draft"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  learningEnvironmentText: z.string().optional(),
  physicalEnvironmentText: z.string().optional(),
  socialInteractionText: z.string().optional(),
  digitalSupportsText: z.string().optional(),
  familyFrequency: z.string().optional(),
  familyMethod: z.string().optional(),
  familyTrainingRequired: z.boolean().default(false),
  familyTrainingMethod: z.string().optional(),
  nextMeetingDate: z.string().optional(),
  generalEvaluation: z.string().optional(),
  otherDecisionOne: z.string().optional(),
  otherDecisionTwo: z.string().optional(),
  otherDecisionThree: z.string().optional(),
  performanceEntries: z.array(performanceEntrySchema).default([]),
  planRows: z.array(planRowSchema).default([]),
  supportServiceEntries: z.array(bepSupportServiceEntrySchema).default([]),
  decisionEntries: z.array(decisionEntrySchema).default([]),
  committeeMembers: z.array(committeeMemberSchema).default([]),
  subjectTeachers: z.array(subjectTeacherSchema).default([]),
});

export const bulkBepCreateSchema = z.object({
  studentIds: z.array(z.string().min(1)).min(1, "En az bir öğrenci seçin."),
  title: z.string().min(1, "BEP basligi zorunludur."),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  skipExisting: z.boolean().default(true),
  planRows: z.array(bulkBepPlanRowSchema).default([]),
});

export const productFeedbackSchema = z.object({
  documentId: z.string().min(1, "Geri bildirim için belge seçimi zorunludur."),
  source: z.enum(["bep_completed"]).default("bep_completed"),
  value: z.enum(["like", "dislike"]),
  reason: z.string().optional(),
});

export const deleteProductFeedbackSchema = z.object({
  id: z.string().min(1, "Geri bildirim seçimi zorunludur."),
});

export const bepGoalProgressEntrySchema = z.object({
  id: z.string().optional(),
  documentId: z.string().min(1, "BEP seçimi zorunludur."),
  planRowId: z.string().min(1, "Amaç seçimi zorunludur."),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  status: goalProgressStatusSchema.default("in_progress"),
  phase: learningPhaseSchema.default("acquisition"),
  progressPercent: z.coerce.number().int().min(0).max(100).default(0),
  note: z.string().optional(),
  nextStep: z.string().optional(),
  measuredAt: z.string().min(1, "Izleme tarihi zorunludur."),
});

export const deleteBepGoalProgressEntrySchema = z.object({
  id: z.string().min(1, "Ilerleme kaydı seçimi zorunludur."),
});

export const studentFileCategorySchema = z.enum([
  "ram_report",
  "health_report",
  "parent_consent",
  "progress_report",
  "iep_copy",
  "other",
]);

export const studentFileSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().optional(),
  folderId: z.string().optional(),
  title: z.string().min(1, "Belge basligi zorunludur."),
  category: studentFileCategorySchema.default("other"),
  fileName: z.string().optional(),
  fileUrl: z.string().url("Gecerli bir bağlantı girin.").optional().or(z.literal("")),
  uploadedFileName: z.string().optional(),
  uploadedMimeType: z.string().optional(),
  uploadedBase64: z.string().optional(),
  notes: z.string().optional(),
  documentDate: z.string().optional(),
  expiresAt: z.string().optional(),
});

export const studentFileFolderSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Klasor adı zorunludur."),
});

export const deleteStudentFileFolderSchema = z.object({
  id: z.string().min(1, "Klasor seçimi zorunludur."),
});

export const bepApprovalActionSchema = z.object({
  documentId: z.string().min(1, "Belge seçimi zorunludur."),
});

export const createBepTransferInviteSchema = z.object({
  documentId: z.string().min(1, "BEP seçimi zorunludur."),
});

export const acceptBepTransferInviteSchema = z.object({
  token: z.string().min(16, "BEP devir bağlantısı geçersiz."),
});

export const undoBepTransferInviteSchema = z.object({
  inviteId: z.string().min(1, "BEP devir kaydı seçimi zorunludur."),
});

export const createStudentTransferInviteSchema = z.object({
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
});

export const acceptStudentTransferInviteSchema = z.object({
  token: z.string().min(16, "Öğrenci devir bağlantısı geçersiz."),
});

export const undoStudentTransferInviteSchema = z.object({
  inviteId: z.string().min(1, "Öğrenci devir kaydı seçimi zorunludur."),
});

export const bepRejectionSchema = z.object({
  documentId: z.string().min(1, "Belge seçimi zorunludur."),
  rejectionReason: z.string().min(3, "Ret gerekcesi zorunludur."),
});

export const parentStudentLinkSchema = z.object({
  parentId: z.string().min(1, "Veli seçimi zorunludur."),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
});

export const parentStudentUnlinkSchema = z.object({
  parentId: z.string().min(1, "Veli seçimi zorunludur."),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
});

export const adminUserRoleSchema = z.object({
  userId: z.string().min(1, "Kullanıcı seçimi zorunludur."),
  role: userRoleSchema,
});

export const adminUpdateUserInstitutionSchema = z.object({
  userId: z.string().min(1, "Kullanıcı seçimi zorunludur."),
  institutionId: z.string().nullable(),
});

export const adminCreateUserSchema = z.object({
  name: z.string().min(2, "Ad soyad zorunludur."),
  email: z.string().email("Gecerli bir e-posta girin."),
  password: z.string().min(8, "Şifre en az 8 karakter olmalidir."),
  role: userRoleSchema,
  institutionId: z.string().optional(),
});

export const institutionCreateSchema = z.object({
  name: z.string().min(2, "Kurum adı zorunludur."),
  type: institutionTypeSchema.default("rehabilitation_center"),
  slug: z
    .string()
    .min(2, "Kurum kısa adı zorunludur.")
    .regex(/^[a-z0-9-]+$/, "Sadece kucuk harf, rakam ve tire kullanin."),
});

export const institutionSaveSchema = institutionCreateSchema.extend({
  id: z.string().optional(),
});

export const deleteInstitutionSchema = z.object({
  id: z.string().min(1, "Kurum seçimi zorunludur."),
});

export const deleteBepDocumentSchema = z.object({
  id: z.string().min(1, "BEP seçimi zorunludur."),
});

export const institutionApplicationSchema = z.object({
  institutionName: z.string().min(2, "Kurum adı zorunludur."),
  institutionType: institutionTypeSchema.default("rehabilitation_center"),
  contactName: z.string().min(2, "Yetkili adı zorunludur."),
  email: z.string().email("Gecerli bir e-posta girin."),
  phone: z.string().optional(),
  message: z.string().optional(),
});

export const institutionApplicationReviewSchema = z.object({
  id: z.string().min(1, "Başvuru seçimi zorunludur."),
  status: institutionApplicationStatusSchema,
  adminNotes: z.string().optional(),
  sendEmail: z.boolean().optional(),
});

export const deleteInstitutionApplicationSchema = z.object({
  id: z.string().min(1, "Başvuru seçimi zorunludur."),
});

export const platformAnnouncementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Duyuru basligi zorunludur."),
  summary: z.string().optional(),
  content: z.string().min(5, "Duyuru icerigi zorunludur."),
  isActive: z.boolean().default(true),
  showAsPopup: z.boolean().default(true),
});

export const togglePlatformAnnouncementSchema = z.object({
  id: z.string().min(1, "Duyuru seçimi zorunludur."),
  isActive: z.boolean(),
});

export const deletePlatformAnnouncementSchema = z.object({
  id: z.string().min(1, "Duyuru seçimi zorunludur."),
});

export const platformStatusIncidentSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(4, "Incident basligi zorunludur."),
  summary: z.string().optional(),
  serviceLabel: z.string().optional(),
  status: platformIncidentStatusSchema.default("investigating"),
  isActive: z.boolean().default(true),
  startedAt: z.string().min(1, "Başlangıç tarihi zorunludur."),
  resolvedAt: z.string().optional(),
});

export const platformStatusIncidentUpdateSchema = z.object({
  id: z.string().optional(),
  incidentId: z.string().min(1, "Incident seçimi zorunludur."),
  status: platformIncidentStatusSchema,
  message: z.string().min(6, "Guncelleme metni zorunludur."),
});

export const deletePlatformStatusIncidentSchema = z.object({
  id: z.string().min(1, "Incident seçimi zorunludur."),
});

export const deletePlatformStatusIncidentUpdateSchema = z.object({
  id: z.string().min(1, "Incident guncellemesi seçimi zorunludur."),
});

export const inviteCodeCreateSchema = z.object({
  role: z.enum(["teacher", "parent"]),
  email: z.string().email("Gecerli bir e-posta girin.").optional().or(z.literal("")),
  studentId: z.string().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(30).default(7),
});

export const deleteInviteCodeSchema = z.object({
  id: z.string().min(1, "Davet kodu seçimi zorunludur."),
});

export const adminUserStateSchema = z.object({
  userId: z.string().min(1, "Kullanıcı seçimi zorunludur."),
  isActive: z.boolean(),
  suspendedUntil: z.string().optional().nullable(),
});

export const adminDeleteUserSchema = z.object({
  userId: z.string().min(1, "Kullanıcı seçimi zorunludur."),
});

export const institutionSettingsSchema = z.object({
  schoolName: z.string().optional(),
  district: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().optional(),
  principalName: z.string().optional(),
  principalTitle: z.string().optional(),
  defaultManagerName: z.string().optional(),
  defaultManagerTitle: z.string().optional(),
  legalName: z.string().optional(),
  taxOffice: z.string().optional(),
  taxNumber: z.string().optional(),
  mersisNumber: z.string().optional(),
  iban: z.string().optional(),
  invoicePrefix: z.string().optional(),
  notes: z.string().optional(),
  logoBase64: z.string().optional(),
  logoMimeType: z.string().optional(),
  logoFileName: z.string().optional(),
  removeLogo: z.boolean().optional(),
});

export const platformMaintenanceSettingsSchema = z
  .object({
    maintenanceEnabled: z.boolean().default(false),
    maintenanceEndsAt: z.string().optional(),
    maintenanceMessage: z
      .string()
      .max(240, "Bakim mesaji en fazla 240 karakter olabilir.")
      .optional(),
  })
  .superRefine((data, ctx) => {
    const endsAt = data.maintenanceEndsAt?.trim();

    if (data.maintenanceEnabled && !endsAt) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maintenanceEndsAt"],
        message: "Bakim aktifken bitis tarihi zorunludur.",
      });
      return;
    }

    if (!endsAt) {
      return;
    }

    const parsed = new Date(endsAt);
    if (Number.isNaN(parsed.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maintenanceEndsAt"],
        message: "Gecerli bir bitis tarihi girin.",
      });
      return;
    }

    if (data.maintenanceEnabled && parsed.getTime() <= Date.now()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maintenanceEndsAt"],
        message: "Bakim bitis zamani gelecekte olmalidir.",
      });
    }
  });

export const maintenanceWindowSchema = z
  .object({
    id: z.string().optional(),
    title: z
      .string()
      .min(3, "Başlık en az 3 karakter olmalıdır.")
      .max(100, "Başlık en fazla 100 karakter olabilir."),
    description: z.string().max(500, "Açıklama en fazla 500 karakter olabilir.").optional().or(z.literal("")),
    startsAt: z.string().min(1, "Başlangıç tarihi zorunludur."),
    endsAt: z.string().min(1, "Bitiş tarihi zorunludur."),
    autoActivate: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startsAt);
    const end = new Date(data.endsAt);

    if (Number.isNaN(start.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startsAt"],
        message: "Geçerli bir başlangıç tarihi girin.",
      });
      return;
    }

    if (Number.isNaN(end.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Geçerli bir bitiş tarihi girin.",
      });
      return;
    }

    if (end.getTime() <= start.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.",
      });
    }
  });

export const appVersionInfoSchema = z.object({
  platform: z.enum(["ios", "android"]),
  currentVersion: z
    .string()
    .trim()
    .min(1, "Güncel sürüm numarası zorunludur.")
    .max(20, "Sürüm numarası en fazla 20 karakter olabilir."),
  minRequiredVersion: z
    .string()
    .trim()
    .min(1, "Minimum sürüm numarası zorunludur.")
    .max(20, "Sürüm numarası en fazla 20 karakter olabilir."),
  forceUpdate: z.boolean().default(false),
  message: z.string().trim().max(500, "Mesaj en fazla 500 karakter olabilir.").optional().or(z.literal("")),
  appStoreUrl: z
    .string()
    .trim()
    .max(300, "Bağlantı en fazla 300 karakter olabilir.")
    .optional()
    .or(z.literal("")),
});

export type AppVersionInfoInput = z.infer<typeof appVersionInfoSchema>;

export const institutionInvoiceSchema = z.object({
  id: z.string().optional(),
  customerType: invoiceCustomerTypeSchema.default("individual"),
  status: invoiceStatusSchema.default("issued"),
  issueDate: z.string().min(1, "Fatura tarihi zorunludur."),
  dueDate: z.string().optional(),
  customerName: z.string().min(2, "Musteri adı zorunludur."),
  customerTitle: z.string().optional(),
  customerIdentityNo: z.string().optional(),
  customerTaxOffice: z.string().optional(),
  customerTaxNumber: z.string().optional(),
  customerEmail: z.string().email("Gecerli bir e-posta girin.").optional().or(z.literal("")),
  customerPhone: z.string().optional(),
  billingAddress: z.string().optional(),
  serviceTitle: z.string().min(2, "Hizmet basligi zorunludur."),
  serviceDescription: z.string().optional(),
  servicePeriod: z.string().optional(),
  quantity: z.coerce.number().positive("Miktar 0'dan buyuk olmalidir."),
  unitPrice: z.coerce.number().positive("Birim tutar 0'dan buyuk olmalidir."),
  taxRate: z.coerce.number().min(0).max(100).default(20),
  notes: z.string().optional(),
});

export const deleteInstitutionInvoiceSchema = z.object({
  id: z.string().min(1, "Fatura seçimi zorunludur."),
});

export const generateEntitlementInvoiceDraftsSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Dönem YYYY-AA formatinda olmalidir."),
  unitPrice: z.coerce.number().positive("Birim tutar 0'dan buyuk olmalidir."),
  taxRate: z.coerce.number().min(0).max(100).default(0),
});

export const updateEntitlementInvoiceStatusSchema = z.object({
  id: z.string().min(1, "Fatura seçimi zorunludur."),
  status: z.enum(["approved", "issued", "paid", "cancelled", "refunded"]),
});

export const financialTariffSchema = z.object({
  id: z.string().optional(),
  educationType: z.enum(["individual", "group", "makeup"]),
  startDate: z.string().min(1, "Başlangıç tarihi zorunludur."),
  endDate: z.string().optional(),
  amount: z.coerce.number().positive("Tarife tutari 0'dan buyuk olmalidir."),
  monthlyAmount: z.coerce.number().positive().optional(),
  monthlyHours: z.coerce.number().int().positive().optional(),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  officialBasis: z.string().min(2, "Resmi dayanak zorunludur."),
  isActive: z.boolean().default(true),
});

export const deleteFinancialTariffSchema = z.object({
  id: z.string().min(1, "Tarife seçimi zorunludur."),
});

export const calculateEntitlementClaimSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/, "Dönem YYYY-AA formatinda olmalidir."),
});

export const updateEntitlementClaimStatusSchema = z.object({
  id: z.string().min(1, "Hak edis seçimi zorunludur."),
  status: z.enum([
    "preliminary",
    "meb_verified",
    "reconciled",
    "discrepancy",
    "ready_to_invoice",
    "invoiced",
  ]),
});

export const mebSubmissionStatusSchema = z.enum([
  "not_submitted",
  "submitted",
  "approved",
  "rejected",
  "missing_documents",
  "resubmitted",
]);

export const updateMebSubmissionStatusSchema = z.object({
  id: z.string().min(1, "Hak edis seçimi zorunludur."),
  mebSubmissionStatus: mebSubmissionStatusSchema,
  reason: z.string().optional(),
});

export const institutionInvoicePaymentSchema = z.object({
  invoiceId: z.string().min(1, "Fatura seçimi zorunludur."),
  paymentDate: z.string().min(1, "Ödeme tarihi zorunludur."),
  amount: z.coerce.number().positive("Tutar 0'dan buyuk olmalidir."),
  method: z.enum(["bank_transfer", "cash", "card", "other"]),
  kind: z.enum(["collection", "refund"]).default("collection"),
  reference: z.string().optional(),
  notes: z.string().optional(),
});

export const deleteInstitutionInvoicePaymentSchema = z.object({
  id: z.string().min(1, "Ödeme kaydı seçimi zorunludur."),
});

export const staffExpenseCategorySchema = z.enum([
  "salary",
  "bonus",
  "per_session_fee",
  "sgk_tax",
  "other",
]);

export const staffExpenseStatusSchema = z.enum(["planned", "paid"]);

export const staffExpenseSchema = z
  .object({
    id: z.string().optional(),
    staffUserId: z.string().optional(),
    staffName: z.string().optional(),
    staffRole: z.string().optional(),
    category: staffExpenseCategorySchema.default("salary"),
    status: staffExpenseStatusSchema.default("planned"),
    period: z.string().regex(/^\d{4}-\d{2}$/, "Dönem YYYY-AA formatinda olmalidir."),
    amount: z.coerce.number().positive("Tutar 0'dan buyuk olmalidir."),
    paymentDate: z.string().optional(),
    paymentMethod: z.enum(["bank_transfer", "cash", "card", "other"]).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => Boolean(data.staffUserId) || (data.staffName?.trim().length ?? 0) >= 2, {
    message: "Personel secilmeli veya adı girilmelidir.",
    path: ["staffName"],
  });

export const deleteStaffExpenseSchema = z.object({
  id: z.string().min(1, "Gider kaydı seçimi zorunludur."),
});

export const generalExpenseCategorySchema = z.enum([
  "rent",
  "utilities",
  "office_supplies",
  "maintenance",
  "other",
]);

export const generalExpenseStatusSchema = z.enum(["planned", "paid"]);

export const generalExpenseSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Gider basligi zorunludur."),
  vendorName: z.string().optional(),
  category: generalExpenseCategorySchema.default("other"),
  status: generalExpenseStatusSchema.default("planned"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Dönem YYYY-AA formatinda olmalidir."),
  amount: z.coerce.number().positive("Tutar 0'dan buyuk olmalidir."),
  paymentDate: z.string().optional(),
  paymentMethod: z.enum(["bank_transfer", "cash", "card", "other"]).optional(),
  uploadedFileName: z.string().optional(),
  uploadedMimeType: z.string().optional(),
  uploadedBase64: z.string().optional(),
  removeReceipt: z.boolean().optional(),
  ocrRawText: z.string().optional(),
  notes: z.string().optional(),
});

export const deleteGeneralExpenseSchema = z.object({
  id: z.string().min(1, "Gider kaydı seçimi zorunludur."),
});

export const institutionRamTrackingSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().optional(),
  title: z.string().min(2, "Kayıt basligi zorunludur."),
  reportNumber: z.string().optional(),
  supportCategory: z.string().optional(),
  reportDate: z.string().min(1, "Rapor tarihi zorunludur."),
  validUntil: z.string().optional(),
  weeklyIndividualHours: z.coerce.number().int().min(0).max(40).default(0),
  weeklyGroupHours: z.coerce.number().int().min(0).max(40).default(0),
  monthlyIndividualHours: z.coerce.number().int().min(0).max(200).optional(),
  monthlyGroupHours: z.coerce.number().int().min(0).max(200).optional(),
  monthlyMakeupHours: z.coerce.number().int().min(0).max(200).default(0),
  reviewDate: z.string().optional(),
  notes: z.string().optional(),
  status: ramReportStatusSchema.default("active"),
});

export const deleteInstitutionRamTrackingSchema = z.object({
  id: z.string().min(1, "RAM kaydı seçimi zorunludur."),
});

export const institutionTransportPlanSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().optional(),
  title: z.string().min(2, "Plan basligi zorunludur."),
  serviceType: z.string().min(2, "Hizmet tipi zorunludur."),
  routeName: z.string().optional(),
  pickupAddress: z.string().optional(),
  dropoffAddress: z.string().optional(),
  daysLabel: z.string().optional(),
  timeLabel: z.string().optional(),
  vehicleLabel: z.string().optional(),
  companionName: z.string().optional(),
  companionPhone: z.string().optional(),
  reviewDate: z.string().optional(),
  notes: z.string().optional(),
  status: transportPlanStatusSchema.default("active"),
});

export const deleteInstitutionTransportPlanSchema = z.object({
  id: z.string().min(1, "Plan seçimi zorunludur."),
});

export const familyEducationPlanSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  title: z.string().min(2, "Plan basligi zorunludur."),
  cadence: familyEducationCadenceSchema.default("weekly"),
  weeklyFocus: z.string().optional(),
  homeActivity: z.string().optional(),
  familySuggestion: z.string().optional(),
  deliveryMethod: z.string().optional(),
  sharedAt: z.string().optional(),
  dueDate: z.string().optional(),
  followUpDate: z.string().optional(),
  status: familyEducationPlanStatusSchema.default("draft"),
  implementationNote: z.string().optional(),
  familyFeedback: z.string().optional(),
  teacherNote: z.string().optional(),
});

export const deleteFamilyEducationPlanSchema = z.object({
  id: z.string().min(1, "Plan seçimi zorunludur."),
});

export const familyEducationNoteSchema = z.object({
  id: z.string().optional(),
  planId: z.string().min(1, "Plan seçimi zorunludur."),
  noteType: familyEducationNoteTypeSchema.default("meeting_note"),
  title: z.string().optional(),
  content: z.string().min(2, "Not icerigi zorunludur."),
  nextStep: z.string().optional(),
});

export const deleteFamilyEducationNoteSchema = z.object({
  id: z.string().min(1, "Not seçimi zorunludur."),
});

export const familyEducationResponseStatusSchema = z.enum(["done", "partial", "not_done"]);

export const familyEducationResponseSchema = z
  .object({
    id: z.string().optional(),
    planId: z.string().min(1, "Yonlendirme seçimi zorunludur."),
    status: familyEducationResponseStatusSchema.default("done"),
    content: z.string().max(4000, "Aciklama en fazla 4000 karakter olabilir.").optional(),
    uploadedFileName: z.string().optional(),
    uploadedMimeType: z.string().optional(),
    uploadedBase64: z.string().optional(),
  })
  .refine(
    (value) => Boolean(value.content?.trim()) || Boolean(value.uploadedBase64?.trim()),
    { message: "Lutfen bir aciklama yazin veya gorsel ekleyin.", path: ["content"] },
  );

export const deleteFamilyEducationResponseSchema = z.object({
  id: z.string().min(1, "Yanit seçimi zorunludur."),
});

export const reminderSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().optional().nullable(),
  title: z.string().min(2, "Baslik en az 2 karakter olmalidir.").max(200, "Baslik en fazla 200 karakter olabilir."),
  note: z.string().max(2000, "Not en fazla 2000 karakter olabilir.").optional().nullable(),
  remindAt: z.string().min(1, "Hatirlatma zamani zorunludur."),
  isCompleted: z.boolean().default(false),
});

export const deleteReminderSchema = z.object({
  id: z.string().min(1, "Silinecek hatirlatici secilmelidir."),
});

export const adminNotificationTargetSchema = z.enum(["all", "role", "institution", "user"]);

export const adminNotificationSchema = z
  .object({
    title: z.string().min(2, "Baslik en az 2 karakter olmalidir.").max(120, "Baslik en fazla 120 karakter olabilir."),
    body: z.string().min(2, "Mesaj en az 2 karakter olmalidir.").max(500, "Mesaj en fazla 500 karakter olabilir."),
    target: adminNotificationTargetSchema,
    role: z.enum(["admin", "institution", "teacher", "parent"]).optional(),
    institutionId: z.string().optional(),
    userEmail: z.string().email("Gecerli bir e-posta girin.").optional(),
  })
  .refine((data) => data.target !== "role" || Boolean(data.role), {
    message: "Rol seçimi zorunludur.",
    path: ["role"],
  })
  .refine((data) => data.target !== "institution" || Boolean(data.institutionId), {
    message: "Kurum seçimi zorunludur.",
    path: ["institutionId"],
  })
  .refine((data) => data.target !== "user" || Boolean(data.userEmail), {
    message: "Kullanıcı e-postasi zorunludur.",
    path: ["userEmail"],
  });

export const personalNoteSchema = z.object({
  id: z.string().optional(),
  folderId: z.string().optional().nullable(),
  title: z.string().max(120, "Baslik en fazla 120 karakter olabilir.").optional(),
  content: z.string().min(1, "Not icerigi zorunludur.").max(8000, "Not en fazla 8000 karakter olabilir."),
  noteType: z.enum(["text", "checklist"]).default("text"),
  checklistItems: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1, "Liste maddesi bos olamaz.").max(300, "Liste maddesi en fazla 300 karakter olabilir."),
        isDone: z.boolean().default(false),
      }),
    )
    .default([]),
  category: z.string().max(48, "Kategori en fazla 48 karakter olabilir.").optional(),
  color: z.enum(["yellow", "blue", "green", "pink", "gray"]).default("yellow"),
  isPinned: z.boolean().default(false),
});

export const deletePersonalNoteSchema = z.object({
  id: z.string().min(1, "Not seçimi zorunludur."),
});

export const personalNoteFolderSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Klasor adı zorunludur.").max(80, "Klasor adı en fazla 80 karakter olabilir."),
});

export const institutionArchiveRecordSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2, "Evrak basligi zorunludur."),
  section: archiveSectionSchema.default("institution_archive"),
  category: z.string().min(2, "Kategori zorunludur."),
  documentNumber: z.string().optional(),
  responsibleUnit: z.string().optional(),
  issuedAt: z.string().optional(),
  reviewDate: z.string().optional(),
  fileName: z.string().optional(),
  fileUrl: z.string().url("Gecerli bir bağlantı girin.").optional().or(z.literal("")),
  uploadedFileName: z.string().optional(),
  uploadedMimeType: z.string().optional(),
  uploadedBase64: z.string().optional(),
  notes: z.string().optional(),
});

export const deleteInstitutionArchiveRecordSchema = z.object({
  id: z.string().min(1, "Evrak seçimi zorunludur."),
});

export const deleteCourseEvaluationSchema = z.object({
  id: z.string().min(1, "Değerlendirme seçimi zorunludur."),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, "Ad soyad zorunludur."),
  email: z.string().email("Gecerli bir e-posta girin."),
});

export const passwordChangeSchema = z
  .object({
  currentPassword: z.string().min(6, "Mevcut şifre zorunludur."),
  newPassword: z.string().min(8, "Yeni şifre en az 8 karakter olmalidir."),
  confirmPassword: z.string().min(8, "Şifre tekrari en az 8 karakter olmalidir."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Yeni şifre ve tekrar alani ayni olmalidir.",
    path: ["confirmPassword"],
  });

export const closeAccountSchema = z.object({
  password: z.string().optional(),
  confirmationText: z
    .string()
    .min(1, "Onay metni zorunludur.")
    .superRefine((value, ctx) => {
      if (value.trim() !== "HESABIMI KAPAT") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
    message: "Onay için HESABIMI KAPAT yazin.",
        });
      }
    }),
});

export const staffProfileSchema = z.object({
  userId: z.string().min(1, "Kullanıcı seçimi zorunludur."),
  branch: z.string().optional(),
  employmentType: z.union([staffEmploymentTypeSchema, z.literal("")]).optional(),
  allowedModules: z.array(staffModulePermissionSchema).default([]),
});

export const institutionMemberStateSchema = z.object({
  userId: z.string().min(1, "Kullanıcı seçimi zorunludur."),
  isActive: z.boolean(),
});

export const removeInstitutionMemberSchema = z.object({
  userId: z.string().min(1, "Kullanıcı seçimi zorunludur."),
});

export const sessionRoomSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Oda adı zorunludur."),
  color: z.string().optional(),
});

export const deleteSessionRoomSchema = z.object({
  id: z.string().min(1, "Oda seçimi zorunludur."),
});

export const sessionTimeSlotSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Ders saati adı zorunludur."),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat HH:MM formatinda olmalidir."),
  durationMinutes: z.coerce.number().int().min(15).max(180).default(40),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const deleteSessionTimeSlotSchema = z.object({
  id: z.string().min(1, "Ders saati seçimi zorunludur."),
});

export const institutionSessionSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  teacherId: z.string().optional(),
  roomId: z.string().optional(),
  timeSlotId: z.string().min(1, "Ders saati seçimi zorunludur."),
  sessionDate: z.string().min(1, "Tarih zorunludur."),
  startTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat HH:MM formatinda olmalidir."),
  durationMinutes: z.coerce.number().int().min(15).max(180).default(40),
  sessionType: sessionTypeSchema.default("individual"),
  status: sessionStatusSchema.default("planned"),
  attendanceVerified: z.boolean().default(false),
  attendanceVerificationReference: z.string().optional(),
  attendanceOutcome: attendanceOutcomeSchema.optional(),
  makeupReference: z.string().optional(),
  makeupEducationType: makeupEducationTypeSchema.optional(),
  notes: z.string().optional(),
});

export const quickSessionNoteSchema = z.object({
  id: z.string().min(1, "Seans seçimi zorunludur."),
  status: sessionStatusSchema.default("completed"),
  notes: z.string().optional(),
});

export const deleteInstitutionSessionSchema = z.object({
  id: z.string().min(1, "Seans seçimi zorunludur."),
});

export const calendarEventSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(1, "Etkinlik basligi zorunludur."),
    description: z.string().optional(),
    scope: calendarEventScopeSchema.default("personal"),
    assignedUserId: z.string().optional(),
    studentId: z.string().optional(),
    startAt: z.string().min(1, "Başlangıç tarihi zorunludur."),
    endAt: z.string().min(1, "Bitis tarihi zorunludur."),
  })
  .refine((data) => new Date(data.endAt).getTime() > new Date(data.startAt).getTime(), {
    message: "Bitis tarihi baslangictan sonra olmalidir.",
    path: ["endAt"],
  });

export const deleteCalendarEventSchema = z.object({
  id: z.string().min(1, "Etkinlik seçimi zorunludur."),
});

export const parentMessageSchema = z.object({
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  recipientId: z.string().min(1, "Alici seçimi zorunludur."),
  subject: z.string().optional().default(""),
  body: z.string().min(5, "Mesaj en az 5 karakter olmalidir.").max(5000, "Mesaj en fazla 5000 karakter olabilir."),
  uploadedFileName: z.string().optional(),
  uploadedMimeType: z.string().optional(),
  uploadedBase64: z.string().optional(),
});

export const markParentMessageReadSchema = z.object({
  id: z.string().min(1, "Mesaj seçimi zorunludur."),
});

export const coordinationActionItemSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  title: z.string().min(1, "Takip maddesi zorunludur."),
  ownerLabel: z.string().optional(),
  dueDate: z.string().optional(),
  status: coordinationActionStatusSchema.default("open"),
  notes: z.string().optional(),
});

export const coordinationMeetingSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().optional(),
  title: z.string().min(2, "Toplantı basligi zorunludur."),
  meetingType: coordinationMeetingTypeSchema.default("parent_meeting"),
  status: coordinationMeetingStatusSchema.default("planned"),
  scheduledAt: z.string().min(1, "Toplantı tarihi zorunludur."),
  location: z.string().optional(),
  participants: z.string().optional(),
  summary: z.string().optional(),
  decisions: z.string().optional(),
  followUpPlan: z.string().optional(),
  nextMeetingAt: z.string().optional(),
  actionItems: z.array(coordinationActionItemSchema).default([]),
});

export const deleteCoordinationMeetingSchema = z.object({
  id: z.string().min(1, "Toplantı seçimi zorunludur."),
});

export const zumreMeetingAgendaItemSchema = z.object({
  id: z.string().optional(),
  sortOrder: z.number().int().nonnegative(),
  title: z.string().min(2, "Gundem basligi zorunludur."),
  discussionText: z.string().optional(),
  decisionText: z.string().optional(),
});

export const zumreMeetingDocumentSchema = z.object({
  id: z.string().optional(),
  status: zumreMeetingStatusSchema.default("draft"),
  documentType: z.enum(["zumre", "sok"]).default("zumre"),
  title: z.string().min(2, "Tutanak basligi zorunludur."),
  educationYear: z.string().min(4, "Eğitim ogretim yili zorunludur."),
  termLabel: z.string().min(2, "Dönem bilgisi zorunludur."),
  meetingNo: z.string().min(1, "Toplantı numarasi zorunludur."),
  meetingDate: z.string().min(1, "Toplantı tarihi zorunludur."),
  meetingTime: z.string().min(1, "Toplantı saati zorunludur."),
  location: z.string().min(2, "Toplantı yeri zorunludur."),
  city: z.string().optional(),
  district: z.string().optional(),
  schoolName: z.string().min(2, "Okul adı zorunludur."),
  zumreName: z.string().min(2, "Zumre adı zorunludur."),
  gradeLevel: z.string().optional(),
  meetingType: z.string().min(2, "Toplantı türü zorunludur."),
  chairpersonName: z.string().min(2, "Zumre baskani zorunludur."),
  recorderName: z.string().optional(),
  principalName: z.string().min(2, "Mudur/onaylayan adi zorunludur."),
  principalTitle: z.string().optional(),
  participants: z.string().min(2, "Katilimci bilgisi zorunludur."),
  announcementDate: z.string().optional(),
  complianceNotes: z.string().optional(),
  agendaItems: z.array(zumreMeetingAgendaItemSchema).min(1, "En az bir gundem maddesi gerekir."),
});

export const deleteZumreMeetingDocumentSchema = z.object({
  id: z.string().min(1, "Zumre tutanağı seçimi zorunludur."),
});

export const specialEducationReinforcerSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  title: z.string().min(2, "Pekiştireç basligi zorunludur."),
  category: z.string().min(2, "Kategori zorunludur."),
  useCase: z.string().optional(),
  deliveryType: z.string().optional(),
  notes: z.string().optional(),
  strengthLevel: z.coerce.number().int().min(1).max(5).default(3),
  isActive: z.boolean().default(true),
});

export const deleteSpecialEducationReinforcerSchema = z.object({
  id: z.string().min(1, "Pekiştireç seçimi zorunludur."),
});

export const sensoryRegulationMenuItemSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  title: z.string().min(2, "Menu basligi zorunludur."),
  category: z.string().min(2, "Kategori zorunludur."),
  useWhen: z.string().optional(),
  durationLabel: z.string().optional(),
  materials: z.string().optional(),
  notes: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isActive: z.boolean().default(true),
});

export const deleteSensoryRegulationMenuItemSchema = z.object({
  id: z.string().min(1, "Menu ogesi seçimi zorunludur."),
});

export const specialEducationDailyDataEntrySchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  documentId: z.string().optional(),
  measuredAt: z.string().min(1, "Olcum tarihi zorunludur."),
  sessionLabel: z.string().optional(),
  skillArea: z.string().min(2, "Beceri alani zorunludur."),
  target: z.string().min(2, "Hedef alani zorunludur."),
  metricType: z.string().min(2, "Olcum tipi zorunludur."),
  metricValue: z.coerce.number().int().min(0).max(1000).optional(),
  setting: z.string().optional(),
  note: z.string().optional(),
  outcome: z.string().optional(),
});

export const deleteSpecialEducationDailyDataEntrySchema = z.object({
  id: z.string().min(1, "Veri kaydı seçimi zorunludur."),
});

export const dailyQuickEntrySchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  documentId: z.string().min(1, "BEP seçimi zorunludur."),
  planRowId: z.string().min(1, "Hedef seçimi zorunludur."),
  value: z.coerce.number().int().min(0).max(100),
  phase: learningPhaseSchema.default("acquisition"),
  note: z.string().optional(),
  measuredAt: z.string().min(1, "Olcum tarihi zorunludur."),
});

export const deleteDailyQuickEntrySchema = z.object({
  id: z.string().min(1, "Veri kaydı seçimi zorunludur."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VerifyRegistrationCodeInput = z.infer<typeof verifyRegistrationCodeSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type StudentInput = z.infer<typeof studentSchema>;
export type BulkStudentImportInput = z.infer<typeof bulkStudentImportSchema>;
export type SetStudentActiveInput = z.infer<typeof setStudentActiveSchema>;
export type BepDocumentInput = z.infer<typeof bepDocumentSchema>;
export type BulkBepCreateInput = z.infer<typeof bulkBepCreateSchema>;
export type ProductFeedbackInput = z.infer<typeof productFeedbackSchema>;
export type DeleteProductFeedbackInput = z.infer<typeof deleteProductFeedbackSchema>;
export type BepGoalProgressEntryInput = z.infer<typeof bepGoalProgressEntrySchema>;
export type DeleteBepGoalProgressEntryInput = z.infer<typeof deleteBepGoalProgressEntrySchema>;
export type StudentFileInput = z.infer<typeof studentFileSchema>;
export type StudentFileFolderInput = z.infer<typeof studentFileFolderSchema>;
export type DeleteStudentFileFolderInput = z.infer<typeof deleteStudentFileFolderSchema>;
export type BepApprovalActionInput = z.infer<typeof bepApprovalActionSchema>;
export type CreateBepTransferInviteInput = z.infer<typeof createBepTransferInviteSchema>;
export type AcceptBepTransferInviteInput = z.infer<typeof acceptBepTransferInviteSchema>;
export type UndoBepTransferInviteInput = z.infer<typeof undoBepTransferInviteSchema>;
export type CreateStudentTransferInviteInput = z.infer<typeof createStudentTransferInviteSchema>;
export type AcceptStudentTransferInviteInput = z.infer<typeof acceptStudentTransferInviteSchema>;
export type UndoStudentTransferInviteInput = z.infer<typeof undoStudentTransferInviteSchema>;
export type BepRejectionInput = z.infer<typeof bepRejectionSchema>;
export type ParentStudentLinkInput = z.infer<typeof parentStudentLinkSchema>;
export type ParentStudentUnlinkInput = z.infer<typeof parentStudentUnlinkSchema>;
export type AdminUserRoleInput = z.infer<typeof adminUserRoleSchema>;
export type AdminUpdateUserInstitutionInput = z.infer<typeof adminUpdateUserInstitutionSchema>;
export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
export type AdminUserStateInput = z.infer<typeof adminUserStateSchema>;
export type AdminDeleteUserInput = z.infer<typeof adminDeleteUserSchema>;
export type InstitutionSettingsInput = z.infer<typeof institutionSettingsSchema>;
export type PlatformMaintenanceSettingsInput = z.infer<typeof platformMaintenanceSettingsSchema>;
export type MaintenanceWindowInput = z.infer<typeof maintenanceWindowSchema>;
export type InstitutionInvoiceInput = z.infer<typeof institutionInvoiceSchema>;
export type DeleteInstitutionInvoiceInput = z.infer<typeof deleteInstitutionInvoiceSchema>;
export type GenerateEntitlementInvoiceDraftsInput = z.infer<typeof generateEntitlementInvoiceDraftsSchema>;
export type UpdateEntitlementInvoiceStatusInput = z.infer<typeof updateEntitlementInvoiceStatusSchema>;
export type FinancialTariffInput = z.infer<typeof financialTariffSchema>;
export type DeleteFinancialTariffInput = z.infer<typeof deleteFinancialTariffSchema>;
export type CalculateEntitlementClaimInput = z.infer<typeof calculateEntitlementClaimSchema>;
export type UpdateEntitlementClaimStatusInput = z.infer<typeof updateEntitlementClaimStatusSchema>;
export type UpdateMebSubmissionStatusInput = z.infer<typeof updateMebSubmissionStatusSchema>;
export type InstitutionInvoicePaymentInput = z.infer<typeof institutionInvoicePaymentSchema>;
export type DeleteInstitutionInvoicePaymentInput = z.infer<typeof deleteInstitutionInvoicePaymentSchema>;
export type StaffExpenseInput = z.infer<typeof staffExpenseSchema>;
export type DeleteStaffExpenseInput = z.infer<typeof deleteStaffExpenseSchema>;
export type GeneralExpenseInput = z.infer<typeof generalExpenseSchema>;
export type DeleteGeneralExpenseInput = z.infer<typeof deleteGeneralExpenseSchema>;
export type InstitutionRamTrackingInput = z.infer<typeof institutionRamTrackingSchema>;
export type DeleteInstitutionRamTrackingInput = z.infer<typeof deleteInstitutionRamTrackingSchema>;
export type InstitutionTransportPlanInput = z.infer<typeof institutionTransportPlanSchema>;
export type DeleteInstitutionTransportPlanInput = z.infer<typeof deleteInstitutionTransportPlanSchema>;
export type FamilyEducationPlanInput = z.infer<typeof familyEducationPlanSchema>;
export type DeleteFamilyEducationPlanInput = z.infer<typeof deleteFamilyEducationPlanSchema>;
export type FamilyEducationNoteInput = z.infer<typeof familyEducationNoteSchema>;
export type DeleteFamilyEducationNoteInput = z.infer<typeof deleteFamilyEducationNoteSchema>;
export type FamilyEducationResponseInput = z.infer<typeof familyEducationResponseSchema>;
export type DeleteFamilyEducationResponseInput = z.infer<
  typeof deleteFamilyEducationResponseSchema
>;
export type ReminderInput = z.infer<typeof reminderSchema>;
export type DeleteReminderInput = z.infer<typeof deleteReminderSchema>;
export type AdminNotificationInput = z.infer<typeof adminNotificationSchema>;
export type PersonalNoteInput = z.input<typeof personalNoteSchema>;
export type PersonalNoteFolderInput = z.infer<typeof personalNoteFolderSchema>;
export type DeletePersonalNoteInput = z.infer<typeof deletePersonalNoteSchema>;
export type InstitutionArchiveRecordInput = z.infer<typeof institutionArchiveRecordSchema>;
export type DeleteInstitutionArchiveRecordInput = z.infer<typeof deleteInstitutionArchiveRecordSchema>;
export type CourseEvaluationRowInput = z.infer<typeof courseEvaluationRowSchema>;
export type CourseEvaluationDocumentInput = z.infer<typeof courseEvaluationDocumentSchema>;
export type DeleteCourseEvaluationInput = z.infer<typeof deleteCourseEvaluationSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type CloseAccountInput = z.infer<typeof closeAccountSchema>;
export type InstitutionCreateInput = z.infer<typeof institutionCreateSchema>;
export type InstitutionSaveInput = z.infer<typeof institutionSaveSchema>;
export type DeleteInstitutionInput = z.infer<typeof deleteInstitutionSchema>;
export type DeleteBepDocumentInput = z.infer<typeof deleteBepDocumentSchema>;
export type InstitutionApplicationInput = z.infer<typeof institutionApplicationSchema>;
export type InstitutionApplicationReviewInput = z.infer<
  typeof institutionApplicationReviewSchema
>;
export type DeleteInstitutionApplicationInput = z.infer<
  typeof deleteInstitutionApplicationSchema
>;
export type PlatformAnnouncementInput = z.infer<typeof platformAnnouncementSchema>;
export type PlatformStatusIncidentInput = z.infer<typeof platformStatusIncidentSchema>;
export type PlatformStatusIncidentUpdateInput = z.infer<
  typeof platformStatusIncidentUpdateSchema
>;
export type DeletePlatformStatusIncidentInput = z.infer<
  typeof deletePlatformStatusIncidentSchema
>;
export type DeletePlatformStatusIncidentUpdateInput = z.infer<
  typeof deletePlatformStatusIncidentUpdateSchema
>;
export type TogglePlatformAnnouncementInput = z.infer<
  typeof togglePlatformAnnouncementSchema
>;
export type DeletePlatformAnnouncementInput = z.infer<
  typeof deletePlatformAnnouncementSchema
>;
export type InviteCodeCreateInput = z.infer<typeof inviteCodeCreateSchema>;
export type DeleteInviteCodeInput = z.infer<typeof deleteInviteCodeSchema>;
export type StaffProfileInput = z.infer<typeof staffProfileSchema>;
export type InstitutionMemberStateInput = z.infer<typeof institutionMemberStateSchema>;
export type RemoveInstitutionMemberInput = z.infer<typeof removeInstitutionMemberSchema>;
export type SessionRoomInput = z.infer<typeof sessionRoomSchema>;
export type DeleteSessionRoomInput = z.infer<typeof deleteSessionRoomSchema>;
export type SessionTimeSlotInput = z.infer<typeof sessionTimeSlotSchema>;
export type DeleteSessionTimeSlotInput = z.infer<typeof deleteSessionTimeSlotSchema>;
export type InstitutionSessionInput = z.infer<typeof institutionSessionSchema>;
export type QuickSessionNoteInput = z.infer<typeof quickSessionNoteSchema>;
export type DeleteInstitutionSessionInput = z.infer<typeof deleteInstitutionSessionSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
export type DeleteCalendarEventInput = z.infer<typeof deleteCalendarEventSchema>;
export type ParentMessageInput = z.infer<typeof parentMessageSchema>;
export type MarkParentMessageReadInput = z.infer<typeof markParentMessageReadSchema>;
export type CoordinationMeetingInput = z.infer<typeof coordinationMeetingSchema>;
export type DeleteCoordinationMeetingInput = z.infer<typeof deleteCoordinationMeetingSchema>;
export type ZumreMeetingDocumentInput = z.infer<typeof zumreMeetingDocumentSchema>;
export type DeleteZumreMeetingDocumentInput = z.infer<
  typeof deleteZumreMeetingDocumentSchema
>;
export type SpecialEducationReinforcerInput = z.infer<typeof specialEducationReinforcerSchema>;
export type DeleteSpecialEducationReinforcerInput = z.infer<
  typeof deleteSpecialEducationReinforcerSchema
>;
export type SensoryRegulationMenuItemInput = z.infer<typeof sensoryRegulationMenuItemSchema>;
export type DeleteSensoryRegulationMenuItemInput = z.infer<
  typeof deleteSensoryRegulationMenuItemSchema
>;
export type SpecialEducationDailyDataEntryInput = z.infer<
  typeof specialEducationDailyDataEntrySchema
>;
export type DeleteSpecialEducationDailyDataEntryInput = z.infer<
  typeof deleteSpecialEducationDailyDataEntrySchema
>;
export type DailyQuickEntryInput = z.infer<typeof dailyQuickEntrySchema>;
export type DeleteDailyQuickEntryInput = z.infer<typeof deleteDailyQuickEntrySchema>;

export const supportTicketSchema = z.object({
  subject: z.string().min(3, "Konu en az 3 karakter olmalidir.").max(200, "Konu en fazla 200 karakter olabilir."),
  message: z.string().min(10, "Mesaj en az 10 karakter olmalidir.").max(5000, "Mesaj en fazla 5000 karakter olabilir."),
});

export const supportTicketReplySchema = z.object({
  ticketId: z.string().min(1, "Destek talebi seçimi geçersiz."),
  message: z.string().min(1, "Mesaj bos olamaz.").max(5000, "Mesaj en fazla 5000 karakter olabilir."),
});

export const supportTicketStatusSchema = z.object({
  ticketId: z.string().min(1, "Destek talebi seçimi geçersiz."),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
});

export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type SupportTicketReplyInput = z.infer<typeof supportTicketReplySchema>;
export type SupportTicketStatusInput = z.infer<typeof supportTicketStatusSchema>;

export const deleteSupportTicketSchema = z.object({
  ticketId: z.string().min(1, "Destek talebi seçimi geçersiz."),
});

export type DeleteSupportTicketInput = z.infer<typeof deleteSupportTicketSchema>;

// Blog schemas
export const blogPostSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3, "Blog başlığı en az 3 karakter olmalıdır."),
  slug: z.string().optional().nullable(),
  summary: z.string().max(500, "Özet en fazla 500 karakter olabilir.").optional().nullable(),
  content: z.string().min(10, "İçerik en az 10 karakter olmalıdır."),
  coverImage: z.string().optional().nullable(),
  category: z.string().min(1, "Kategori seçimi zorunludur."),
  authorName: z.string().max(100, "Yazar adı en fazla 100 karakter olabilir.").optional().nullable(),
  published: z.boolean().default(false),
});

export type BlogPostInput = z.infer<typeof blogPostSchema>;

export const deleteBlogPostSchema = z.object({
  id: z.string().min(1, "Silinecek blog yazısı seçilmelidir."),
});

export type DeleteBlogPostInput = z.infer<typeof deleteBlogPostSchema>;

export const toggleBlogPostPublishSchema = z.object({
  id: z.string().min(1, "Yazı seçimi zorunludur."),
  published: z.boolean(),
});

export type ToggleBlogPostPublishInput = z.infer<typeof toggleBlogPostPublishSchema>;

// Skill template schemas
export const skillTemplateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Beceri adı en az 2 karakter olmalıdır."),
  category: z.string().optional().nullable(),
  description: z.string().max(500, "Açıklama en fazla 500 karakter olabilir.").optional().nullable(),
  steps: z.array(z.string().min(1, "Basamak metni boş olamaz.")).min(1, "En az 1 basamak gerekli."),
  order: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type SkillTemplateInput = z.infer<typeof skillTemplateSchema>;

export const deleteSkillTemplateSchema = z.object({
  id: z.string().min(1, "Silinecek beceri şablonu seçilmelidir."),
});

export type DeleteSkillTemplateInput = z.infer<typeof deleteSkillTemplateSchema>;

// Evaluation schemas
export const evaluationDocumentSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  title: z.string().min(2, "Başlık zorunludur."),
  type: z.string().min(1, "Değerlendirme türü zorunludur."),
  kazanim: z.string().optional().nullable(),
  evaluationType: z.string().optional().nullable(),
  evaluationDate: z.string().optional().nullable(),
  evaluatorName: z.string().optional().nullable(),
  data: z.any().optional(),
});

export type EvaluationDocumentInput = z.infer<typeof evaluationDocumentSchema>;

export const deleteEvaluationSchema = z.object({
  id: z.string().min(1, "Silinecek değerlendirme seçilmelidir."),
});

export type DeleteEvaluationInput = z.infer<typeof deleteEvaluationSchema>;

// Student Behavior and ABC logging schemas
export const studentBehaviorSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  name: z.string().min(2, "Davranış adı en az 2 karakter olmalıdır."),
  trackingType: z.enum(["duration", "frequency"]),
});

export type StudentBehaviorInput = z.infer<typeof studentBehaviorSchema>;

export const deleteStudentBehaviorSchema = z.object({
  id: z.string().min(1, "Silinecek davranış seçilmelidir."),
});

export type DeleteStudentBehaviorInput = z.infer<typeof deleteStudentBehaviorSchema>;

export const abcLogSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Öğrenci seçimi zorunludur."),
  behaviorId: z.string().min(1, "Davranış seçimi zorunludur."),
  durationSeconds: z.number().int().nonnegative().default(0),
  frequency: z.number().int().positive().default(1),
  lessonName: z.string().optional().nullable(),
  subTopic: z.string().optional().nullable(),
  classSize: z.number().int().nonnegative().optional().nullable(),
  timestamp: z.string().optional().nullable(),
});

export type AbcLogInput = z.infer<typeof abcLogSchema>;

export const labelAbcLogSchema = z.object({
  id: z.string().min(1, "Log ID zorunludur."),
  antecedentTag: z.string().min(1, "Öncesi (Antecedent) seçimi zorunludur."),
  antecedentDisplay: z.string().min(1, "Öncesi açıklaması zorunludur."),
  consequenceTag: z.string().min(1, "Sonrası (Consequence) seçimi zorunludur."),
  consequenceDisplay: z.string().min(1, "Sonrası açıklaması zorunludur."),
  teacherNotes: z.string().max(1000, "Öğretmen notu en fazla 1000 karakter olabilir.").optional().nullable(),
});

export type LabelAbcLogInput = z.infer<typeof labelAbcLogSchema>;

export const deleteAbcLogSchema = z.object({
  id: z.string().min(1, "Silinecek kayıt seçilmelidir."),
});

export type DeleteAbcLogInput = z.infer<typeof deleteAbcLogSchema>;

