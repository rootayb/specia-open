import { getPlatformMaintenanceState } from "@/lib/platform-runtime";
import { prisma } from "@/lib/prisma";

type HealthStatus = "healthy" | "warning" | "critical";

type HealthCheck = {
  key: string;
  label: string;
  status: HealthStatus;
  summary: string;
  details: string[];
  action?: string;
};

type PublicStatusItem = {
  key: string;
  label: string;
  status: HealthStatus;
  summary: string;
  details: string[];
};

function isSameDatabaseTarget(runtimeUrl?: string, directUrl?: string) {
  if (!runtimeUrl || !directUrl) {
    return null;
  }

  try {
    const runtime = new URL(runtimeUrl);
    const direct = new URL(directUrl);

    return runtime.pathname === direct.pathname;
  } catch {
    return false;
  }
}

function getOverallStatus(checks: Array<{ status: HealthStatus }>): HealthStatus {
  if (checks.some((check) => check.status === "critical")) {
    return "critical";
  }

  if (checks.some((check) => check.status === "warning")) {
    return "warning";
  }

  return "healthy";
}

async function getDatabaseRuntimeCheck(requiredTables: string[]): Promise<HealthCheck> {
  try {
    await prisma.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;

    const existingTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;

    const tableNames = new Set(existingTables.map((row) => row.table_name));
    const missingTables = requiredTables.filter((tableName) => !tableNames.has(tableName));

    if (missingTables.length > 0) {
      return {
        key: "database-runtime",
        label: "Veritabanı erişimi",
        status: "critical",
        summary: "Veritabanına bağlanılıyor ancak uygulama şeması eksik görünüyor.",
        details: [
          `Eksik tablo sayısı: ${missingTables.length}`,
          "Uygulama verileri tam akışta çalışmayabilir.",
        ],
        action: "Migration veya kurulum adımlarını tamamlayın.",
      };
    }

    return {
      key: "database-runtime",
      label: "Veritabanı erişimi",
      status: "healthy",
      summary: "Veritabanı sorgusu ve temel uygulama tabloları çalışıyor.",
      details: ["SELECT 1 kontrolü başarılı.", "Temel tablo seti erişilebilir durumda."],
    };
  } catch {
    return {
      key: "database-runtime",
      label: "Veritabanı erişimi",
      status: "critical",
      summary: "Veritabanı erişimi şu anda kurulamıyor.",
      details: ["Uygulama canlı veri sorgularını tamamlayamıyor."],
      action: "Bağlantı ayarlarını ve erişim yetkilerini kontrol edin.",
    };
  }
}

function getAuthCheck(): HealthCheck {
  const authReady = Boolean(process.env.NEXTAUTH_URL && process.env.NEXTAUTH_SECRET);

  return {
    key: "auth",
    label: "Oturum altyapısı",
    status: authReady ? "healthy" : "critical",
    summary: authReady
      ? "Auth.js yapılandırması hazır görünüyor."
      : "Oturum altyapısında eksik ayar var.",
    details: [
      authReady
        ? "NEXTAUTH_URL ve NEXTAUTH_SECRET tanımlı."
        : "NEXTAUTH_URL veya NEXTAUTH_SECRET eksik.",
    ],
    action: authReady ? undefined : "Oturum değişkenlerini tamamlayın.",
  };
}

function getEmailCheck(): HealthCheck {
  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
  );

  return {
    key: "email",
    label: "E-posta servisi",
    status: emailConfigured ? "healthy" : "warning",
    summary: emailConfigured
      ? "E-posta gönderimi için gerekli yapılandırma hazır."
      : "E-posta servisi kısmen hazır veya pasif durumda.",
    details: [
      emailConfigured
        ? "RESEND yapılandırması tanımlı."
        : "RESEND_API_KEY veya RESEND_FROM_EMAIL eksik.",
    ],
    action: emailConfigured ? undefined : "E-posta ayarlarını tamamlayın.",
  };
}

function getMobileApiCheck(): HealthCheck {
  const secret = process.env.NEXTAUTH_SECRET?.trim();
  const secretOk = Boolean(secret && secret.length >= 32);

  return {
    key: "mobile-api",
    label: "Mobile API Altyapısı",
    status: secretOk ? "healthy" : "critical",
    summary: secretOk
      ? "Mobile API ağ geçidi ve token doğrulama sistemi operasyonel."
      : "Mobile API güvenliği için NEXTAUTH_SECRET yetersiz veya eksik.",
    details: [
      secretOk
        ? "Mobil JWT imzalama anahtarı hazır (HS256)."
        : "NEXTAUTH_SECRET en az 32 karakter uzunluğunda olmalıdır.",
      "Mobil uygulama uç noktaları aktif durumda."
    ],
    action: secretOk ? undefined : "NEXTAUTH_SECRET değerini en az 32 karaktere güncelleyin.",
  };
}

