import { Prisma } from "@/lib/prisma-shim";

const DEFAULT_MESSAGE =
  "Veritabanı bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.";

export function getReadableDbError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return DEFAULT_MESSAGE;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return "Veritabanı işlemi tamamlanamadı. Lütfen tekrar deneyin.";
  }

  if (error instanceof Error && /Can't reach database server/i.test(error.message)) {
    return DEFAULT_MESSAGE;
  }

  return "Beklenmeyen bir sunucu hatası oluştu.";
}

/**
 * Geçici veritabanı hatalarında (serverless soğuk başlangıç, anlık bağlantı
 * kopması vb.) işlemi kısa bir bekleme sonrası bir kez daha dener; kalıcı
 * hatalar kullanıcıya hata kartı olarak yansımadan önce ikinci şans almış olur.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  { attempts = 2, delayMs = 300 }: { attempts?: number; delayMs?: number } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
      }
    }
  }
  throw lastError;
}
