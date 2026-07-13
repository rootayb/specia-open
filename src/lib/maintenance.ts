import { isEnvironmentMaintenanceEnabled } from "@/lib/maintenance-env";

export function isMaintenanceModeEnabled() {
  return isEnvironmentMaintenanceEnabled();
}

export function isMaintenanceBypassPath(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/runtime-status") ||
    pathname === "/favicon.ico" ||
    pathname === "/bakim" ||
    pathname === "/durum" ||
    pathname === "/giris" ||
    pathname === "/gizlilik" ||
    pathname === "/kullanim-kosullari" ||
    pathname === "/cerez-politikasi"
  );
}
