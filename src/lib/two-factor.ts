import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { buildTwoFactorVerificationEmail } from "@/lib/email-templates";
import { writeAuditLog } from "@/lib/audit";

const CODE_EXPIRY_MS = 1000 * 60 * 5; // 5 dakika
const MAX_ATTEMPTS = 3;

export function generateTwoFactorCode(): string {
  return crypto.randomInt(100000, 1000000).toString().padStart(6, "0");
}

export function hashTwoFactorCode(code: string): string {
  return crypto.createHash("sha256").update(code.trim()).digest("hex");
}

/**
 * İki adımlı doğrulama kodunu üretir, kaydeder ve kullanıcının e-postasına gönderir.
 * Web (NextAuth) ve mobil giriş akışları aynı kuralları paylaşır.
 */
export async function issueTwoFactorChallenge(params: {
  email: string; // normalize edilmiş (küçük harf)
  name: string;
  userId?: string | null;
  ip?: string | null;
}): Promise<void> {
  const code = generateTwoFactorCode();
  const codeHash = hashTwoFactorCode(code);
  const expiresAt = new Date(Date.now() + CODE_EXPIRY_MS);

  await prisma.twoFactorCode.upsert({
    where: { email: params.email },
    update: { codeHash, expiresAt, attempts: 0 },
    create: { email: params.email, codeHash, expiresAt },
  });

  const emailContent = buildTwoFactorVerificationEmail(params.name, code);
  await sendTransactionalEmail({
    to: params.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
    idempotencyKey: `2fa-verification/${params.email}/${expiresAt.getTime()}`,
  });

  await writeAuditLog({
    actorId: params.userId ?? null,
    action: "auth.two_factor_requested",
    entityType: "user",
    entityId: params.userId ?? undefined,
    summary: `${params.email} için giriş doğrulama kodu gönderildi.`,
    metadata: { email: params.email, ip: params.ip ?? null },
  });
}

export type TwoFactorVerifyResult = "ok" | "invalid" | "expired" | "blocked";

/**
 * Gönderilen kodu doğrular. Başarıda kaydı siler; üst üste hatalı denemede engeller.
 */
export async function verifyTwoFactorCode(
  email: string,
  code: string,
): Promise<TwoFactorVerifyResult> {
  const record = await prisma.twoFactorCode.findUnique({ where: { email } });
  if (!record) return "invalid";
  if (record.expiresAt < new Date()) {
    await prisma.twoFactorCode.delete({ where: { email } }).catch(() => undefined);
    return "expired";
  }

  const matches = record.codeHash === hashTwoFactorCode(code);
  if (matches) {
    await prisma.twoFactorCode.delete({ where: { email } });
    return "ok";
  }

  const nextAttempts = record.attempts + 1;
  if (nextAttempts >= MAX_ATTEMPTS) {
    await prisma.twoFactorCode.delete({ where: { email } });
    return "blocked";
  }

  await prisma.twoFactorCode.update({ where: { email }, data: { attempts: nextAttempts } });
  return "invalid";
}
