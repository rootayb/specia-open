import { describe, expect, it } from "vitest";

import {
  supportsSessionAndFinanceModules,
  userSupportsSessionAndFinanceModules,
} from "@/lib/institution-features";

describe("institution feature access", () => {
  it("disables session and finance modules for public practice schools", () => {
    expect(supportsSessionAndFinanceModules("public_special_education_practice_school")).toBe(false);
    expect(
      userSupportsSessionAndFinanceModules({
        institutionId: "institution-1",
        institution: { type: "public_special_education_practice_school" },
      }),
    ).toBe(false);
  });

  it("keeps modules available for rehabilitation centers and platform users", () => {
    expect(supportsSessionAndFinanceModules("rehabilitation_center")).toBe(true);
    expect(userSupportsSessionAndFinanceModules({ institutionId: null })).toBe(true);
  });
});
