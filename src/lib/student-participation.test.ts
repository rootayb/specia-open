import { describe, expect, it } from "vitest";

import { isStudentAvailableOnDate } from "@/lib/student-participation";

const regularStudent = {
  enrollmentType: "regular" as const,
  isActive: true,
  enrollmentStartDate: null,
  enrollmentEndDate: null,
};

describe("isStudentAvailableOnDate", () => {
  it("keeps active regular students available", () => {
    expect(isStudentAvailableOnDate(regularStudent, new Date("2026-06-13"))).toBe(true);
  });

  it("excludes archived students", () => {
    expect(
      isStudentAvailableOnDate(
        { ...regularStudent, isActive: false },
        new Date("2026-06-13"),
      ),
    ).toBe(false);
  });

  it("includes both boundary dates for periodic students", () => {
    const student = {
      enrollmentType: "periodic" as const,
      isActive: true,
      enrollmentStartDate: new Date("2026-06-01"),
      enrollmentEndDate: new Date("2026-06-30"),
    };

    expect(isStudentAvailableOnDate(student, new Date("2026-06-01"))).toBe(true);
    expect(isStudentAvailableOnDate(student, new Date("2026-06-30"))).toBe(true);
  });

  it("excludes periodic students outside their participation dates", () => {
    const student = {
      enrollmentType: "periodic" as const,
      isActive: true,
      enrollmentStartDate: new Date("2026-06-01"),
      enrollmentEndDate: new Date("2026-06-30"),
    };

    expect(isStudentAvailableOnDate(student, new Date("2026-05-31"))).toBe(false);
    expect(isStudentAvailableOnDate(student, new Date("2026-07-01"))).toBe(false);
  });
});
