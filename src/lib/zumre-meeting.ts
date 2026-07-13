import type { ZumreMeetingAgendaItem, ZumreMeetingDocument } from "@/lib/prisma-shim";

import { restoreTurkishText } from "@/lib/turkish";

export const ZUMRE_MEETING_TYPE_OPTIONS = [
  { value: "year_start", label: "Ders yılı başı" },
  { value: "second_term", label: "İkinci dönem başı" },
  { value: "year_end", label: "Ders yılı sonu" },
  { value: "midyear", label: "Ara toplantı" },
] as const;

export const DEFAULT_ZUMRE_AGENDA_ITEMS = [
  {
    title: "Açılış ve yoklama",
    discussionText:
      "Zümre öğretmenleri toplantısı, zümre başkanının gündem maddelerini sunması ve katılımcı yoklamasının yapılmasıyla başlatıldı.",
    decisionText: "Toplantı gündeminin görüşülmesine geçilmesine karar verildi.",
  },
  {
    title: "Bir önceki toplantıda alınan kararların değerlendirilmesi",
    discussionText:
      "Bir önceki zümre toplantısında alınan kararlar okunarak uygulama durumu değerlendirildi.",
    decisionText: "Önceki kararların izlenmesine ve eksik kalan çalışmaların tamamlanmasına karar verildi.",
  },
  {
    title: "Mevzuat, okulun kuruluş amaçı ve öğretim programı uyumu",
    discussionText:
      "Planlamaların eğitim ve öğretim mevzuatı, okulun kuruluş amaçı ve ilgili öğretim programına uygun yürütülmesi görüşüldü.",
    decisionText: "Yıllık plan ve ders planlarının ilgili öğretim programı doğrultusunda uygulanmasına karar verildi.",
  },
  {
    title: "Atatürkçülük, yıllık plan, ders planı ve kazanım ağırlıkları",
    discussionText:
      "Atatürkçülük konularının derslerde işlenişi, yıllık planlar, ders planları ve kazanım ağırlıkları değerlendirildi.",
    decisionText: "Planların çevre şartları ve kazanım ağırlıkları dikkate alınarak uygulanmasına karar verildi.",
  },
  {
    title: "Öğretim yöntem ve teknikleri ile okul temelli faaliyetler",
    discussionText:
      "Derslerin işlenişinde uygulanacak yöntem ve teknikler ile okul temelli faaliyetlere yönelik planlamalar görüşüldü.",
    decisionText: "Öğrenci merkezli, farklılaştırılmış ve uygulamaya dönük yöntemlerin kullanılmasına karar verildi.",
  },
  {
    title: "BEP, ders planları ve farklılaştırılmış uygulamalar",
    discussionText:
      "Özel eğitim ihtiyacı olan öğrenciler için BEP, ders planları ve destekleme yaklaşımları değerlendirildi.",
    decisionText: "BEP hedeflerinin izlenmesine ve farklılaştırılmış uygulamaların derslere yansıtılmasına karar verildi.",
  },
  {
    title: "Ders ziyareti, zümreler arası iş birliği ve mesleki paylaşım",
    discussionText:
      "Zümre öğretmenleri arasında ders ziyareti, geri bildirim ve diğer zümrelerle yapılabilecek iş birlikleri görüşüldü.",
    decisionText: "Eğitim öğretim yılı içinde en az bir ders ziyareti yapılmasına ve geri bildirimlerin değerlendirilmesine karar verildi.",
  },
  {
    title: "Akademik çalışmalar, teknolojik gelişmeler ve öğretim materyalleri",
    discussionText:
      "Alanla ilgili akademik çalışmalar, teknolojik gelişmeler ve ihtiyaç duyulan öğretim materyalleri değerlendirildi.",
    decisionText: "Uygun basılı ve dijital materyallerin derslerde etkin kullanılmasına karar verildi.",
  },
  {
    title: "Ölçme değerlendirme, ortak sınavlar ve öğrenci başarısı",
    discussionText:
      "Öğrenci başarısının ölçülmesi, sınav analizleri, ortak sınavlar ve eksik kazanımlar için alınacak önlemler görüşüldü.",
    decisionText: "Sınav analizleri doğrultusunda konu ve kazanım eksikliği olan öğrenciler için izleme yapılmasına karar verildi.",
  },
  {
    title: "Değerler eğitimi, sosyal sorumluluk ve okul dışı öğrenme",
    discussionText:
      "Değerlerin öğretimi, sosyal sorumluluk faaliyetleri, okul içi ve okul dışı öğrenme ortamlarının kullanımı değerlendirildi.",
    decisionText: "Ders kazanımlarıyla uyumlu faaliyetlerin planlanmasına ve takvimlendirilmesine karar verildi.",
  },
  {
    title: "İş sağlığı ve güvenliği",
    discussionText:
      "Eğitim öğretim faaliyetlerinde iş sağlığı ve güvenliği tedbirleri değerlendirildi.",
    decisionText: "Derslik, atölye, laboratuvar ve diğer eğitim ortamlarında güvenlik tedbirlerine uyulmasına karar verildi.",
  },
  {
    title: "Dilek ve temenniler",
    discussionText:
      "Katılımcıların dilek ve temennileri alınarak toplantı tamamlandı.",
    decisionText: "Alınan kararların okul müdürlüğü onayından sonra uygulanmasına karar verildi.",
  },
] as const;

