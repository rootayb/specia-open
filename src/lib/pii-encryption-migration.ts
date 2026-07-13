import { PrismaClient } from "@/lib/prisma-shim";

import {
  encryptBytesField,
  encryptField,
  isEncrypted,
  isEncryptedBytes,
} from "@/lib/encryption";

const BATCH_SIZE = 25;

const STUDENT_FIELDS = [
  "healthNotes",
  "behaviorNotes",
  "developmentHistory",
  "strengths",
  "improvementAreas",
  "previousSupport",
  "motherPhone",
  "fatherPhone",
  "guardianPhone",
  "homeAddress",
  "workAddress",
  "motherHomeAddress",
  "fatherHomeAddress",
  "guardianHomeAddress",
  "motherWorkAddress",
  "fatherWorkAddress",
  "guardianWorkAddress",
  "schoolName",
  "district",
  "placementDecision",
  "currentSupport",
  "supportMaterials",
  "educationAdjustments",
] as const;

type ModelConfig = {
  model: string;
  label: string;
  string?: readonly string[];
  json?: readonly string[];
  bytes?: readonly string[];
};

const MODEL_CONFIGS: readonly ModelConfig[] = [
  { model: "student", label: "Student", string: STUDENT_FIELDS },
  { model: "institutionSettings", label: "InstitutionSettings", string: ["iban"] },
  { model: "parentMessage", label: "ParentMessage", string: ["subject", "body"] },
  { model: "bepDocument", label: "BepDocument", string: ["title", "approvedByName", "rejectedByName", "rejectionReason", "learningEnvironmentText", "physicalEnvironmentText", "socialInteractionText", "digitalSupportsText", "familyFrequency", "familyMethod", "familyTrainingMethod", "generalEvaluation", "otherDecisionOne", "otherDecisionTwo", "otherDecisionThree"] },
  { model: "performanceEntry", label: "PerformanceEntry", string: ["courseName", "performanceLevel"] },
  { model: "bepPlanRow", label: "BepPlanRow", string: ["themeName", "outcomeCode", "courseName", "learningArea", "learningOutcome", "criterion", "methodTechnique", "materials", "tendencies", "evaluationMethods", "performanceResult"], json: ["processComponents", "evaluationDates"] },
  { model: "bepSupportServiceEntry", label: "BepSupportServiceEntry", string: ["serviceType", "courseName", "weeklyDuration", "responsiblePeople"] },
  { model: "bepGoalProgressEntry", label: "BepGoalProgressEntry", string: ["note", "nextStep"] },
  { model: "dailyQuickEntry", label: "DailyQuickEntry", string: ["note"] },
  { model: "specialEducationDailyDataEntry", label: "SpecialEducationDailyDataEntry", string: ["sessionLabel", "skillArea", "target", "metricType", "setting", "note", "outcome"] },
  { model: "decisionEntry", label: "DecisionEntry", string: ["title", "value"] },
  { model: "committeeMember", label: "CommitteeMember", string: ["role", "title", "fullName", "branch"] },
  { model: "subjectTeacher", label: "SubjectTeacher", string: ["courseName", "fullName"] },
  { model: "courseEvaluationDocument", label: "CourseEvaluationDocument", string: ["title", "courseName", "evaluatorName"] },
  { model: "courseEvaluationRow", label: "CourseEvaluationRow", string: ["courseName", "unitName", "learningArea", "learningOutcome", "processComponent", "result"] },
  { model: "evaluationDocument", label: "EvaluationDocument", string: ["title", "kazanim", "evaluationType", "evaluatorName"], json: ["data"] },
  { model: "studentFile", label: "StudentFile", string: ["title", "fileName", "fileUrl", "notes"], bytes: ["fileData"] },
  { model: "institutionArchiveRecord", label: "InstitutionArchiveRecord", string: ["title", "category", "documentNumber", "responsibleUnit", "fileName", "fileUrl", "notes"], bytes: ["fileData"] },
  { model: "personalNote", label: "PersonalNote", string: ["title", "content"], json: ["checklistItems"] },
  { model: "supportTicket", label: "SupportTicket", string: ["name", "subject", "message"] },
  { model: "supportTicketReply", label: "SupportTicketReply", string: ["name", "message"] },
  { model: "zumreMeetingDocument", label: "ZumreMeetingDocument", string: ["title", "educationYear", "termLabel", "meetingNo", "meetingTime", "location", "city", "district", "schoolName", "zumreName", "gradeLevel", "meetingType", "chairpersonName", "recorderName", "principalName", "principalTitle", "participants", "complianceNotes"] },
  { model: "zumreMeetingAgendaItem", label: "ZumreMeetingAgendaItem", string: ["title", "discussionText", "decisionText", "responsible", "followUpNote"] },
  { model: "coordinationMeeting", label: "CoordinationMeeting", string: ["title", "location", "participants", "summary", "decisions", "followUpPlan"] },
  { model: "coordinationActionItem", label: "CoordinationActionItem", string: ["title", "ownerLabel", "notes"] },
  { model: "calendarEvent", label: "CalendarEvent", string: ["title", "description"] },
  { model: "familyEducationPlan", label: "FamilyEducationPlan", string: ["title", "weeklyFocus", "homeActivity", "familySuggestion", "deliveryMethod", "implementationNote", "familyFeedback", "teacherNote"] },
  { model: "familyEducationResponse", label: "FamilyEducationResponse", string: ["content", "imageName"], bytes: ["imageData"] },
  { model: "familyEducationNote", label: "FamilyEducationNote", string: ["title", "content", "nextStep"] },
  { model: "specialEducationReinforcer", label: "SpecialEducationReinforcer", string: ["title", "category", "useCase", "deliveryType", "notes"] },
  { model: "sensoryRegulationMenuItem", label: "SensoryRegulationMenuItem", string: ["title", "category", "useWhen", "durationLabel", "materials", "notes"] },
  { model: "productFeedback", label: "ProductFeedback", string: ["reason"] },
  { model: "aiSuggestionLog", label: "AiSuggestionLog", string: ["prompt", "suggestion"] },
  { model: "auditLog", label: "AuditLog", string: ["summary"], json: ["metadata"] },
  { model: "mebAttendanceImportRow", label: "MebAttendanceImportRow", string: ["studentIdentityNo", "studentName", "verificationReference", "reason"], json: ["rawData"] },
];

