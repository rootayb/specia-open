#!/bin/zsh
# İndirilebilir Specia Open paketi üretir: dist/specia-open.zip
# İçerik: derlenmiş sunucu + müfredat yüklü boş veritabanı + Mac/Windows başlatıcıları.
set -e
setopt NULL_GLOB
cd "$(dirname "$0")/.."

echo "1/5 Prisma istemcisi (tüm platform motorlarıyla) üretiliyor..."
# dist önce silinir ki build sırasında dosya izleme paketi kendi içine almasın.
rm -rf dist
npx prisma generate >/dev/null

echo "2/5 Uygulama derleniyor..."
npm run build >/dev/null

echo "3/5 Şablon veritabanı (müfredat + beceri şablonları) hazırlanıyor..."
rm -f prisma/release-template.db
DATABASE_URL="file:./release-template.db" npx prisma db push --skip-generate >/dev/null
DATABASE_URL="file:./release-template.db" npx tsx prisma/seed.ts >/dev/null
DATABASE_URL="file:./release-template.db" npx tsx prisma/seed-skill-templates.ts >/dev/null

echo "4/5 Paket klasörü birleştiriliyor..."
rm -rf dist/specia-open dist/specia-open.zip
mkdir -p dist/specia-open/uygulama
# Standalone sunucu + statik dosyalar + public varlıkları
cp -R .next/standalone/. dist/specia-open/uygulama/
mkdir -p dist/specia-open/uygulama/.next/static
cp -R .next/static/. dist/specia-open/uygulama/.next/static/
cp -R public dist/specia-open/uygulama/public

# GÜVENLİK: izleme sırasında pakete sızan gizli/kişisel ve gereksiz dosyaları temizle.
(
  cd dist/specia-open/uygulama
  rm -rf .env .env.* prisma/dev.db prisma/*.db prisma/*.db-journal \
    .claude scripts dist tsconfig.tsbuildinfo "Specia Local Baslat.command" \
    eslint.config.mjs vitest.config.ts CLAUDE.md components.json
  find . -name ".DS_Store" -delete
)
# Paket içinde gizli dosya kalmadığını doğrula; kalırsa üretimi durdur.
if [ -e dist/specia-open/uygulama/.env ] || find dist/specia-open -name "dev.db" | grep -q .; then
  echo "HATA: pakette gizli dosya kaldı!" >&2
  exit 1
fi
# Şablon veritabanı ve başlatıcılar
cp prisma/release-template.db dist/specia-open/uygulama/veritabani-sablonu.db
cp scripts/release-assets/Specia-Baslat.command dist/specia-open/
cp scripts/release-assets/Specia-Baslat.bat dist/specia-open/
cp scripts/release-assets/NASIL-KULLANILIR.txt dist/specia-open/
cp LICENSE dist/specia-open/
chmod +x dist/specia-open/Specia-Baslat.command
rm -f prisma/release-template.db

echo "5/5 Zip oluşturuluyor..."
cd dist && zip -qry specia-open.zip specia-open && cd ..
du -sh dist/specia-open.zip
echo "Hazır: dist/specia-open.zip"