export const DEFAULT_SOK_AGENDA_ITEMS = [
  {
    title: "Açılış, yoklama ve gündemin okunması",
    discussionText:
      "Şube öğretmenler kurulu toplantısı, kurul başkanının açılış konuşması, katılımcı yoklaması ve gündem maddelerinin okunmasıyla başlatıldı.",
    decisionText: "Toplantı gündeminin sırasıyla görüşülmesine karar verildi.",
  },
  {
    title: "Öğrencilerin akademik gelişimlerinin değerlendirilmesi",
    discussionText:
      "Öğrencilerin ders bazındaki başarı durumları, güçlü yönleri ve desteklenmesi gereken öğrenme alanları değerlendirildi.",
    decisionText:
      "Öğrencilerin gelişimlerinin düzenli izlenmesine ve ihtiyaç duyulan alanlarda bireyselleştirilmiş destek sağlanmasına karar verildi.",
  },
  {
    title: "Devamsızlık, derse katılım ve okul kurallarına uyum",
    discussionText:
      "Öğrencilerin devam durumu, derse katılımı, sorumlulukları ve okul kurallarına uyumları görüşüldü.",
    decisionText:
      "Devamsızlık ve uyum sorunu görülen öğrenciler için veli, rehberlik servisi ve okul yönetimiyle koordineli çalışma yürütülmesine karar verildi.",
  },
  {
    title: "Özel eğitim ihtiyacı ve BEP uygulamalarının değerlendirilmesi",
    discussionText:
      "Özel eğitim ihtiyacı bulunan öğrencilerin BEP hedefleri, sınıf içi uyarlamaları ve ölçme değerlendirme süreçleri ele alındı.",
    decisionText:
      "BEP kararlarının derslere yansıtılmasına, gelişimin kayıt altına alınmasına ve gerekli uyarlamaların sürdürülmesine karar verildi.",
  },
  {
    title: "Rehberlik, sosyal ve duygusal gelişim",
    discussionText:
      "Öğrencilerin sosyal ilişkileri, duygusal gelişimleri, rehberlik ihtiyaçları ve sınıf içi uyumları değerlendirildi.",
    decisionText:
      "İhtiyaç duyulan öğrenciler için rehberlik servisiyle iş birliği yapılmasına ve koruyucu destek çalışmalarının planlanmasına karar verildi.",
  },
  {
    title: "Veli iş birliği ve bilgilendirme çalışmaları",
    discussionText:
      "Öğrenci gelişiminin desteklenmesi amaçıyla velilerle yürütülecek bilgilendirme ve iş birliği çalışmaları görüşüldü.",
    decisionText:
      "Velilerle düzenli iletişim kurulmasına ve alınan eğitim kararlarının anlaşılır biçimde paylaşılmasına karar verildi.",
  },
  {
    title: "Ölçme değerlendirme ve alınacak eğitim tedbirleri",
    discussionText:
      "Ölçme değerlendirme sonuçları, sınıfın genel başarı durumu ve öğrenme eksikliklerine yönelik tedbirler değerlendirildi.",
    decisionText:
      "Öğrenme eksiklikleri için ek çalışmalar planlanmasına, sonuçların izlenmesine ve öğretmenler arası bilgi paylaşımına karar verildi.",
  },
  {
    title: "Dilek ve temenniler",
    discussionText: "Katılımcıların dilek ve önerileri alınarak toplantı tamamlandı.",
    decisionText:
      "Alınan kararların ilgili öğretmenlerce uygulanmasına ve gelişmelerin sonraki toplantıda değerlendirilmesine karar verildi.",
  },
] as const;

