export type FormFieldOption = {
  label: string;
  value: string;
};

export type FormTemplateContext = {
  currentUserName?: string;
  student?: {
    firstName: string;
    lastName: string;
    schoolName?: string | null;
    schoolNumber?: string | null;
    classroom?: string | null;
    kademe?: string | null;
    district?: string | null;
    birthDate?: string | null;
    diagnosis?: string | null;
    placementDecision?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
    developmentHistory?: string | null;
    strengths?: string | null;
    improvementAreas?: string | null;
    behaviorNotes?: string | null;
    bepStartDate?: string | null;
    bepEndDate?: string | null;
  } | null;
};

export type FormFieldDefinition = {
  id: string;
  label: string;
  type: "text" | "textarea" | "date" | "select" | "checklist" | "list";
  layout?: "half" | "full";
  placeholder?: string;
  rows?: number;
  options?: FormFieldOption[];
  columns?: number;
  allowCustomOptions?: boolean;
  customEntryPlaceholder?: string;
  defaultValue?: (context: FormTemplateContext) => string;
};

export type FormSectionDefinition = {
  id: string;
  title: string;
  description?: string;
  fields: FormFieldDefinition[];
};

export type FormTemplateDefinition = {
  slug: string;
  category: string;
  title: string;
  sourceFile: string;
  description: string;
  highlights: string[];
  intro?: string;
  sections: FormSectionDefinition[];
};

