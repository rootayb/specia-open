export type FAQItem = {
  q: string;
  a: string;
};

export type FAQCategory = {
  id: string;
  title: string;
  items: FAQItem[];
};

export const faqData: FAQCategory[] = [
  {
    id: "genel",
    title: "Genel Kullanım",
    items: [
      {
        q: "Specia hangi süreçleri yönetir?",
        a: "Specia; öğrenci kayıtları, BEP belgeleri, kaba değerlendirme, öğretim sonu değerlendirmeleri, kontrol listeleri, eğitsel analiz, belge arşivi, evrak doğrulama, zümre ve ŞÖK tutanakları, notlar, görevler, takvim, mesajlaşma ve destek taleplerini tek panelde yönetmek için kullanılır.",
      },
      {
        q: "Rollere göre hangi alanlar görünür?",
        a: "Kurum yöneticileri kurum genelindeki kayıtları yönetebilir. Öğretmenler yetkili oldukları öğrenci ve belgeler üzerinde çalışır. Veli hesabı ise çocuğuna ait kayıtları görüntüleme odaklı kullanır; veli yalnız mesaj ve destek gibi iletişim alanlarında yeni içerik oluşturabilir.",
      },
      {
        q: "Web panel ve mobil uygulama aynı veriyi mi kullanır?",
        a: "Evet. Web panelde oluşturulan öğrenci, BEP, değerlendirme, belge, tutanak, destek ve bildirim kayıtları yetkiniz dahilinde mobil uygulamada da görünür. Mobil uygulama bazı ekranları daha sade görüntüleme veya hızlı işlem akışıyla sunabilir.",
      },
      {
        q: "En iyi kullanım için hangi tarayıcıları önerirsiniz?",
        a: "Web panel için Chrome, Edge, Safari veya Firefox'un güncel sürümünü kullanmanızı öneririz. Mobilde ise App Store üzerinden yayınlanan güncel Specia iOS uygulamasını kullanmalısınız.",
      },
    ],
  },
  {
    id: "öğrenci-veli",
    title: "Öğrenci ve Veli",
    items: [
      {
        q: "Yeni öğrenci nasıl eklenir?",
        a: "Öğrenciler sayfasındaki yeni öğrenci akışından kimlik, eğitim, veli ve ihtiyaç bilgilerini girerek kayıt oluşturabilirsiniz. Kurum yapınıza göre öğrenciye öğretmen, veli veya kurum ilişkisi atanabilir.",
      },
      {
        q: "Veli öğrenci bilgilerini nasıl görür?",
        a: "Veli hesabı, kendisiyle eşleştirilen öğrencinin profilini, BEP ve değerlendirme çıktılarını, belgelerini, bildirimlerini ve mesajlarını görüntüler. Veli tarafında belge veya değerlendirme oluşturma gibi yönetim işlemleri kapalıdır.",
      },
      {
        q: "Öğrenci devretme veya eşleştirme kodu ne işe yarar?",
        a: "Öğrenci devretme ve veli eşleştirme kodları, öğrencinin doğru kullanıcıyla güvenli biçimde ilişkilendirilmesi için kullanılır. Kodlar yalnız yetkili kullanıcılar tarafından oluşturulmalı ve ilgili kişiyle paylaşılmalıdır.",
      },
      {
        q: "Veliler hangi işlemleri yapabilir?",
        a: "Veliler temel olarak görüntüleme rolündedir. Öğrenci kayıtlarını, BEP ve değerlendirme belgelerini, paylaşılan dosyaları ve bildirimleri görebilir; mesaj gönderebilir ve destek talebi oluşturabilir.",
      },
    ],
  },
  {
    id: "bep",
    title: "BEP Belgeleri",
    items: [
      {
        q: "BEP belgesi nasıl oluşturulur?",
        a: "BEP sayfasından veya öğrenci detayından yeni BEP oluşturabilirsiniz. Öğrenci, eğitim yılı, dersler, performans bilgileri, amaçlar, yöntem ve teknikler, destek hizmetleri, kararlar ve BEP geliştirme birimi alanları doldurularak belge taslak ya da tamamlandı durumunda kaydedilir.",
      },
      {
        q: "Amaçlar ve plan satırları otomatik gelir mi?",
        a: "Ders ve öğrenme alanı seçildiğinde sistemdeki müfredat ve hazır içerikler kullanılabilir. Kullanıcı hazır amaçları seçebilir, düzenleyebilir veya kendi amaç ve kararlarını ekleyebilir.",
      },
      {
        q: "BEP belgesini düzenleyebilir miyim?",
        a: "Yetkiniz varsa taslak durumundaki BEP belgelerini düzenleyebilirsiniz. Tamamlandı durumundaki belgelerde kurumunuzun çalışma kuralına göre yeni sürüm oluşturmanız veya belgeyi tekrar taslak akışına almanız gerekebilir.",
      },
      {
        q: "BEP çıktısı nasıl alınır?",
        a: "BEP detay ekranındaki çıktı araçlarıyla PDF oluşturabilir, belgeyi indirebilir, paylaşabilir veya evrak kodunu kopyalayabilirsiniz. Evrak kodu, belgenin doğrulama ekranından kontrol edilmesini sağlar.",
      },
    ],
  },
  {
    id: "değerlendirmeler",
    title: "Değerlendirmeler",
    items: [
      {
        q: "Kaba değerlendirme nasıl hazırlanır?",
        a: "Kaba değerlendirme ekranında öğrenci ve dersleri seçtikten sonra sistem ilgili öğrenme alanı, kazanım ve süreç bileşenlerini getirir. Her satır için yapabiliyor, yapamıyor veya destekle yapıyor gibi işaretlemeler yapılabilir; sonuçlar PDF olarak alınabilir.",
      },
      {
        q: "Öğretim sonu değerlendirmesi ne için kullanılır?",
        a: "Öğretim sonu değerlendirmesi, BEP amaçlarının öğretim süreci sonunda hangi düzeye ulaştığını izlemek için kullanılır. Öğrenci, kontrol listesi, tarih ve ders oturumları seçilerek kayıt oluşturulur.",
      },
      {
        q: "Kontrol listesi ve ÖBT kayıtlarında nelere dikkat etmeliyim?",
        a: "Öğrenci, değerlendirme adı, tarih bilgileri ve kullanılacak kontrol listesi doğru seçilmelidir. BEP amaçları otomatik seçili gelmez; kullanıcı hangi amaçları değerlendirmeye dahil edeceğini kendisi belirler.",
      },
      {
        q: "Veli değerlendirmeleri nasıl görür?",
        a: "Veli hesabında değerlendirmeler iki ayrı kategoriyle gösterilir: Kaba Değerlendirmeler ve Öğretim Sonu Değerlendirmeler. Veli bu kayıtları görüntüler; yeni değerlendirme oluşturamaz veya mevcut kaydı düzenleyemez.",
      },
    ],
  },
  {
    id: "egitsel-analiz",
    title: "Eğitsel Analiz ve Raporlar",
    items: [
      {
        q: "Eğitsel analiz ekranı ne gösterir?",
        a: "Eğitsel analiz, öğrencinin BEP amaçları, veri girişleri, ilerleme yüzdeleri ve durum dağılımlarını görsel olarak takip etmenizi sağlar. Hedef bazlı ilerleme, tamamlanan amaçlar ve destek gerektiren alanlar buradan izlenebilir.",
      },
      {
        q: "Grafikli PDF çıktısı alabilir miyim?",
        a: "Evet. Bir amaç seçiliyse ve veri grafiğiyle çıktı almak istiyorsanız, eğitsel analiz PDF çıktısı ilgili amaçın ilerleme grafiğini ve son durum özetini içerecek şekilde hazırlanır.",
      },
      {
        q: "Hızlı veri girişi ne işe yarar?",
        a: "Hızlı veri girişi, BEP amaçlarına ait gözlem ve ilerleme kayıtlarını kısa yoldan eklemek için kullanılır. Uygun öğrenci, BEP ve amaç seçilerek veri girişi yapılır; bu kayıtlar analiz ekranlarına yansır.",
      },
    ],
  },
  {
    id: "belgeler-evrak",
    title: "Belgeler ve Evrak Doğrulama",
    items: [
      {
        q: "Belge yüklerken öğrenci seçmek zorunlu mu?",
        a: "Hayır. Belgeyi hesabınıza veya kurum arşivinize bağlı genel belge olarak yükleyebilirsiniz. İsterseniz belgeyi bir öğrenciyle ilişkilendirerek o öğrencinin dosyasında görünmesini ve yetkili veliyle paylaşılmasını sağlayabilirsiniz.",
      },
      {
        q: "Klasörler nasıl kullanılır?",
        a: "Belgeler bölümünde klasör oluşturabilir, klasör içine belge yükleyebilir ve boş klasörleri de düzen amaçıyla kullanabilirsiniz. Klasörler kurum veya kullanıcı hesabı içinde belge düzenini korumak için tasarlanmıştır.",
      },
      {
        q: "Evrak doğrulama nasıl çalışır?",
        a: "BEP, kaba değerlendirme, tutanak ve diğer çıktılarda yer alan evrak kodu doğrulama ekranında kontrol edilebilir. Güvenlik gerektiren belgelerde ikinci güvenlik kodu da istenebilir; kod doğrulandıktan sonra belge görüntülenir.",
      },
      {
        q: "PDF ve DOCX çıktıları nereden alınır?",
        a: "Belge detaylarındaki çıktı menüsünden PDF veya desteklenen belgelerde DOCX çıktısı alabilirsiniz. Mobilde belge görüntüleme ve paylaşma, iOS belge önizleme araçlarıyla yapılır.",
      },
    ],
  },
  {
    id: "tutanaklar",
    title: "Tutanaklar ve Toplantılar",
    items: [
      {
        q: "Zümre tutanağı nasıl oluşturulur?",
        a: "Tutanaklar bölümünden Zümre Tutanağı ekranına girerek kurum varsayılanları, toplantı bilgileri, katılımcılar, gündem maddeleri ve kararları doldurabilirsiniz. Hazır gündem maddeleri kullanılabilir veya yeni madde eklenebilir.",
      },
      {
        q: "ŞÖK tutanağı ile zümre tutanağı arasındaki fark nedir?",
        a: "Zümre tutanağı ders veya alan bazlı zümre kararları için kullanılır. ŞÖK tutanağı ise şube öğretmenler kurulu toplantıları ve öğrenciye yönelik kurul kararları için hazırlanır.",
      },
      {
        q: "Tutanak çıktısı ve evrak kodu alınabilir mi?",
        a: "Evet. Yetkili kullanıcılar tutanakları PDF veya desteklenen akışlarda DOCX olarak indirebilir. Evrak kodu çıktı menüsünden kopyalanabilir ve doğrulama ekranında kontrol edilebilir.",
      },
    ],
  },
  {
    id: "notlar-görevler",
    title: "Notlar, Görevler ve Takvim",
    items: [
      {
        q: "Notlar bölümünde klasörleme var mı?",
        a: "Evet. Notlarınızı klasörlerle düzenleyebilir, notları klasörler arasında taşıyabilir ve gerektiğinde kontrol listesi mantığında tiklenebilir görevlere dönüştürebilirsiniz.",
      },
      {
        q: "Görev merkezi ne için kullanılır?",
        a: "Görev merkezi; kurum içi yapılacakları, hatırlatmaları ve takip edilmesi gereken iş akışlarını bir arada görmek için kullanılır. Görevler tamamlandı olarak işaretlenebilir.",
      },
      {
        q: "Takvim ve toplantı kayıtları nasıl takip edilir?",
        a: "Takvim ekranı önemli tarihleri, toplantıları ve kurum içi planlamaları görüntülemek için kullanılır. Kurum yapınıza göre seans, toplantı veya hatırlatma kayıtları burada listelenebilir.",
      },
    ],
  },
  {
    id: "kurum-admin",
    title: "Kurum ve Yönetim",
    items: [
      {
        q: "Kurum bilgileri nereden yönetilir?",
        a: "Kurum sayfasından kurum adı, iletişim bilgileri, resmi bilgiler, çalışma ayarları ve belge çıktılarında kullanılacak varsayılan alanlar güncellenebilir.",
      },
      {
        q: "Finans, hak ediş ve seans alanları kimler için aktiftir?",
        a: "Finans, hak ediş ve seans modülleri kurum tipine ve yetkilere göre açılır. Bireysel kullanımda bu alanlar sadeleştirilebilir; kurumsal kullanımda yönetici yetkisiyle görünür.",
      },
    ],
  },
  {
    id: "hesap-guvenlik",
    title: "Hesap ve Güvenlik",
    items: [
      {
        q: "Şifremi nasıl değiştirebilirim?",
        a: "Profil ekranındaki güvenlik bölümünden mevcut şifrenizi doğrulayarak yeni şifre belirleyebilirsiniz. Şifrenizi unuttuysanız giriş ekranındaki şifremi unuttum akışını kullanabilirsiniz.",
      },
      {
        q: "İki aşamalı doğrulama ve güvenilir cihaz mantığı nedir?",
        a: "İki aşamalı doğrulama açıksa giriş sırasında e-posta kodu istenir. Mobilde cihaz e-posta koduyla güvenilir olarak eşleştirildiyse aynı cihazdan sonraki girişlerde tekrar kod istenmeyebilir. Yeni veya tanınmayan cihazlarda tekrar doğrulama yapılır.",
      },
      {
        q: "Aktif cihazları nereden görebilirim?",
        a: "Profil ve güvenlik alanından hesabınıza bağlı aktif cihazları görüntüleyebilirsiniz. Mobil cihazlar IP adresinden bağımsız olarak cihaz kimliği özetiyle tanınır; gerekirse güvenilir cihaz erişimi kaldırılabilir.",
      },
      {
        q: "Hesabımı silebilir miyim?",
        a: "Evet. Profildeki hesap kapatma akışıyla şifrenizi ve onay metnini girerek hesabınızı kapatma işlemini başlatabilirsiniz. Kurum sahipliği veya özel yetki durumlarında sistem işlemi güvenlik nedeniyle engelleyebilir.",
      },
    ],
  },
  {
    id: "mobil",
    title: "Mobil Uygulama",
    items: [
      {
        q: "Mobil uygulamada hangi işlemler yapılabilir?",
        a: "Mobil uygulamada giriş/kayıt, öğrenci görüntüleme, BEP ve değerlendirme görüntüleme/oluşturma, kaba değerlendirme, zümre tutanağı, PDF/DOCX görüntüleme, evrak kodu kopyalama, bildirimler, mesajlar, destek talepleri ve profil işlemleri kullanılabilir. Rolünüze göre bazı işlemler sadece görüntüleme modunda olabilir.",
      },
      {
        q: "Bildirimler nasıl çalışır?",
        a: "Bildirimler uygulamadaki bildirim simgesinden açılır. Okunan veya kapatılan bildirimler anlık olarak güncellenir. Push bildirimleri için cihaz bildirim izni verilmiş olmalı ve sunucu tarafında Firebase ayarları aktif olmalıdır.",
      },
      {
        q: "Mobilde belge çıktısı kod gibi görünürse ne yapmalıyım?",
        a: "Güncel sürümde PDF ve DOCX çıktıları iOS belge görüntüleyiciyle açılır. Eski build kullanıyorsanız uygulamayı güncelleyin; sorun devam ederse destek talebi oluşturun.",
      },
    ],
  },
  {
    id: "destek",
    title: "Yardım ve Destek",
    items: [
      {
        q: "Destek ekibine nasıl ulaşabilirim?",
        a: "Web panelde Destek sayfasından veya mobil uygulamada Yardım ve Destek bölümünden yeni destek talebi oluşturabilirsiniz. Talebinizde ekran adı, yaptığınız işlem ve gördüğünüz hata mesajını yazmanız çözümü hızlandırır.",
      },
      {
        q: "Destek yanıtlarını nereden görürüm?",
        a: "Destek talebinizin detayına girdiğinizde destek ekibinin yanıtları aynı konuşma içinde görünür. Durum güncellemeleri ve yeni yanıtlar bildirim olarak da yansıtılabilir.",
      },
      {
        q: "Destek talebimi silebilir miyim?",
        a: "Kendi oluşturduğunuz destek talebini yetkiniz dahilinde silebilirsiniz.",
      },
      {
        q: "Aradığım cevabı SSS içinde bulamazsam ne yapmalıyım?",
        a: "Yardım içeriğinde arama yapabilir, ilgili kategoriye bakabilir veya doğrudan destek talebi oluşturabilirsiniz. Sistemle ilgili kritik hatalarda ekran görüntüsü ve mümkünse işlem adımlarını ekleyin.",
      },
    ],
  },
];
