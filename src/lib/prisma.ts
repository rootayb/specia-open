import { PrismaClient } from "@/lib/prisma-shim";
import {
  decryptBytesField,
  decryptField,
  decryptJsonValue,
  encryptBytesField,
  encryptField,
  encryptJsonValue,
} from "./encryption";

// ---------------------------------------------------------------------------
// Şifrelenecek alan tanımları
// ---------------------------------------------------------------------------

const STUDENT_ENCRYPTED_FIELDS = [
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
  // Arama/sıralama sorgularında (contains/orderBy) hiç kullanılmayan, bu
  // yüzden şifrelenmesi mevcut arama davranışını bozmayan ek alanlar.
  "schoolName",
  "district",
  "placementDecision",
  "currentSupport",
  "supportMaterials",
  "educationAdjustments",
] as const;

const INSTITUTION_SETTINGS_ENCRYPTED_FIELDS = ["iban"] as const;

const PARENT_MESSAGE_ENCRYPTED_FIELDS = ["body"] as const;

type FieldEncryptionConfig = {
  string?: readonly string[];
  json?: readonly string[];
  bytes?: readonly string[];
};

const FIELD_ENCRYPTION_CONFIG = {
  aiSuggestionLog: {
    string: ["prompt", "suggestion"],
  },
  auditLog: {
    string: ["summary"],
    json: ["metadata"],
  },
  bepDocument: {
    string: [
      "title",
      "approvedByName",
      "rejectedByName",
      "rejectionReason",
      "learningEnvironmentText",
      "physicalEnvironmentText",
      "socialInteractionText",
      "digitalSupportsText",
      "familyFrequency",
      "familyMethod",
      "familyTrainingMethod",
      "generalEvaluation",
      "otherDecisionOne",
      "otherDecisionTwo",
      "otherDecisionThree",
    ],
  },
  bepGoalProgressEntry: {
    string: ["note", "nextStep"],
  },
  bepPlanRow: {
    string: [
      "themeName",
      "outcomeCode",
      "courseName",
      "learningArea",
      "learningOutcome",
      "criterion",
      "methodTechnique",
      "materials",
      "tendencies",
      "evaluationMethods",
      "performanceResult",
    ],
    json: ["processComponents", "evaluationDates"],
  },
  bepSupportServiceEntry: {
    string: ["serviceType", "courseName", "weeklyDuration", "responsiblePeople"],
  },
  calendarEvent: {
    string: ["title", "description"],
  },
  committeeMember: {
    string: ["role", "title", "fullName", "branch"],
  },
  coordinationActionItem: {
    string: ["title", "ownerLabel", "notes"],
  },
  coordinationMeeting: {
    string: ["title", "location", "participants", "summary", "decisions", "followUpPlan"],
  },
  courseEvaluationDocument: {
    string: ["title", "courseName", "evaluatorName"],
  },
  courseEvaluationRow: {
    string: [
      "courseName",
      "unitName",
      "learningArea",
      "learningOutcome",
      "processComponent",
      "result",
    ],
  },
  dailyQuickEntry: {
    string: ["note"],
  },
  decisionEntry: {
    string: ["title", "value"],
  },
  evaluationDocument: {
    string: ["title", "kazanim", "evaluationType", "evaluatorName"],
    json: ["data"],
  },
  familyEducationNote: {
    string: ["title", "content", "nextStep"],
  },
  familyEducationPlan: {
    string: [
      "title",
      "weeklyFocus",
      "homeActivity",
      "familySuggestion",
      "deliveryMethod",
      "implementationNote",
      "familyFeedback",
      "teacherNote",
    ],
  },
  familyEducationResponse: {
    string: ["content", "imageName"],
    bytes: ["imageData"],
  },
  institutionArchiveRecord: {
    string: ["title", "category", "documentNumber", "responsibleUnit", "fileName", "fileUrl", "notes"],
    bytes: ["fileData"],
  },
  mebAttendanceImportRow: {
    string: ["studentIdentityNo", "studentName", "verificationReference", "reason"],
    json: ["rawData"],
  },
  parentMessage: {
    string: ["subject", ...PARENT_MESSAGE_ENCRYPTED_FIELDS],
  },
  performanceEntry: {
    string: ["courseName", "performanceLevel"],
  },
  personalNote: {
    string: ["title", "content"],
    json: ["checklistItems"],
  },
  productFeedback: {
    string: ["reason"],
  },
  sensoryRegulationMenuItem: {
    string: ["title", "category", "useWhen", "durationLabel", "materials", "notes"],
  },
  specialEducationDailyDataEntry: {
    string: ["sessionLabel", "skillArea", "target", "metricType", "setting", "note", "outcome"],
  },
  specialEducationReinforcer: {
    string: ["title", "category", "useCase", "deliveryType", "notes"],
  },
  student: {
    string: STUDENT_ENCRYPTED_FIELDS,
  },
  studentFile: {
    string: ["title", "fileName", "fileUrl", "notes"],
    bytes: ["fileData"],
  },
  subjectTeacher: {
    string: ["courseName", "fullName"],
  },
  supportTicket: {
    string: ["name", "subject", "message"],
  },
  supportTicketReply: {
    string: ["name", "message"],
  },
  zumreMeetingAgendaItem: {
    string: ["title", "discussionText", "decisionText", "responsible", "followUpNote"],
  },
  zumreMeetingDocument: {
    string: [
      "title",
      "educationYear",
      "termLabel",
      "meetingNo",
      "meetingTime",
      "location",
      "city",
      "district",
      "schoolName",
      "zumreName",
      "gradeLevel",
      "meetingType",
      "chairpersonName",
      "recorderName",
      "principalName",
      "principalTitle",
      "participants",
      "complianceNotes",
    ],
  },
} satisfies Record<string, FieldEncryptionConfig>;

