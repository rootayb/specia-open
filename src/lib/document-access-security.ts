import { createHmac, timingSafeEqual } from "node:crypto";

import { writeAuditLog } from "@/lib/audit";
import { normalizeVerificationCode } from "@/lib/issued-pdf-documents";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { generateTotpCode } from "@/lib/totp";
import type { UserRole } from "@/lib/prisma-shim";

const DEFAULT_SIGNED_URL_TTL_SECONDS = 15 * 60;
const DOCUMENT_ACCESS_ALARM_WINDOW_MS = 1000 * 60 * 15;
const DOCUMENT_ACCESS_ALARM_LIMIT = 1;

type SignedDocumentUrlInput = {
  code: string;
  download?: boolean;
  expiresInSeconds?: number;
};

type IssuedDocumentAccessUser = {
  id: string;
  role: UserRole;
  institutionId?: string | null;
};

type IssuedDocumentAccessRecord = {
  studentId?: string | null;
  institutionId?: string | null;
  issuedById?: string | null;
};

type DocumentSecurityEventInput = {
  code?: string | null;
  ip: string;
  userAgent?: string | null;
  action: string;
  status: "allowed" | "blocked" | "not_found" | "invalid";
  documentId?: string | null;
  documentType?: string | null;
  download?: boolean;
  reason?: string;
};

function getSigningSecret() {
  const secret =
    process.env.DOCUMENT_LINK_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim();

  if (!secret || secret.length < 32) {
    throw new Error(
      "DOCUMENT_LINK_SECRET veya NEXTAUTH_SECRET en az 32 karakter olacak sekilde yapilandirilmalidir.",
    );
  }

  return secret;
}

function buildPayload(code: string, expires: string, download: boolean) {
  return `${normalizeVerificationCode(code)}.${expires}.${download ? "1" : "0"}`;
}

function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  return aBuffer.length === bBuffer.length && timingSafeEqual(aBuffer, bBuffer);
}

export function buildSignedDocumentUrl(input: SignedDocumentUrlInput) {
  const code = normalizeVerificationCode(input.code);
  const download = Boolean(input.download);
  const expires = String(
    Math.floor(Date.now() / 1000) + (input.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS),
  );
  const signature = signPayload(buildPayload(code, expires, download));
  const params = new URLSearchParams({
    expires,
    signature,
  });

  if (download) {
    params.set("download", "1");
  }

  return `/api/evrak-kontrol/${code}?${params.toString()}`;
}