function formatDateInput(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function studentName(context: FormTemplateContext) {
  const firstName = context.student?.firstName?.trim() ?? "";
  const lastName = context.student?.lastName?.trim() ?? "";
  return `${firstName} ${lastName}`.trim();
}

function studentClassroom(context: FormTemplateContext) {
  return context.student?.classroom ?? "";
}

function schoolName(context: FormTemplateContext) {
  return context.student?.schoolName ?? "";
}

function guardianName(context: FormTemplateContext) {
  return context.student?.guardianName ?? "";
}

function guardianPhone(context: FormTemplateContext) {
  return context.student?.guardianPhone ?? "";
}

function teacherName(context: FormTemplateContext) {
  return context.currentUserName ?? "";
}

export const FORM_TEMPLATES: FormTemplateDefinition[] = [
  /* ── Öğretim ──────────────────────────────────────────────────────────── */
  {
    slug: "beceri-gorev-analizi",
    category: "Öğretim",
    title: "Görev Analizi ve Beceri Öğretimi Kayıt Formu",
    sourceFile: "specia",
    description:
      "Bir beceriyi basamaklarına ayırın, öğretim yöntemini belirleyin ve deneme kayıtlarını ipucu düzeyleriyle birlikte tek formda tutun.",
    highlights: [
      "Beceri basamakları listesi",
      "İpucu düzeyi kısaltmalarıyla deneme kaydı",
      "Ölçüt ve değerlendirme alanları",
    ],
    intro:
      "Beceri, uygulama sırasına göre basamaklara ayrılır; her denemede öğrencinin hangi ipucu düzeyiyle basamağı tamamladığı kaydedilir (B: Bağımsız, S: Sözel ipucu, M: Model olma, F: Fiziksel yardım).",
    sections: [
      {
        id: "general",
        title: "Genel Bilgiler",
        fields: [
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "teacher_name",
            label: "Uygulayan Öğretmen",
            type: "text",
            defaultValue: teacherName,
          },
          { id: "start_date", label: "Öğretime Başlama Tarihi", type: "date" },
          {
            id: "skill_name",
            label: "Öğretilecek Beceri",
            type: "text",
            placeholder: "Örn. Ellerini yıkama",
          },
          {
            id: "teaching_method",
            label: "Öğretim Yöntemi",
            type: "select",
            options: [
              { label: "İleri zincirleme", value: "İleri zincirleme" },
              { label: "Geriye zincirleme", value: "Geriye zincirleme" },
              { label: "Tüm beceri yaklaşımı", value: "Tüm beceri yaklaşımı" },
            ],
          },
          {
            id: "criterion",
            label: "Başarı Ölçütü",
            type: "text",
            defaultValue: () => "Art arda 3 oturumda tüm basamakları bağımsız tamamlama",
          },
        ],
      },
      {
        id: "steps",
        title: "Beceri Basamakları",
        description: "Beceriyi uygulama sırasına göre basamaklara ayırın.",
        fields: [
          {
            id: "skill_steps",
            label: "Basamaklar",
            type: "list",
            layout: "full",
            placeholder: "Basamağı yazın ve Enter'a basın (örn. Musluğu açar).",
          },
          {
            id: "materials",
            label: "Kullanılacak Materyaller",
            type: "text",
            layout: "full",
            placeholder: "Örn. Sabun, havlu, görsel basamak kartları",
          },
          {
            id: "reinforcer",
            label: "Kullanılacak Pekiştireç",
            type: "text",
            layout: "full",
          },
        ],
      },
      {
        id: "records",
        title: "Deneme Kayıtları",
        fields: [
          {
            id: "trial_records",
            label: "Kayıtlar",
            type: "textarea",
            layout: "full",
            rows: 10,
            placeholder:
              "Tarih · Basamak no · İpucu düzeyi (B/S/M/F) · Not\nÖrn. 12.05 · 1 · S · Sözel hatırlatma ile açtı",
          },
          {
            id: "evaluation_note",
            label: "Değerlendirme ve Sonraki Adım",
            type: "textarea",
            layout: "full",
            rows: 4,
            placeholder: "Hangi basamaklarda bağımsızlık arttı, öğretim nasıl sürdürülecek?",
          },
        ],
      },
    ],
  },
  {
    slug: "seans-gozlem-kaydi",
    category: "Öğretim",
    title: "Bireysel Seans / Ders Gözlem Kaydı",
    sourceFile: "specia",
    description:
      "Bir seansın hedeflerini, öğrenci performansını ve sonraki seans planını tek sayfalık düzenli bir kayda dönüştürür.",
    highlights: [
      "Çalışılan hedefler ve performans",
      "Davranış gözlemi ve pekiştireç kullanımı",
      "Sonraki seans planı ve veliye not",
    ],
    sections: [
      {
        id: "general",
        title: "Seans Bilgileri",
        fields: [
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "teacher_name",
            label: "Öğretmen",
            type: "text",
            defaultValue: teacherName,
          },
          { id: "session_date", label: "Tarih", type: "date" },
          {
            id: "session_duration",
            label: "Seans Süresi",
            type: "text",
            placeholder: "Örn. 40 dk",
          },
          {
            id: "course_area",
            label: "Ders / Gelişim Alanı",
            type: "text",
            placeholder: "Örn. Dil ve konuşma, Türkçe, öz bakım",
          },
        ],
      },
      {
        id: "content",
        title: "Seans İçeriği",
        fields: [
          {
            id: "targets",
            label: "Çalışılan Hedefler",
            type: "list",
            layout: "full",
            placeholder: "Hedefi yazın ve Enter'a basın.",
          },
          {
            id: "methods_materials",
            label: "Kullanılan Yöntem ve Materyaller",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "performance",
            label: "Öğrenci Performansı",
            type: "textarea",
            layout: "full",
            rows: 5,
            placeholder: "Hedef bazında gözlenen performans, bağımsızlık düzeyi, hata örüntüleri",
          },
          {
            id: "behavior_observation",
            label: "Davranış Gözlemleri",
            type: "textarea",
            layout: "half",
            rows: 4,
          },
          {
            id: "reinforcer_use",
            label: "Kullanılan Pekiştireçler",
            type: "textarea",
            layout: "half",
            rows: 4,
          },
        ],
      },
      {
        id: "next",
        title: "Plan ve Paylaşım",
        fields: [
          {
            id: "next_session_plan",
            label: "Sonraki Seans Planı",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "family_note",
            label: "Veliye Not",
            type: "textarea",
            layout: "full",
            rows: 3,
            placeholder: "Evde tekrar edilebilecek çalışma, gözlemlenmesi istenen durum",
          },
        ],
      },
    ],
  },
  /* ── Davranış ─────────────────────────────────────────────────────────── */
  {
    slug: "abc-gozlem-kaydi",
    category: "Davranış",
    title: "ABC (Öncül-Davranış-Sonuç) Gözlem Kayıt Formu",
    sourceFile: "specia",
    description:
      "Problem davranışın öncülünü, davranışı ve ardından gelen sonucu yapılandırılmış üç kayıt bloğuyla belgelendirir.",
    highlights: [
      "Üç ayrı ABC kayıt bloğu",
      "Olası davranış işlevi işaretleme",
      "Genel değerlendirme alanı",
    ],
    intro:
      "Her kayıtta davranıştan hemen önce olan durum (öncül), davranışın kendisi ve davranıştan hemen sonra olanlar (sonuç) gözlendiği şekliyle, yorum katılmadan yazılır.",
    sections: [
      {
        id: "general",
        title: "Genel Bilgiler",
        fields: [
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "observer_name",
            label: "Gözlemci",
            type: "text",
            defaultValue: teacherName,
          },
          { id: "observation_date", label: "Gözlem Tarihi", type: "date" },
          {
            id: "setting",
            label: "Ortam / Ders",
            type: "text",
            placeholder: "Örn. Bireysel eğitim odası, teneffüs",
          },
        ],
      },
      {
        id: "record1",
        title: "1. Kayıt",
        fields: [
          { id: "record1_time", label: "Saat", type: "text" },
          { id: "record1_duration", label: "Süre / Yoğunluk", type: "text" },
          {
            id: "record1_antecedent",
            label: "Öncül (Davranıştan hemen önce ne oldu?)",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "record1_behavior",
            label: "Davranış (Ne yaptı?)",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "record1_consequence",
            label: "Sonuç (Hemen sonra ne oldu?)",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
        ],
      },
      {
        id: "record2",
        title: "2. Kayıt",
        fields: [
          { id: "record2_time", label: "Saat", type: "text" },
          { id: "record2_duration", label: "Süre / Yoğunluk", type: "text" },
          {
            id: "record2_antecedent",
            label: "Öncül",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "record2_behavior",
            label: "Davranış",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "record2_consequence",
            label: "Sonuç",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
        ],
      },
      {
        id: "record3",
        title: "3. Kayıt",
        fields: [
          { id: "record3_time", label: "Saat", type: "text" },
          { id: "record3_duration", label: "Süre / Yoğunluk", type: "text" },
          {
            id: "record3_antecedent",
            label: "Öncül",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "record3_behavior",
            label: "Davranış",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "record3_consequence",
            label: "Sonuç",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
        ],
      },
      {
        id: "summary",
        title: "Değerlendirme",
        fields: [
          {
            id: "possible_function",
            label: "Davranışın Olası İşlevi",
            type: "checklist",
            layout: "full",
            columns: 4,
            allowCustomOptions: true,
            customEntryPlaceholder: "Farklı bir işlev yazın ve Enter'a basın.",
            options: [
              { label: "İlgi elde etme", value: "İlgi elde etme" },
              { label: "Kaçma / kaçınma", value: "Kaçma / kaçınma" },
              { label: "Nesne / etkinlik elde etme", value: "Nesne / etkinlik elde etme" },
              { label: "Duyusal uyarım", value: "Duyusal uyarım" },
            ],
          },
          {
            id: "general_evaluation",
            label: "Genel Değerlendirme ve Öneri",
            type: "textarea",
            layout: "full",
            rows: 4,
            placeholder: "Kayıtlardaki ortak örüntü, denenecek önleyici düzenlemeler",
          },
        ],
      },
    ],
  },
  {
    slug: "olay-bildirim-kaydi",
    category: "Davranış",
    title: "Olay / Kriz Bildirim ve Kayıt Formu",
    sourceFile: "specia",
    description:
      "Yaşanan kriz veya olayın öncesini, anını, yapılan müdahaleyi ve bilgilendirilen kişileri resmi bir kayda dönüştürür.",
    highlights: [
      "Olay öncesi, anı ve sonrası kaydı",
      "Yapılan müdahale ve bilgilendirilenler",
      "İzlem ve önlem planı",
    ],
    sections: [
      {
        id: "general",
        title: "Olay Bilgileri",
        fields: [
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "reporter_name",
            label: "Bildiren Personel",
            type: "text",
            defaultValue: teacherName,
          },
          { id: "incident_date", label: "Tarih", type: "date" },
          { id: "incident_time", label: "Saat", type: "text" },
          {
            id: "incident_place",
            label: "Olay Yeri",
            type: "text",
            placeholder: "Örn. Sınıf, bahçe, servis",
          },
          {
            id: "incident_type",
            label: "Olay Türü",
            type: "checklist",
            layout: "full",
            columns: 3,
            allowCustomOptions: true,
            customEntryPlaceholder: "Farklı bir olay türü yazın ve Enter'a basın.",
            options: [
              { label: "Kendine zarar verme", value: "Kendine zarar verme" },
              { label: "Başkasına yönelik saldırganlık", value: "Başkasına yönelik saldırganlık" },
              { label: "Eşyaya zarar verme", value: "Eşyaya zarar verme" },
              { label: "Ortamdan kaçma / uzaklaşma", value: "Ortamdan kaçma / uzaklaşma" },
              { label: "Yoğun kriz / ağlama", value: "Yoğun kriz / ağlama" },
              { label: "Kaza / yaralanma", value: "Kaza / yaralanma" },
            ],
          },
        ],
      },
      {
        id: "narrative",
        title: "Olayın Anlatımı",
        fields: [
          {
            id: "before_incident",
            label: "Olay Öncesi (ne oluyordu?)",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "during_incident",
            label: "Olay Anı (gözlendiği şekliyle)",
            type: "textarea",
            layout: "full",
            rows: 4,
          },
          {
            id: "intervention",
            label: "Yapılan Müdahale",
            type: "textarea",
            layout: "full",
            rows: 4,
            placeholder: "Kullanılan sakinleştirme stratejileri, güvenlik önlemleri",
          },
          {
            id: "after_incident",
            label: "Olay Sonrası ve Sakinleşme",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
        ],
      },
      {
        id: "followup",
        title: "Bilgilendirme ve İzlem",
        fields: [
          {
            id: "informed_parties",
            label: "Bilgilendirilenler",
            type: "checklist",
            layout: "full",
            columns: 4,
            allowCustomOptions: true,
            customEntryPlaceholder: "Farklı bir kişi/birim yazın ve Enter'a basın.",
            options: [
              { label: "Veli", value: "Veli" },
              { label: "Okul yönetimi", value: "Okul yönetimi" },
              { label: "Rehberlik servisi", value: "Rehberlik servisi" },
              { label: "Sağlık personeli", value: "Sağlık personeli" },
            ],
          },
          {
            id: "prevention_plan",
            label: "İzlem ve Önlem Planı",
            type: "textarea",
            layout: "full",
            rows: 4,
            placeholder: "Tekrarı önlemek için yapılacak düzenlemeler",
          },
          {
            id: "reporter_signature",
            label: "Bildiren (Ad Soyad / İmza)",
            type: "text",
            defaultValue: teacherName,
          },
        ],
      },
    ],
  },
  /* ── Resmî Yazışma ────────────────────────────────────────────────────── */
  {
    slug: "bep-veli-toplanti-daveti",
    category: "Resmî Yazışma",
    title: "BEP Toplantısı Veli Davet Yazısı",
    sourceFile: "specia",
    description:
      "BEP geliştirme birimi toplantısı için tarih, saat, yer ve gündemi içeren resmi veli davet yazısı üretir.",
    highlights: [
      "Toplantı tarihi, saati ve yeri",
      "Seçilebilir gündem maddeleri",
      "Veli katılım onayı ve imza alanı",
    ],
    sections: [
      {
        id: "general",
        title: "Davet Bilgileri",
        fields: [
          {
            id: "school_name",
            label: "Okul / Kurum Adı",
            type: "text",
            defaultValue: schoolName,
          },
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "classroom",
            label: "Sınıfı",
            type: "text",
            defaultValue: studentClassroom,
          },
          {
            id: "parent_name",
            label: "Sayın Veli (Adı Soyadı)",
            type: "text",
            defaultValue: guardianName,
          },
          { id: "letter_date", label: "Yazı Tarihi", type: "date" },
          { id: "meeting_date", label: "Toplantı Tarihi", type: "date" },
          { id: "meeting_time", label: "Toplantı Saati", type: "text", placeholder: "Örn. 14:00" },
          {
            id: "meeting_place",
            label: "Toplantı Yeri",
            type: "text",
            placeholder: "Örn. Rehberlik servisi",
          },
        ],
      },
      {
        id: "agenda",
        title: "Gündem",
        fields: [
          {
            id: "agenda_items",
            label: "Gündem Maddeleri",
            type: "checklist",
            layout: "full",
            columns: 2,
            allowCustomOptions: true,
            customEntryPlaceholder: "Farklı bir gündem maddesi yazın ve Enter'a basın.",
            options: [
              { label: "BEP taslağının görüşülmesi", value: "BEP taslağının görüşülmesi" },
              { label: "Dönem hedeflerinin belirlenmesi", value: "Dönem hedeflerinin belirlenmesi" },
              {
                label: "Öğrenci gelişiminin değerlendirilmesi",
                value: "Öğrenci gelişiminin değerlendirilmesi",
              },
              {
                label: "Destek eğitim hizmetlerinin planlanması",
                value: "Destek eğitim hizmetlerinin planlanması",
              },
              { label: "Aile katılımının planlanması", value: "Aile katılımının planlanması" },
              { label: "Yeni dönem yerleştirme önerisi", value: "Yeni dönem yerleştirme önerisi" },
            ],
          },
          {
            id: "invitation_text",
            label: "Davet Metni",
            type: "textarea",
            layout: "full",
            rows: 4,
            defaultValue: () =>
              "Öğrencimizin Bireyselleştirilmiş Eğitim Programı (BEP) çalışmaları kapsamında yapılacak toplantıya katılımınızı önemle rica ederiz. Görüş ve önerileriniz programın hazırlanmasında belirleyici olacaktır.",
          },
        ],
      },
      {
        id: "signatures",
        title: "Onay ve İmza",
        fields: [
          {
            id: "attendance_status",
            label: "Katılım Durumu (veli dolduracaktır)",
            type: "select",
            options: [
              { label: "Katılacağım", value: "Katılacağım" },
              { label: "Katılamayacağım", value: "Katılamayacağım" },
            ],
          },
          {
            id: "issuer_signature",
            label: "Düzenleyen (Ad Soyad / İmza)",
            type: "text",
            defaultValue: teacherName,
          },
          {
            id: "parent_signature",
            label: "Veli (Ad Soyad / İmza)",
            type: "text",
            defaultValue: guardianName,
          },
        ],
      },
    ],
  },
  {
    slug: "egitsel-degerlendirme-istegi",
    category: "Resmî Yazışma",
    title: "Eğitsel Değerlendirme İsteği Ön Bilgi Formu",
    sourceFile: "specia",
    description:
      "RAM'a eğitsel değerlendirme isteğiyle gönderilecek öğrenci için gözlem, alınan önlem ve gönderme gerekçelerini derler.",
    highlights: [
      "Kimlik ve eğitim geçmişi bilgileri",
      "Sınıf içi gözlem ve alınan önlemler",
      "Gönderme gerekçesi ve imza alanları",
    ],
    intro:
      "Bu form, Rehberlik ve Araştırma Merkezine yapılacak eğitsel değerlendirme isteği öncesinde okulda toplanması gereken bilgileri tek belgede toplar; resmi sevk evrakına ek olarak kullanılır.",
    sections: [
      {
        id: "identity",
        title: "Kimlik Bilgileri",
        fields: [
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "birth_date",
            label: "Doğum Tarihi",
            type: "date",
            defaultValue: (context) => formatDateInput(context.student?.birthDate),
          },
          {
            id: "school_name",
            label: "Okulu",
            type: "text",
            defaultValue: schoolName,
          },
          {
            id: "classroom",
            label: "Sınıfı",
            type: "text",
            defaultValue: studentClassroom,
          },
          {
            id: "parent_name",
            label: "Velisi",
            type: "text",
            defaultValue: guardianName,
          },
          {
            id: "parent_phone",
            label: "Veli Telefonu",
            type: "text",
            defaultValue: guardianPhone,
          },
          {
            id: "diagnosis",
            label: "Varsa Tanısı / Raporu",
            type: "text",
            defaultValue: (context) => context.student?.diagnosis ?? "",
          },
        ],
      },
      {
        id: "history",
        title: "Eğitim Geçmişi ve Gözlemler",
        fields: [
          {
            id: "education_history",
            label: "Eğitim Geçmişi",
            type: "textarea",
            layout: "full",
            rows: 4,
            defaultValue: (context) => context.student?.developmentHistory ?? "",
          },
          {
            id: "academic_observation",
            label: "Akademik Beceriler (okuma, yazma, matematik)",
            type: "textarea",
            layout: "full",
            rows: 4,
            defaultValue: (context) => context.student?.improvementAreas ?? "",
          },
          {
            id: "social_observation",
            label: "Sosyal Beceriler ve İletişim",
            type: "textarea",
            layout: "full",
            rows: 4,
            defaultValue: (context) => context.student?.behaviorNotes ?? "",
          },
          {
            id: "strengths",
            label: "Güçlü Yönleri",
            type: "textarea",
            layout: "full",
            rows: 3,
            defaultValue: (context) => context.student?.strengths ?? "",
          },
        ],
      },
      {
        id: "measures",
        title: "Alınan Önlemler ve Gerekçe",
        fields: [
          {
            id: "measures_taken",
            label: "Sınıf İçinde Alınan Önlemler ve Uyarlamalar",
            type: "textarea",
            layout: "full",
            rows: 4,
            placeholder: "Oturma düzeni, ek süre, bireysel çalışma, veli işbirliği vb.",
          },
          {
            id: "referral_reason",
            label: "Eğitsel Değerlendirme İsteğinin Gerekçesi",
            type: "textarea",
            layout: "full",
            rows: 4,
          },
          { id: "form_date", label: "Tarih", type: "date" },
          {
            id: "teacher_signature",
            label: "Sınıf / Alan Öğretmeni (Ad Soyad / İmza)",
            type: "text",
            defaultValue: teacherName,
          },
          {
            id: "principal_signature",
            label: "Okul Müdürü (Ad Soyad / İmza)",
            type: "text",
          },
        ],
      },
    ],
  },
  /* ── Aile ─────────────────────────────────────────────────────────────── */
  {
    slug: "ev-uygulama-programi",
    category: "Aile",
    title: "Ev Uygulama Programı Formu",
    sourceFile: "specia",
    description:
      "Evde çalışılacak hedef beceriyi, uygulama adımlarını ve ailenin tutacağı kaydı tek sayfada veliye teslim edilecek şekilde hazırlar.",
    highlights: [
      "Hedef beceri ve uygulama adımları",
      "Sıklık, süre ve pekiştireç bilgisi",
      "Aile kayıt ve geri bildirim bölümü",
    ],
    sections: [
      {
        id: "general",
        title: "Program Bilgileri",
        fields: [
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "teacher_name",
            label: "Hazırlayan Öğretmen",
            type: "text",
            defaultValue: teacherName,
          },
          { id: "start_date", label: "Başlangıç Tarihi", type: "date" },
          { id: "end_date", label: "Bitiş Tarihi", type: "date" },
          {
            id: "target_skill",
            label: "Hedef Beceri",
            type: "text",
            layout: "full",
            placeholder: "Örn. Kaşıkla bağımsız yemek yeme",
          },
        ],
      },
      {
        id: "application",
        title: "Uygulama",
        fields: [
          {
            id: "home_activity",
            label: "Evde Yapılacak Etkinlik",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "application_steps",
            label: "Uygulama Adımları",
            type: "list",
            layout: "full",
            placeholder: "Adımı yazın ve Enter'a basın.",
          },
          {
            id: "frequency",
            label: "Sıklık / Süre",
            type: "text",
            placeholder: "Örn. Her gün 1 kez, 10 dakika",
          },
          {
            id: "reinforcer",
            label: "Kullanılacak Pekiştireç",
            type: "text",
          },
          {
            id: "attention_points",
            label: "Dikkat Edilecek Noktalar",
            type: "textarea",
            layout: "full",
            rows: 3,
            placeholder: "İpucunun nasıl verileceği, nelerden kaçınılacağı",
          },
        ],
      },
      {
        id: "family_record",
        title: "Aile Kayıt Bölümü",
        description: "Bu bölüm evde uygulama sırasında veli tarafından doldurulur.",
        fields: [
          {
            id: "family_log",
            label: "Uygulama Kaydı",
            type: "textarea",
            layout: "full",
            rows: 7,
            placeholder: "Gün · Yapıldı mı? · Gözlem\nÖrn. Pazartesi · Evet · Tek hatırlatmayla tamamladı",
          },
          {
            id: "family_feedback",
            label: "Veli Geri Bildirimi",
            type: "textarea",
            layout: "full",
            rows: 3,
          },
          {
            id: "parent_signature",
            label: "Veli (Ad Soyad / İmza)",
            type: "text",
            defaultValue: guardianName,
          },
        ],
      },
    ],
  },
  {
    slug: "pekistirec-belirleme-aile",
    category: "Aile",
    title: "Pekiştireç Belirleme Formu (Aile)",
    sourceFile: "form_7.docx",
    description:
      "Öğrencinin tercih ettiği nesne, sosyal, yiyecek-içecek ve etkinlik pekiştireçlerini aile görüşüne göre belirlemek için kullanılır.",
    highlights: [
      "Dört ayrı pekiştireç grubu",
      "Hazır seçenekler işaretlenebilir",
      "Ek not ve veli bilgisi eklenebilir",
    ],
    intro:
      "Formun amaçı öğrencinin etkili olabilecek pekiştireçlerini farklı gruplar altında belirlemek ve eğitim sürecinde kullanılabilecek tercihleri netleştirmektir.",
    sections: [
      {
        id: "general",
        title: "Genel Bilgiler",
        fields: [
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "filled_by_name",
            label: "Formu Dolduranın Adı Soyadı",
            type: "text",
            defaultValue: guardianName,
          },
          {
            id: "relation",
            label: "Öğrenciye Yakınlığı",
            type: "text",
            placeholder: "Anne, baba, vasi...",
          },
          {
            id: "form_date",
            label: "Tarih",
            type: "date",
          },
        ],
      },
      {
        id: "object_reinforcers",
        title: "Nesne Pekiştireçleri",
        description: "Uygun olan seçenekleri işaretleyin.",
        fields: [
          {
            id: "object_reinforcers_selected",
            label: "Seçilen Nesne Pekiştireçleri",
            type: "checklist",
            layout: "full",
            columns: 4,
            allowCustomOptions: true,
            customEntryPlaceholder: "Nesne yazın ve Enter'a basın.",
            options: [
              { label: "Balon", value: "Balon" },
              { label: "Boyama Kitabı", value: "Boyama Kitabı" },
              { label: "Kalem", value: "Kalem" },
              { label: "Kalemtıraş", value: "Kalemtıraş" },
              { label: "Oyuncak araba", value: "Oyuncak araba" },
              { label: "Oyuncak Bebek", value: "Oyuncak Bebek" },
              { label: "Oyun Kartları", value: "Oyun Kartları" },
              { label: "Sticker", value: "Sticker" },
              { label: "Top", value: "Top" },
              { label: "Ünlülerin Posterleri", value: "Ünlülerin Posterleri" },
            ],
          },
        ],
      },
      {
        id: "social_reinforcers",
        title: "Sosyal Pekiştireçler",
        description: "Uygun olan seçenekleri işaretleyin.",
        fields: [
          {
            id: "social_reinforcers_selected",
            label: "Seçilen Sosyal Pekiştireçler",
            type: "checklist",
            layout: "full",
            columns: 4,
            options: [
              { label: "Aferin Deme", value: "Aferin Deme" },
              { label: "Alkışlama", value: "Alkışlama" },
              { label: "Baş ile onaylama", value: "Baş ile onaylama" },
              { label: "Bravo Deme", value: "Bravo Deme" },
              { label: "Bugün çok iyisin Deme", value: "Bugün çok iyisin Deme" },
              { label: "Çak yapma", value: "Çak yapma" },
              { label: "Çok Güzel Deme", value: "Çok Güzel Deme" },
              { label: "Diğer öğrencilere alkışlatma", value: "Diğer öğrencilere alkışlatma" },
              { label: "Göz Kırpma", value: "Göz Kırpma" },
              { label: "Gülümseme", value: "Gülümseme" },
              { label: "Harika Deme", value: "Harika Deme" },
              { label: "Makas alma", value: "Makas alma" },
              { label: "Saçını Okşama", value: "Saçını Okşama" },
              { label: "Sarılma", value: "Sarılma" },
              { label: "Sırtını Sıvazlama", value: "Sırtını Sıvazlama" },
              { label: "Süper Deme", value: "Süper Deme" },
            ],
          },
          {
            id: "social_reinforcers_other",
            label: "Diğer Sosyal Pekiştireçler",
            type: "list",
            layout: "full",
            placeholder: "Listede yoksa yazın ve Enter'a basın.",
          },
        ],
      },
      {
        id: "food_reinforcers",
        title: "Yiyecek ve İçecek Pekiştireçleri",
        description: "Uygun olan seçenekleri işaretleyin.",
        fields: [
          {
            id: "food_reinforcers_selected",
            label: "Seçilen Yiyecek ve İçecek Pekiştireçleri",
            type: "checklist",
            layout: "full",
            columns: 4,
            options: [
              { label: "Bonibon", value: "Bonibon" },
              { label: "Çay", value: "Çay" },
              { label: "Çerez", value: "Çerez" },
              { label: "Çikolata", value: "Çikolata" },
              { label: "Cips", value: "Cips" },
              { label: "Dondurma", value: "Dondurma" },
              { label: "Kek", value: "Kek" },
              { label: "Kraker", value: "Kraker" },
              { label: "Meyve", value: "Meyve" },
              { label: "Meyve Suyu", value: "Meyve Suyu" },
              { label: "Pasta", value: "Pasta" },
              { label: "Sakız", value: "Sakız" },
              { label: "Şeker", value: "Şeker" },
              { label: "Süt", value: "Süt" },
            ],
          },
          {
            id: "food_reinforcers_other",
            label: "Diğer Yiyecek ve İçecek Pekiştireçleri",
            type: "list",
            layout: "full",
            placeholder: "Listede yoksa yazın ve Enter'a basın.",
          },
        ],
      },
      {
        id: "activity_reinforcers",
        title: "Etkinlik Pekiştireçleri",
        description: "Uygun olan seçenekleri işaretleyin.",
        fields: [
          {
            id: "activity_reinforcers_selected",
            label: "Seçilen Etkinlik Pekiştireçleri",
            type: "checklist",
            layout: "full",
            columns: 4,
            options: [
              { label: "Bilgisayar Oynama", value: "Bilgisayar Oynama" },
              { label: "Çizgi Film Seyretme", value: "Çizgi Film Seyretme" },
              { label: "Dans Etme", value: "Dans Etme" },
              { label: "Dersten Erken Çıkma", value: "Dersten Erken Çıkma" },
              { label: "Evcilik Oynama", value: "Evcilik Oynama" },
              { label: "Müzik Dinleme", value: "Müzik Dinleme" },
              { label: "Oyun Hamuru ile Oynama", value: "Oyun Hamuru ile Oynama" },
              { label: "Oyun Parkına Gitme", value: "Oyun Parkına Gitme" },
              {
                label: "Resimli kartlarla eşleştirme oyunu oynama",
                value: "Resimli kartlarla eşleştirme oyunu oynama",
              },
              { label: "Resim Yapma ve Boyama", value: "Resim Yapma ve Boyama" },
              {
                label: "Sınıfı Temizlemede Öğretmene Yardım Etme",
                value: "Sınıfı Temizlemede Öğretmene Yardım Etme",
              },
              { label: "Top Oynama", value: "Top Oynama" },
            ],
          },
          {
            id: "activity_reinforcers_other",
            label: "Diğer Etkinlik Pekiştireçleri",
            type: "list",
            layout: "full",
            placeholder: "Listede yoksa yazın ve Enter'a basın.",
          },
        ],
      },
      {
        id: "notes",
        title: "Notlar",
        fields: [
          {
            id: "allergy_notes",
            label: "Alerji, sınırlar ve ek notlar",
            type: "textarea",
            rows: 4,
            placeholder: "Kaçınılması gereken yiyecekler, uygun olmayan pekiştireçler veya ek açıklamalar",
          },
          {
            id: "parent_signature",
            label: "Veli İmza / Ad Soyad",
            type: "text",
            defaultValue: guardianName,
          },
        ],
      },
    ],
  },
  {
    slug: "aile-gorusme-formu",
    category: "Aile",
    title: "Aile Görüşme Formu",
    sourceFile: "form_9.docx",
    description:
      "Çocuk, aile, ev, sağlık ve gelişim bilgilerini ayrıntılı şekilde toplamak için kullanılır.",
    highlights: [
      "Kimlik, aile ve ev bilgileri",
      "Sağlık ve gelişim başlıkları",
      "Uzun form yapıya uygun detaylı veri girişi",
    ],
    sections: [
      {
        id: "interview_meta",
        title: "A. Çocuk ve Görüşme Bilgileri",
        fields: [
          { id: "interview_date", label: "Görüşme Tarihi", type: "date" },
          {
            id: "interviewer_name",
            label: "Görüşmeyi Yapan",
            type: "text",
            defaultValue: teacherName,
          },
          { id: "interviewed_person", label: "Görüşülen Kişi", type: "text" },
          { id: "relation", label: "Görüşülen Kişinin Yakınlığı", type: "text" },
          {
            id: "student_name",
            label: "Çocuğun Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          { id: "gender", label: "Cinsiyet", type: "text" },
          {
            id: "birth_place_date",
            label: "Doğum Yeri ve Tarihi",
            type: "text",
            defaultValue: (context) =>
              context.student?.birthDate ? formatDateInput(context.student.birthDate) : "",
          },
          { id: "blood_type", label: "Kan Grubu", type: "text" },
          { id: "child_order", label: "Kaçıncı Çocuk", type: "text" },
          {
            id: "current_school",
            label: "Devam Ettiği Kurum",
            type: "text",
            defaultValue: schoolName,
          },
          {
            id: "previous_education",
            label: "Daha Önce Eğitim Aldı mı?",
            type: "select",
            options: [
              { label: "Evet", value: "Evet" },
              { label: "Hayır", value: "Hayır" },
            ],
          },
        ],
      },
      {
        id: "mother_info",
        title: "B. Anne Bilgileri",
        fields: [
          { id: "mother_status", label: "Öz / Üvey / Sağ / Ölü", type: "text" },
          { id: "mother_name", label: "Adı", type: "text" },
          { id: "mother_birth", label: "Doğum Yeri ve Tarihi", type: "text" },
          { id: "mother_blood_type", label: "Kan Grubu", type: "text" },
          { id: "mother_education", label: "Öğrenim Durumu", type: "text" },
          { id: "mother_job", label: "Mesleği", type: "text" },
          { id: "mother_income", label: "Gelir Düzeyi", type: "text" },
          { id: "mother_home_address", label: "Ev Adresi", type: "text" },
          { id: "mother_work_address", label: "İş Adresi", type: "text" },
          { id: "mother_phone", label: "Telefon", type: "text" },
          { id: "mother_work_hours", label: "İş Saatleri", type: "text" },
          { id: "mother_social_security", label: "Sosyal Güvenlik Kurumu", type: "text" },
        ],
      },
      {
        id: "father_info",
        title: "B. Baba Bilgileri",
        fields: [
          { id: "father_status", label: "Öz / Üvey / Sağ / Ölü", type: "text" },
          { id: "father_name", label: "Adı", type: "text" },
          { id: "father_birth", label: "Doğum Yeri ve Tarihi", type: "text" },
          { id: "father_blood_type", label: "Kan Grubu", type: "text" },
          { id: "father_education", label: "Öğrenim Durumu", type: "text" },
          { id: "father_job", label: "Mesleği", type: "text" },
          { id: "father_income", label: "Gelir Düzeyi", type: "text" },
          { id: "father_home_address", label: "Ev Adresi", type: "text" },
          { id: "father_work_address", label: "İş Adresi", type: "text" },
          { id: "father_phone", label: "Telefon", type: "text" },
          { id: "father_work_hours", label: "İş Saatleri", type: "text" },
          { id: "father_social_security", label: "Sosyal Güvenlik Kurumu", type: "text" },
        ],
      },
      {
        id: "family_home",
        title: "C-D-E. Aile, Ev ve Diğer Bireyler",
        fields: [
          { id: "consanguinity", label: "Anne-baba arasında akrabalık var mı?", type: "text" },
          { id: "first_marriage", label: "İlk evlilik mi?", type: "text" },
          { id: "parents_together", label: "Anne-baba beraber mi yaşıyor?", type: "text" },
          { id: "house_status", label: "Ev kira mı? Bedeli?", type: "text" },
          { id: "house_room_count", label: "Ev kaç odalı?", type: "text" },
          { id: "child_room", label: "Çocuğun kendine ait odası var mı?", type: "text" },
          { id: "heating", label: "Ev ne ile ısınıyor?", type: "text" },
          { id: "school_distance", label: "Okula yakın mı?", type: "text" },
          { id: "siblings", label: "Kardeş sayısı ve durumları", type: "textarea", rows: 5 },
          { id: "other_household", label: "Evde yaşayan diğer bireyler", type: "textarea", rows: 5 },
        ],
      },
      {
        id: "health",
        title: "F. Sağlık Durumu",
        fields: [
          { id: "body_info", label: "Boy, kilo, temel sağlık bilgileri", type: "textarea", rows: 4 },
          { id: "milestones", label: "Diş çıkarma, tuvalet, konuşma yaşı", type: "textarea", rows: 4 },
          { id: "disease_history", label: "Önemli hastalıklar / ameliyatlar", type: "textarea", rows: 4 },
          { id: "diet_treatment", label: "Diyet, sürekli tedavi, ilaç bilgileri", type: "textarea", rows: 4 },
          { id: "seizure_info", label: "Nöbet bilgileri ve müdahale", type: "textarea", rows: 4 },
          { id: "device_disability", label: "Cihaz / protez / ek özür bilgileri", type: "textarea", rows: 4 },
          { id: "eye_ear_sleep", label: "Göz, kulak ve uyku düzeni", type: "textarea", rows: 4 },
        ],
      },
      {
        id: "development",
        title: "Gelişim Notları",
        fields: [
          {
            id: "psychomotor_notes",
            label: "Psiko-motor Gelişim Notları",
            type: "textarea",
            rows: 6,
            defaultValue: (context) => context.student?.behaviorNotes ?? "",
          },
          {
            id: "fine_motor_notes",
            label: "Küçük Kas ve El Kullanımı",
            type: "textarea",
            rows: 5,
          },
          {
            id: "selfcare_notes",
            label: "Öz Bakım Becerileri",
            type: "textarea",
            rows: 5,
          },
        ],
      },
    ],
  },
  {
    slug: "problem-davranis-belirleme-aile",
    category: "Davranış",
    title: "Problem Davranış Belirleme Formu (Aile)",
    sourceFile: "form_10.docx",
    description:
      "Öğrencinin evde sergilediği problem davranışları, sıklığı ve açıklamalarıyla birlikte kayda alır.",
    highlights: [
      "Problem davranış listesi",
      "Sıklık ve süre bilgisi",
      "Açıklama ve veli imza alanı",
    ],
    intro:
      "Problem davranış; öğrencinin kendisine, çevresindeki kişilere veya nesnelere karşı yaptığı istenmeyen davranışlardır.",
    sections: [
      {
        id: "general",
        title: "Genel Bilgiler",
        fields: [
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "filled_by_name",
            label: "Formu Dolduranın Adı Soyadı",
            type: "text",
            defaultValue: guardianName,
          },
          { id: "relation", label: "Öğrenciye Yakınlığı", type: "text" },
          { id: "form_date", label: "Tarih", type: "date" },
        ],
      },
      {
        id: "behaviors",
        title: "Problem Davranışlar",
        fields: [
          {
            id: "problem_behaviors",
            label: "Problem Davranışlar",
            type: "textarea",
            layout: "half",
            rows: 8,
          },
          {
            id: "frequency_duration",
            label: "Sıklığı / Süresi",
            type: "textarea",
            layout: "half",
            rows: 8,
            placeholder: "Günde kaç kere veya ne kadar süre",
          },
          {
            id: "behavior_explanations",
            label: "Açıklama",
            type: "textarea",
            rows: 6,
          },
          {
            id: "parent_signature",
            label: "Veli İmza / Ad Soyad",
            type: "text",
            defaultValue: guardianName,
          },
        ],
      },
    ],
  },
  /* ── Veli ─────────────────────────────────────────────────────────────── */
  {
    slug: "sosyal-medya-veli-izin",
    category: "Veli",
    title: "Öğrenci Sosyal Medya Veli İzin Belgesi",
    sourceFile: "form_8.docx",
    description:
      "MEB genelgesine uygun olarak öğrenciye ait ses, görüntü ve eserlerin kurumsal mecralarda yayını için veli izni alır.",
    highlights: [
      "İzin veriyorum / vermiyorum seçimi",
      "Okul, sınıf ve öğrenci bilgileri",
      "Veli ad soyad ve imza alanı",
    ],
    intro:
      "Bu belge, öğrencinin eğitim-öğretim faaliyetleri kapsamında üretilen ses, görüntü, video ve eserlerin kurumsal mecralarda yayını için veli onayını toplar.",
    sections: [
      {
        id: "identity",
        title: "Belge Bilgileri",
        fields: [
          {
            id: "school_name",
            label: "Okul / Kurum Adı",
            type: "text",
            defaultValue: schoolName,
          },
          {
            id: "classroom",
            label: "Sınıf",
            type: "text",
            defaultValue: studentClassroom,
          },
          {
            id: "student_name",
            label: "Öğrencinin Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "parent_name",
            label: "Velinin Adı Soyadı",
            type: "text",
            defaultValue: guardianName,
          },
          {
            id: "document_date",
            label: "Tarih",
            type: "date",
          },
          {
            id: "permission_status",
            label: "İzin Durumu",
            type: "select",
            options: [
              { label: "İzin Veriyorum", value: "İzin Veriyorum" },
              { label: "İzin Vermiyorum", value: "İzin Vermiyorum" },
            ],
          },
        ],
      },
      {
        id: "statement",
        title: "Açıklama",
        fields: [
          {
            id: "consent_statement",
            label: "İzin Metni / Not",
            type: "textarea",
            rows: 6,
            defaultValue: () =>
              "Ses, görüntü, video kayıtları ve öğrenci eserlerinin MEB'e bağlı kurumsal internet siteleri ve sosyal medya hesaplarında yayınlanması için izin açıklaması.",
          },
          {
            id: "signature_name",
            label: "Veli Ad Soyad / İmza",
            type: "text",
            defaultValue: guardianName,
          },
        ],
      },
    ],
  },
  {
    slug: "acil-durum-basvuru",
    category: "Veli",
    title: "Acil Durumlarda Başvuru Formu",
    sourceFile: "form_12.docx",
    description:
      "Acil durumlarda aranacak anne, baba ve üçüncü şahıs ile okul ulaşım bilgisini tek formda toplar.",
    highlights: [
      "Anne, baba ve üçüncü şahıs iletişim bilgileri",
      "Adres ve telefon alanları",
      "Okula geliş-dönüş ve veli imza alanı",
    ],
    sections: [
      {
        id: "child",
        title: "Çocuğun Bilgileri",
        fields: [
          {
            id: "student_name",
            label: "Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "student_first_name",
            label: "Adı",
            type: "text",
            defaultValue: (context) => context.student?.firstName ?? "",
          },
          {
            id: "student_last_name",
            label: "Soyadı",
            type: "text",
            defaultValue: (context) => context.student?.lastName ?? "",
          },
        ],
      },
      {
        id: "mother_contact",
        title: "Çocuğun Annesi",
        fields: [
          { id: "mother_name", label: "Adı Soyadı", type: "text" },
          { id: "mother_mobile", label: "Cep Telefonu", type: "text" },
          { id: "mother_home_address", label: "Ev Adresi", type: "text" },
          { id: "mother_home_phone", label: "Ev Telefonu", type: "text" },
          { id: "mother_work_address", label: "İş Adresi", type: "text" },
          { id: "mother_work_phone", label: "İş Telefonu", type: "text" },
          { id: "mother_notes", label: "Açıklamalar", type: "textarea", rows: 4 },
        ],
      },
      {
        id: "father_contact",
        title: "Çocuğun Babası",
        fields: [
          { id: "father_name", label: "Adı Soyadı", type: "text" },
          { id: "father_mobile", label: "Cep Telefonu", type: "text" },
          { id: "father_home_address", label: "Ev Adresi", type: "text" },
          { id: "father_home_phone", label: "Ev Telefonu", type: "text" },
          { id: "father_work_address", label: "İş Adresi", type: "text" },
          { id: "father_work_phone", label: "İş Telefonu", type: "text" },
          { id: "father_notes", label: "Açıklamalar", type: "textarea", rows: 4 },
        ],
      },
      {
        id: "third_contact",
        title: "Üçüncü Şahıs",
        fields: [
          { id: "third_name", label: "Adı Soyadı", type: "text" },
          { id: "third_mobile", label: "Cep Telefonu", type: "text" },
          { id: "third_relation", label: "Yakınlık Derecesi", type: "text" },
          { id: "third_home_address", label: "Ev Adresi", type: "text" },
          { id: "third_home_phone", label: "Ev Telefonu", type: "text" },
          { id: "third_work_address", label: "İş Adresi", type: "text" },
          { id: "third_work_phone", label: "İş Telefonu", type: "text" },
          { id: "third_notes", label: "Açıklamalar", type: "textarea", rows: 4 },
        ],
      },
      {
        id: "transport",
        title: "Okula Geliş ve Dönüş",
        fields: [
          { id: "transport_family", label: "Aile", type: "text" },
          { id: "transport_service", label: "Servis", type: "text" },
          { id: "transport_other", label: "Diğer", type: "text" },
          { id: "transport_notes", label: "Ek Açıklama", type: "textarea", rows: 4 },
          { id: "signature_date", label: "Tarih", type: "date" },
          {
            id: "signature_name",
            label: "Velinin Adı Soyadı / İmza",
            type: "text",
            defaultValue: guardianName,
          },
        ],
      },
    ],
  },
  /* ── Gözlem ───────────────────────────────────────────────────────────── */
  {
    slug: "okul-oncesi-gelisim-gozlem",
    category: "Gözlem",
    title: "Gelişim Gözlem Formu",
    sourceFile: "form_13.doc",
    description:
      "Okul öncesi programındaki gelişim alanlarını tarih bazlı izlemek ve görüş-öneri notlarını kaydetmek için kullanılır.",
    highlights: [
      "Motor, bilişsel, dil, sosyal-duygusal alanlar",
      "Öz bakım becerileri izleme",
      "Görüş ve öneriler alanı",
    ],
    sections: [
      {
        id: "identity",
        title: "Kimlik Bilgileri",
        fields: [
          {
            id: "school_name",
            label: "Okul Adı",
            type: "text",
            defaultValue: schoolName,
          },
          {
            id: "teacher_name",
            label: "Öğretmenin Adı Soyadı",
            type: "text",
            defaultValue: teacherName,
          },
          {
            id: "student_name",
            label: "Çocuğun Adı Soyadı",
            type: "text",
            defaultValue: studentName,
          },
          {
            id: "birth_date",
            label: "Çocuğun Doğum Tarihi",
            type: "date",
            defaultValue: (context) => formatDateInput(context.student?.birthDate),
          },
          { id: "gender", label: "Çocuğun Cinsiyeti", type: "text" },
        ],
      },
      {
        id: "observations",
        title: "Gelişim Alanları ve Gözlemler",
        fields: [
          { id: "observation_date_1", label: "Gözlem Tarihi 1", type: "date" },
          { id: "observation_date_2", label: "Gözlem Tarihi 2", type: "date" },
          { id: "observation_date_3", label: "Gözlem Tarihi 3", type: "date" },
          { id: "observation_date_4", label: "Gözlem Tarihi 4", type: "date" },
          {
            id: "motor_development",
            label: "Motor Gelişim",
            type: "textarea",
            rows: 5,
            defaultValue: (context) => context.student?.behaviorNotes ?? "",
          },
          {
            id: "cognitive_development",
            label: "Bilişsel Gelişim",
            type: "textarea",
            rows: 5,
          },
          {
            id: "language_development",
            label: "Dil Gelişimi",
            type: "textarea",
            rows: 5,
          },
          {
            id: "social_emotional",
            label: "Sosyal ve Duygusal Gelişim",
            type: "textarea",
            rows: 5,
          },
          {
            id: "self_care_skills",
            label: "Öz Bakım Becerileri",
            type: "textarea",
            rows: 5,
          },
          {
            id: "opinions_recommendations",
            label: "Görüş ve Öneriler",
            type: "textarea",
            rows: 6,
            defaultValue: (context) =>
              [
                context.student?.strengths ?? "",
                context.student?.improvementAreas ?? "",
              ]
                .filter(Boolean)
                .join("\n"),
          },
        ],
      },
    ],
  },
];

export type FormTemplateSlug = (typeof FORM_TEMPLATES)[number]["slug"];

export function getFormTemplate(slug: string) {
  return FORM_TEMPLATES.find((template) => template.slug === slug) ?? null;
}

export function buildInitialFormValues(
  template: FormTemplateDefinition,
  context: FormTemplateContext,
) {
  return Object.fromEntries(
    template.sections.flatMap((section) =>
      section.fields.map((field) => [field.id, field.defaultValue?.(context) ?? ""]),
    ),
  ) as Record<string, string>;
}

export function sanitizeFormValues(
  template: FormTemplateDefinition,
  values: Record<string, unknown> | null | undefined,
) {
  const entries = template.sections.flatMap((section) => section.fields);
  return Object.fromEntries(
    entries.map((field) => [field.id, typeof values?.[field.id] === "string" ? values[field.id] : ""]),
  ) as Record<string, string>;
}