// ---------------------------------------------------------------------------
// Yardımcı: bir data nesnesindeki belirtilen alanları şifrele
// ---------------------------------------------------------------------------

function transformWriteValue(value: unknown, transform: (input: unknown) => unknown): unknown {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.prototype.hasOwnProperty.call(value, "set")
  ) {
    const operation = value as Record<string, unknown>;
    return { ...operation, set: transform(operation.set) };
  }
  return transform(value);
}

function encryptDataFields<T extends Record<string, unknown>>(data: T, config: FieldEncryptionConfig): T {
  const result = { ...data };
  for (const field of config.string ?? []) {
    const value = result[field];
    (result as Record<string, unknown>)[field] = transformWriteValue(value, (input) =>
      typeof input === "string" ? encryptField(input) : input,
    );
  }
  for (const field of config.json ?? []) {
    const value = result[field];
    (result as Record<string, unknown>)[field] = transformWriteValue(value, encryptJsonValue);
  }
  for (const field of config.bytes ?? []) {
    const value = result[field];
    (result as Record<string, unknown>)[field] = transformWriteValue(value, (input) =>
      input instanceof Uint8Array ? encryptBytesField(input) : input,
    );
  }
  return result;
}

/**
 * Prisma result extension nesnesi oluşturur — okunan şifreli alanları çözer.
 * `as Record<string, never>` ile tip uyumluluğu sağlanır.
 */
function buildResultDecryptors(config: FieldEncryptionConfig) {
  const stringDecryptors = (config.string ?? []).map((field) => [
    field,
    {
      needs: { [field]: true },
      compute(record: Record<string, unknown>) {
        return decryptField(record[field] as string | null);
      },
    },
  ]);
  const jsonDecryptors = (config.json ?? []).map((field) => [
    field,
    {
      needs: { [field]: true },
      compute(record: Record<string, unknown>) {
        return decryptJsonValue(record[field]);
      },
    },
  ]);
  const bytesDecryptors = (config.bytes ?? []).map((field) => [
    field,
    {
      needs: { [field]: true },
      compute(record: Record<string, unknown>) {
        const value = record[field];
        return value instanceof Uint8Array ? decryptBytesField(value) : value;
      },
    },
  ]);

  return Object.fromEntries(
    [...stringDecryptors, ...jsonDecryptors, ...bytesDecryptors],
  );
}

