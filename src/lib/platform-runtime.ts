import { prisma } from "@/lib/prisma";
import { isEnvironmentMaintenanceEnabled } from "@/lib/maintenance-env";

export { isEnvironmentMaintenanceEnabled } from "@/lib/maintenance-env";

export const PLATFORM_RUNTIME_SETTINGS_ID = "platform";
const PLATFORM_RUNTIME_SETTINGS_CACHE_TTL_MS = 5_000;

export type PlatformRuntimeSettingsRecord = {
  maintenanceEnabled: boolean;
  maintenanceEndsAt: Date | null;
  maintenanceMessage: string | null;
  updatedAt: Date | null;
  scheduledWindow: {
    id: string;
    title: string;
    description: string | null;
    startsAt: Date;
    endsAt: Date;
    updatedAt: Date;
  } | null;
};

export type PlatformMaintenanceState = {
  enabled: boolean;
  isActive: boolean;
  endsAt: Date | null;
  message: string | null;
  updatedAt: Date | null;
  remainingMs: number | null;
  source: "database" | "environment" | "scheduled_window";
  scheduledWindow: PlatformRuntimeSettingsRecord["scheduledWindow"];
};

let runtimeSettingsCache:
  | {
      expiresAt: number;
      value: PlatformRuntimeSettingsRecord | null;
    }
  | null = null;
let runtimeSettingsRequest: Promise<PlatformRuntimeSettingsRecord | null> | null = null;
let runtimeSettingsCacheRevision = 0;

export function buildPlatformMaintenanceState(
  settings: PlatformRuntimeSettingsRecord | null,
  now = new Date(),
): PlatformMaintenanceState {
  const environmentEnabled = isEnvironmentMaintenanceEnabled();
  const manualEndsAt = settings?.maintenanceEndsAt ?? null;
  const manualMaintenanceActive = Boolean(settings?.maintenanceEnabled) && (!manualEndsAt || manualEndsAt > now);
  const scheduledWindow = settings?.scheduledWindow ?? null;
  const scheduledWindowActive = Boolean(scheduledWindow && scheduledWindow.endsAt > now);
  const endsAt = manualMaintenanceActive ? manualEndsAt : scheduledWindow?.endsAt ?? manualEndsAt;
  const enabled = environmentEnabled || Boolean(settings?.maintenanceEnabled) || scheduledWindowActive;
  const isActive = environmentEnabled || manualMaintenanceActive || scheduledWindowActive;
  const remainingMs = endsAt ? Math.max(0, endsAt.getTime() - now.getTime()) : null;
  const source = environmentEnabled
    ? "environment"
    : scheduledWindowActive && !manualMaintenanceActive
      ? "scheduled_window"
      : "database";

  return {
    enabled,
    isActive,
    endsAt,
    message: manualMaintenanceActive
      ? settings?.maintenanceMessage ?? null
      : scheduledWindow?.description || scheduledWindow?.title || settings?.maintenanceMessage || null,
    updatedAt: scheduledWindowActive && !manualMaintenanceActive
      ? scheduledWindow?.updatedAt ?? null
      : settings?.updatedAt ?? null,
    remainingMs,
    source,
    scheduledWindow,
  };
}

export async function getPlatformRuntimeSettingsRecord() {
  if (runtimeSettingsCache && runtimeSettingsCache.expiresAt > Date.now()) {
    return runtimeSettingsCache.value;
  }

  const requestRevision = runtimeSettingsCacheRevision;
  const now = new Date();

  runtimeSettingsRequest ??= Promise.all([
    prisma.platformRuntimeSettings.findUnique({
      where: { id: PLATFORM_RUNTIME_SETTINGS_ID },
      select: {
        maintenanceEnabled: true,
        maintenanceEndsAt: true,
        maintenanceMessage: true,
        updatedAt: true,
      },
    }),
    prisma.maintenanceWindow.findFirst({
      where: {
        endsAt: { gt: now },
        OR: [
          {
            autoActivate: true,
            status: "scheduled",
            startsAt: { lte: now },
          },
          {
            status: "in_progress",
          },
        ],
      },
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        endsAt: true,
        updatedAt: true,
      },
    }),
  ])
    .then(([settings, scheduledWindow]) => {
      const value = {
        maintenanceEnabled: settings?.maintenanceEnabled ?? false,
        maintenanceEndsAt: settings?.maintenanceEndsAt ?? null,
        maintenanceMessage: settings?.maintenanceMessage ?? null,
        updatedAt: settings?.updatedAt ?? null,
        scheduledWindow,
      } satisfies PlatformRuntimeSettingsRecord;

      if (requestRevision === runtimeSettingsCacheRevision) {
        runtimeSettingsCache = {
          expiresAt: Date.now() + PLATFORM_RUNTIME_SETTINGS_CACHE_TTL_MS,
          value,
        };
      }
      return value;
    })
    .catch((err) => {
      console.warn("Failed to fetch platform runtime settings from database, using defaults:", err.message || err);
      return {
        maintenanceEnabled: false,
        maintenanceEndsAt: null,
        maintenanceMessage: null,
        updatedAt: null,
        scheduledWindow: null,
      } satisfies PlatformRuntimeSettingsRecord;
    })
    .finally(() => {
      runtimeSettingsRequest = null;
    });

  return runtimeSettingsRequest;
}

export function invalidatePlatformRuntimeSettingsCache() {
  runtimeSettingsCacheRevision += 1;
  runtimeSettingsCache = null;
}

export async function getPlatformMaintenanceState() {
  const settings = await getPlatformRuntimeSettingsRecord();
  return buildPlatformMaintenanceState(settings);
}
