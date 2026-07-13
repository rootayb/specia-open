import type { BepDocumentInput, StudentInput } from "@/lib/schemas";

type CommitteeMemberDefaults = BepDocumentInput["committeeMembers"];
type SubjectTeacherDefaults = BepDocumentInput["subjectTeachers"];

export function emptyStudentValues(): StudentInput {
  return {
    enrollmentType: "regular",
    isActive: true,
    enrollmentStartDate: "",
    enrollmentEndDate: "",
    firstName: "",
    lastName: "",
    kademe: "",
    classroom: "",
    schoolNumber: "",
    schoolName: "",
    birthDate: "",
    district: "",
    placementDecision: "",
    diagnosis: "",
    previousSupport: "",
    currentSupport: "",
    supportMaterials: "",
    healthNotes: "",
    educationAdjustments: "",
    bepStartDate: "",
    bepEndDate: "",
    motherName: "",
    motherPhone: "",
    fatherName: "",
    fatherPhone: "",
    guardianName: "",
    guardianPhone: "",
    motherHomeAddress: "",
    fatherHomeAddress: "",
    guardianHomeAddress: "",
    homeAddress: "",
    motherWorkAddress: "",
    fatherWorkAddress: "",
    guardianWorkAddress: "",
    workAddress: "",
    developmentHistory: "",
    strengths: "",
    improvementAreas: "",
    behaviorNotes: "",
  };
}

function defaultCommitteeMembers(): CommitteeMemberDefaults {
  return [
    {
      sortOrder: 0,
      role: "Müdür/Müdür Yardımcısı (BEP Geliştirme Birimi Başkanı)",
      title: "",
      fullName: "",
      branch: "",
    },
    {
      sortOrder: 1,
      role: "Öğrencinin Velisi (Anne/Baba/Yasal Vasi)",
      title: "",
      fullName: "",
      branch: "",
    },
    {
      sortOrder: 2,
      role: "Öğrencinin Sınıf Öğretmeni",
      title: "",
      fullName: "",
      branch: "",
    },
  ];
}

function normalizeCommitteeMembers(
  committeeMembers?: CommitteeMemberDefaults,
): CommitteeMemberDefaults {
  const source =
    committeeMembers && committeeMembers.length > 0
      ? committeeMembers
      : defaultCommitteeMembers();

  return source.map((member, index) => ({
    sortOrder: index,
    role: member.role,
    title: member.title ?? "",
    fullName: member.fullName ?? "",
    branch: member.branch ?? "",
  }));
}

function defaultSubjectTeachers(): SubjectTeacherDefaults {
  return Array.from({ length: 6 }, (_, index) => ({
    sortOrder: index,
    courseName: "",
    fullName: "",
  }));
}

function normalizeSubjectTeachers(
  subjectTeachers?: SubjectTeacherDefaults,
): SubjectTeacherDefaults {
  const source =
    subjectTeachers && subjectTeachers.length > 0 ? subjectTeachers : defaultSubjectTeachers();

  return source.map((teacher, index) => ({
    sortOrder: index,
    courseName: teacher.courseName ?? "",
    fullName: teacher.fullName ?? "",
  }));
}

export function emptyBepValues(
  studentId: string,
  committeeMembers?: CommitteeMemberDefaults,
): BepDocumentInput {
  return {
    studentId,
    title: "2025-2026 BEP",
    status: "draft",
    startDate: "",
    endDate: "",
    learningEnvironmentText: "",
    physicalEnvironmentText: "",
    socialInteractionText: "",
    digitalSupportsText: "",
    familyFrequency: "Ayda 1 kez",
    familyMethod: "Yüz yüze görüşme + telefon bilgilendirmesi",
    familyTrainingRequired: false,
    familyTrainingMethod: "",
    nextMeetingDate: "",
    generalEvaluation: "",
    otherDecisionOne: "",
    otherDecisionTwo: "",
    otherDecisionThree: "",
    performanceEntries: [{ sortOrder: 0, courseName: "Matematik", performanceLevel: "" }],
    planRows: [
      {
        sortOrder: 0,
        courseName: "Matematik",
        learningArea: "",
        learningOutcome: "",
        processComponents: [],
        processComponentSchedules: [],
        criterion: "4/5 (%80)",
        methodTechnique: "",
        materials: "",
        tendencies: "",
        startDate: "",
        endDate: "",
        evaluationMethods: "",
        evaluationDates: [],
        performanceResult: "",
        isManualEntry: false,
      },
    ],
    supportServiceEntries: [
      {
        sortOrder: 0,
        serviceType: "",
        courseName: "",
        weeklyDuration: "",
        responsiblePeople: "",
      },
    ],
    decisionEntries: [
      {
        category: "family_process",
        sortOrder: 0,
        title: "Aile bilgilendirmesi",
        value: "Aile ayda bir kez öğrenci gelişimi hakkında bilgilendirilecektir.",
      },
    ],
    committeeMembers: normalizeCommitteeMembers(committeeMembers),
    subjectTeachers: normalizeSubjectTeachers(),
  };
}