function buildQueryEncryptors(config: FieldEncryptionConfig) {
  return {
    async create({ args, query }: { args: { data: unknown }; query: (args: unknown) => unknown }) {
      args.data = encryptDataFields(args.data as Record<string, unknown>, config);
      return query(args);
    },
    async update({ args, query }: { args: { data?: unknown }; query: (args: unknown) => unknown }) {
      if (args.data) {
        args.data = encryptDataFields(args.data as Record<string, unknown>, config);
      }
      return query(args);
    },
    async upsert({
      args,
      query,
    }: {
      args: { create: unknown; update?: unknown };
      query: (args: unknown) => unknown;
    }) {
      args.create = encryptDataFields(args.create as Record<string, unknown>, config);
      if (args.update) {
        args.update = encryptDataFields(args.update as Record<string, unknown>, config);
      }
      return query(args);
    },
    async createMany({
      args,
      query,
    }: {
      args: { data: unknown | unknown[] };
      query: (args: unknown) => unknown;
    }) {
      if (Array.isArray(args.data)) {
        args.data = args.data.map((item) =>
          encryptDataFields(item as Record<string, unknown>, config),
        );
      } else {
        args.data = encryptDataFields(args.data as Record<string, unknown>, config);
      }
      return query(args);
    },
  };
}

// ---------------------------------------------------------------------------
// Prisma Client + PII Encryption Extension
// ---------------------------------------------------------------------------

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

