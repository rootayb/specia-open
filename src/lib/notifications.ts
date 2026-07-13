import { prisma } from "@/lib/prisma";
import { sendMobilePushToUsers } from "@/lib/mobile-push";

type NotifyPayload = {
  type: string;
  title: string;
  body: string;
  data?: Record<string, string | number | boolean | null | undefined>;
};

/**
 * Bir veya birden fazla kullanıcıya bildirim gönderir: hem kalıcı bir
 * AppNotification kaydı oluşturur (uygulama içi Bildirimler listesinde
 * görünür, GET /api/mobile/v1/notifications tarafından okunur) hem de push
 * bildirimi (Firebase, uygulama dışı) gönderir.
 *
 * Önceden bu iki kanal ayrı ayrı tetikleniyordu: sendMobilePushToUsers
 * doğrudan çağrılıyor, uygulama içi listeye (getTaskReminderHub) karşılık
 * gelen bir kayıt hiç oluşmuyordu. Sonuç: kullanıcı push bildirimi görüyor
 * ama "Bildirimler" ekranında hiçbir şey bulamıyordu. Bundan sonra tüm
 * bildirim gönderimleri buradan geçmeli — push tetiklemek isteyen hiçbir
 * kod sendMobilePushToUsers'ı doğrudan çağırmamalı.
 */
export async function notifyUsers(userIds: string[], payload: NotifyPayload) {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueUserIds.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, skipped: true };
  }

  await prisma.appNotification.createMany({
    data: uniqueUserIds.map((userId) => ({
      userId,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      data: payload.data ? sanitizeJson(payload.data) : undefined,
    })),
  });

  return sendMobilePushToUsers(uniqueUserIds, {
    title: payload.title,
    body: payload.body,
    data: payload.data,
  });
}

function sanitizeJson(
  data: Record<string, string | number | boolean | null | undefined>,
) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as Record<string, string | number | boolean | null>;
}
