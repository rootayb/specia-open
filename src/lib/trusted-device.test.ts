import { beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "node:crypto";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findMany: vi.fn(),
  update: vi.fn(),
  upsert: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    mobileTrustedDevice: {
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      update: mocks.update,
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
      count: mocks.count,
    },
  },
}));

import {
  hashDeviceId,
  isTrustedDevice,
  trustDevice,
  clearTrustedDevices,
  untrustDevice,
  getDeviceTrustStatus,
  listTrustedDeviceHashes,
} from "./trusted-device";

const DEVICE_ID = "AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE";
const DEVICE_ID_HASH = crypto.createHash("sha256").update(DEVICE_ID).digest("hex");

beforeEach(() => {
  vi.clearAllMocks();
});

describe("hashDeviceId", () => {
  it("deviceId'yi SHA-256 ile özetler ve ham değeri saklamaz", () => {
    expect(hashDeviceId(DEVICE_ID)).toBe(DEVICE_ID_HASH);
    expect(hashDeviceId(DEVICE_ID)).not.toContain(DEVICE_ID);
  });

  it("baştaki/sondaki boşlukları yok sayar (tutarlı eşleşme)", () => {
    expect(hashDeviceId(`  ${DEVICE_ID}  `)).toBe(DEVICE_ID_HASH);
  });
});

describe("isTrustedDevice", () => {
  it("kullanılamaz/kısa kimlikte sorgu yapmadan false döner", async () => {
    expect(await isTrustedDevice("user-1", undefined)).toBe(false);
    expect(await isTrustedDevice("user-1", "")).toBe(false);
    expect(await isTrustedDevice("user-1", "short")).toBe(false);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("eşleşme yoksa false döner", async () => {
    mocks.findUnique.mockResolvedValue(null);
    expect(await isTrustedDevice("user-1", DEVICE_ID)).toBe(false);
    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { userId_deviceIdHash: { userId: "user-1", deviceIdHash: DEVICE_ID_HASH } },
      select: { id: true },
    });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("eşleşme varsa true döner ve lastUsedAt tazelenir", async () => {
    mocks.findUnique.mockResolvedValue({ id: "device-1" });
    mocks.update.mockResolvedValue({});
    expect(await isTrustedDevice("user-1", DEVICE_ID)).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "device-1" } }),
    );
  });
});

describe("trustDevice", () => {
  it("kullanılamaz kimlikte upsert yapmaz", async () => {
    await trustDevice({ userId: "user-1", deviceId: "" });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("cihazı (userId, deviceIdHash) anahtarıyla upsert eder", async () => {
    mocks.upsert.mockResolvedValue({});
    await trustDevice({
      userId: "user-1",
      deviceId: DEVICE_ID,
      deviceName: "iPhone 15",
      platform: "ios",
    });
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_deviceIdHash: { userId: "user-1", deviceIdHash: DEVICE_ID_HASH } },
        create: expect.objectContaining({
          userId: "user-1",
          deviceIdHash: DEVICE_ID_HASH,
          deviceName: "iPhone 15",
          platform: "ios",
        }),
      }),
    );
  });
});

describe("clearTrustedDevices", () => {
  it("kullanıcının tüm güvenilir cihazlarını siler", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 2 });
    await clearTrustedDevices("user-1");
    expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});

describe("untrustDevice", () => {
  it("yalnızca verilen cihazı siler ve kalan sayıyı döndürür", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.count.mockResolvedValue(2);
    const result = await untrustDevice("user-1", DEVICE_ID);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1", deviceIdHash: DEVICE_ID_HASH },
    });
    expect(result).toEqual({ removed: true, remainingCount: 2 });
  });

  it("son cihaz kaldırıldığında remainingCount 0 döner", async () => {
    mocks.deleteMany.mockResolvedValue({ count: 1 });
    mocks.count.mockResolvedValue(0);
    const result = await untrustDevice("user-1", DEVICE_ID);
    expect(result).toEqual({ removed: true, remainingCount: 0 });
  });

  it("kullanılamaz kimlikte silme yapmaz ama kalan sayıyı döndürür", async () => {
    mocks.count.mockResolvedValue(1);
    const result = await untrustDevice("user-1", "");
    expect(mocks.deleteMany).not.toHaveBeenCalled();
    expect(result).toEqual({ removed: false, remainingCount: 1 });
  });
});

describe("getDeviceTrustStatus", () => {
  it("eşli cihazda deviceTrusted true döner ve lastUsedAt'e dokunmaz", async () => {
    mocks.findUnique.mockResolvedValue({ id: "device-1" });
    mocks.count.mockResolvedValue(3);
    const status = await getDeviceTrustStatus("user-1", DEVICE_ID);
    expect(status).toEqual({ deviceTrusted: true, trustedDeviceCount: 3 });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("kullanılamaz kimlikte sorgu yapmadan deviceTrusted false döner", async () => {
    mocks.count.mockResolvedValue(1);
    const status = await getDeviceTrustStatus("user-1", null);
    expect(mocks.findUnique).not.toHaveBeenCalled();
    expect(status).toEqual({ deviceTrusted: false, trustedDeviceCount: 1 });
  });
});

describe("listTrustedDeviceHashes", () => {
  it("kullanıcının güvenilir cihaz hash'lerini set olarak döndürür", async () => {
    mocks.findMany.mockResolvedValue([
      { deviceIdHash: "hash-1" },
      { deviceIdHash: "hash-2" },
    ]);
    const hashes = await listTrustedDeviceHashes("user-1");
    expect(hashes).toEqual(new Set(["hash-1", "hash-2"]));
  });
});
