import { describe, expect, it } from "vitest";

import {
  calculateEntitlementClaim,
  calculateInvoicePaymentState,
} from "@/lib/financial-compliance";

const ram = {
  id: "ram-1",
  studentId: "student-1",
  reportDate: new Date("2026-01-01"),
  validUntil: new Date("2026-12-31"),
  weeklyIndividualHours: 2,
  weeklyGroupHours: 1,
  monthlyIndividualHours: 3,
  monthlyGroupHours: 2,
  monthlyMakeupHours: 1,
};

const tariffs = [
  {
    id: "individual-old",
    educationType: "individual" as const,
    startDate: new Date("2026-01-01"),
    endDate: new Date("2026-06-14"),
    amount: 100,
    taxRate: 0,
    officialBasis: "Eski tarife",
  },
  {
    id: "individual-new",
    educationType: "individual" as const,
    startDate: new Date("2026-06-15"),
    amount: 120,
    taxRate: 10,
    officialBasis: "Yeni tarife",
  },
  {
    id: "group",
    educationType: "group" as const,
    startDate: new Date("2026-01-01"),
    amount: 50,
    taxRate: 0,
    officialBasis: "Grup tarifesi",
  },
  {
    id: "makeup",
    educationType: "makeup" as const,
    startDate: new Date("2026-01-01"),
    amount: 80,
    taxRate: 0,
    officialBasis: "Telafi tarifesi",
  },
];

function session(
  id: string,
  date: string,
  sessionType: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    studentId: "student-1",
    sessionDate: new Date(date),
    sessionType,
    attendanceVerified: true,
    attendanceVerificationReference: `BKDS-${id}`,
    makeupReference: sessionType === "makeup" ? `TELAFI-${id}` : null,
    ...overrides,
  };
}

describe("financial compliance engine", () => {
  it("splits tariff periods and individual/group/makeup services", () => {
    const result = calculateEntitlementClaim({
      sessions: [
        session("1", "2026-06-10", "individual"),
        session("2", "2026-06-16", "speech"),
        session("3", "2026-06-17", "group"),
        session("4", "2026-06-18", "makeup"),
      ],
      rams: [ram],
      tariffs,
    });

    expect(result.lines).toHaveLength(4);
    expect(result.calculatedAmount).toBe(100 + 132 + 50 + 80);
  });

  it("rejects missing verification, expired RAM and entitlement excess", () => {
    const result = calculateEntitlementClaim({
      sessions: [
        session("1", "2026-06-01", "individual"),
        session("2", "2026-06-02", "individual"),
        session("3", "2026-06-03", "individual"),
        session("4", "2026-06-04", "individual"),
        session("5", "2026-06-09", "individual", {
          attendanceVerificationReference: null,
        }),
      ],
      rams: [ram],
      tariffs,
    });

    expect(result.lines[0]?.eligibleCount).toBe(2);
    expect(result.lines[0]?.rejectedCount).toBe(3);
    expect(result.exclusions.some((item) => item.reason.includes("haftalık"))).toBe(true);
    expect(result.exclusions.some((item) => item.reason.includes("BKDS"))).toBe(true);
  });

  it("requires a makeup reference and calculates payment state independently", () => {
    const result = calculateEntitlementClaim({
      sessions: [session("1", "2026-06-10", "makeup", { makeupReference: null })],
      rams: [ram],
      tariffs,
    });
    expect(result.calculatedAmount).toBe(0);
    expect(result.lines[0]?.rejectionReasons[0]).toContain("Telafi");

    expect(
      calculateInvoicePaymentState({
        invoiceTotal: 1000,
        payments: [{ amount: 400, kind: "collection" }],
      }),
    ).toEqual({ state: "partial", collected: 400, remaining: 600 });
  });

  it("applies monthly RAM limits independently for each calendar month", () => {
    const result = calculateEntitlementClaim({
      sessions: [
        session("may-1", "2026-05-04", "individual"),
        session("may-2", "2026-05-05", "individual"),
        session("may-3", "2026-05-11", "individual"),
        session("june-1", "2026-06-01", "individual"),
      ],
      rams: [ram],
      tariffs,
    });

    expect(result.lines[0]?.eligibleCount).toBe(4);
    expect(result.lines[0]?.rejectedCount).toBe(0);
  });

  it("caps individual makeup sessions at 4 per week regardless of RAM allowance", () => {
    const generousRam = { ...ram, monthlyMakeupHours: 20 };
    const result = calculateEntitlementClaim({
      sessions: [
        session("m1", "2026-06-01", "makeup", { makeupEducationType: "individual" }),
        session("m2", "2026-06-02", "makeup", { makeupEducationType: "individual" }),
        session("m3", "2026-06-03", "makeup", { makeupEducationType: "individual" }),
        session("m4", "2026-06-04", "makeup", { makeupEducationType: "individual" }),
        session("m5", "2026-06-05", "makeup", { makeupEducationType: "individual" }),
      ],
      rams: [generousRam],
      tariffs,
    });

    expect(result.lines[0]?.eligibleCount).toBe(4);
    expect(result.lines[0]?.rejectedCount).toBe(1);
    expect(result.exclusions.some((item) => item.reason.includes("Haftalık telafi"))).toBe(true);
  });

  it("caps group makeup sessions at 2 per week, separately from individual makeup", () => {
    const generousRam = { ...ram, monthlyMakeupHours: 20 };
    const result = calculateEntitlementClaim({
      sessions: [
        session("i1", "2026-06-01", "makeup", { makeupEducationType: "individual" }),
        session("i2", "2026-06-02", "makeup", { makeupEducationType: "individual" }),
        session("g1", "2026-06-01", "makeup", { makeupEducationType: "group" }),
        session("g2", "2026-06-02", "makeup", { makeupEducationType: "group" }),
        session("g3", "2026-06-03", "makeup", { makeupEducationType: "group" }),
      ],
      rams: [generousRam],
      tariffs,
    });

    expect(result.lines[0]?.eligibleCount).toBe(4);
    expect(result.lines[0]?.rejectedCount).toBe(1);
  });

  it("never exceeds the RAM-configured monthly makeup allowance even under the regulatory cap", () => {
    const strictRam = { ...ram, monthlyMakeupHours: 2 };
    const result = calculateEntitlementClaim({
      sessions: [
        session("m1", "2026-06-01", "makeup", { makeupEducationType: "individual" }),
        session("m2", "2026-06-08", "makeup", { makeupEducationType: "individual" }),
        session("m3", "2026-06-15", "makeup", { makeupEducationType: "individual" }),
      ],
      rams: [strictRam],
      tariffs,
    });

    expect(result.lines[0]?.eligibleCount).toBe(2);
    expect(result.lines[0]?.rejectedCount).toBe(1);
    expect(result.exclusions.some((item) => item.reason.includes("Aylık telafi"))).toBe(true);
  });
});
