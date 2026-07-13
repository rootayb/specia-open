import type {
  BepDocument,
  BepSupportServiceEntry,
  CommitteeMember,
  CourseEvaluationDocument,
  CourseEvaluationRow,
  DecisionEntry,
  PerformanceEntry,
  BepPlanRow,
  SubjectTeacher,
  Student,
} from "@/lib/prisma-shim";

import { buildCourseEvaluationDocumentMeta } from "@/lib/course-evaluation";
import { derivePlanRowDateSummary, getProcessComponentLabels, parseProcessComponentSchedules } from "@/lib/process-component-schedules";
import type { BepDocumentInput, CourseEvaluationDocumentInput, StudentInput } from "@/lib/schemas";
import { formatDateInput } from "@/lib/utils";

type StudentRecord = Student;

type BepRecord = BepDocument & {
  performanceEntries: PerformanceEntry[];
  planRows: BepPlanRow[];
  supportServiceEntries: BepSupportServiceEntry[];
  decisionEntries: DecisionEntry[];
  committeeMembers: CommitteeMember[];
  subjectTeachers: SubjectTeacher[];
};

type CourseEvaluationRecord = CourseEvaluationDocument & {
  rows: CourseEvaluationRow[];
};

export function serializeStudentForForm(student: StudentRecord): StudentInput {
  return {
    id: student.id,
    enrollmentType: student.enrollmentType as "regular" | "periodic",
    isActive: student.isActive,
    enrollmentStartDate: formatDateInput(student.enrollmentStartDate),
    enrollmentEndDate: formatDateInput(student.enrollmentEndDate),
    firstName: student.firstName,
    lastName: student.lastName,
    kademe: student.kademe ?? "",
    classroom: student.classroom ?? "",
    schoolNumber: student.schoolNumber ?? "",
    schoolName: student.schoolName ?? "",
    birthDate: formatDateInput(student.birthDate),
    district: student.district ?? "",
    placementDecision: student.placementDecision ?? "",
    diagnosis: student.diagnosis ?? "",
    previousSupport: student.previousSupport ?? "",
    currentSupport: student.currentSupport ?? "",
    supportMaterials: student.supportMaterials ?? "",
    healthNotes: student.healthNotes ?? "",
    educationAdjustments: student.educationAdjustments ?? "",
    bepStartDate: formatDateInput(student.bepStartDate),
    bepEndDate: formatDateInput(student.bepEndDate),
    motherName: student.motherName ?? "",
    motherPhone: student.motherPhone ?? "",
    fatherName: student.fatherName ?? "",
    fatherPhone: student.fatherPhone ?? "",
    guardianName: student.guardianName ?? "",
    guardianPhone: student.guardianPhone ?? "",
    motherHomeAddress: student.motherHomeAddress ?? "",
    fatherHomeAddress: student.fatherHomeAddress ?? "",
    guardianHomeAddress: student.guardianHomeAddress ?? student.homeAddress ?? "",
    homeAddress: student.homeAddress ?? "",
    motherWorkAddress: student.motherWorkAddress ?? "",
    fatherWorkAddress: student.fatherWorkAddress ?? "",
    guardianWorkAddress: student.guardianWorkAddress ?? student.workAddress ?? "",
    workAddress: student.workAddress ?? "",
    developmentHistory: student.developmentHistory ?? "",
    strengths: student.strengths ?? "",
    improvementAreas: student.improvementAreas ?? "",
    behaviorNotes: student.behaviorNotes ?? "",
  };
}

