import { prisma } from "@/lib/prisma";

export type AppPlatform = "ios" | "android";

export type AppVersionInfoRecord = {
  platform: AppPlatform;
  currentVersion: string;
  minRequiredVersion: string;
  forceUpdate: boolean;
  message: string | null;
  appStoreUrl: string | null;
  updatedAt: Date | null;
};

const DEFAULT_APP_VERSION_INFO: Record<AppPlatform, Omit<AppVersionInfoRecord, "platform" | "updatedAt">> = {
  ios: {
    currentVersion: "1.0.3",
    minRequiredVersion: "1.0.0",
    forceUpdate: false,
    message: "Yeni özellikler ve performans iyileştirmeleri içerir.",
    appStoreUrl: "https://apps.apple.com/app/specia",
  },
  android: {
    currentVersion: "1.0.0",
    minRequiredVersion: "1.0.0",
    forceUpdate: false,
    message: "Yeni özellikler ve performans iyileştirmeleri içerir.",
    appStoreUrl: "https://play.google.com/store/apps/details?id=com.mobile.specia",
  },
};

function isAppPlatform(value: string): value is AppPlatform {
  return value === "ios" || value === "android";
}

export function normalizeAppPlatform(value: string | null | undefined): AppPlatform {
  return value && isAppPlatform(value) ? value : "ios";
}

export async function getAppVersionInfo(platform: AppPlatform): Promise<AppVersionInfoRecord> {
  try {
    const record = await prisma.appVersionInfo.findUnique({ where: { platform } });
    if (!record) {
      return { platform, updatedAt: null, ...DEFAULT_APP_VERSION_INFO[platform] };
    }

    return {
      platform,
      currentVersion: record.currentVersion,
      minRequiredVersion: record.minRequiredVersion,
      forceUpdate: record.forceUpdate,
      message: record.message,
      appStoreUrl: record.appStoreUrl,
      updatedAt: record.updatedAt,
    };
  } catch (error) {
    console.warn(`Failed to fetch app version info for ${platform} from database, using default:`, error);
    return { platform, updatedAt: null, ...DEFAULT_APP_VERSION_INFO[platform] };
  }
}

export async function getAllAppVersionInfo(): Promise<AppVersionInfoRecord[]> {
  const platforms: AppPlatform[] = ["ios", "android"];
  return Promise.all(platforms.map((platform) => getAppVersionInfo(platform)));
}
