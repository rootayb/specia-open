import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";

import { getPlatformMaintenanceState } from "@/lib/platform-runtime";

export async function GET() {
  noStore();

  const maintenance = await getPlatformMaintenanceState();

  return NextResponse.json({
    maintenance: {
      enabled: maintenance.enabled,
      isActive: maintenance.isActive,
      endsAt: maintenance.endsAt?.toISOString() ?? null,
      message: maintenance.message,
      updatedAt: maintenance.updatedAt?.toISOString() ?? null,
      remainingMs: maintenance.remainingMs,
      source: maintenance.source,
    },
    checkedAt: new Date().toISOString(),
  });
}
