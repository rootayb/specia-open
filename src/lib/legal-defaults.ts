import { getLegalContactEmail, getLegalHostname, LEGAL_BRAND_NAME } from "./legal";

export const LEGAL_DOCUMENT_SLUGS = ["privacy", "terms", "cookies"] as const;
export type LegalDocumentSlug = (typeof LEGAL_DOCUMENT_SLUGS)[number];

export type LegalDocumentSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

export type LegalDocumentPayload = {
  slug: LegalDocumentSlug;
  title: string;
  summary: string;
  sections: LegalDocumentSection[];
  updatedAt?: string;
};

export function defaultLegalDocuments(): Record<LegalDocumentSlug, LegalDocumentPayload> {
  const hostname = getLegalHostname();
  const contactEmail = getLegalContactEmail();

  return {
    privacy: {
      slug: "privacy",
      title: "Gizlilik ve KVKK Aydınlatma Metni",
      summary: `${LEGAL_BRAND_NAME} üzerinde işlenen kullanıcı, öğrenci, BEP, belge, mobil cihaz ve güvenlik kayıtlarına ilişkin temel kurallar. Son güncelleme: 2 Temmuz 2026.`,
      sections: [
        {
          title: "1. Kapsam ve veri sorumluluğu",
          paragraphs: [
            `Bu metin, ${hostname} alan adı ve Specia Dijital Eğitim Çözümleri mobil uygulaması üzerinden sunulan hizmet kapsamında toplanan ve işlenen kişisel veriler için hazırlanmıştır.`,
            "Öğrenciye ait BEP, belge, performans, değerlendirme, veli ve özel eğitim süreci verileri bakımından sisteme veri giren kurum, okul, uzman veya yetkili kullanıcı kendi mevzuat ve kurum içi yetkilendirme yükümlülüklerinden ayrıca sorumludur.",
          ],
        },
        {
          title: "2. Hangi verileri işliyoruz",
          bullets: [
            "Kullanıcı hesap verileri: ad soyad, e-posta, rol, kurum, parola özeti, hesap durumu ve davet/kayıt doğrulama bilgileri.",
            "Kimlik doğrulama verileri: Google veya Apple hesap kimliği, sağlayıcı doğrulama sonucu, oturum tokenları ve iki adımlı doğrulama kod kayıtları.",
            "Mobil cihaz güvenliği verileri: cihaz kimliği hash’i, cihaz adı/modeli, platform, son kullanım zamanı, IP adresi, refresh token ve bildirim tokenı.",
            "Öğrenci ve veli verileri: kimlik, sınıf, okul, iletişim, tanılama ve eğitim süreciyle ilgili kullanıcı tarafından girilen kayıtlar.",
            "BEP, kaba değerlendirme, değerlendirme, zümre ve belge verileri: planlar, hedefler, kazanımlar, kurul bilgileri, dosyalar, PDF/DOCX çıktıları ve evrak doğrulama kodları.",
            "İletişim ve destek verileri: mesajlar, bildirimler, destek talepleri, destek yanıtları ve yardım/SSS kullanım kayıtları.",
            "Güvenlik ve denetim verileri: giriş, çıkış, erişim, düzenleme, silme, dosya/PDF işlemleri, audit logları ve işlem geçmişi.",
          ],
        },
        {
          title: "3. Mobil cihaz doğrulama ve güvenilir cihazlar",
          paragraphs: [
            "Mobil uygulamada aynı cihazı tanımak için cihazın ham kimliği saklanmaz; cihaz kimliği SHA-256 özetiyle tutulur. Bu kayıt IP adresinden bağımsızdır. IP adresi yalnız güvenlik denetimi, kötüye kullanım önleme ve son erişim bilgisini anlamlandırmak için yardımcı veri olarak kullanılabilir.",
            "Bir cihaz e-posta doğrulama koduyla güvenilir hale getirildiğinde, aynı cihazdan sonraki girişlerde tekrar kod istenmeyebilir. Farklı bir cihazdan giriş denendiğinde güvenlik amaçıyla e-posta doğrulama kodu istenebilir. Kullanıcı, Aktif Cihazlar ekranından güvenilir cihaz oturumlarını sonlandırabilir.",
          ],
        },
        {
          title: "4. İşleme amaçları ve hukuki sebepler",
          paragraphs: [
            "Veriler; hesap oluşturma, kimlik doğrulama, cihaz güvenliği, yetkilendirme, öğrenci ve BEP süreçlerini yürütme, belge oluşturma, bildirim, destek, denetim ve mevzuata uyum amaçlarıyla işlenir.",
            "Kişisel veriler KVKK md. 5 kapsamında sözleşmenin kurulması veya ifası, hukuki yükümlülük, bir hakkın tesisi veya korunması ve meşru menfaat sebeplerine dayanabilir. Özel nitelikli veriler yalnız gerekli olduğu ölçüde ve ilgili kurumun hukuki dayanağına uygun şekilde sisteme girilmelidir.",
          ],
        },
        {
          title: "5. Saklama, güvenlik ve erişim",
          paragraphs: [
            "Web oturumu güvenli çerezlerle, mobil oturum yenileme tokenı cihazın güvenli saklama alanıyla korunur. Mobil cihaz eşleştirme verileri ham cihaz kimliği yerine hash olarak saklanır.",
            "Öğrenci sağlık bilgileri, gelişim ve davranış notları, BEP/değerlendirme içerikleri, dosyalar, mesajlar, destek içerikleri ve benzeri hassas alanlar veritabanı seviyesinde güçlü şifreleme ile korunur.",
            "Tam güvenlik garantisi verilemese de makul teknik ve idari tedbirler uygulanır. Kullanıcıların güçlü parola, güncel cihaz yazılımı ve ekran kilidi kullanması beklenir.",
          ],
        },
        {
          title: "6. Aktarım ve hizmet sağlayıcılar",
          paragraphs: [
            "Veriler barındırma, veritabanı, kimlik doğrulama, işlem e-postası, bildirim, destek ve güvenlik hizmetleri gibi teknik sağlayıcılar üzerinde yalnız hizmetin çalışması için gerekli ölçüde işlenebilir.",
            "PDF/DOCX çıktıları ve paylaşılan belgeler kullanıcı tarafından cihaz veya tarayıcı paylaşım araçlarıyla aktarılabilir. Paylaşımın hukuka uygunluğundan kullanıcı veya ilgili kurum sorumludur.",
          ],
        },
        {
          title: "7. KVKK hakları ve hesap silme",
          paragraphs: [
            "KVKK md. 11 kapsamında kişisel verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltme, silme/yok etme şartları oluşursa uygulanmasını isteme ve kanuna aykırı işleme nedeniyle zarar doğarsa giderim talep etme haklarına sahipsiniz.",
            "Hesabınızı web profilinden veya mobil uygulamadaki Hesabı Sil ekranından kapatabilirsiniz. Hesap silme talebinizle birlikte hesabınız, profil bilgileriniz ve hesabınıza bağlı tüm kişisel veriler sistemimizden kalıcı olarak silinecek olup, bu işlem geri alınamaz. Ancak yasal yükümlülükler, uyuşmazlık durumları veya kanuni saklama süreleri kapsamında muhafazası zorunlu olan kayıtlar ilgili yasal süre boyunca saklanabilir.",
          ],
        },
        {
          title: "8. İletişim",
          paragraphs: [
            `Gizlilik ve KVKK taleplerinizi ${contactEmail} adresine iletebilirsiniz. Talebinizin değerlendirilebilmesi için hesap e-postanızı, kurum bilginizi ve talep konusunu açık belirtmeniz gerekir.`,
          ],
        },
      ],
    },
    terms: {
      slug: "terms",
      title: "Kullanım Koşulları",
      summary: `${LEGAL_BRAND_NAME} üzerinde hesap açan veya hizmeti kullanan herkes bu koşulları kabul eder. Son güncelleme: 2 Temmuz 2026.`,
      sections: [
        {
          title: "1. Hizmetin kapsamı",
          paragraphs: [
            `${LEGAL_BRAND_NAME}; öğrenci, BEP, değerlendirme, belge, takvim, mesaj, destek ve kurum süreçlerinin dijital ortamda yönetilmesi için sunulan bir yazılım hizmetidir.`,
            "Hizmet hukuki, tıbbi veya pedagojik uzman görüşünün yerine geçmez. Kullanıcı, oluşturduğu kayıtları kendi mesleki ve kurumsal sorumluluğu altında kullanır.",
          ],
        },
        {
          title: "2. Hesap, cihaz ve erişim güvenliği",
          bullets: [
            "Hesap bilgilerinizi doğru, güncel ve yetkili olduğunuz ölçüde sağlamalısınız.",
            "Şifrenizin, Apple/Google hesabınızın ve cihaz güvenliğinizin korunmasından sorumlusunuz.",
            "Mobil uygulamada güvenilir cihaz eşleştirmesi e-posta kodu ve cihaz kimliği hash’i ile yapılabilir.",
            "Aynı güvenilir cihazdan girişlerde tekrar kod istenmeyebilir; farklı cihazlardan girişte ek doğrulama kodu istenebilir.",
            "Yetkisiz erişim şüphesinde şifrenizi değiştirmeli, aktif cihazları sonlandırmalı ve destek ekibine bildirim yapmalısınız.",
          ],
        },
        {
          title: "3. Yetkili veri girişi",
          paragraphs: [
            "Öğrenci, veli, BEP, değerlendirme, seans ve mesaj kayıtları yalnız yetkili olduğunuz kişi ve süreçler için girilmelidir. Gereksiz, ilgisiz veya hukuki dayanağı olmayan özel nitelikli veri sisteme eklenmemelidir.",
            "Kurum yöneticileri ve uzman kullanıcılar rol bazlı erişimlerin doğru tanımlanmasından ve kurum içi veri paylaşımının uygunluğundan sorumludur.",
          ],
        },
        {
          title: "4. Belge, çıktı ve paylaşım",
          paragraphs: [
            "BEP, kaba değerlendirme, zümre ve diğer PDF/DOCX çıktıları kullanıcı girişlerine göre hazırlanır. Belgeyi paylaşmadan, yazdırmadan veya kurum dışında kullanmadan önce içerik doğruluğunu kontrol etmeniz gerekir.",
            "Paylaşım menüsü, yazdırma veya indirme gibi işlemlerde alıcı, paylaşım kanalı, evrak doğrulama kodu ve belge güvenliği kullanıcı sorumluluğundadır.",
          ],
        },
        {
          title: "5. Yasak kullanım",
          bullets: [
            "Yetkisiz öğrenci, veli, kurum veya kullanıcı verisine erişmeye çalışmak.",
            "Başka bir kullanıcının hesabını kullanmak ya da kimliğe bürünmek.",
            "Sisteme zarar verecek otomasyon, tersine mühendislik veya izinsiz güvenlik testi yapmak.",
            "Hukuka aykırı, yanıltıcı veya yetkisiz belge üretmek ya da paylaşmak.",
            "Uygulama, marka, arayüz veya içerikleri izinsiz kopyalamak veya ayrı bir hizmet gibi sunmak.",
          ],
        },
        {
          title: "6. Güncellemeler, kesintiler ve hesap kapatma",
          paragraphs: [
            "Hizmet özellikleri, teknik altyapı, API bağlantıları ve güvenlik kontrolleri zaman içinde güncellenebilir. Bakım, güvenlik gereklilikleri veya üçüncü taraf servis kesintileri nedeniyle geçici erişim sorunları yaşanabilir.",
            "Hesabınızı web veya mobil uygulama içinden silebilirsiniz. Hesap silme işlemiyle birlikte kullanıcı hesabınız ve hesabınıza bağlı tüm veriler sistemden kalıcı olarak temizlenir. Bu silme işlemi geri alınamaz. Mevzuat gereği yasal saklama yükümlülüğü bulunan veya diğer kullanıcıların kayıt bütünlüğünü etkileyen durumlarda saklanması zorunlu olan kayıtlar yasal saklama süresi boyunca korunur.",
            `Kullanım koşullarına ilişkin sorularınız için ${contactEmail} adresine yazabilirsiniz.`,
          ],
        },
      ],
    },
    cookies: {
      slug: "cookies",
      title: "Çerez Politikası",
      summary: `${LEGAL_BRAND_NAME} üzerinde kullanılan zorunlu web çerezleri ve mobil uygulama oturum verileri. Son güncelleme: 2 Temmuz 2026.`,
      sections: [
        {
          title: "1. Web çerezleri",
          paragraphs: [
            "Çerezler, ziyaret ettiğiniz siteler tarafından tarayıcınıza yerleştirilen küçük veri dosyalarıdır. Specia Dijital Eğitim Çözümleri web uygulamasında çerezler ağırlıklı olarak oturum açma, oturumun korunması, güvenlik kontrolleri ve yönlendirme akışları için kullanılır.",
          ],
        },
        {
          title: "2. Zorunlu çerez ve benzeri teknolojiler",
          bullets: [
            "Oturum çerezleri: kullanıcı girişini sürdürmek ve yetkili ekranlara erişim sağlamak için kullanılır.",
            "Güvenlik çerezleri: CSRF koruması, istek doğrulaması ve oturum güvenliği için kullanılır.",
            "Web güvenilir cihaz çerezi: tarayıcıda rastgele cihaz kimliği tutarak web giriş güvenliğini destekler; sunucuda hash olarak saklanır.",
            "Yönlendirme çerezleri: giriş veya çıkış sonrasında kullanıcıyı doğru sayfaya yönlendirmek için kullanılır.",
          ],
        },
        {
          title: "3. Mobil uygulama oturumu",
          paragraphs: [
            "Specia Dijital Eğitim Çözümleri iOS uygulamasının temel akışları tarayıcı çerezleriyle çalışmaz. Kısa süreli erişim tokenı, refresh token, bildirim tokenı ve cihaz eşleştirme kimliği gibi mobil veriler kullanılır.",
            "Cihaz eşleştirmesinde ham cihaz kimliği sunucuda saklanmaz; hash değeri kullanılır. Bu kayıt IP adresinden bağımsızdır ve aynı cihazı hatırlamak, farklı cihazlarda e-posta doğrulama kodu istemek ve Aktif Cihazlar ekranını yönetmek için kullanılır.",
          ],
        },
        {
          title: "4. Kullanılmayan kategoriler",
          paragraphs: [
            "Bu sürümde reklam, pazarlama, davranışsal hedefleme veya üçüncü taraf kampanya çerezleri kullanılmamaktadır. Zorunlu olmayan bir kategori devreye alınırsa bu politika güncellenir ve gerekli tercih mekanizması ayrıca sunulur.",
          ],
        },
        {
          title: "5. Tercihlerinizi yönetme",
          paragraphs: [
            "Tarayıcı ayarlarınızdan çerezleri silebilir veya kısıtlayabilirsiniz; ancak zorunlu çerezleri engellemeniz halinde giriş ve panel işlevleri çalışmayabilir. Mobilde çıkış yapmak refresh tokenı temizler; Aktif Cihazlar ekranından cihaz oturumlarını sonlandırabilirsiniz.",
            `Çerez, mobil token veya cihaz eşleştirme verileriyle ilgili sorularınızı ${contactEmail} adresine iletebilirsiniz.`,
          ],
        },
      ],
    },
  };
}
