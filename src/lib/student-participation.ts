import type { Prisma, StudentEnrollmentType } from "@/lib/prisma-shim";

type StudentParticipation = {
  enrollmentType: StudentEnrollmentType;
  isActive: boolean;
  enrollmentStartDate: Date | null;
  enrollmentEndDate: Date | null;
};

export function getActiveStudentParticipationWhere(
  date: Date = new Date(),
): Prisma.StudentWhereInput {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  return {
    isActive: true,
    OR: [
      { enrollmentType: "regular" },
      {
        enrollmentType: "periodic",
        AND: [
          {
            OR: [
              { enrollmentStartDate: null },
              { enrollmentStartDate: { lte: targetDate } },
            ],
          },
          {
            OR: [
              { enrollmentEndDate: null },
              { enrollmentEndDate: { gte: targetDate } },
            ],
          },
        ],
      },
    ],
  };
}

export function isStudentAvailableOnDate(
  student: StudentParticipation,
  date: Date,
) {
  if (!student.isActive) {
    return false;
  }

  if (student.enrollmentType === "regular") {
    return true;
  }

  const targetTime = new Date(date).setHours(0, 0, 0, 0);
  const startTime = student.enrollmentStartDate
    ? new Date(student.enrollmentStartDate).setHours(0, 0, 0, 0)
    : null;
  const endTime = student.enrollmentEndDate
    ? new Date(student.enrollmentEndDate).setHours(0, 0, 0, 0)
    : null;

  return (startTime === null || startTime <= targetTime) && (endTime === null || endTime >= targetTime);
}
