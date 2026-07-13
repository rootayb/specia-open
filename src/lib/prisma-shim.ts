// Prisma enum shim — SQLite enum desteklemediği için orijinal Postgres şemasındaki
// enum'lar burada sabit nesneler ve string-birlik tipleri olarak tanımlanır.
// Değerler ve isimler orijinal şema ile birebir aynıdır.
export * from "@prisma/client";
export { Prisma, PrismaClient } from "@prisma/client";

export const BepStatus = {
  draft: "draft",
  completed: "completed",
} as const;
export type BepStatus = (typeof BepStatus)[keyof typeof BepStatus];

export const BepApprovalStatus = {
  approved: "approved",
  pending: "pending",
  rejected: "rejected",
} as const;
export type BepApprovalStatus = (typeof BepApprovalStatus)[keyof typeof BepApprovalStatus];

export const BepTransferStatus = {
  pending: "pending",
  accepted: "accepted",
  undone: "undone",
  canceled: "canceled",
} as const;
export type BepTransferStatus = (typeof BepTransferStatus)[keyof typeof BepTransferStatus];

export const GoalProgressStatus = {
  not_started: "not_started",
  in_progress: "in_progress",
  completed: "completed",
  needs_support: "needs_support",
} as const;
export type GoalProgressStatus = (typeof GoalProgressStatus)[keyof typeof GoalProgressStatus];

export const LearningPhase = {
  acquisition: "acquisition",
  fluency: "fluency",
  maintenance: "maintenance",
  generalization: "generalization",
} as const;
export type LearningPhase = (typeof LearningPhase)[keyof typeof LearningPhase];

