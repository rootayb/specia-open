# Specia Local — BEP ve Değerlendirmeler

Specia'nın **BEP** (Bireyselleştirilmiş Eğitim Programı) ve **Değerlendirmeler** bölümlerinin tamamen yerel (offline) çalışan sürümü. Çevrimiçi sistemdeki tüm mantık ve içerik birebir korunmuştur; veritabanı olarak bulut PostgreSQL yerine bilgisayarınızdaki tek bir SQLite dosyası (`prisma/dev.db`) kullanılır. İnternet ve üyelik gerektirmez — uygulama açıldığında otomatik olarak yerel kullanıcıyla çalışır.

## İçerik

- **Öğrenciler** — öğrenci kaydı (BEP ve değerlendirmeler öğrenciye bağlı olduğu için taşındı)
- **BEP** — BEP oluşturma/düzenleme (performans, hedefler, ortam, hizmetler, aile ve kararlar, kurul), toplu BEP, PDF çıktısı
- **Değerlendirmeler**
  - Kaba Değerlendirme (ders kazanımı bazlı form + PDF)
  - Öğretim Sonu Değerlendirmeler (ÖBT, Kontrol Listesi, Beceri Analizi + PDF/Word)
  - Davranış Değerlendirmesi (ABC modeli, anlık gözlem)
- **Formlar** — BEP'e bağlı hazır form şablonları

## Hazır paketi indir (önerilen — kurulum gerektirmez)

> ⚠️ **Dikkat:** Releases sayfasında iki indirme seçeneği görürsünüz. Yalnızca **`specia-open.zip`** dosyasını indirin. GitHub'ın otomatik oluşturduğu **"Source code (zip)"** (adı `specia-open-1.0.0.zip` gibi görünür) ham kaynak koddur, hazır çalışmaz ve hataya sebep olur.

1. Bilgisayarınızda [Node.js](https://nodejs.org) yoksa LTS sürümünü kurun (bir kez).
2. [Releases sayfasından](https://github.com/rootayb/specia-open/releases/latest), **Assets** başlığı altındaki `specia-open.zip` dosyasını indirin ve bir klasöre çıkarın.
3. **Windows**: `Specia-Baslat.bat` · **macOS**: `Specia-Baslat.command` dosyasına çift tıklayın.

Tarayıcınızda `http://localhost:3000` otomatik açılır. Verileriniz paketin içindeki `veri/` klasöründe saklanır; yedek için o klasörü kopyalamanız yeterli. Ayrıntılar paket içindeki `NASIL-KULLANILIR.txt` dosyasındadır.

## Kaynak koddan kurulum (geliştiriciler için)

Gereksinim: [Node.js](https://nodejs.org) 20 veya üzeri.

```bash
npm install
npm run setup:local   # .env dosyasını (rastgele anahtarlarla), veritabanını, müfredatı ve beceri şablonlarını oluşturur
```

## Çalıştırma (kaynak koddan)

```bash
npm run dev     # geliştirme modu — http://localhost:3000
```

veya üretim modu (daha hızlı):

```bash
npm run build   # kod değiştiyse bir kez
npm run start   # uygulamayı başlatır — http://localhost:3000
```

**Kapatmak için:** terminalde `Ctrl+C` tuşlarına basın. Verileriniz her zaman diske kaydedildiği için istediğiniz an kapatabilirsiniz, veri kaybı olmaz.

## Verileriniz

- Tüm veriler `prisma/dev.db` dosyasındadır. Yedeklemek için bu dosyayı **ve `.env` dosyasını birlikte** kopyalayın.
- ÖNEMLİ: `.env` içindeki `DB_ENCRYPTION_KEY`, kişisel verileri (isimler, notlar vb.) veritabanında şifreler. **Bu anahtar kaybolursa şifreli veriler geri getirilemez.** `.env` dosyasını silmeyin, yedeğini alın.

## Lisans

Bu proje [MIT lisansı](LICENSE) ile yayınlanmıştır — özgürce kullanabilir, değiştirebilir ve dağıtabilirsiniz.

## Çevrimiçi sürümden farklar

- Giriş/üyelik, e-posta, kurum yönetimi, finans, seans, iletişim vb. modüller kaldırıldı; yalnızca BEP + Değerlendirmeler (+ Öğrenciler, Formlar) taşındı.
- Veritabanı PostgreSQL yerine SQLite; enum kolonlar String olarak tutulur (değerler aynı, tanımlar `src/lib/prisma-shim.ts` içinde).
- Tek yerel kullanıcı (`Yerel Kullanıcı`, öğretmen rolü) otomatik oluşturulur; `src/lib/session.ts` bu kullanıcıyı döndürür.
