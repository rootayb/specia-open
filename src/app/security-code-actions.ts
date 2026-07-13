"use server";

import { getSession } from "@/lib/session";
import { isSecurityCodeUnused } from "@/lib/document-access-security";
import { isAdminRole, isInstitutionRole, isTeacherRole } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/lib/prisma-shim";

/**
 * `SecurityCodeBadge` bu action'ı kısa aralıklarla çağırarak şu an
 * gösterdiği kodun kullanılıp kullanılmadığını sorar; kullanılmışsa süresini
 * beklemeden bir sonraki kodu üretip gösterir. Yalnızca kendi tohumunu
 * (kullanıcı id'si veya kendi kurum id'si) sorgulayabilir.
 */
export async function isCurrentSecurityCodeUnused(seed: string, code: string): Promise<boolean> {
  const session = await getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return true;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, institutionId: true, isActive: true },
  });

  if (!user?.isActive) {
    return true;
  }

  const role = user.role as UserRole;
  const allowedSeeds = new Set<string>();
  if (isTeacherRole(role) || isAdminRole(role)) {
    allowedSeeds.add(user.id);
  }
  if (isInstitutionRole(role) && user.institutionId) {
    allowedSeeds.add(user.institutionId);
  }

  if (!allowedSeeds.has(seed)) {
    return true;
  }

  return isSecurityCodeUnused(seed, code);
}
