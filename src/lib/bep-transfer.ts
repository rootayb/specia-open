import crypto from "node:crypto";

export const BEP_TRANSFER_UNDO_WINDOW_MINUTES = 15;
export const BEP_TRANSFER_INVITE_TTL_DAYS = 7;

export function createBepTransferToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashBepTransferToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getBepTransferUndoUntil(from = new Date()) {
  return new Date(from.getTime() + BEP_TRANSFER_UNDO_WINDOW_MINUTES * 60 * 1000);
}

export function getBepTransferInviteExpiresAt(from = new Date()) {
  return new Date(from.getTime() + BEP_TRANSFER_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}
