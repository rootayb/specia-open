import { NextRequest } from "next/server";
import { UserRole } from "@/lib/prisma-shim";
import { ApiUser, getCurrentUser } from "./auth";
import { ApiError } from "./errors";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/action-security";
import { hasModuleAccess } from "@/lib/permissions";
import { userSupportsSessionAndFinanceModules } from "@/lib/institution-features";

export async function enforceRateLimit(actionName: string, limit = 100, windowMs = 60000) {
  let effectiveLimit = limit;
  // PDF önizleme/üretme ve belge indirme işlemlerinde (özellikle editörün sık kaydetmesi veya ardışık indirmeler durumunda)
  // 10 olan varsayılan hız sınırını 120'ye yükselterek önizlemenin yarıda kesilmesini engelliyoruz.
  if (actionName === "pdf_generation" || actionName.includes("pdf") || actionName.includes("docx")) {
    effectiveLimit = 120;
  }

  const ip = await getRequestIp();
  const rateLimitResult = await consumeRateLimit({
    action: `api.${actionName}`,
    key: ip,
    limit: effectiveLimit,
    windowMs,
  });

  if (!rateLimitResult.allowed) {
    throw new ApiError(
      "TOO_MANY_REQUESTS",
      `Çok fazla istek yolladınız. Lütfen ${Math.ceil(rateLimitResult.retryAfterMs / 1000)} saniye sonra tekrar deneyin.`,
      429
    );
  }
}

export async function enforceAuth(req: NextRequest): Promise<ApiUser> {
  // IP tabanlı spam saldırılarını engellemek için genel API hız sınırı kontrolü
  await enforceRateLimit("authenticated", 120, 60 * 1000); // Dakikada maksimum 120 istek

  const user = await getCurrentUser(req);
  if (!user) {
    throw new ApiError("UNAUTHORIZED", "Bu işlem için giriş yapmanız gerekmektedir.", 401);
  }
  return user;
}

export function enforceRoles(user: ApiUser, allowedRoles: UserRole[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new ApiError("FORBIDDEN", "Bu işlem için yetkiniz bulunmuyor.", 403);
  }
}

export function enforceInstitution(user: ApiUser, resourceInstitutionId: string | null | undefined) {
  if (user.role === "admin") return;
  if (!user.institutionId || user.institutionId !== resourceInstitutionId) {
    throw new ApiError("FORBIDDEN", "Bu kuruma ait verilere erişim yetkiniz bulunmuyor.", 403);
  }
}

export function enforceModule(
  user: ApiUser,
  module: Parameters<typeof hasModuleAccess>[2],
) {
  if (!hasModuleAccess(user.role, user.allowedModules, module)) {
    throw new ApiError("FORBIDDEN", "Bu modül için yetkiniz bulunmuyor.", 403);
  }
}

export function enforceSessionAndFinanceInstitution(user: ApiUser) {
  if (!userSupportsSessionAndFinanceModules(user)) {
    throw new ApiError(
      "FORBIDDEN",
      "Bu modül Özel Eğitim Uygulama Okulları için kullanılamaz.",
      403,
    );
  }
}
