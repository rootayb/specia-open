import crypto from "crypto";

export async function generateTotpCode(
  secret: string,
  intervalSeconds: number = 120,
  offset: number = 0,
): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / intervalSeconds) + offset;
  const input = `${secret}-${counter}`;

  if (typeof window === "undefined") {
    // Node.js
    const hash = crypto.createHash("sha256").update(input).digest("hex");
    const numericCode = parseInt(hash.substring(0, 8), 16) % 1000000;
    return String(numericCode).padStart(6, "0");
  } else {
    // Browser (Web Crypto API)
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    const numericCode = parseInt(hashHex.substring(0, 8), 16) % 1000000;
    return String(numericCode).padStart(6, "0");
  }
}