export type ZumreMeetingWithAgenda = ZumreMeetingDocument & {
  agendaItems: ZumreMeetingAgendaItem[];
};

export function getZumreMeetingTypeLabel(value: string) {
  return (
    ZUMRE_MEETING_TYPE_OPTIONS.find((option) => option.value === value)?.label ??
    restoreTurkishText(value)
  );
}

export function buildZumreMeetingTitle(input: {
  educationYear: string;
  schoolName: string;
  zumreName: string;
  termLabel: string;
  documentType?: "zumre" | "sok";
}) {
  const isSok = input.documentType === "sok";
  const suffix = isSok ? "Şube Öğretmenler Kurulu Toplantı Tutanağı" : "Zümre Öğretmenler Kurulu Toplantı Tutanağı";
  return restoreTurkishText(
    `${input.educationYear} ${input.schoolName} ${input.zumreName} ${input.termLabel} ${suffix}`,
  )
    .replace(/\s+/g, " ")
    .trim();
}

export function splitZumreParticipants(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => restoreTurkishText(item).trim())
    .filter(Boolean);
}

export function formatZumreDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

export function buildZumreComplianceChecklist(document: Pick<
  ZumreMeetingDocument,
  "announcementDate" | "meetingDate" | "meetingType"
>) {
  const meetingTimeCheck =
    document.meetingType === "midyear"
      ? "Ara toplantı; müdür/zümre başkanı çağrısı veya salt çoğunluk talebiyle yapılmalıdır."
      : "EK-2'ye göre eğitim kurumu zümreleri öğretmenler kurulunu takip eden işgününde toplanır.";

  const announcementCheck = (() => {
    if (!document.announcementDate) {
      return "Duyuru tarihi girilmedi; zorunlu durumlar dışında toplantı tarihi, yeri ve gündemi en az 5 gün önce duyurulmalıdır.";
    }

    const diffMs = document.meetingDate.getTime() - document.announcementDate.getTime();
    const diffDays = Math.floor(diffMs / 86_400_000);
    return diffDays >= 5
      ? "Duyuru tarihi 5 gün önceden bildirim kuralı ile uyumlu görünüyor."
      : "Duyuru tarihi 5 gün önceden bildirim kuralını karşılamıyor; zorunlu durum notu eklenmelidir.";
  })();

  return [
    meetingTimeCheck,
    announcementCheck,
    "Kararlar oy çokluğuyla alınır; eşitlik hâlinde zümre başkanının katıldığı görüş kabul edilir.",
    "Tutanak, toplantıya katılmayanlar dâhil ilgili zümre kurulu üyeleri tarafından imzalanır ve okul yönetimince saklanır.",
    "Alınan kararlar müdür onayından sonra uygulamaya konulur.",
  ];
}