export function serializeBepForForm(document: BepRecord): BepDocumentInput {
  return {
    id: document.id,
    studentId: document.studentId,
    title: document.title,
    status: document.status as "draft" | "completed",
    startDate: formatDateInput(document.startDate),
    endDate: formatDateInput(document.endDate),
    learningEnvironmentText: document.learningEnvironmentText ?? "",
    physicalEnvironmentText: document.physicalEnvironmentText ?? "",
    socialInteractionText: document.socialInteractionText ?? "",
    digitalSupportsText: document.digitalSupportsText ?? "",
    familyFrequency: document.familyFrequency ?? "",
    familyMethod: document.familyMethod ?? "",
    familyTrainingRequired: document.familyTrainingRequired,
    familyTrainingMethod: document.familyTrainingMethod ?? "",
    nextMeetingDate: formatDateInput(document.nextMeetingDate),
    generalEvaluation: document.generalEvaluation ?? "",
    otherDecisionOne: document.otherDecisionOne ?? "",
    otherDecisionTwo: document.otherDecisionTwo ?? "",
    otherDecisionThree: document.otherDecisionThree ?? "",
    performanceEntries: document.performanceEntries
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => ({
        id: entry.id,
        sortOrder: entry.sortOrder,
        courseName: entry.courseName,
        performanceLevel: entry.performanceLevel,
      })),
    planRows: document.planRows
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((row) => {
        const fallbackStartDate = formatDateInput(row.startDate);
        const fallbackEndDate = formatDateInput(row.endDate);
        const fallbackEvaluationDates = Array.isArray(row.evaluationDates)
          ? (row.evaluationDates as string[])
          : [];
        const processComponentSchedules = parseProcessComponentSchedules(row.processComponents, {
          fallbackStartDate,
          fallbackEndDate,
          fallbackEvaluationDates,
        });
        const summaryDates = derivePlanRowDateSummary(processComponentSchedules);

        return {
          id: row.id,
          sortOrder: row.sortOrder,
          courseId: row.courseId ?? "",
          themeName: row.themeName ?? "",
          outcomeCode: row.outcomeCode ?? "",
          courseName: row.courseName,
          learningArea: row.learningArea,
          learningOutcome: row.learningOutcome,
          processComponents: getProcessComponentLabels(row.processComponents, {
            fallbackStartDate,
            fallbackEndDate,
            fallbackEvaluationDates,
          }),
          processComponentSchedules,
          criterion: row.criterion ?? "",
          methodTechnique: row.methodTechnique ?? "",
          materials: row.materials ?? "",
          tendencies: row.tendencies ?? "",
          startDate: summaryDates.startDate || fallbackStartDate,
          endDate: summaryDates.endDate || fallbackEndDate,
          evaluationMethods: row.evaluationMethods ?? "",
          evaluationDates:
            summaryDates.evaluationDates.length > 0
              ? summaryDates.evaluationDates
              : fallbackEvaluationDates,
          performanceResult: row.performanceResult ?? "",
          isManualEntry: row.isManualEntry,
        };
      }),
    supportServiceEntries: (
      document.supportServiceEntries.length > 0
        ? document.supportServiceEntries
        : document.decisionEntries
            .filter((entry) => entry.category === "school_service")
            .map((entry) => ({
              id: entry.id,
              sortOrder: entry.sortOrder,
              serviceType: entry.title,
              courseName: entry.value,
              weeklyDuration: "",
              responsiblePeople: "",
            }))
    )
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => ({
        id: entry.id,
        sortOrder: entry.sortOrder,
        serviceType: entry.serviceType ?? "",
        courseName: entry.courseName ?? "",
        weeklyDuration: entry.weeklyDuration ?? "",
        responsiblePeople: entry.responsiblePeople ?? "",
      })),
    decisionEntries: document.decisionEntries
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((entry) => ({
        id: entry.id,
        category: entry.category as "other" | "school_service" | "family_process",
        sortOrder: entry.sortOrder,
        title: entry.title,
        value: entry.value,
      })),
    committeeMembers: document.committeeMembers
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((member) => ({
        id: member.id,
        sortOrder: member.sortOrder,
        role: member.role,
        title: member.title ?? "",
        fullName: member.fullName ?? "",
        branch: member.branch ?? "",
      })),
    subjectTeachers: document.subjectTeachers
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((teacher) => ({
        id: teacher.id,
        sortOrder: teacher.sortOrder,
        courseName: teacher.courseName ?? "",
        fullName: teacher.fullName ?? "",
      })),
  };
}

export function serializeCourseEvaluationForForm(
  document: CourseEvaluationRecord,
): CourseEvaluationDocumentInput {
  const rows: CourseEvaluationDocumentInput["rows"] = document.rows
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row) => ({
      id: row.id,
      sortOrder: row.sortOrder,
      courseId: row.courseId ?? document.courseId,
      courseName: row.courseName ?? document.courseName,
      unitName: row.unitName,
      learningArea: row.learningArea,
      learningOutcome: row.learningOutcome,
      processComponent: row.processComponent ?? "",
      result: row.result === "+" || row.result === "-" ? row.result : "",
    }));
  const meta = buildCourseEvaluationDocumentMeta(rows.map((row) => row.courseId));

  return {
    id: document.id,
    studentId: document.studentId,
    title: document.title,
    courseId: document.courseId,
    courseName: document.courseName,
    selectedCourseIds: meta.selectedCourseIds,
    evaluatorName: document.evaluatorName ?? "",
    evaluationDate: formatDateInput(document.evaluationDate),
    rows,
  };
}

