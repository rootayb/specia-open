import { NextResponse } from "next/server";

import { getRequestIp } from "@/lib/action-security";
import { writeAuditLog } from "@/lib/audit";
import { getStudentFileAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";

function isSafeExternalFileUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    action: "student_file.download",
    key: `ip:${await getRequestIp()}`,
    limit: 60,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const file = await prisma.studentFile.findFirst({
    where: {
      id,
      ...getStudentFileAccessWhere(user),
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      fileData: true,
      mimeType: true,
      fileUrl: true,
      studentId: true,
      institutionId: true,
    },
  });

  if (!file) {
    return NextResponse.json({ error: "Belge bulunamadı." }, { status: 404 });
  }

  if (!file.fileData) {
    if (file.fileUrl) {
      if (!isSafeExternalFileUrl(file.fileUrl)) {
        return NextResponse.json({ error: "Belge doğrulanamadı." }, { status: 404 });
      }

      await writeAuditLog({
        actorId: user.id,
        action: "student_file.external_link_opened",
        entityType: "studentFile",
        entityId: file.id,
        summary: "Öğrenci dosya bağlantısı açıldı.",
        metadata: {
          studentId: file.studentId,
          institutionId: file.institutionId,
          ip: await getRequestIp(),
          userAgent: request.headers.get("user-agent"),
        },
      });

      return NextResponse.redirect(file.fileUrl);
    }

    return NextResponse.json({ error: "Belge doğrulanamadı." }, { status: 404 });
  }

  const fileName = file.fileName?.trim() || `${file.title}.bin`;
  await writeAuditLog({
    actorId: user.id,
    action: "student_file.downloaded",
    entityType: "studentFile",
    entityId: file.id,
    summary: "Öğrenci dosyası görüntülendi veya indirildi.",
    metadata: {
      studentId: file.studentId,
      institutionId: file.institutionId,
      ip: await getRequestIp(),
      userAgent: request.headers.get("user-agent"),
    },
  });

  return new NextResponse(file.fileData, {
    headers: {
      "content-type": file.mimeType || "application/octet-stream",
      "content-disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
      "cache-control": "private, max-age=0, must-revalidate",
      "x-content-type-options": "nosniff",
    },
  });
}
