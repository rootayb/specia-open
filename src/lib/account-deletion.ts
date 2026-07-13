import { UserRole } from "@/lib/prisma-shim";

import { ApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";

export const ACCOUNT_DELETION_BLOCKED_MESSAGE =
  "Hesabınız şu anda silinemiyor. Lütfen destek ekibiyle iletişime geçin.";

export async function deleteUserAccount(input: {
  userId: string;
  requestIp?: string;
  source: "web" | "mobile";
}) {
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      email: true,
      role: true,
      institutionId: true,
    },
  });

  if (!user) {
    throw new ApiError("NOT_FOUND", "Kullanıcı kaydı bulunamadı.", 404);
  }

  if (user.role === UserRole.admin) {
    const remainingAdmins = await prisma.user.count({
      where: {
        id: { not: user.id },
        role: UserRole.admin,
        isActive: true,
        OR: [{ suspendedUntil: null }, { suspendedUntil: { lte: new Date() } }],
      },
    });
    if (remainingAdmins === 0) {
      throw new ApiError("ACCOUNT_DELETION_BLOCKED", ACCOUNT_DELETION_BLOCKED_MESSAGE, 409);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: "profile.closed",
        entityType: "user",
        entityId: user.id,
        summary: `${user.email} hesabı kullanıcı tarafından silindi.`,
        metadata: {
          ip: input.requestIp,
          institutionId: user.institutionId,
          source: input.source,
        },
      },
    });
    await tx.mobileRefreshToken.deleteMany({ where: { userId: user.id } });
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id } });
    await tx.authIdentity.deleteMany({ where: { userId: user.id } });
    await tx.user.delete({ where: { id: user.id } });
  });

  return user;
}
