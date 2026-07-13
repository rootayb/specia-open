import { NextResponse } from "next/server";

import { getRequestIp } from "@/lib/action-security";
import { getZumreMeetingById } from "@/lib/data";
import { consumeRateLimit } from "@/lib/rate-limit";
import { requireApiUser } from "@/lib/session";
import { generateZumreMeetingDocx } from "@/lib/zumre-meeting-export";

export const dynamic = "force-dynamic";

function buildSafeDocxFilename(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${base || "zumre-toplantı-tutanagi"}.docx`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  const rateLimit = await consumeRateLimit({
    action: "docx.zumre",
    key: `ip:${await getRequestIp()}`,
    limit: 120,
    windowMs: 60 * 1000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Çok fazla istek gönderildi. Lütfen biraz sonra tekrar deneyin." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const document = await getZumreMeetingById(user, id);
  if (!document) {
    return NextResponse.json({ error: "Zumre tutanağı bulunamadı." }, { status: 404 });
  }

  const bytes = await generateZumreMeetingDocx(document);
  const fileName = buildSafeDocxFilename(document.title);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