export type PiiMigrationStats = {
  label: string;
  total: number;
  encrypted: number;
  skipped: number;
  errors: number;
};

export type PiiMigrationCursor = {
  modelIndex: number;
  recordCursor?: string;
};

type Delegate = {
  findMany(args: Record<string, unknown>): Promise<Record<string, unknown>[]>;
  update(args: Record<string, unknown>): Promise<unknown>;
};

function encryptJsonIfNeeded(value: unknown): { value: unknown; changed: boolean } {
  if (typeof value === "string") {
    if (!value || isEncrypted(value)) return { value, changed: false };
    return { value: encryptField(value), changed: true };
  }
  if (Array.isArray(value)) {
    let changed = false;
    const next = value.map((item) => {
      const result = encryptJsonIfNeeded(item);
      changed ||= result.changed;
      return result.value;
    });
    return { value: next, changed };
  }
  if (value && typeof value === "object") {
    let changed = false;
    const next = Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => {
        const result = encryptJsonIfNeeded(item);
        changed ||= result.changed;
        return [key, result.value];
      }),
    );
    return { value: next, changed };
  }
  return { value, changed: false };
}

function assertEncryptionEnv() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL ortam değişkeni bulunamadı.");
  }
  if (!process.env.DB_ENCRYPTION_KEY) {
    throw new Error("DB_ENCRYPTION_KEY ortam değişkeni bulunamadı.");
  }
  if (process.env.DB_ENCRYPTION_KEY.length !== 64) {
    throw new Error("DB_ENCRYPTION_KEY 64 hex karakter olmalıdır.");
  }
}

