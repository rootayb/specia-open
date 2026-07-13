export type FinancialEducationType = "individual" | "group" | "makeup";

export type MakeupEducationType = "individual" | "group";

export type ClaimSessionInput = {
  id: string;
  studentId: string;
  sessionDate: Date;
  sessionType: string;
  attendanceVerified: boolean;
  attendanceVerificationReference?: string | null;
  makeupReference?: string | null;
  /** Telafi dersinin hangi eğitim türünün yerine geçtiği (yalnızca sessionType "makeup" iken anlamlıdır). */
  makeupEducationType?: MakeupEducationType | null;
};

/**
 * Telafi derslerinde bireysel/grup ayrımına göre sabit haftalık/aylık üst sınır
 * (mevzuat gereği; RAM raporundaki aylık telafi limitinden daha gevşek olamaz).
 */
const MAKEUP_WEEKLY_LIMIT: Record<MakeupEducationType, number> = {
  individual: 4,
  group: 2,
};
const MAKEUP_MONTHLY_LIMIT: Record<MakeupEducationType, number> = {
  individual: 8,
  group: 4,
};

export type ClaimRamInput = {
  id: string;
  studentId: string;
  reportDate: Date;
  validUntil?: Date | null;
  weeklyIndividualHours: number;
  weeklyGroupHours: number;
  monthlyIndividualHours?: number | null;
  monthlyGroupHours?: number | null;
  monthlyMakeupHours: number;
};

export type ClaimTariffInput = {
  id: string;
  educationType: FinancialEducationType;
  startDate: Date;
  endDate?: Date | null;
  amount: number;
  taxRate: number;
  officialBasis: string;
};

export type CalculatedClaimLine = {
  studentId: string;
  educationType: FinancialEducationType;
  tariffId: string;
  scheduledCount: number;
  verifiedCount: number;
  eligibleCount: number;
  rejectedCount: number;
  ramMonthlyLimit: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  rejectionReasons: string[];
};

export type ClaimCalculationResult = {
  lines: CalculatedClaimLine[];
  calculatedAmount: number;
  exclusions: Array<{ sessionId: string; reason: string }>;
};

const BIOMETRIC_REQUIRED_FROM = new Date("2026-05-01T00:00:00.000Z");

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function educationTypeOf(sessionType: string): FinancialEducationType | null {
  if (sessionType === "parent_meeting") return null;
  if (sessionType === "group") return "group";
  if (sessionType === "makeup") return "makeup";
  return "individual";
}

