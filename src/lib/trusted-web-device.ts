import { prisma } from "@/lib/prisma";
import { hashDeviceId } from "@/lib/trusted-device";
import { TRUSTED_WEB_DEVICE_TTL_DAYS } from "@/lib/web-device-cookie";

/**
 * Web tarayıcı cihaz güveni. Tarayıcıda `specia-device-id` httpOnly
 * cookie'siyle tutulan rastgele bir kimlik SHA-256 özetiyle saklanır.
 * Bir cihaz güvenilirse o cihazdan (IP değişse bile) girişte 2FA e-posta
 * kodu istenmez; tanınmayan bir tarayıcı/cihazda kod akışı devam eder.
 * Güven süresi kayan pencere: her kullanımda expiresAt tazelenir.
 */

function trustExpiryDate(): Date {
  return new Date(Date.now() + TRUSTED_WEB_DEVICE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export async function isTrustedWebDevice(
  userId: string,
  deviceId?: string | null,
): Promise<boolean> {
  if (!deviceId) return false;

  const deviceIdHash = hashDeviceId(deviceId);
  const device = await prisma.trustedWebDevice.findUnique({
    where: { userId_deviceIdHash: { userId, deviceIdHash } },
    select: { id: true, expiresAt: true },
  });
  if (!device || device.expiresAt < new Date()) return false;

  await prisma.trustedWebDevice
    .update({
      where: { id: device.id },
      data: { lastUsedAt: new Date(), expiresAt: trustExpiryDate() },
    })
    .catch(() => undefined);
  return true;
}

export async function trustWebDevice(params: {
  userId: string;
  deviceId?: string | null;
  deviceLabel?: string | null;
}): Promise<void> {
  if (!params.deviceId) return;

  const deviceIdHash = hashDeviceId(params.deviceId);
  await prisma.trustedWebDevice.upsert({
    where: { userId_deviceIdHash: { userId: params.userId, deviceIdHash } },
    update: {
      lastUsedAt: new Date(),
      expiresAt: trustExpiryDate(),
      deviceLabel: params.deviceLabel ?? undefined,
    },
    create: {
      userId: params.userId,
      deviceIdHash,
      deviceLabel: params.deviceLabel ?? null,
      expiresAt: trustExpiryDate(),
    },
  });
}
