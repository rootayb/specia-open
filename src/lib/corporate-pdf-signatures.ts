import type { UserRole } from "@/lib/prisma-shim";

import { prisma } from "@/lib/prisma";

type SigningUser = {
  name: string | null;
  email: string;
  role: UserRole;
  institutionId?: string | null;
};

export type CorporatePdfSigningMeta = {
  generatedByName: string;
  generatedByRole: "institution" | "teacher" | "other";
  institutionId: string | null;
  institutionManagerName: string | null;
  institutionManagerTitle: string | null;
};

export async function getCorporatePdfSigningMeta(
  user: SigningUser,
  institutionId?: string | null,
): Promise<CorporatePdfSigningMeta> {
  const resolvedInstitutionId = institutionId ?? user.institutionId ?? null;
  let institutionManagerName: string | null = null;
  let institutionManagerTitle: string | null = null;

  if (resolvedInstitutionId) {
    const settings = await prisma.institutionSettings.findFirst({
      where: { institutionId: resolvedInstitutionId },
      orderBy: { createdAt: "asc" },
      select: {
        defaultManagerName: true,
        defaultManagerTitle: true,
        principalName: true,
        principalTitle: true,
      },
    });

    institutionManagerName =
      settings?.defaultManagerName?.trim() ||
      settings?.principalName?.trim() ||
      null;
    institutionManagerTitle =
      settings?.defaultManagerTitle?.trim() ||
      settings?.principalTitle?.trim() ||
      "Kurum yöneticisi";
  }

  return {
    generatedByName: user.name?.trim() || user.email,
    generatedByRole:
      user.role === "institution"
        ? "institution"
        : user.role === "teacher"
          ? "teacher"
          : "other",
    institutionId: resolvedInstitutionId,
    institutionManagerName,
    institutionManagerTitle,
  };
}
