import { Prisma } from "@/lib/prisma-shim";
import { describe, expect, it } from "vitest";

import { handleApiError } from "@/lib/api/errors";

describe("mobile API database errors", () => {
  it("maps unique constraint failures to 409", async () => {
    const response = handleApiError(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "CONFLICT" },
    });
  });

  it("maps missing mutation targets to 404", async () => {
    const response = handleApiError(
      new Prisma.PrismaClientKnownRequestError("missing", {
        code: "P2025",
        clientVersion: "test",
      }),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: { code: "NOT_FOUND" },
    });
  });
});