export const UserRole = {
  admin: "admin",
  institution: "institution",
  teacher: "teacher",
  parent: "parent",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const StaffEmploymentType = {
  full_time: "full_time",
  part_time: "part_time",
  consultant: "consultant",
} as const;
export type StaffEmploymentType = (typeof StaffEmploymentType)[keyof typeof StaffEmploymentType];

export const StaffModulePermission = {
  all: "all",
  overview: "overview",
  students: "students",
  bep: "bep",
  approvals: "approvals",
  documents: "documents",
  invites: "invites",
  institution: "institution",
  reports: "reports",
  schedule: "schedule",
} as const;
export type StaffModulePermission = (typeof StaffModulePermission)[keyof typeof StaffModulePermission];

export const StudentFileCategory = {
  ram_report: "ram_report",
  health_report: "health_report",
  parent_consent: "parent_consent",
  progress_report: "progress_report",
  iep_copy: "iep_copy",
  other: "other",
} as const;
export type StudentFileCategory = (typeof StudentFileCategory)[keyof typeof StudentFileCategory];

export const StudentEnrollmentType = {
  regular: "regular",
  periodic: "periodic",
} as const;
export type StudentEnrollmentType = (typeof StudentEnrollmentType)[keyof typeof StudentEnrollmentType];

export const SessionType = {
  individual: "individual",
  group: "group",
  speech: "speech",
  occupational: "occupational",
  psychomotor: "psychomotor",
  resource_room: "resource_room",
  makeup: "makeup",
  parent_meeting: "parent_meeting",
} as const;
export type SessionType = (typeof SessionType)[keyof typeof SessionType];

export const SessionStatus = {
  planned: "planned",
  completed: "completed",
  cancelled: "cancelled",
} as const;
export type SessionStatus = (typeof SessionStatus)[keyof typeof SessionStatus];

export const AttendanceOutcome = {
  attended: "attended",
  absent: "absent",
  excused: "excused",
  to_makeup: "to_makeup",
  cancelled: "cancelled",
} as const;
export type AttendanceOutcome = (typeof AttendanceOutcome)[keyof typeof AttendanceOutcome];

export const CalendarEventScope = {
  institution: "institution",
  personal: "personal",
} as const;
export type CalendarEventScope = (typeof CalendarEventScope)[keyof typeof CalendarEventScope];

export const CoordinationMeetingType = {
  parent_meeting: "parent_meeting",
  ram_meeting: "ram_meeting",
  coordination: "coordination",
  other: "other",
} as const;
export type CoordinationMeetingType = (typeof CoordinationMeetingType)[keyof typeof CoordinationMeetingType];

export const CoordinationMeetingStatus = {
  planned: "planned",
  completed: "completed",
  cancelled: "cancelled",
} as const;
export type CoordinationMeetingStatus = (typeof CoordinationMeetingStatus)[keyof typeof CoordinationMeetingStatus];

export const CoordinationActionStatus = {
  open: "open",
  completed: "completed",
  cancelled: "cancelled",
} as const;
export type CoordinationActionStatus = (typeof CoordinationActionStatus)[keyof typeof CoordinationActionStatus];

export const ZumreMeetingStatus = {
  draft: "draft",
  completed: "completed",
} as const;
export type ZumreMeetingStatus = (typeof ZumreMeetingStatus)[keyof typeof ZumreMeetingStatus];

export const InvoiceCustomerType = {
  individual: "individual",
  corporate: "corporate",
} as const;
export type InvoiceCustomerType = (typeof InvoiceCustomerType)[keyof typeof InvoiceCustomerType];

export const InvoiceStatus = {
  draft: "draft",
  approved: "approved",
  issued: "issued",
  paid: "paid",
  cancelled: "cancelled",
  refunded: "refunded",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const InstitutionType = {
  rehabilitation_center: "rehabilitation_center",
  public_special_education_practice_school: "public_special_education_practice_school",
} as const;
export type InstitutionType = (typeof InstitutionType)[keyof typeof InstitutionType];

export const EducationServiceType = {
  individual: "individual",
  group: "group",
  makeup: "makeup",
  other: "other",
} as const;
export type EducationServiceType = (typeof EducationServiceType)[keyof typeof EducationServiceType];

export const EntitlementClaimStatus = {
  preliminary: "preliminary",
  meb_verified: "meb_verified",
  reconciled: "reconciled",
  discrepancy: "discrepancy",
  ready_to_invoice: "ready_to_invoice",
  invoiced: "invoiced",
} as const;
export type EntitlementClaimStatus = (typeof EntitlementClaimStatus)[keyof typeof EntitlementClaimStatus];

export const MebSubmissionStatus = {
  not_submitted: "not_submitted",
  submitted: "submitted",
  approved: "approved",
  rejected: "rejected",
  missing_documents: "missing_documents",
  resubmitted: "resubmitted",
} as const;
export type MebSubmissionStatus = (typeof MebSubmissionStatus)[keyof typeof MebSubmissionStatus];

export const MebImportStatus = {
  processing: "processing",
  completed: "completed",
  failed: "failed",
} as const;
export type MebImportStatus = (typeof MebImportStatus)[keyof typeof MebImportStatus];

export const MebImportRowStatus = {
  matched: "matched",
  unmatched: "unmatched",
  duplicate: "duplicate",
  rejected: "rejected",
  invalid: "invalid",
} as const;
export type MebImportRowStatus = (typeof MebImportRowStatus)[keyof typeof MebImportRowStatus];

export const InvoicePaymentMethod = {
  bank_transfer: "bank_transfer",
  cash: "cash",
  card: "card",
  other: "other",
} as const;
export type InvoicePaymentMethod = (typeof InvoicePaymentMethod)[keyof typeof InvoicePaymentMethod];

export const InvoicePaymentKind = {
  collection: "collection",
  refund: "refund",
} as const;
export type InvoicePaymentKind = (typeof InvoicePaymentKind)[keyof typeof InvoicePaymentKind];

export const StaffExpenseCategory = {
  salary: "salary",
  bonus: "bonus",
  per_session_fee: "per_session_fee",
  sgk_tax: "sgk_tax",
  other: "other",
} as const;
export type StaffExpenseCategory = (typeof StaffExpenseCategory)[keyof typeof StaffExpenseCategory];

export const StaffExpenseStatus = {
  planned: "planned",
  paid: "paid",
} as const;
export type StaffExpenseStatus = (typeof StaffExpenseStatus)[keyof typeof StaffExpenseStatus];

export const InstitutionApplicationStatus = {
  new: "new",
  reviewing: "reviewing",
  approved: "approved",
  rejected: "rejected",
} as const;
export type InstitutionApplicationStatus = (typeof InstitutionApplicationStatus)[keyof typeof InstitutionApplicationStatus];

export const PlatformIncidentStatus = {
  investigating: "investigating",
  identified: "identified",
  monitoring: "monitoring",
  resolved: "resolved",
} as const;
export type PlatformIncidentStatus = (typeof PlatformIncidentStatus)[keyof typeof PlatformIncidentStatus];

export const ProductFeedbackValue = {
  like: "like",
  dislike: "dislike",
} as const;
export type ProductFeedbackValue = (typeof ProductFeedbackValue)[keyof typeof ProductFeedbackValue];

export const ProductFeedbackSource = {
  bep_completed: "bep_completed",
} as const;
export type ProductFeedbackSource = (typeof ProductFeedbackSource)[keyof typeof ProductFeedbackSource];

export const DecisionCategory = {
  school_service: "school_service",
  family_process: "family_process",
  other: "other",
} as const;
export type DecisionCategory = (typeof DecisionCategory)[keyof typeof DecisionCategory];

export const RamReportStatus = {
  active: "active",
  review_due: "review_due",
  expired: "expired",
  archived: "archived",
} as const;
export type RamReportStatus = (typeof RamReportStatus)[keyof typeof RamReportStatus];

export const TransportPlanStatus = {
  active: "active",
  paused: "paused",
  completed: "completed",
} as const;
export type TransportPlanStatus = (typeof TransportPlanStatus)[keyof typeof TransportPlanStatus];

export const ArchiveSection = {
  inspection_file: "inspection_file",
  institution_archive: "institution_archive",
} as const;
export type ArchiveSection = (typeof ArchiveSection)[keyof typeof ArchiveSection];

export const FamilyEducationPlanStatus = {
  draft: "draft",
  shared: "shared",
  applied: "applied",
  not_applied: "not_applied",
  review_due: "review_due",
  completed: "completed",
} as const;
export type FamilyEducationPlanStatus = (typeof FamilyEducationPlanStatus)[keyof typeof FamilyEducationPlanStatus];

export const FamilyEducationCadence = {
  daily: "daily",
  weekly: "weekly",
  monthly: "monthly",
} as const;
export type FamilyEducationCadence = (typeof FamilyEducationCadence)[keyof typeof FamilyEducationCadence];

export const FamilyEducationNoteType = {
  meeting_note: "meeting_note",
  family_feedback: "family_feedback",
  teacher_note: "teacher_note",
  home_program: "home_program",
} as const;
export type FamilyEducationNoteType = (typeof FamilyEducationNoteType)[keyof typeof FamilyEducationNoteType];

export const FamilyEducationResponseStatus = {
  done: "done",
  partial: "partial",
  not_done: "not_done",
} as const;
export type FamilyEducationResponseStatus = (typeof FamilyEducationResponseStatus)[keyof typeof FamilyEducationResponseStatus];

export const GeneralExpenseCategory = {
  rent: "rent",
  utilities: "utilities",
  office_supplies: "office_supplies",
  maintenance: "maintenance",
  other: "other",
} as const;
export type GeneralExpenseCategory = (typeof GeneralExpenseCategory)[keyof typeof GeneralExpenseCategory];

export const GeneralExpenseStatus = {
  planned: "planned",
  paid: "paid",
} as const;
export type GeneralExpenseStatus = (typeof GeneralExpenseStatus)[keyof typeof GeneralExpenseStatus];

export const SupportTicketStatus = {
  open: "open",
  in_progress: "in_progress",
  resolved: "resolved",
  closed: "closed",
} as const;
export type SupportTicketStatus = (typeof SupportTicketStatus)[keyof typeof SupportTicketStatus];

export const MaintenanceWindowStatus = {
  scheduled: "scheduled",
  in_progress: "in_progress",
  completed: "completed",
  cancelled: "cancelled",
} as const;
export type MaintenanceWindowStatus = (typeof MaintenanceWindowStatus)[keyof typeof MaintenanceWindowStatus];

