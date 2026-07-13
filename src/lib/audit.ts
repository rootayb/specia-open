import { Prisma } from "@/lib/prisma-shim";

import { prisma } from "@/lib/prisma";

type AuditInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Prisma.InputJsonValue | null;
};

export async function writeAuditLog(input: AuditInput) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary,
        metadata: input.metadata ?? undefined,
      },
    });
  } catch {
    // Audit kayıt hatası ana işlemi kesmemeli.
  }
}
