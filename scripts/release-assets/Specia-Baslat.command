#!/bin/zsh
# Specia Open başlatıcı (macOS) — çift tıklayınca uygulamayı açar.
cd "$(dirname "$0")"

# Node.js kurulu mu?
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js bulunamadı."
  echo "Lütfen https://nodejs.org adresinden LTS sürümünü kurun ve tekrar deneyin."
  read -k1 -s "?Kapatmak için bir tuşa basın..."
  exit 1
fi

mkdir -p veri

# İlk çalıştırma: müfredat yüklü boş veritabanını kopyala.
if [ ! -f veri/specia.db ]; then
  cp uygulama/veritabani-sablonu.db veri/specia.db
  echo "Yeni veritabanı oluşturuldu."
fi

# İlk çalıştırma: rastgele gizli anahtarları üret.
# DİKKAT: veri/ klasörünü silmek = tüm verilerin kaybı. Yedeklerinizi bu klasörden alın.
if [ ! -f veri/ayarlar.env ]; then
  node -e '
    const { randomBytes } = require("node:crypto");
    const k = () => randomBytes(32).toString("hex");
    require("node:fs").writeFileSync("veri/ayarlar.env",
      `NEXTAUTH_SECRET=${k()}\nDOCUMENT_LINK_SECRET=${k()}\nDB_ENCRYPTION_KEY=${k()}\n`);
  '
  echo "Gizli anahtarlar oluşturuldu."
fi

# Ayarları yükle ve ortam değişkenlerini ayarla.
set -a
source veri/ayarlar.env
set +a
export DATABASE_URL="file:$(pwd)/veri/specia.db"
export NEXTAUTH_URL="http://localhost:3000"
export NEXT_TELEMETRY_DISABLED=1
export HOSTNAME="127.0.0.1"
export PORT=3000

( sleep 3 && open "http://localhost:3000" ) &

echo ""
echo "Specia Open http://localhost:3000 adresinde çalışıyor."
echo "KAPATMAK için bu pencerede Ctrl+C'ye basın veya pencereyi kapatın."
echo ""
node uygulama/server.js
