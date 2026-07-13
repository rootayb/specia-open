import { headers } from "next/headers";

export async function getRequestIp() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    headerStore.get("x-real-ip") ??
    headerStore.get("cf-connecting-ip") ??
    headerStore.get("x-vercel-forwarded-for") ??
    "unknown"
  );
}

export async function assertTrustedActionOrigin() {
  const headerStore = await headers();
  const origin = headerStore.get("origin");

  if (!origin) {
    throw new Error("Istek kaynagi dogrulanamadi.");
  }

  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto =
    headerStore.get("x-forwarded-proto") ??
    (process.env.NEXTAUTH_URL?.startsWith("https://") ? "https" : "http");

  const allowedOrigins = new Set<string>();
  if (host) {
    allowedOrigins.add(`${proto}://${host}`);
  }

  if (process.env.NEXTAUTH_URL?.trim()) {
    allowedOrigins.add(process.env.NEXTAUTH_URL.trim().replace(/\/+$/, ""));
  }

  if (!allowedOrigins.has(origin.replace(/\/+$/, ""))) {
    throw new Error("Geçersiz istek kaynagi.");
  }
}
