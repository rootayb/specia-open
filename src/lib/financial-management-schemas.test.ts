import { describe, expect, it } from "vitest";

import {
  financialTariffSchema,
  institutionInvoicePaymentSchema,
  institutionRamTrackingSchema,
  institutionSessionSchema,
} from "@/lib/schemas";

describe("financial management schemas", () => {
  it("accepts tariff and payment management inputs", () => {
    expect(
      financialTariffSchema.safeParse({
        educationType: "individual",
        startDate: "2026-06-01",
        amount: 1250,
        taxRate: 0,
        officialBasis: "2026 yılı resmi tarife kararı",
        isActive: true,
      }).success,
    ).toBe(true);

    expect(
      institutionInvoicePaymentSchema.safeParse({
        invoiceId: "invoice-1",
        paymentDate: "2026-06-14",
        amount: 500,
        method: "bank_transfer",
        kind: "collection",
      }).success,
    ).toBe(true);
  });

  it("accepts monthly RAM limits and attendance verification details", () => {
    const ram = institutionRamTrackingSchema.parse({
      title: "2026 RAM raporu",
      reportDate: "2026-01-01",
      weeklyIndividualHours: 2,
      weeklyGroupHours: 1,
      monthlyIndividualHours: 8,
      monthlyGroupHours: 4,
      monthlyMakeupHours: 1,
      status: "active",
    });
    expect(ram.monthlyIndividualHours).toBe(8);

    const session = institutionSessionSchema.parse({
      studentId: "student-1",
      timeSlotId: "slot-1",
      sessionDate: "2026-06-14",
      startTime: "09:00",
      durationMinutes: 40,
      sessionType: "makeup",
      status: "completed",
      attendanceVerified: true,
      attendanceVerificationReference: "BKDS-123",
      makeupReference: "TELAFI-456",
    });
    expect(session.attendanceVerified).toBe(true);
    expect(session.makeupReference).toBe("TELAFI-456");
  });
});
