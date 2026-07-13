import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.DOCUMENT_LINK_SECRET ||= "test-document-link-secret-at-least-32-characters-long";

const rateLimitBuckets = new Map<string, { windowStart: Date }>();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimitBucket: {
      findUnique: vi.fn(({ where }: { where: { action_key: { action: string; key: string } } }) => {
        const { action, key } = where.action_key;
        return Promise.resolve(rateLimitBuckets.get(`${action}:${key}`) ?? null);
      }),
      upsert: vi.fn(({ where }: { where: { action_key: { action: string; key: string } } }) => {
        const { action, key } = where.action_key;
        const mapKey = `${action}:${key}`;
        if (!rateLimitBuckets.has(mapKey)) {
          rateLimitBuckets.set(mapKey, { windowStart: new Date() });
        }
        return Promise.resolve(rateLimitBuckets.get(mapKey));
      }),
    },
  },
}));

import {
  buildVerifiedDocumentSession,
  canAccessIssuedDocument,
  isSecondaryCodeRequired,
  isSecondaryCodeValid,
  isSecurityCodeUnused,
  verifyVerifiedDocumentSession,
} from "@/lib/document-access-security";
import { generateTotpCode } from "@/lib/totp";

beforeEach(() => {
  rateLimitBuckets.clear();
});

describe("issued document access", () => {
  it("allows administrators", () => {
    expect(
      canAccessIssuedDocument(
        { id: "admin-1", role: "admin", institutionId: null },
        { institutionId: null, studentId: null, issuedById: null },
      ),
    ).toBe(true);
  });

  it("allows parents only for linked student documents", () => {
    const user = { id: "parent-1", role: "parent" as const, institutionId: "inst-1" };
    const record = {
      institutionId: "inst-1",
      studentId: "student-1",
      issuedById: "teacher-1",
    };

    expect(canAccessIssuedDocument(user, record, { isParentLinked: true })).toBe(true);
    expect(canAccessIssuedDocument(user, record, { isParentLinked: false })).toBe(false);
    expect(
      canAccessIssuedDocument(user, { ...record, studentId: null }, { isParentLinked: true }),
    ).toBe(false);
  });

  it("lets institution and teacher roles through regardless of scope match (gated by secondary code instead)", () => {
    const institutionUser = {
      id: "institution-1",
      role: "institution" as const,
      institutionId: "inst-1",
    };

    expect(
      canAccessIssuedDocument(institutionUser, {
        institutionId: "inst-1",
        studentId: null,
        issuedById: null,
      }),
    ).toBe(true);
    expect(
      canAccessIssuedDocument(institutionUser, {
        institutionId: "inst-2",
        studentId: null,
        issuedById: null,
      }),
    ).toBe(true);

    expect(
      canAccessIssuedDocument(
        { id: "teacher-1", role: "teacher", institutionId: "inst-1" },
        { institutionId: "inst-2", issuedById: "teacher-2" },
      ),
    ).toBe(true);
    expect(
      canAccessIssuedDocument(
        { id: "teacher-1", role: "teacher", institutionId: null },
        { institutionId: null, issuedById: "teacher-2" },
      ),
    ).toBe(true);
  });
});

describe("isSecondaryCodeRequired", () => {
  it("never requires a code for platform admins", () => {
    expect(
      isSecondaryCodeRequired(
        { id: "admin-1", role: "admin", institutionId: null },
        { institutionId: "inst-1", issuedById: "teacher-1" },
      ),
    ).toBe(false);
  });

  it("does not require a code from the document's own issuer", () => {
    expect(
      isSecondaryCodeRequired(
        { id: "teacher-1", role: "teacher", institutionId: null },
        { institutionId: null, issuedById: "teacher-1" },
      ),
    ).toBe(false);
  });

  it("does not require a code for a fellow institution member", () => {
    expect(
      isSecondaryCodeRequired(
        { id: "teacher-2", role: "teacher", institutionId: "inst-1" },
        { institutionId: "inst-1", issuedById: "teacher-1" },
      ),
    ).toBe(false);
  });

  it("requires a code for outside parties when the document has an institution or issuer", () => {
    expect(
      isSecondaryCodeRequired(
        { id: "teacher-2", role: "teacher", institutionId: "inst-2" },
        { institutionId: "inst-1", issuedById: "teacher-1" },
      ),
    ).toBe(true);
    expect(
      isSecondaryCodeRequired(
        { id: "parent-1", role: "parent", institutionId: null },
        { institutionId: null, issuedById: "teacher-1" },
      ),
    ).toBe(true);
  });

  it("does not require a code when the document has neither institution nor issuer", () => {
    expect(
      isSecondaryCodeRequired(
        { id: "teacher-2", role: "teacher", institutionId: null },
        { institutionId: null, issuedById: null },
      ),
    ).toBe(false);
  });
});

describe("isSecondaryCodeValid", () => {
  it("accepts the institution-seeded TOTP code", async () => {
    const code = await generateTotpCode("inst-1", 300, 0);
    expect(await isSecondaryCodeValid({ institutionId: "inst-1", issuedById: null }, code)).toBe(true);
  });

  it("accepts the personal issuer-seeded TOTP code", async () => {
    const code = await generateTotpCode("teacher-1", 300, 0);
    expect(await isSecondaryCodeValid({ institutionId: null, issuedById: "teacher-1" }, code)).toBe(
      true,
    );
  });

  it("rejects an incorrect or empty code", async () => {
    expect(
      await isSecondaryCodeValid({ institutionId: "inst-1", issuedById: "teacher-1" }, "000000"),
    ).toBe(false);
    expect(await isSecondaryCodeValid({ institutionId: "inst-1", issuedById: "teacher-1" }, "")).toBe(
      false,
    );
  });

  it("rejects a code that has already been used once, even though it has not expired", async () => {
    const code = await generateTotpCode("teacher-1", 300, 0);
    const record = { institutionId: null, issuedById: "teacher-1" };

    expect(await isSecondaryCodeValid(record, code)).toBe(true);
    expect(await isSecondaryCodeValid(record, code)).toBe(false);
  });
});

describe("verified document session", () => {
  it("accepts a freshly issued session token for the same document code", () => {
    const token = buildVerifiedDocumentSession("SPC-RPT-260328-AB12CD");
    expect(verifyVerifiedDocumentSession("SPC-RPT-260328-AB12CD", token)).toBe(true);
  });

  it("rejects a token issued for a different document code", () => {
    const token = buildVerifiedDocumentSession("SPC-RPT-260328-AB12CD");
    expect(verifyVerifiedDocumentSession("SPC-RPT-260328-OTHER", token)).toBe(false);
  });

  it("rejects an expired session token", () => {
    const token = buildVerifiedDocumentSession("SPC-RPT-260328-AB12CD", -1);
    expect(verifyVerifiedDocumentSession("SPC-RPT-260328-AB12CD", token)).toBe(false);
  });

  it("rejects a missing or malformed token", () => {
    expect(verifyVerifiedDocumentSession("SPC-RPT-260328-AB12CD", null)).toBe(false);
    expect(verifyVerifiedDocumentSession("SPC-RPT-260328-AB12CD", "garbage")).toBe(false);
  });
});

describe("isSecurityCodeUnused", () => {
  it("reports a code as unused until it has been successfully consumed", async () => {
    const code = await generateTotpCode("teacher-1", 300, 0);

    expect(await isSecurityCodeUnused("teacher-1", code)).toBe(true);

    await isSecondaryCodeValid({ institutionId: null, issuedById: "teacher-1" }, code);

    expect(await isSecurityCodeUnused("teacher-1", code)).toBe(false);
  });
});
