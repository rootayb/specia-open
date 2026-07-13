import QRCode from "qrcode";

function getAppBaseUrl() {
  const explicitBaseUrl = process.env.NEXTAUTH_URL?.trim();
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/+$/, "");
  }

  const vercelBaseUrl =
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ?? process.env.VERCEL_URL?.trim();
  if (vercelBaseUrl) {
    const normalized = vercelBaseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    return `https://${normalized}`;
  }

  return "http://localhost:3000";
}

export function buildInviteRegistrationUrl(inviteCode: string) {
  const url = new URL("/kayit", getAppBaseUrl());
  url.searchParams.set("inviteCode", inviteCode);
  return url.toString();
}

export async function buildInviteQrDataUrl(inviteCode: string) {
  return QRCode.toDataURL(buildInviteRegistrationUrl(inviteCode), {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 184,
    color: {
      dark: "#111111",
      light: "#ffffff",
    },
  });
}
