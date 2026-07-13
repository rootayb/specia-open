export function isEnvironmentMaintenanceEnabled() {
  const value = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return value === "1" || value === "true" || value === "on";
}