async function migrateModelChunk(
  client: PrismaClient,
  config: ModelConfig,
  dryRun: boolean,
  recordCursor: string | undefined,
  limit: number,
): Promise<{ stats: PiiMigrationStats; nextRecordCursor?: string }> {
  const stats: PiiMigrationStats = {
    label: config.label,
    total: 0,
    encrypted: 0,
    skipped: 0,
    errors: 0,
  };
  const delegate = (client as unknown as Record<string, Delegate>)[config.model];
  if (!delegate) {
    return { stats: { ...stats, errors: 1 } };
  }

  const batch = await delegate.findMany({
    take: limit,
    ...(recordCursor ? { skip: 1, cursor: { id: recordCursor } } : {}),
    orderBy: { id: "asc" },
  });

  stats.total += batch.length;

  for (const record of batch) {
    try {
      const updates: Record<string, unknown> = {};
      let needsUpdate = false;

      for (const field of config.string ?? []) {
        const value = record[field];
        if (typeof value === "string" && value && !isEncrypted(value)) {
          updates[field] = encryptField(value);
          needsUpdate = true;
        }
      }

      for (const field of config.json ?? []) {
        const result = encryptJsonIfNeeded(record[field]);
        if (result.changed) {
          updates[field] = result.value;
          needsUpdate = true;
        }
      }

      for (const field of config.bytes ?? []) {
        const value = record[field];
        if (value instanceof Uint8Array && value.byteLength > 0 && !isEncryptedBytes(value)) {
          updates[field] = encryptBytesField(value);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        if (!dryRun) {
          await delegate.update({
            where: { id: record.id },
            data: updates,
          });
        }
        stats.encrypted++;
      } else {
        stats.skipped++;
      }
    } catch {
      stats.errors++;
    }
  }

  return {
    stats,
    nextRecordCursor: batch.length === limit ? (batch[batch.length - 1].id as string) : undefined,
  };
}

export async function runPiiEncryptionMigration(options: {
  dryRun: boolean;
  cursor?: PiiMigrationCursor;
  maxRecords?: number;
}) {
  assertEncryptionEnv();

  const client = new PrismaClient();
  try {
    const modelIndex = Math.max(0, Math.min(options.cursor?.modelIndex ?? 0, MODEL_CONFIGS.length));
    const config = MODEL_CONFIGS[modelIndex];

    if (!config) {
      return {
        dryRun: options.dryRun,
        totals: { total: 0, encrypted: 0, skipped: 0, errors: 0 },
        results: [] as PiiMigrationStats[],
        nextCursor: undefined,
        done: true,
        progress: {
          currentModelIndex: MODEL_CONFIGS.length,
          totalModels: MODEL_CONFIGS.length,
          currentModelLabel: undefined,
        },
      };
    }

    const { stats, nextRecordCursor } = await migrateModelChunk(
      client,
      config,
      options.dryRun,
      options.cursor?.recordCursor,
      options.maxRecords ?? BATCH_SIZE,
    );
    const nextCursor = nextRecordCursor
      ? { modelIndex, recordCursor: nextRecordCursor }
      : modelIndex + 1 < MODEL_CONFIGS.length
        ? { modelIndex: modelIndex + 1 }
        : undefined;
    const results = stats.total > 0 || stats.encrypted > 0 || stats.errors > 0 ? [stats] : [];

    return {
      dryRun: options.dryRun,
      totals: results.reduce(
        (acc, item) => ({
          total: acc.total + item.total,
          encrypted: acc.encrypted + item.encrypted,
          skipped: acc.skipped + item.skipped,
          errors: acc.errors + item.errors,
        }),
        { total: 0, encrypted: 0, skipped: 0, errors: 0 },
      ),
      results,
      nextCursor,
      done: !nextCursor,
      progress: {
        currentModelIndex: modelIndex,
        totalModels: MODEL_CONFIGS.length,
        currentModelLabel: config.label,
      },
    };
  } finally {
    await client.$disconnect();
  }
}
