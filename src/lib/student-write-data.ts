import type { StudentInput } from "@/lib/schemas";
import { parseDate } from "@/lib/utils";

export function buildStudentWriteData(input: StudentInput) {
  const isPeriodic = input.enrollmentType === "periodic";

  return {
    enrollmentType: input.enrollmentType,
    enrollmentStartDate: isPeriodic ? parseDate(input.enrollmentStartDate) : null,
    enrollmentEndDate: isPeriodic ? parseDate(input.enrollmentEndDate) : null,
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    kademe: input.kademe?.trim() || null,
    classroom: input.classroom?.trim() || null,
    schoolNumber: input.schoolNumber?.trim() || null,
    schoolName: input.schoolName?.trim() || null,
    birthDate: parseDate(input.birthDate),
    district: input.district?.trim() || null,
    placementDecision: input.placementDecision?.trim() || null,
    diagnosis: input.diagnosis?.trim() || null,
    previousSupport: input.previousSupport?.trim() || null,
    currentSupport: input.currentSupport?.trim() || null,
    supportMaterials: input.supportMaterials?.trim() || null,
    healthNotes: input.healthNotes?.trim() || null,
    educationAdjustments: input.educationAdjustments?.trim() || null,
    bepStartDate: parseDate(input.bepStartDate),
    bepEndDate: parseDate(input.bepEndDate),
    motherName: input.motherName?.trim() || null,
    motherPhone: input.motherPhone?.trim() || null,
    fatherName: input.fatherName?.trim() || null,
    fatherPhone: input.fatherPhone?.trim() || null,
    guardianName: input.guardianName?.trim() || null,
    guardianPhone: input.guardianPhone?.trim() || null,
    motherHomeAddress: input.motherHomeAddress?.trim() || null,
    fatherHomeAddress: input.fatherHomeAddress?.trim() || null,
    guardianHomeAddress: input.guardianHomeAddress?.trim() || null,
    homeAddress: input.guardianHomeAddress?.trim() || input.homeAddress?.trim() || null,
    motherWorkAddress: input.motherWorkAddress?.trim() || null,
    fatherWorkAddress: input.fatherWorkAddress?.trim() || null,
    guardianWorkAddress: input.guardianWorkAddress?.trim() || null,
    workAddress: input.guardianWorkAddress?.trim() || input.workAddress?.trim() || null,
    developmentHistory: input.developmentHistory?.trim() || null,
    strengths: input.strengths?.trim() || null,
    improvementAreas: input.improvementAreas?.trim() || null,
    behaviorNotes: input.behaviorNotes?.trim() || null,
  };
}
