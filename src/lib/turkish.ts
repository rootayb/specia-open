const phraseEntries = [
  ["yuz yuze", "yüz yüze"],
  ["cevrimici", "çevrimiçi"],
  ["il / ilce", "il / ilçe"],
];

const wordEntries = [
  ["adi", "adı"],
  ["alti", "altı"],
  ["amac", "amaç"],
  ["araligi", "aralığı"],
  ["arsiv", "arşiv"],
  ["arsivi", "arşivi"],
  ["asagi", "aşağı"],
  ["ayarlari", "ayarları"],
  ["bagli", "bağlı"],
  ["baglanti", "bağlantı"],
  ["bakis", "bakış"],
  ["basladi", "başladı"],
  ["baslangic", "başlangıç"],
  ["basvuru", "başvuru"],
  ["basvurulari", "başvuruları"],
  ["basvurunuz", "başvurunuz"],
  ["bolum", "bölüm"],
  ["bulunamadi", "bulunamadı"],
  ["cikti", "çıktı"],
  ["ciktiyi", "çıktıyı"],
  ["cocuk", "çocuk"],
  ["deger", "değer"],
  ["degerlendirme", "değerlendirme"],
  ["degil", "değil"],
  ["degisti", "değişti"],
  ["degistir", "değiştir"],
  ["degistirme", "değiştirme"],
  ["degisim", "değişim"],
  ["dogru", "doğru"],
  ["dogrulama", "doğrulama"],
  ["duzen", "düzen"],
  ["duzeni", "düzeni"],
  ["duzenle", "düzenle"],
  ["duzenleme", "düzenleme"],
  ["egitim", "eğitim"],
  ["erisim", "erişim"],
  ["eslesme", "eşleşme"],
  ["eslestirme", "eşleştirme"],
  ["gecmis", "geçmiş"],
  ["gelisim", "gelişim"],
  ["gelistirme", "geliştirme"],
  ["giris", "giriş"],
  ["goruntu", "görüntü"],
  ["gorusme", "görüşme"],
  ["goster", "göster"],
  ["gorev", "görev"],
  ["guclu", "güçlü"],
  ["guncel", "güncel"],
  ["guncelle", "güncelle"],
  ["gunluk", "günlük"],
  ["henuz", "henüz"],
  ["hayir", "hayır"],
  ["icerik", "içerik"],
  ["icin", "için"],
  ["icinde", "içinde"],
  ["icecek", "içecek"],
  ["ilce", "ilçe"],
  ["iletisim", "iletişim"],
  ["iliski", "ilişki"],
  ["iliskili", "ilişkili"],
  ["kagit", "kağıt"],
  ["kaydi", "kaydı"],
  ["kayit", "kayıt"],
  ["kisa", "kısa"],
  ["kisisel", "kişisel"],
  ["kosullari", "koşulları"],
  ["mudur", "müdür"],
  ["mudurlugu", "müdürlüğü"],
  ["ogrenci", "öğrenci"],
  ["ogretmen", "öğretmen"],
  ["ogretimi", "öğretimi"],
  ["olustur", "oluştur"],
  ["oneri", "öneri"],
  ["oneriler", "öneriler"],
  ["ornek", "örnek"],
  ["ozel", "özel"],
  ["ozet", "özet"],
  ["ozeti", "özeti"],
  ["ozellik", "özellik"],
  ["saglik", "sağlık"],
  ["sayisi", "sayısı"],
  ["sec", "seç"],
  ["secili", "seçili"],
  ["secim", "seçim"],
  ["secin", "seçin"],
  ["sikligi", "sıklığı"],
  ["siklikla", "sıklıkla"],
  ["sinif", "sınıf"],
  ["sirasi", "sırası"],
  ["sira", "sıra"],
  ["sifre", "şifre"],
  ["sonrasi", "sonrası"],
  ["sure", "süre"],
  ["sureci", "süreci"],
  ["suresi", "süresi"],
  ["suruyor", "sürüyor"],
  ["tasima", "taşıma"],
  ["toplanti", "toplantı"],
  ["turu", "türü"],
  ["uye", "üye"],
  ["uyesi", "üyesi"],
  ["yalnizca", "yalnızca"],
  ["yazi", "yazı"],
  ["yontem", "yöntem"],
  ["yonetim", "yönetim"],
  ["yukle", "yükle"],
  ["yuzde", "yüzde"],
];

function applyCase(source: string, target: string) {
  if (source === source.toLocaleUpperCase("tr-TR")) {
    return target.toLocaleUpperCase("tr-TR");
  }

  if (source === source.toLocaleLowerCase("tr-TR")) {
    return target.toLocaleLowerCase("tr-TR");
  }

  if (
    source[0] === source[0]?.toLocaleUpperCase("tr-TR") &&
    source.slice(1) === source.slice(1).toLocaleLowerCase("tr-TR")
  ) {
    return target[0]?.toLocaleUpperCase("tr-TR") + target.slice(1).toLocaleLowerCase("tr-TR");
  }

  return target;
}

function maybeDecodeMojibake(value: string) {
  if (!/[\u00C3\u00C4\u00C5]/.test(value)) {
    return value;
  }

  try {
    const bytes = Uint8Array.from(Array.from(value), (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);

    if (decoded.includes("\uFFFD")) {
      return value;
    }

    return decoded;
  } catch {
    return value;
  }
}

export function restoreTurkishText(value?: string | null) {
  if (!value) {
    return value ?? "";
  }

  let nextValue = maybeDecodeMojibake(value);

  for (const [source, target] of phraseEntries) {
    const pattern = new RegExp(source, "gi");
    nextValue = nextValue.replace(pattern, (match) => applyCase(match, target));
  }

  for (const [source, target] of wordEntries) {
    // Use explicit lookahead/lookbehind with Turkish characters so that words
    // like "amacı" are not falsely matched by \b (which treats Turkish chars
    // as non-word characters and would fire between "c" and "ı").
    const tuChars = "a-zA-ZğüşöçıiİĞÜŞÖÇ";
    const pattern = new RegExp(`(?<![${tuChars}])${source}(?![${tuChars}])`, "gi");
    nextValue = nextValue.replace(pattern, (match) => applyCase(match, target));
  }

  return nextValue;
}
