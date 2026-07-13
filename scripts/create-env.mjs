// .env dosyası yoksa rastgele anahtarlarla oluşturur (ilk kurulum için).
// Mevcut .env dosyasına asla dokunmaz — anahtar kaybı veri kaybı demektir.
import { existsSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

if (existsSync(".env")) {
  console.log(".env zaten var, dokunulmadı.");
  process.exit(0);
}

const key = () => randomBytes(32).toString("hex");

writeFileSync(
  ".env",
  `# Specia Local — otomatik oluşturulan yerel ortam dosyası
# DİKKAT: DB_ENCRYPTION_KEY kaybolursa şifreli veriler kalıcı olarak okunamaz.
# Bu dosyayı prisma/dev.db ile birlikte yedekleyin.
DATABASE_URL="file:./dev.db"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="${key()}"
DOCUMENT_LINK_SECRET="${key()}"
DB_ENCRYPTION_KEY="${key()}"
NEXT_TELEMETRY_DISABLED=1
`,
);

console.log(".env oluşturuldu (rastgele anahtarlarla).");
