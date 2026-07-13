import { describe, expect, it } from "vitest";

import { institutionSessionSchema, studentSchema } from "@/lib/schemas";

const baseStudent = {
  firstName: "Deniz",
  lastName: "Yilmaz",
};

describe("studentSchema", () => {
  it("requires participation dates for periodic students", () => {
    const result = studentSchema.safeParse({
      ...baseStudent,
      enrollmentType: "periodic",
    });

    expect(result.success).toBe(false);
  });

  it("rejects an end date before the start date", () => {
    const result = studentSchema.safeParse({
      ...baseStudent,
      enrollmentType: "periodic",
      enrollmentStartDate: "2026-06-30",
      enrollmentEndDate: "2026-06-01",
    });

    expect(result.success).toBe(false);
  });
});

describe("institutionSessionSchema", () => {
  it("requires a configured time slot", () => {
    const result = institutionSessionSchema.safeParse({
      studentId: "student-1",
      teacherId: "",
      roomId: "",
      timeSlotId: "",
      sessionDate: "2026-06-13",
      startTime: "09:00",
      durationMinutes: 40,
      sessionType: "individual",
      status: "planned",
      notes: "",
    });

    expect(result.success).toBe(false);
  });
});
