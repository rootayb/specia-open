import { JWT } from "google-auth-library";

import { prisma } from "@/lib/prisma";

type MobilePushPayload = {
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

type MobilePushResult = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: boolean;
};

type FcmErrorResponse = {
  error?: {
    status?: string;
    message?: string;
    details?: Array<{
      "@type"?: string;
      errorCode?: string;
    }>;
  };
};

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const FCM_TOKEN_CHUNK_SIZE = 500;

let cachedClient: JWT | null | undefined;
let cachedProjectId: string | null | undefined;

function normalizePrivateKey(value?: string | null) {
  return value?.replace(/\\n/g, "\n").trim() || null;
}

function serviceAccountFromEnv() {
  const rawJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };
      return {
        projectId: parsed.project_id ?? process.env.FIREBASE_PROJECT_ID ?? null,
        clientEmail: parsed.client_email ?? null,
        privateKey: normalizePrivateKey(parsed.private_key),
      };
    } catch {
      return null;
    }
  }

  return {
    projectId: process.env.FIREBASE_PROJECT_ID ?? null,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ?? null,
    privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
  };
}

function getFcmClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const credentials = serviceAccountFromEnv();
  if (!credentials?.projectId || !credentials.clientEmail || !credentials.privateKey) {
    cachedProjectId = null;
    cachedClient = null;
    return null;
  }

  cachedProjectId = credentials.projectId;
  cachedClient = new JWT({
    email: credentials.clientEmail,
    key: credentials.privateKey,
    scopes: [FCM_SCOPE],
  });
  return cachedClient;
}

function stringData(data: MobilePushPayload["data"]) {
  return Object.fromEntries(
    Object.entries(data ?? {})
      .filter(([, value]) => value !== undefined && value !== null)
      .map(([key, value]) => [key, String(value)]),
  );
}

function trimForPush(value: string, maxLength: number) {
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return `${trimmed.slice(0, Math.max(0, maxLength - 1))}…`;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function isInvalidFcmToken(error: FcmErrorResponse) {
  const status = error.error?.status;
  const codes = error.error?.details?.map((detail) => detail.errorCode) ?? [];
  return status === "NOT_FOUND" || codes.includes("UNREGISTERED");
}

async function sendFcmMessage(token: string, payload: MobilePushPayload) {
  const client = getFcmClient();
  if (!client || !cachedProjectId) {
    return { sent: false, invalidToken: false, skipped: true };
  }

  const accessToken = await client.getAccessToken();
  if (!accessToken.token) {
    return { sent: false, invalidToken: false, skipped: true };
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${cachedProjectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          notification: {
            title: trimForPush(payload.title, 90),
            body: trimForPush(payload.body, 180),
          },
          data: stringData(payload.data),
          apns: {
            payload: {
              aps: {
                sound: "default",
              },
            },
          },
        },
      }),
    },
  );

  if (response.ok) {
    return { sent: true, invalidToken: false, skipped: false };
  }

  const error = (await response.json().catch(() => ({}))) as FcmErrorResponse;
  return { sent: false, invalidToken: isInvalidFcmToken(error), skipped: false };
}

export async function sendMobilePushToUsers(
  userIds: string[],
  payload: MobilePushPayload,
): Promise<MobilePushResult> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, skipped: true };
  }

  if (!getFcmClient()) {
    return { attempted: 0, sent: 0, failed: 0, skipped: true };
  }

  try {
    const activeTokens = await prisma.mobileRefreshToken.findMany({
      where: {
        userId: { in: uniqueUserIds },
        fcmToken: { not: null },
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        fcmToken: true,
      },
    });

    const tokenRows = activeTokens.filter(
      (row): row is { id: string; fcmToken: string } => Boolean(row.fcmToken),
    );

    let sent = 0;
    let failed = 0;
    const invalidTokenIds: string[] = [];

    for (const rows of chunk(tokenRows, FCM_TOKEN_CHUNK_SIZE)) {
      const results = await Promise.allSettled(
        rows.map(async (row) => {
          const result = await sendFcmMessage(row.fcmToken, payload);
          return { id: row.id, ...result };
        }),
      );

      for (const result of results) {
        if (result.status === "rejected") {
          failed += 1;
          continue;
        }

        if (result.value.skipped) {
          continue;
        }

        if (result.value.sent) {
          sent += 1;
        } else {
          failed += 1;
        }

        if (result.value.invalidToken) {
          invalidTokenIds.push(result.value.id);
        }
      }
    }

    if (invalidTokenIds.length > 0) {
      await prisma.mobileRefreshToken.updateMany({
        where: { id: { in: invalidTokenIds } },
        data: { fcmToken: null },
      });
    }

    return {
      attempted: tokenRows.length,
      sent,
      failed,
      skipped: false,
    };
  } catch {
    return { attempted: 0, sent: 0, failed: 0, skipped: true };
  }
}
