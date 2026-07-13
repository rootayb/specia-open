import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;
const VERSION_PREFIX = "enc_v1:";
const BYTES_VERSION_PREFIX = Buffer.from("encb_v1:", "utf8");

/**
 * Returns the 32-byte encryption key derived from the DB_ENCRYPTION_KEY env var.
 * Throws if the key is missing or malformed.
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.DB_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error(
      "DB_ENCRYPTION_KEY ortam değişkeni tanımlanmamış. PII şifreleme için 64 karakterlik hex string gereklidir."
    );
  }
  if (keyHex.length !== 64) {
    throw new Error(
      `DB_ENCRYPTION_KEY 64 hex karakter olmalıdır (32 byte). Mevcut uzunluk: ${keyHex.length}`
    );
  }
  return Buffer.from(keyHex, "hex");
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Returns a versioned string in the format: "enc_v1:iv:authTag:ciphertext" (all hex).
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return `${VERSION_PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a ciphertext string produced by `encrypt()`.
 * Expects the versioned format "enc_v1:iv:authTag:ciphertext".
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(VERSION_PREFIX)) {
    throw new Error("Şifreli veri tanınmayan formatta — enc_v1: prefix bulunamadı.");
  }

  const key = getEncryptionKey();
  const payload = ciphertext.slice(VERSION_PREFIX.length);
  const parts = payload.split(":");

  if (parts.length !== 3) {
    throw new Error("Şifreli veri bozuk — beklenen format: iv:authTag:ciphertext");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Checks whether a string value looks like it was encrypted by this module.
 */
export function isEncrypted(value: string): boolean {
  return value.startsWith(VERSION_PREFIX);
}

/**
 * Null-safe encrypt wrapper for optional Prisma fields.
 * Returns null if input is null/undefined/empty string.
 */
export function encryptField(value: string | null | undefined): string | null {
  if (value == null || value === "") return value as string | null;
  if (isEncrypted(value)) return value; // already encrypted
  return encrypt(value);
}

/**
 * Null-safe decrypt wrapper for optional Prisma fields.
 * Returns null if input is null/undefined. Returns as-is if not encrypted (backward compat).
 */
export function decryptField(value: string | null | undefined): string | null {
  if (value == null || value === "") return value as string | null;
  if (!isEncrypted(value)) return value; // plaintext (pre-migration data)
  return decrypt(value);
}

export function encryptJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    return encryptField(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => encryptJsonValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        encryptJsonValue(item),
      ]),
    );
  }
  return value;
}

export function decryptJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    return decryptField(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => decryptJsonValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        decryptJsonValue(item),
      ]),
    );
  }
  return value;
}

export function isEncryptedBytes(value: Uint8Array): boolean {
  const bytes = Buffer.from(value);
  return (
    bytes.length > BYTES_VERSION_PREFIX.length &&
    bytes.subarray(0, BYTES_VERSION_PREFIX.length).equals(BYTES_VERSION_PREFIX)
  );
}

export function encryptBytes(value: Uint8Array): Buffer {
  if (value.byteLength === 0 || isEncryptedBytes(value)) {
    return Buffer.from(value);
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  const encrypted = Buffer.concat([cipher.update(Buffer.from(value)), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([BYTES_VERSION_PREFIX, iv, authTag, encrypted]);
}

export function decryptBytes(value: Uint8Array): Buffer {
  if (!isEncryptedBytes(value)) {
    return Buffer.from(value);
  }

  const bytes = Buffer.from(value);
  const offset = BYTES_VERSION_PREFIX.length;
  const iv = bytes.subarray(offset, offset + IV_LENGTH);
  const authTag = bytes.subarray(offset + IV_LENGTH, offset + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = bytes.subarray(offset + IV_LENGTH + AUTH_TAG_LENGTH);

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export function encryptBytesField<T extends Uint8Array | null | undefined>(value: T): T | Buffer {
  if (value == null) return value;
  return encryptBytes(value);
}

export function decryptBytesField<T extends Uint8Array | null | undefined>(value: T): T | Buffer {
  if (value == null) return value;
  return decryptBytes(value);
}
