import crypto from "node:crypto";

const PASSWORD_RESET_TTL_MS = 1000 * 60 * 60;

export function createPasswordResetToken() {
  const token = crypto.randomBytes(32).toString("hex");

  return {
    token,
    tokenHash: hashPasswordResetToken(token),
    expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MS),
  };
}

export function hashPasswordResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
