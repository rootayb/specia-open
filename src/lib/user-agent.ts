export function getDeviceDetails(userAgent?: string | null): string {
  if (!userAgent) return "Bilinmeyen Cihaz";
  const ua = userAgent.toLowerCase();

  if (ua.includes("iphone")) return "iPhone";
  if (ua.includes("ipad")) return "iPad";
  if (ua.includes("android")) return "Android Cihazı";
  if (ua.includes("macintosh") || ua.includes("mac os x")) return "Mac (macOS)";
  if (ua.includes("windows")) return "Windows PC";
  if (ua.includes("linux")) return "Linux Cihazı";

  return "Bilinmeyen Cihaz";
}

export function cleanDeviceLabel(label?: string | null): string {
  if (!label) return "Bilinmeyen Cihaz";

  // Format: "Browser / OS" veya "Browser / OS - IP"
  const parts = label.split(" - ");
  const devicePart = parts[0].toLowerCase();

  let deviceName = parts[0];
  if (devicePart.includes("macos") || devicePart.includes("mac os x")) {
    deviceName = "Mac (macOS)";
  } else if (devicePart.includes("windows")) {
    deviceName = "Windows PC";
  } else if (devicePart.includes("iphone")) {
    deviceName = "iPhone";
  } else if (devicePart.includes("ipad")) {
    deviceName = "iPad";
  } else if (devicePart.includes("android")) {
    deviceName = "Android Cihazı";
  } else if (devicePart.includes("linux")) {
    deviceName = "Linux Cihazı";
  }

  return deviceName;
}
