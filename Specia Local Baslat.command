#!/bin/zsh
# Specia Local başlatıcı — çift tıklayınca uygulamayı derleyip açar.
cd "$(dirname "$0")"

echo "Specia Local başlatılıyor..."

# Daha önce derlenmemişse (veya derleme silinmişse) bir kez derle.
if [ ! -f .next/BUILD_ID ]; then
  echo "İlk çalıştırma: uygulama derleniyor, bu birkaç dakika sürebilir..."
  npm run build || { echo "Derleme başarısız oldu."; read -k1; exit 1; }
fi

# Sunucu ayağa kalkınca tarayıcıyı aç.
( sleep 3 && open "http://localhost:3000" ) &

echo ""
echo "Uygulama http://localhost:3000 adresinde çalışıyor."
echo "KAPATMAK için bu pencerede Ctrl+C'ye basın veya pencereyi kapatın."
echo ""
npm run start
