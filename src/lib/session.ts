import { redirect } from "next/navigation";
import { cache } from "react";

import { prisma } from "@/lib/prisma";
import type {
  InstitutionType,
  StaffEmploymentType,
  StaffModulePermission,
  UserRole,
} from "@/lib/prisma-shim";
import { canManageInstitutionRecords, isAdminRole, isInstitutionRole } from "@/lib/permissions";
import { userSupportsSessionAndFinanceModules } from "@/lib/institution-features";

// Yerel sürüm: çevrimiçi kimlik doğrulama kaldırıldı. Uygulama tek bir yerel
// kullanıcı ile çalışır; ilk erişimde otomatik oluşturulur. Dönen kullanıcı
// şekli çevrimiçi sürümdeki requireUser ile birebir aynıdır.
const LOCAL_USER_ID = "local-user";
const LOCAL_USER_EMAIL = "yerel@specia.local";

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  branch: true,
  employmentType: true,
  allowedModules: true,
  isActive: true,
  twoFactorEnabled: true,
  institutionId: true,
  institution: {
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
    },
  },
} as const;

async function getOrCreateLocalUser() {
  const existing = await prisma.user.findUnique({
    where: { id: LOCAL_USER_ID },
    select: userSelect,
  });

  const user =
    existing ??
    (await prisma.user
      .create({
        data: {
          id: LOCAL_USER_ID,
          email: LOCAL_USER_EMAIL,
          passwordHash: "yerel",
          name: "Yerel Kullanıcı",
          role: "teacher",
        },
        select: userSelect,
      })
      .catch(async () => {
        const created = await prisma.user.findUnique({
          where: { id: LOCAL_USER_ID },
          select: userSelect,
        });
        if (!created) {
          throw new Error("Yerel kullanıcı oluşturulamadı.");
        }
        return created;
      }));

  // SQLite'ta enum kolonları String tutulduğu için orijinal enum tiplerine
  // burada daraltılır; değerler çevrimiçi şemadaki enum değerleriyle aynıdır.
  return {
    ...user,
    role: user.role as UserRole,
    employmentType: user.employmentType as StaffEmploymentType | null,
    institution: user.institution
      ? { ...user.institution, type: user.institution.type as InstitutionType }
      : null,
    allowedModules: (Array.isArray(user.allowedModules)
      ? user.allowedModules
      : []) as StaffModulePermission[],
  };
}

export const getSession = cache(async function getSession() {
  const user = await getOrCreateLocalUser();
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      sessionId: "local-session" as string | undefined,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
});

export const requireUser = cache(async function requireUser() {
  return getOrCreateLocalUser();
});

export async function requireAdmin() {
  const user = await requireUser();

  if (!isAdminRole(user.role)) {
    redirect("/panel");
  }

  return user;
}

export async function requireInstitutionUser() {
  const user = await requireUser();

  if (!isInstitutionRole(user.role) && !isAdminRole(user.role)) {
    redirect("/panel");
  }

  return user;
}

export async function requireManagementUser() {
  const user = await requireUser();

  if (!canManageInstitutionRecords(user.role)) {
    redirect("/panel");
  }

  return user;
}

export async function requireApiUser() {
  return getOrCreateLocalUser();
}

export async function requireSessionAndFinanceUser() {
  const user = await requireUser();

  if (!userSupportsSessionAndFinanceModules(user)) {
    redirect("/panel");
  }

  return user;
}