export function verifySignedDocumentUrl(code: string, url: string) {
  const parsedUrl = new URL(url);
  const expires = parsedUrl.searchParams.get("expires") ?? "";
  const signature = parsedUrl.searchParams.get("signature") ?? "";
  const download = parsedUrl.searchParams.get("download") === "1";
  const expiresAt = Number(expires);

  if (!expires || !signature || !Number.isFinite(expiresAt)) {
    return false;
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = signPayload(buildPayload(code, expires, download));
  return safeEqual(signature, expected);
}

const VERIFIED_SESSION_TTL_SECONDS = 10 * 60;

function buildVerifiedSessionPayload(code: string, expires: string) {
  return `verified-session.${normalizeVerificationCode(code)}.${expires}`;
}

/**
 * Bir ikinci güvenlik kodu doğrulama sayfasında bir kere başarıyla
 * kullanıldığında üretilen, kısa ömürlü bir "doğrulandı" oturum belirteci.
 * Sayfanın kendi görüntüle/indir bağlantıları bu belirteci taşır; böylece
 * ham güvenlik kodu (secCode) sayfa içinde tekrar tekrar gönderilmez ve
 * gerçek anlamda tek kullanımlık kalabilir.
 */
export function buildVerifiedDocumentSession(code: string, expiresInSeconds = VERIFIED_SESSION_TTL_SECONDS) {
  const expires = String(Math.floor(Date.now() / 1000) + expiresInSeconds);
  const signature = signPayload(buildVerifiedSessionPayload(code, expires));
  return `${expires}.${signature}`;
}

export function verifyVerifiedDocumentSession(code: string, token: string | null | undefined) {
  if (!token) {
    return false;
  }

  const [expires, signature] = token.split(".");
  const expiresAt = Number(expires);
  if (!expires || !signature || !Number.isFinite(expiresAt)) {
    return false;
  }

  if (expiresAt < Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expected = signPayload(buildVerifiedSessionPayload(code, expires));
  return safeEqual(signature, expected);
}

/**
 * Belge görüntüleme için kaba rol uygunluğu kontrolü. Kendi kurumu/kendi
 * ürettiği belge dışındaki erişimler burada engellenmez — bunlar
 * `isSecondaryCodeRequired`/`isSecondaryCodeValid` ile ikinci güvenlik
 * kodu zorunlu kılınarak korunur. Sadece veli (öğrenciye bağlı değilse)
 * burada kesin olarak engellenir; bağlantısız velinin görebileceği bir
 * güvenlik kodu akışı yoktur.
 */
export function canAccessIssuedDocument(
  user: IssuedDocumentAccessUser,
  record: IssuedDocumentAccessRecord,
  options?: { isParentLinked?: boolean },
) {
  if (user.role === "admin") {
    return true;
  }

  if (user.role === "parent") {
    return Boolean(record.studentId && options?.isParentLinked);
  }

  if (user.role === "institution" || user.role === "teacher") {
    return true;
  }

  return false;
}

/**
 * Belgeyi görüntülemek için ikinci (TOTP) güvenlik kodunun istenip
 * istenmediğini belirler. Belgeyi üreten hesap (issuedById) veya aynı kurum
 * üyesi ya da platform admini bu kodu hiç görmez; dış taraflar görür.
 */
export function isSecondaryCodeRequired(
  user: IssuedDocumentAccessUser,
  record: IssuedDocumentAccessRecord,
) {
  if (user.role === "admin") {
    return false;
  }

  if (record.issuedById && record.issuedById === user.id) {
    return false;
  }

  const isOwnInstitution =
    user.role !== "parent" &&
    Boolean(user.institutionId) &&
    Boolean(record.institutionId) &&
    user.institutionId === record.institutionId;
  if (isOwnInstitution) {
    return false;
  }

  return Boolean(record.institutionId || record.issuedById);
}

const SECURITY_CODE_USED_ACTION = "security_code_used";

function securityCodeUsageKey(seed: string, code: string) {
  return `${seed}:${code}`;
}

async function getSecurityCodeUsage(seed: string, code: string) {
  return prisma.rateLimitBucket.findUnique({
    where: {
      action_key: {
        action: SECURITY_CODE_USED_ACTION,
        key: securityCodeUsageKey(seed, code),
      },
    },
  });
}

async function markSecurityCodeUsed(seed: string, code: string) {
  await prisma.rateLimitBucket.upsert({
    where: {
      action_key: {
        action: SECURITY_CODE_USED_ACTION,
        key: securityCodeUsageKey(seed, code),
      },
    },
    create: {
      action: SECURITY_CODE_USED_ACTION,
      key: securityCodeUsageKey(seed, code),
      count: 1,
      windowStart: new Date(),
    },
    update: {},
  });
}

/**
 * Belirli bir tohum (kullanıcı/kurum) için şu an gösterilen kodun daha önce
 * kullanılıp kullanılmadığını bildirir — `SecurityCodeBadge` bunu kısa
 * aralıklarla yoklayıp, kod kullanıldığında süresini beklemeden yeni kod
 * üretmek için kullanır.
 */
export async function isSecurityCodeUnused(seed: string, code: string) {
  const usage = await getSecurityCodeUsage(seed, code);
  return !usage;
}

/**
 * Girilen kodu, belgenin kurum (institutionId) ve/veya üretici hesap
 * (issuedById) için üretilen 5 dakikalık TOTP pencerelerine (önceki/şimdiki/
 * sonraki) karşı doğrular. İki tohum türünden biri eşleşirse yeterlidir.
 * Kodun bir hesaptan diğerine (telefon/mesaj ile) paylaşılması zaman aldığı
 * için pencere genişçe tutulur. Bir kod başarıyla kullanıldığında kesin
 * olarak tek kullanımlık sayılır — aynı kod bir kez doğrulamada kabul
 * edildikten sonra, süresi dolmamış olsa bile bir daha kullanılamaz; bu kodu
 * elinde tutan biri sınırsız sayıda doğrulama yapamaz. Doğrulama sayfasının
 * kendi görüntüle/indir bağlantıları ham kodu tekrar göndermez, bunun yerine
 * `buildVerifiedDocumentSession` ile üretilen kısa ömürlü oturum belirtecini
 * kullanır (bkz. `document-verification-view.tsx`).
 */
export async function isSecondaryCodeValid(
  record: IssuedDocumentAccessRecord,
  secCode: string,
) {
  const trimmed = secCode.trim();
  if (!trimmed) {
    return false;
  }

  const seeds = [record.institutionId, record.issuedById].filter(
    (seed): seed is string => Boolean(seed),
  );

  for (const seed of seeds) {
    const offsets = [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const candidates = await Promise.all(
      offsets.map((offset) => generateTotpCode(seed, 300, offset)),
    );
    if (candidates.includes(trimmed)) {
      const usage = await getSecurityCodeUsage(seed, trimmed);
      if (usage) {
        continue;
      }
      await markSecurityCodeUsed(seed, trimmed);
      return true;
    }
  }

  return false;
}

export async function logDocumentSecurityEvent(input: DocumentSecurityEventInput) {
  await writeAuditLog({
    action: input.action,
    entityType: "issuedPdfDocument",
    entityId: input.documentId ?? null,
    summary:
      input.status === "allowed"
        ? "Evrak dosyası erişimi kaydedildi."
        : "Evrak kontrol güvenlik olayı kaydedildi.",
    metadata: {
      verificationCode: input.code ? normalizeVerificationCode(input.code) : null,
      ip: input.ip,
      userAgent: input.userAgent ?? null,
      status: input.status,
      documentType: input.documentType ?? null,
      download: input.download ?? false,
      reason: input.reason ?? null,
    },
  });
}

export async function raiseDocumentAccessAlarm(input: {
  ip: string;
  code?: string | null;
  userAgent?: string | null;
  reason: string;
}) {
  const alarmLimit = await consumeRateLimit({
    action: "document_verification.alarm",
    key: `ip:${input.ip}`,
    limit: DOCUMENT_ACCESS_ALARM_LIMIT,
    windowMs: DOCUMENT_ACCESS_ALARM_WINDOW_MS,
  });

  if (!alarmLimit.allowed) {
    return;
  }

  await logDocumentSecurityEvent({
    action: "security.document_verification_probe",
    code: input.code,
    ip: input.ip,
    userAgent: input.userAgent,
    status: "blocked",
    reason: input.reason,
  });
}
