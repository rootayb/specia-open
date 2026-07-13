import { describe, it, expect, beforeAll } from "vitest";
import {
  decrypt,
  decryptBytesField,
  decryptField,
  decryptJsonValue,
  encrypt,
  encryptBytesField,
  encryptField,
  encryptJsonValue,
  isEncrypted,
  isEncryptedBytes,
} from "./encryption";

// Test key: 32 bytes = 64 hex characters (only for tests)
const TEST_KEY = "ab1c2d3e4f5061728394a5b6c7d8e9f0a1b2c3d4e5f6071829304a5b6c7d8e9f";

beforeAll(() => {
  process.env.DB_ENCRYPTION_KEY = TEST_KEY;
});

describe("encrypt / decrypt", () => {
  it("should roundtrip a simple string", () => {
    const plaintext = "Merhaba Dünya";
    const encrypted = encrypt(plaintext);
    expect(encrypted).not.toBe(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("should roundtrip Turkish characters", () => {
    const plaintext = "Öğrenci tanısı: Çoklu öğrenme güçlüğü — İşitsel destek";
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("should roundtrip a long text (health notes)", () => {
    const plaintext = "Lorem ipsum ".repeat(500);
    const encrypted = encrypt(plaintext);
    expect(decrypt(encrypted)).toBe(plaintext);
  });

  it("should produce different ciphertexts for the same plaintext (random IV)", () => {
    const plaintext = "aynı metin";
    const enc1 = encrypt(plaintext);
    const enc2 = encrypt(plaintext);
    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(plaintext);
    expect(decrypt(enc2)).toBe(plaintext);
  });

  it("should include the version prefix", () => {
    const encrypted = encrypt("test");
    expect(encrypted.startsWith("enc_v1:")).toBe(true);
  });

  it("should throw on tampered ciphertext", () => {
    const encrypted = encrypt("test");
    // Flip a character in the ciphertext portion
    const parts = encrypted.split(":");
    const lastPart = parts[parts.length - 1];
    const flippedChar = lastPart[0] === "a" ? "b" : "a";
    parts[parts.length - 1] = flippedChar + lastPart.slice(1);
    const tampered = parts.join(":");

    expect(() => decrypt(tampered)).toThrow();
  });

  it("should throw on wrong key", () => {
    const encrypted = encrypt("secret data");
    // Change the key
    process.env.DB_ENCRYPTION_KEY =
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

    expect(() => decrypt(encrypted)).toThrow();

    // Restore
    process.env.DB_ENCRYPTION_KEY = TEST_KEY;
  });

  it("should throw if format is invalid", () => {
    expect(() => decrypt("not-encrypted-data")).toThrow();
    expect(() => decrypt("enc_v1:only-two-parts")).toThrow();
  });
});

describe("isEncrypted", () => {
  it("should return true for encrypted values", () => {
    expect(isEncrypted(encrypt("hello"))).toBe(true);
  });

  it("should return false for plaintext values", () => {
    expect(isEncrypted("plaintext")).toBe(false);
    expect(isEncrypted("")).toBe(false);
    expect(isEncrypted("enc_v2:different-version")).toBe(false);
  });
});

describe("encryptField / decryptField (null-safe)", () => {
  it("should pass null through unchanged", () => {
    expect(encryptField(null)).toBe(null);
    expect(decryptField(null)).toBe(null);
  });

  it("should pass undefined through as null-ish", () => {
    expect(encryptField(undefined)).toBeUndefined();
    expect(decryptField(undefined)).toBeUndefined();
  });

  it("should pass empty string through unchanged", () => {
    expect(encryptField("")).toBe("");
    expect(decryptField("")).toBe("");
  });

  it("should encrypt and decrypt a non-empty string", () => {
    const encrypted = encryptField("05551234567");
    expect(encrypted).not.toBe("05551234567");
    expect(isEncrypted(encrypted!)).toBe(true);
    expect(decryptField(encrypted)).toBe("05551234567");
  });

  it("should not double-encrypt already encrypted values", () => {
    const encrypted = encryptField("veri");
    const doubleEncrypted = encryptField(encrypted);
    expect(doubleEncrypted).toBe(encrypted);
    expect(decryptField(doubleEncrypted)).toBe("veri");
  });

  it("should return plaintext as-is from decryptField (backward compat)", () => {
    // Pre-migration data that hasn't been encrypted yet
    expect(decryptField("plaintext-phone-number")).toBe("plaintext-phone-number");
  });
});

describe("encryptJsonValue / decryptJsonValue", () => {
  it("should encrypt and decrypt nested string values without changing shape", () => {
    const value = {
      title: "Öğrenci notu",
      rows: [
        { text: "Matematik amaçı", done: false },
        { text: "Okuma hedefi", score: 3 },
      ],
      empty: "",
      meta: null,
    };

    const encrypted = encryptJsonValue(value) as typeof value;
    expect(encrypted.title).not.toBe(value.title);
    expect(isEncrypted(encrypted.title)).toBe(true);
    expect(isEncrypted(encrypted.rows[0].text)).toBe(true);
    expect(encrypted.rows[0].done).toBe(false);
    expect(encrypted.empty).toBe("");
    expect(encrypted.meta).toBeNull();

    expect(decryptJsonValue(encrypted)).toEqual(value);
  });
});

describe("encryptBytesField / decryptBytesField", () => {
  it("should encrypt and decrypt binary data", () => {
    const value = Buffer.from("pdf-content");
    const encrypted = encryptBytesField(value);

    expect(Buffer.from(encrypted).equals(value)).toBe(false);
    expect(isEncryptedBytes(encrypted as Uint8Array)).toBe(true);
    expect(Buffer.from(decryptBytesField(encrypted as Uint8Array) as Uint8Array).equals(value)).toBe(true);
  });

  it("should not double-encrypt binary data", () => {
    const encrypted = encryptBytesField(Buffer.from("file"));
    const doubleEncrypted = encryptBytesField(encrypted as Uint8Array);

    expect(Buffer.from(doubleEncrypted).equals(Buffer.from(encrypted))).toBe(true);
  });
});