function weekKey(value: Date) {
  const date = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${date.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}

function monthKey(value: Date) {
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}`;
}

function activeRamForSession(rams: ClaimRamInput[], session: ClaimSessionInput) {
  return rams
    .filter(
      (ram) =>
        ram.studentId === session.studentId &&
        ram.reportDate <= session.sessionDate &&
        (!ram.validUntil || ram.validUntil >= session.sessionDate),
    )
    .sort((left, right) => right.reportDate.getTime() - left.reportDate.getTime())[0];
}

function tariffForSession(
  tariffs: ClaimTariffInput[],
  educationType: FinancialEducationType,
  sessionDate: Date,
) {
  return tariffs
    .filter(
      (tariff) =>
        tariff.educationType === educationType &&
        tariff.startDate <= sessionDate &&
        (!tariff.endDate || tariff.endDate >= sessionDate),
    )
    .sort((left, right) => right.startDate.getTime() - left.startDate.getTime())[0];
}

function limitsFor(
  ram: ClaimRamInput,
  educationType: FinancialEducationType,
  makeupSubType: MakeupEducationType | null,
) {
  if (educationType === "group") {
    return {
      weekly: ram.weeklyGroupHours,
      monthly: ram.monthlyGroupHours ?? ram.weeklyGroupHours * 4,
    };
  }
  if (educationType === "makeup") {
    const subType = makeupSubType ?? "individual";
    return {
      weekly: MAKEUP_WEEKLY_LIMIT[subType],
      monthly: Math.min(ram.monthlyMakeupHours, MAKEUP_MONTHLY_LIMIT[subType]),
    };
  }
  return {
    weekly: ram.weeklyIndividualHours,
    monthly: ram.monthlyIndividualHours ?? ram.weeklyIndividualHours * 4,
  };
}

export function calculateEntitlementClaim(input: {
  sessions: ClaimSessionInput[];
  rams: ClaimRamInput[];
  tariffs: ClaimTariffInput[];
}): ClaimCalculationResult {
  const buckets = new Map<
    string,
    Omit<CalculatedClaimLine, "subtotal" | "taxAmount" | "totalAmount">
  >();
  const weeklyUsage = new Map<string, number>();
  const monthlyUsage = new Map<string, number>();
  const exclusions: ClaimCalculationResult["exclusions"] = [];

  for (const session of [...input.sessions].sort(
    (left, right) => left.sessionDate.getTime() - right.sessionDate.getTime(),
  )) {
    const educationType = educationTypeOf(session.sessionType);
    if (!educationType) continue;

    const tariff = tariffForSession(input.tariffs, educationType, session.sessionDate);
    if (!tariff) {
      exclusions.push({ sessionId: session.id, reason: "Ders tarihinde yürürlükte tarife yok." });
      continue;
    }

    const ram = activeRamForSession(input.rams, session);
    const key = `${session.studentId}:${educationType}:${tariff.id}`;
    const line = buckets.get(key) ?? {
      studentId: session.studentId,
      educationType,
      tariffId: tariff.id,
      scheduledCount: 0,
      verifiedCount: 0,
      eligibleCount: 0,
      rejectedCount: 0,
      ramMonthlyLimit: 0,
      unitPrice: tariff.amount,
      taxRate: tariff.taxRate,
      rejectionReasons: [],
    };
    line.scheduledCount += 1;

    const reject = (reason: string) => {
      line.rejectedCount += 1;
      if (!line.rejectionReasons.includes(reason)) line.rejectionReasons.push(reason);
      exclusions.push({ sessionId: session.id, reason });
    };

    if (
      !session.attendanceVerified ||
      !session.attendanceVerificationReference?.trim()
    ) {
      reject(
        session.sessionDate >= BIOMETRIC_REQUIRED_FROM
          ? "BKDS biyometrik devam doğrulaması bulunmuyor."
          : "Doğrulanmış devam kaydı bulunmuyor.",
      );
      buckets.set(key, line);
      continue;
    }
    line.verifiedCount += 1;

    const makeupSubType: MakeupEducationType | null =
      educationType === "makeup" ? session.makeupEducationType ?? "individual" : null;

    if (educationType === "makeup" && !session.makeupReference?.trim()) {
      reject("Telafi dersinin dayanak referansı bulunmuyor.");
      buckets.set(key, line);
      continue;
    }

    if (!ram) {
      reject("Ders tarihinde geçerli aktif RAM raporu bulunmuyor.");
      buckets.set(key, line);
      continue;
    }

    const limits = limitsFor(ram, educationType, makeupSubType);
    line.ramMonthlyLimit = Math.max(line.ramMonthlyLimit, limits.monthly);
    const usageBucket = educationType === "makeup" ? `makeup:${makeupSubType}` : educationType;
    const weeklyKey = `${session.studentId}:${usageBucket}:${weekKey(session.sessionDate)}`;
    const monthlyKey = `${session.studentId}:${usageBucket}:${monthKey(session.sessionDate)}`;
    const usedThisWeek = weeklyUsage.get(weeklyKey) ?? 0;
    const usedThisMonth = monthlyUsage.get(monthlyKey) ?? 0;

    if (usedThisWeek >= limits.weekly) {
      reject(
        educationType === "makeup"
          ? `Haftalık telafi hakkı aşıldı (${makeupSubType === "individual" ? "bireysel" : "grup"}).`
          : "RAM haftalık ders hakkı aşıldı.",
      );
    } else if (usedThisMonth >= limits.monthly) {
      reject(
        educationType === "makeup"
          ? `Aylık telafi hakkı aşıldı (${makeupSubType === "individual" ? "bireysel" : "grup"}).`
          : "RAM aylık ders hakkı aşıldı.",
      );
    } else {
      line.eligibleCount += 1;
      weeklyUsage.set(weeklyKey, usedThisWeek + 1);
      monthlyUsage.set(monthlyKey, usedThisMonth + 1);
    }

    buckets.set(key, line);
  }

  const lines = Array.from(buckets.values()).map((line) => {
    const subtotal = roundMoney(line.eligibleCount * line.unitPrice);
    const taxAmount = roundMoney(subtotal * (line.taxRate / 100));
    return {
      ...line,
      subtotal,
      taxAmount,
      totalAmount: roundMoney(subtotal + taxAmount),
    };
  });

  return {
    lines,
    calculatedAmount: roundMoney(lines.reduce((sum, line) => sum + line.totalAmount, 0)),
    exclusions,
  };
}

export type InvoicePaymentState = "unpaid" | "partial" | "paid" | "refunded";

export function calculateInvoicePaymentState(input: {
  invoiceTotal: number;
  payments: Array<{ amount: number; kind: "collection" | "refund" }>;
}) {
  const collected = roundMoney(
    input.payments.reduce(
      (sum, payment) => sum + (payment.kind === "refund" ? -payment.amount : payment.amount),
      0,
    ),
  );
  const remaining = roundMoney(Math.max(input.invoiceTotal - collected, 0));
  let state: InvoicePaymentState = "unpaid";
  if (collected < 0 || (collected === 0 && input.payments.some((item) => item.kind === "refund"))) {
    state = "refunded";
  } else if (collected >= input.invoiceTotal && input.invoiceTotal > 0) {
    state = "paid";
  } else if (collected > 0) {
    state = "partial";
  }
  return { state, collected, remaining };
}

export function calculateInvoiceItemsTotal(
  items: Array<{ quantity: number; unitPrice: number; taxRate: number }>,
) {
  return roundMoney(
    items.reduce((sum, item) => {
      const subtotal = item.quantity * item.unitPrice;
      return sum + subtotal + subtotal * (item.taxRate / 100);
    }, 0),
  );
}
