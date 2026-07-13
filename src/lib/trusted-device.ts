import crypto from "node:crypto";

import { prisma } from "@/lib/prisma";

/**
 * Cihaz eşleştirme yardımcıları. Mobil istemci, Keychain'de kalıcı tutulan
 * benzersiz bir `deviceId` gönderir. Bu kimlik ham olarak değil SHA-256
 * özetiyle saklanır; bir cihaz "güvenilir" ise o cihazdan girişte 2FA kodu
 * istenmez, tanınmayan cihazda e-posta kodu devreye girer.
 */

const MIN_DEVICE_ID_LENGTH = 8;

export function hashDeviceId(deviceId: string): string {
  return crypto.createHash("sha256").update(deviceId.trim()).digest("hex");
}

function isUsableDeviceId(deviceId?: string | null): deviceId is string {
  return typeof deviceId === "string" && deviceId.trim().length >= MIN_DEVICE_ID_LENGTH;
}

export function getDeviceIdHash(deviceId?: string | null): string | null {
  if (!isUsableDeviceId(deviceId)) return null;
  return hashDeviceId(deviceId);
}

/**
 * Verilen cihazın bu kullanıcı için güvenilir olup olmadığını döndürür.
 * Güvenilirse `lastUsedAt` tazelenir.
 */
export async function isTrustedDevice(
  userId: string,
  deviceId?: string | null,
): Promise<boolean> {
  if (!isUsableDeviceId(deviceId)) return false;

  const deviceIdHash = getDeviceIdHash(deviceId);
  if (!deviceIdHash) return false;
  const device = await prisma.mobileTrustedDevice.findUnique({
    where: { userId_deviceIdHash: { userId, deviceIdHash } },
    select: { id: true },
  });
  if (!device) return false;

  await prisma.mobileTrustedDevice
    .update({ where: { id: device.id }, data: { lastUsedAt: new Date() } })
    .catch(() => undefined);
  return true;
}

/**
 * Cihazı bu kullanıcı için güvenilir olarak işaretler (varsa tazeler).
 * Kullanılamaz bir kimlik gelirse sessizce atlar.
 */
export async function trustDevice(params: {
  userId: string;
  deviceId?: string | null;
  deviceName?: string | null;
  platform?: string | null;
}): Promise<void> {
  if (!isUsableDeviceId(params.deviceId)) return;

  const deviceIdHash = getDeviceIdHash(params.deviceId);
  if (!deviceIdHash) return;
  await prisma.mobileTrustedDevice.upsert({
    where: { userId_deviceIdHash: { userId: params.userId, deviceIdHash } },
    update: {
      lastUsedAt: new Date(),
      deviceName: params.deviceName ?? undefined,
      platform: params.platform ?? undefined,
    },
    create: {
      userId: params.userId,
      deviceIdHash,
      deviceName: params.deviceName ?? null,
      platform: params.platform ?? "ios",
    },
  });
}

/**
 * Kullanıcının tüm güvenilir cihaz eşleştirmelerini siler. Koruma
 * kapatıldığında çağrılır.
 */
export async function clearTrustedDevices(userId: string): Promise<void> {
  await prisma.mobileTrustedDevice.deleteMany({ where: { userId } });
}

/**
 * Yalnızca verilen cihazın eşleştirmesini kaldırır ve kullanıcının kalan
 * güvenilir cihaz sayısını döndürür. Diğer cihazların eşleştirmesi korunur;
 * kalan sayı 0 ise çağıran taraf korumayı tümden kapatmayı seçebilir.
 */
export async function untrustDevice(
  userId: string,
  deviceId?: string | null,
): Promise<{ removed: boolean; remainingCount: number }> {
  const deviceIdHash = getDeviceIdHash(deviceId);
  let removed = false;
  if (deviceIdHash) {
    const { count } = await prisma.mobileTrustedDevice.deleteMany({
      where: { userId, deviceIdHash },
    });
    removed = count > 0;
  }
  const remainingCount = await prisma.mobileTrustedDevice.count({ where: { userId } });
  return { removed, remainingCount };
}

/**
 * Verilen cihazın bu hesap için eşleştirme durumu. `isTrustedDevice`'tan
 * farklı olarak `lastUsedAt` tazelenmez; ayar ekranındaki durum sorguları
 * için yan etkisiz okumadır.
 */
export async function getDeviceTrustStatus(
  userId: string,
  deviceId?: string | null,
): Promise<{ deviceTrusted: boolean; trustedDeviceCount: number }> {
  const deviceIdHash = getDeviceIdHash(deviceId);
  const [device, trustedDeviceCount] = await Promise.all([
    deviceIdHash
      ? prisma.mobileTrustedDevice.findUnique({
          where: { userId_deviceIdHash: { userId, deviceIdHash } },
          select: { id: true },
        })
      : Promise.resolve(null),
    prisma.mobileTrustedDevice.count({ where: { userId } }),
  ]);
  return { deviceTrusted: Boolean(device), trustedDeviceCount };
}

/**
 * Kullanıcının güvenilir cihaz hash'lerini döndürür; aktif cihaz listesinde
 * hangi kayıtların eşleştirilmiş olduğunu işaretlemek için kullanılır.
 */
export async function listTrustedDeviceHashes(userId: string): Promise<Set<string>> {
  const devices = await prisma.mobileTrustedDevice.findMany({
    where: { userId },
    select: { deviceIdHash: true },
  });
  return new Set(devices.map((device) => device.deviceIdHash));
}