function buildEncryptedPrisma() {
  return basePrisma.$extends({
    query: {
      aiSuggestionLog: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.aiSuggestionLog),
      auditLog: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.auditLog),
      bepDocument: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.bepDocument),
      bepGoalProgressEntry: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.bepGoalProgressEntry),
      bepPlanRow: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.bepPlanRow),
      bepSupportServiceEntry: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.bepSupportServiceEntry),
      calendarEvent: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.calendarEvent),
      committeeMember: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.committeeMember),
      coordinationActionItem: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.coordinationActionItem),
      coordinationMeeting: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.coordinationMeeting),
      courseEvaluationDocument: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.courseEvaluationDocument),
      courseEvaluationRow: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.courseEvaluationRow),
      dailyQuickEntry: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.dailyQuickEntry),
      decisionEntry: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.decisionEntry),
      evaluationDocument: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.evaluationDocument),
      familyEducationNote: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.familyEducationNote),
      familyEducationPlan: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.familyEducationPlan),
      familyEducationResponse: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.familyEducationResponse),
      institutionArchiveRecord: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.institutionArchiveRecord),
      institutionSettings: {
        async create({ args, query }) {
          args.data = encryptDataFields(
            args.data as Record<string, unknown>,
            { string: INSTITUTION_SETTINGS_ENCRYPTED_FIELDS },
          ) as typeof args.data;
          return query(args);
        },
        async update({ args, query }) {
          if (args.data) {
            args.data = encryptDataFields(
              args.data as Record<string, unknown>,
              { string: INSTITUTION_SETTINGS_ENCRYPTED_FIELDS },
            ) as typeof args.data;
          }
          return query(args);
        },
        async upsert({ args, query }) {
          args.create = encryptDataFields(
            args.create as Record<string, unknown>,
            { string: INSTITUTION_SETTINGS_ENCRYPTED_FIELDS },
          ) as typeof args.create;
          if (args.update) {
            args.update = encryptDataFields(
              args.update as Record<string, unknown>,
              { string: INSTITUTION_SETTINGS_ENCRYPTED_FIELDS },
            ) as typeof args.update;
          }
          return query(args);
        },
      },
      mebAttendanceImportRow: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.mebAttendanceImportRow),
      parentMessage: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.parentMessage),
      performanceEntry: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.performanceEntry),
      personalNote: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.personalNote),
      productFeedback: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.productFeedback),
      sensoryRegulationMenuItem: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.sensoryRegulationMenuItem),
      specialEducationDailyDataEntry: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.specialEducationDailyDataEntry),
      specialEducationReinforcer: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.specialEducationReinforcer),
      student: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.student),
      studentFile: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.studentFile),
      subjectTeacher: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.subjectTeacher),
      supportTicket: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.supportTicket),
      supportTicketReply: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.supportTicketReply),
      zumreMeetingAgendaItem: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.zumreMeetingAgendaItem),
      zumreMeetingDocument: buildQueryEncryptors(FIELD_ENCRYPTION_CONFIG.zumreMeetingDocument),
    },
    result: {
      aiSuggestionLog: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.aiSuggestionLog) as Record<string, never>,
      auditLog: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.auditLog) as Record<string, never>,
      bepDocument: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.bepDocument) as Record<string, never>,
      bepGoalProgressEntry: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.bepGoalProgressEntry) as Record<string, never>,
      bepPlanRow: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.bepPlanRow) as Record<string, never>,
      bepSupportServiceEntry: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.bepSupportServiceEntry) as Record<string, never>,
      calendarEvent: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.calendarEvent) as Record<string, never>,
      committeeMember: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.committeeMember) as Record<string, never>,
      coordinationActionItem: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.coordinationActionItem) as Record<string, never>,
      coordinationMeeting: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.coordinationMeeting) as Record<string, never>,
      courseEvaluationDocument: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.courseEvaluationDocument) as Record<string, never>,
      courseEvaluationRow: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.courseEvaluationRow) as Record<string, never>,
      dailyQuickEntry: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.dailyQuickEntry) as Record<string, never>,
      decisionEntry: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.decisionEntry) as Record<string, never>,
      evaluationDocument: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.evaluationDocument) as Record<string, never>,
      familyEducationNote: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.familyEducationNote) as Record<string, never>,
      familyEducationPlan: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.familyEducationPlan) as Record<string, never>,
      familyEducationResponse: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.familyEducationResponse) as Record<string, never>,
      institutionArchiveRecord: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.institutionArchiveRecord) as Record<string, never>,
      institutionSettings: buildResultDecryptors({ string: INSTITUTION_SETTINGS_ENCRYPTED_FIELDS }) as Record<string, never>,
      mebAttendanceImportRow: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.mebAttendanceImportRow) as Record<string, never>,
      parentMessage: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.parentMessage) as Record<string, never>,
      performanceEntry: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.performanceEntry) as Record<string, never>,
      personalNote: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.personalNote) as Record<string, never>,
      productFeedback: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.productFeedback) as Record<string, never>,
      sensoryRegulationMenuItem: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.sensoryRegulationMenuItem) as Record<string, never>,
      specialEducationDailyDataEntry: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.specialEducationDailyDataEntry) as Record<string, never>,
      specialEducationReinforcer: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.specialEducationReinforcer) as Record<string, never>,
      student: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.student) as Record<string, never>,
      studentFile: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.studentFile) as Record<string, never>,
      subjectTeacher: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.subjectTeacher) as Record<string, never>,
      supportTicket: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.supportTicket) as Record<string, never>,
      supportTicketReply: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.supportTicketReply) as Record<string, never>,
      zumreMeetingAgendaItem: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.zumreMeetingAgendaItem) as Record<string, never>,
      zumreMeetingDocument: buildResultDecryptors(FIELD_ENCRYPTION_CONFIG.zumreMeetingDocument) as Record<string, never>,
    },
  });
}

// ---------------------------------------------------------------------------
// Singleton (dev hot-reload safe)
// ---------------------------------------------------------------------------

type EncryptedPrismaClient = ReturnType<typeof buildEncryptedPrisma>;

const globalForPrisma = globalThis as unknown as {
  prisma?: EncryptedPrismaClient;
};

export const prisma: EncryptedPrismaClient =
  globalForPrisma.prisma ?? buildEncryptedPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