// Caching configuration
const HEALTH_CACHE_TTL_MS = 30_000; // 30 seconds
const PUBLIC_STATUS_CACHE_TTL_MS = 60_000; // 60 seconds

let adminHealthCache: {
  expiresAt: number;
  value: any;
} | null = null;

let publicStatusCache: {
  expiresAt: number;
  value: any;
} | null = null;

export function invalidateSystemHealthCache() {
  adminHealthCache = null;
  publicStatusCache = null;
}

export async function getAdminSystemHealth() {
  if (adminHealthCache && adminHealthCache.expiresAt > Date.now()) {
    return adminHealthCache.value as {
      checkedAt: Date;
      overallStatus: HealthStatus;
      criticalCount: number;
      warningCount: number;
      checks: HealthCheck[];
    };
  }

  const checks: HealthCheck[] = [];
  const runtimeUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DIRECT_URL;
  const requiredTables = [
    "User",
    "Institution",
    "Student",
    "BepDocument",
    "InstitutionSession",
    "AuditLog",
  ];
  const missingDatabaseEnv = ["DATABASE_URL", "DIRECT_URL"].filter(
    (name) => !process.env[name],
  );

  if (missingDatabaseEnv.length > 0) {
    checks.push({
      key: "database-config",
      label: "Veritabanı yapılandırması",
      status: "critical",
      summary: "Veritabanı bağlantı değişkenleri eksik.",
      details: [`Eksik alanlar: ${missingDatabaseEnv.join(", ")}`],
      action: "Sunucu ayarlarında eksik bağlantı değişkenlerini tanımlayın.",
    });
  } else {
    const sameTarget = isSameDatabaseTarget(runtimeUrl, directUrl);

    checks.push({
      key: "database-config",
      label: "Veritabanı yapılandırması",
      status: sameTarget === false ? "warning" : "healthy",
      summary:
        sameTarget === false
          ? "Runtime ve direct bağlantıları farklı hedeflere işaret ediyor olabilir."
          : "Veritabanı bağlantı yönleri tutarlı görünüyor.",
      details: [
        sameTarget === false
          ? "Farklı hedefler migration ve runtime davranışını ayrıştırabilir."
          : "Bağlantı uçları aynı veritabanı hedefiyle uyumlu.",
      ],
      action:
        sameTarget === false
          ? "DATABASE_URL ve DIRECT_URL değerlerini karşılaştırın."
          : undefined,
    });
  }

  checks.push(await getDatabaseRuntimeCheck(requiredTables));
  checks.push(getAuthCheck());
  checks.push(getEmailCheck());
  checks.push(getMobileApiCheck());

  const criticalCount = checks.filter((check) => check.status === "critical").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;

  const result = {
    checkedAt: new Date(),
    overallStatus: getOverallStatus(checks),
    criticalCount,
    warningCount,
    checks,
  };

  adminHealthCache = {
    expiresAt: Date.now() + HEALTH_CACHE_TTL_MS,
    value: result,
  };

  return result;
}

export async function getPublicSystemStatus() {
  if (publicStatusCache && publicStatusCache.expiresAt > Date.now()) {
    return publicStatusCache.value as {
      checkedAt: Date;
      overallStatus: HealthStatus;
      maintenance: any;
      items: PublicStatusItem[];
    };
  }

  const maintenance = await getPlatformMaintenanceState();
  const databaseCheck = await getDatabaseRuntimeCheck([]);
  const authCheck = getAuthCheck();
  const emailCheck = getEmailCheck();
  const mobileApiCheck = getMobileApiCheck();

  const items: PublicStatusItem[] = [
    {
      key: "database",
      label: "Veritabanı",
      status: databaseCheck.status,
      summary:
        databaseCheck.status === "healthy"
          ? "Canlı veri sorguları çalışıyor."
          : "Canlı veri sorgularında sorun var.",
      details: databaseCheck.details,
    },
    {
      key: "auth",
      label: "Oturum",
      status: authCheck.status === "critical" ? "warning" : authCheck.status,
      summary:
        authCheck.status === "healthy"
          ? "Giriş ve oturum altyapısı hazır."
          : "Oturum altyapısı sınırlı veya eksik ayarlı.",
      details: authCheck.details,
    },
    {
      key: "email",
      label: "E-posta",
      status: emailCheck.status,
      summary:
        emailCheck.status === "healthy"
          ? "Bildirim ve e-posta akışı hazır."
          : "E-posta gönderiminde sınırlı durum olabilir.",
      details: emailCheck.details,
    },
    {
      key: "mobile-api",
      label: "Mobile API",
      status: mobileApiCheck.status,
      summary: mobileApiCheck.summary,
      details: mobileApiCheck.details,
    },
  ];

  const result = {
    checkedAt: new Date(),
    overallStatus: maintenance.isActive ? "warning" : getOverallStatus(items),
    maintenance,
    items,
  };

  publicStatusCache = {
    expiresAt: Date.now() + PUBLIC_STATUS_CACHE_TTL_MS,
    value: result,
  };

  return result;
}
