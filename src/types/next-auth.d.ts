import { DefaultSession } from "next-auth";
import type { InstitutionType, UserRole } from "@/lib/prisma-shim";

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    institutionId?: string | null;
    institutionType?: InstitutionType | null;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: UserRole;
      institutionId?: string | null;
      institutionType?: InstitutionType | null;
      sessionId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: UserRole;
    institutionId?: string | null;
    institutionType?: InstitutionType | null;
    lastDatabaseSync?: number;
    syncJti?: string;
    revoked?: boolean;
    jti?: string;
    exp?: number;
  }
}
