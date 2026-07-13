import { describe, expect, it, vi } from "vitest";

import { withDbRetry } from "./db-errors";

describe("withDbRetry", () => {
  it("ilk denemede başarılıysa tekrar denemez", async () => {
    const operation = vi.fn().mockResolvedValue("tamam");
    await expect(withDbRetry(operation, { delayMs: 1 })).resolves.toBe("tamam");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("geçici hatada bir kez daha dener ve ikinci sonucu döndürür", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error("Can't reach database server"))
      .mockResolvedValueOnce("ikinci deneme");
    await expect(withDbRetry(operation, { delayMs: 1 })).resolves.toBe("ikinci deneme");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("tüm denemeler başarısızsa son hatayı fırlatır", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("kalıcı hata"));
    await expect(withDbRetry(operation, { attempts: 3, delayMs: 1 })).rejects.toThrow(
      "kalıcı hata",
    );
    expect(operation).toHaveBeenCalledTimes(3);
  });
});
