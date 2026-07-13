import curriculumCatalog from "@/data/bep_curriculum_catalog_full.json";
import {
  normalizeCurriculumCatalog,
  type NormalizedCurriculumCourse,
} from "@/lib/curriculum-catalog";

export type CurriculumOutcomeOption = {
  outcomeCode: string;
  outcomeText: string;
  processComponents: string[];
};

export type CurriculumThemeOption = {
  themeOrder: number;
  themeName: string;
  tendencies: string[];
  outcomes: CurriculumOutcomeOption[];
};

export type CurriculumCourseOption = NormalizedCurriculumCourse;

const tendencyOverrideSource = [
  {
    courseName: "Matematik",
    themes: {
      "Sayılar ve Nicelikler (1)": [
        "E1.1 Merak",
        "E1.2 Bağımsızlık",
        "E1.3 Azim ve Kararlılık",
        "E1.5 Kendine Güvenme (Öz Güven)",
        "E2.3 Girişkenlik",
        "E2.5 Oyunseverlik",
      ],
      "Sayılar ve Nicelikler (2)": [
        "E1.1 Merak",
        "E1.3 Azim ve Kararlılık",
        "E2.2 Sorumluluk",
        "E2.5 Oyunseverlik",
      ],
      "Sayılar ve Nicelikler (3)": [
        "E1.1 Merak",
        "E1.3 Azim ve Kararlılık",
        "E2.1 Empati",
        "E2.2 Sorumluluk",
        "E2.5 Oyunseverlik",
      ],
      "İşlemlerden Cebirsel Düşünmeye": [
        "E1.1 Merak",
        "E1.3 Azim ve Kararlılık",
        "E1.4 Kendine İnanma (Öz Yeterlilik)",
        "E2.2 Sorumluluk",
      ],
      "Nesnelerin Geometrisi (1)": [
        "E1.1 Merak",
        "E1.3 Azim ve Kararlılık",
        "E1.5 Kendine Güvenme (Öz Güven)",
        "E2.3 Girişkenlik",
        "E2.5 Oyunseverlik",
      ],
      "Nesnelerin Geometrisi (2)": [
        "E1.1 Merak",
        "E1.3 Azim ve Kararlılık",
        "E2.1 Empati",
        "E2.2 Sorumluluk",
        "E2.5 Oyunseverlik",
      ],
      "Veriye Dayalı Araştırma": [
        "E1.1 Merak",
        "E1.3 Azim ve Kararlılık",
        "E2.3 Girişkenlik",
      ],
    },
  },
  {
    courseName: "Türkçe",
    themes: {
      "Merak Ediyorum": ["E1.1 Merak", "E2.1 Empati", "E2.3 Girişkenlik"],
      "Keşfediyorum": ["E1.3 Azim ve Kararlılık", "E2.2 Sorumluluk", "E2.5 Oyunseverlik"],
      "Öğrenmeye Hazırım": ["E2.1 Empati", "E2.2 Sorumluluk"],
      "Okul Yaşamım": ["E2.1 Empati", "E2.2 Sorumluluk", "E2.4 Güven"],
      "Öğrenme Yolculuğum": ["E1.1 Merak", "E2.3 Girişkenlik"],
      "Atatürk’üm ve Türkiyem": ["E2.1 Empati"],
      "Benim Güzel Ailem": ["E2.1 Empati", "E2.2 Sorumluluk"],
      "Sosyal Çevrem": ["E2.2 Sorumluluk", "E2.3 Girişkenlik"],
      "Artık Okuyorum": ["E1.5 Kendine Güvenme (Öz Güven)", "E2.3 Girişkenlik"],
      "İşlevsel Okuma": ["E3.1 Muhakeme", "E3.4 Gerçeği Arama"],
    },
  },
  {
    courseName: "Bağımsız Yaşam Becerileri",
    themes: {
      "Kendimi Keşfediyorum": ["E1.2 Bağımsızlık", "E2.2 Sorumluluk", "E2.5 Oyunseverlik"],
      "Bağımsızım, Günlük Hayata Hazırım": [
        "E1.1 Merak",
        "E2.2 Sorumluluk",
        "E2.5 Oyunseverlik",
      ],
      "İletişim Köprüleri": [
        "E2.1 Empati",
        "E2.2 Sorumluluk",
        "E2.3 Girişkenlik",
        "E2.5 Oyunseverlik",
        "E3.10 Eleştirel Bakma",
      ],
      "Güvende Kal, Özgür Ol": [
        "E1.1 Merak",
        "E2.1 Empati",
        "E2.2 Sorumluluk",
        "E2.5 Oyunseverlik",
        "E3.9 Şüphe Duyma",
      ],
      "Bilinçli Alışveriş": ["E2.2 Sorumluluk", "E3.1 Muhakeme"],
      Değerlerimiz: ["E2.1 Empati", "E2.2 Sorumluluk"],
    },
  },
  {
    courseName: "Sağlıklı Yaşam ve Güvenlik Becerileri",
    themes: {
      "Öz Bakım ve Günlük Yaşam": [
        "E2.2 Sorumluluk",
        "E3.1 Muhakeme / Uzmanlaşma",
        "E3.7 Sistematiklik",
      ],
      "Sağlıklı Beslenme Becerileri": ["E2.2 Sorumluluk", "E2.5 Oyunseverlik"],
      "Hastalıklardan Korunma ve Sağlık": ["E3.1 Muhakeme"],
      "Tehlikeleri Fark Etme": ["E3.1 Muhakeme", "E3.9 Şüphe Duyma"],
      "Acil Durumlar ve Doğal Afetlerden Korunma": ["E2.2 Sorumluluk", "E3.1 Muhakeme"],
      "Trafik Kurallarına Uyma": ["E2.5 Oyunseverlik"],
      "İlk Yardım": ["E2.2 Sorumluluk", "E3.1 Muhakeme"],
      "Kendini Koruma": ["E3.1 Muhakeme", "E3.9 Şüphe Duyma"],
    },
  },
  {
    courseName: "Sosyal Beceriler",
    themes: {
      "Birbirimizi Tanıyoruz ve Etkileşim Kuruyoruz": [
        "E1.1 Merak",
        "E2.1 Empati",
        "E2.5 Oyunseverlik",
        "E3.1 Muhakeme",
      ],
      "Duygularımızı Tanıyoruz ve İfade Ediyoruz": ["E2.1 Empati", "E3.2 Odaklanma"],
      "Birlikte Yaşıyoruz": ["E2.1 Empati", "E3.2 Odaklanma"],
      "Duygu ve Davranışlarımızı Yönetiyoruz": ["E3.1 Muhakeme", "E3.4 Gerçeği Arama"],
    },
  },
  {
    courseName: "Hayat Bilgisi ve Günlük Yaşam Becerileri",
    themes: {
      "Ben ve Okulum": ["E1.4 Kendine İnanma (Öz Yeterlilik)", "E2.2 Sorumluluk"],
      "Ailem ve Toplum": ["E2.1 Empati", "E2.4 Güven"],
      "Yaşadığım Yer ve Ülkem": ["E1.1 Merak", "E2.2 Sorumluluk"],
      "Doğa ve Çevre": ["E1.1 Merak", "E3.7 Sistematiklik"],
      "Bilim, Teknoloji ve Sanat": [
        "E1.1 Merak",
        "E2.2 Sorumluluk",
        "E3.1 Uzmanlaşma",
        "E3.2 Odaklanma",
        "E3.4 Gerçeği Arama",
      ],
    },
  },
  {
    courseName: "İletişim Becerileri",
    themes: {
      "İletişime Başlıyorum": ["E2.3 Girişkenlik", "E2.4 Güven"],
      "Dünyayı Anlıyorum, Anlamlandırıyorum": ["E1.1 Merak", "E2.5 Oyunseverlik"],
      "Ben Kimim?": [
        "E1.4 Kendine İnanma (Öz Yeterlilik)",
        "E1.5 Kendine Güvenme (Öz Güven)",
      ],
      "Oyun Oynuyorum": ["E2.5 Oyunseverlik"],
      "Birlikte Konuşalım": ["E2.1 Empati", "E2.3 Girişkenlik"],
    },
  },
  {
    courseName: "Görsel Sanatlar",
    themes: {
      "Çizim ve Şekillerle Sanat": ["E1.1 Merak", "E2.5 Oyunseverlik"],
      "Renklerden Sanata": ["E1.1 Merak", "E2.5 Oyunseverlik"],
      "Nesnelerden Sanata": ["E2.5 Oyunseverlik", "E3.2 Odaklanma"],
      "Yaşam ve Sanat": ["E2.1 Empati", "E3.3 Yaratıcılık"],
      "Dijital Sanat": ["E1.1 Merak", "E3.2 Odaklanma", "E3.3 Yaratıcılık"],
    },
  },
  {
    courseName: "Müzik",
    themes: {
      "Müziksel Algı": ["E1.1 Merak", "E2.5 Oyunseverlik", "E3.2 Odaklanma"],
      "Müziksel İfade": [
        "E1.1 Merak",
        "E1.4 Kendine İnanma (Öz Yeterlilik)",
        "E1.5 Kendine Güvenme (Öz Güven)",
        "E2.5 Oyunseverlik",
        "E3.2 Odaklanma",
        "E3.3 Yaratıcılık",
        "E3.3 Yaratıcılık",
      ],
      "Müzik Kültürü": [
        "E1.1 Merak",
        "E1.4 Kendine İnanma (Öz Yeterlilik)",
        "E2.5 Oyunseverlik",
        "E3.2 Odaklanma",
        "E3.4 Gerçeği Arama",
      ],
    },
  },
  {
    courseName: "Beden Eğitimi, Oyun ve Spor",
    themes: {
      "Temel Hareket Kavramları": ["E1.1 Merak", "E2.5 Oyunseverlik", "E3.2 Odaklanma"],
      "Temel Hareket Becerileri": [
        "E1.1 Merak",
        "E1.3 Azim ve Kararlılık",
        "E1.5 Kendine Güvenme (Öz Güven)",
        "E2.5 Oyunseverlik",
        "E3.2 Odaklanma",
      ],
      "Birleştirilmiş Hareket Becerileri": [
        "E1.1 Merak",
        "E2.5 Oyunseverlik",
        "E3.2 Odaklanma",
      ],
      "Ritmik Hareket Becerileri": [
        "E1.1 Merak",
        "E1.5 Kendine Güvenme (Öz Güven)",
        "E2.5 Oyunseverlik",
        "E3.2 Odaklanma",
        "E3.3 Yaratıcılık",
      ],
      "Temel Spor Becerileri": ["E1.1 Merak", "E1.3 Azim ve Kararlılık", "E2.5 Oyunseverlik"],
      "Sağlık ve Zindelik Becerileri": [
        "E1.1 Merak",
        "E1.3 Azim ve Kararlılık",
        "E2.2 Sorumluluk",
        "E2.5 Oyunseverlik",
        "E3.2 Odaklanma",
      ],
      "Egzersiz Araçları ve Teknoloji Destekli Fiziksel Aktivite": [
        "E1.1 Merak",
        "E2.5 Oyunseverlik",
        "E3.2 Odaklanma",
      ],
    },
  },
] as const;

export const fixedTendencyOptions = Array.from(
  new Set(tendencyOverrideSource.flatMap((course) => Object.values(course.themes).flat())),
);

function normalizeTendencyKey(value?: string | null) {
  return value?.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ") ?? "";
}

function normalizeThemeKey(value?: string | null) {
  return value?.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ") ?? "";
}

function buildThemeKeys(value?: string | null) {
  const normalizedValue = value?.trim() ?? "";
  if (!normalizedValue) {
    return [];
  }

  const keys = new Set<string>([normalizeThemeKey(normalizedValue)]);
  const segments = normalizedValue.split("/").map((segment) => segment.trim()).filter(Boolean);
  const lastSegment = segments[segments.length - 1];
  if (lastSegment) {
    keys.add(normalizeThemeKey(lastSegment));
  }

  return Array.from(keys);
}

const fixedTendencyLookup = new Map(
  fixedTendencyOptions.flatMap((option) => {
    const [code, ...nameParts] = option.split(" ");
    const name = nameParts.join(" ").trim();

    return [
      [normalizeTendencyKey(option), option],
      [normalizeTendencyKey(code), option],
      [normalizeTendencyKey(name), option],
    ];
  }),
);

const tendencyOverrideLookup = new Map(
  tendencyOverrideSource.map((course) => [
    normalizeThemeKey(course.courseName),
    new Map(
      Object.entries(course.themes).map(([themeName, tendencies]) => [
        normalizeThemeKey(themeName),
        tendencies,
      ]),
    ),
  ]),
);

export function mapFixedTendencyOption(value?: string | null) {
  return fixedTendencyLookup.get(normalizeTendencyKey(value)) ?? null;
}

export function resolveTendencyOverrides(courseName?: string, learningArea?: string) {
  const courseThemes = tendencyOverrideLookup.get(normalizeThemeKey(courseName));
  if (!courseThemes) {
    return null;
  }

  for (const themeKey of buildThemeKeys(learningArea)) {
    const tendencies = courseThemes.get(themeKey);
    if (tendencies) {
      return tendencies;
    }
  }

  return null;
}

// Normalized curriculum data mapped to E-coded tendencies
export const curriculumOptions: CurriculumCourseOption[] = normalizeCurriculumCatalog(
  curriculumCatalog,
).map((course) => ({
  ...course,
  themes: course.themes.map((theme) => {
    const resolvedTendencies =
      resolveTendencyOverrides(course.courseName, theme.themeName) ??
      Array.from(
        new Set(
          theme.tendencies
            .map((tendency) => mapFixedTendencyOption(tendency))
            .filter((tendency): tendency is string => Boolean(tendency))
        )
      );

    return {
      ...theme,
      tendencies: resolvedTendencies.length > 0 ? resolvedTendencies : theme.tendencies,
    };
  })
}));

export function listCurriculumCourses() {
  return curriculumOptions;
}

export function getCourseById(courseId?: string) {
  return curriculumOptions.find((course) => course.courseId === courseId);
}

export function findCurriculumTheme(courseName: string, themeName: string) {
  const course = curriculumOptions.find(
    (c) => c.courseName.trim().toLocaleLowerCase("tr-TR") === courseName.trim().toLocaleLowerCase("tr-TR")
  );
  if (!course) return null;

  const targetThemeKeys = buildThemeKeys(themeName);
  return course.themes.find((t) =>
    targetThemeKeys.includes(normalizeThemeKey(t.themeName))
  );
}

export function findCurriculumOutcome(courseName: string, themeName: string, outcomeText: string) {
  const theme = findCurriculumTheme(courseName, themeName);
  if (!theme) return null;

  const normalizedOutcome = outcomeText.trim().toLocaleLowerCase("tr-TR");
  const outcome = theme.outcomes.find(
    (o) =>
      o.outcomeText.trim().toLocaleLowerCase("tr-TR") === normalizedOutcome ||
      o.outcomeCode.trim().toLocaleLowerCase("tr-TR") === normalizedOutcome
  );

  if (!outcome) return null;

  return {
    theme,
    outcome,
  };
}

export type PlanTemplateSource = {
  courseName: string;
  learningArea: string;
  learningOutcome: string;
  processComponents: string[];
  tendencies?: string[];
};

export function buildPlanRowDefaults(source: PlanTemplateSource) {
  let tendencies = source.tendencies ?? [];
  let processComponents = source.processComponents ?? [];

  // If tendencies are empty, look up the theme tendencies in the curriculum catalog
  if (tendencies.length === 0) {
    const theme = findCurriculumTheme(source.courseName, source.learningArea);
    if (theme && theme.tendencies) {
      tendencies = theme.tendencies;
    }
  }

  // If processComponents are empty, look up the outcome process components in the curriculum catalog
  if (processComponents.length === 0) {
    const matched = findCurriculumOutcome(source.courseName, source.learningArea, source.learningOutcome);
    if (matched && matched.outcome && matched.outcome.processComponents) {
      processComponents = matched.outcome.processComponents;
    }
  }

  const resolvedTendencies =
    resolveTendencyOverrides(source.courseName, source.learningArea) ??
    Array.from(
      new Set(
        tendencies
          .map((tendency) => mapFixedTendencyOption(tendency))
          .filter((tendency): tendency is string => Boolean(tendency)),
      ),
    );

  return {
    criterion: "4/5 (%80)",
    methodTechnique: "",
    materials: "",
    tendencies: resolvedTendencies.join("; "),
    evaluationMethods: "",
    learningArea: source.learningArea,
    learningOutcome: source.learningOutcome,
    processComponents: processComponents,
  };
}

export function buildFallbackSuggestion(fieldName: string, courseName?: string) {
  const defaults: Record<string, string> = {
    learningEnvironmentText:
      "Öğrencinin dikkatini sürdürebileceği, yönergelerin kısa ve net verildiği yapılandırılmış öğrenme ortamı sağlanır.",
    physicalEnvironmentText:
      "Öğrencinin öğretmeni rahat görebileceği, dikkat dağıtıcı uyaranların azaltıldığı oturma düzeni planlanır.",
    socialInteractionText:
      "Akran etkileşimini artıran eşli ve küçük grup etkinlikleri kontrollü biçimde uygulanır.",
    digitalSupportsText:
      "Görsel zamanlayıcı, kısa video model ve etkileşimli alıştırmalar destek amaçlı kullanılır.",
    generalEvaluation:
      "BEP hedeflerine ulaşma düzeyi dönem sonunda gözlem, performans kayıtları ve öğretmen görüşleri ile bütüncül olarak değerlendirilecektir.",
    performanceLevel:
      "Öğrenci verilen yönergeleri görsel ipucu ile yerine getirebilmekte, bağımsız başlatma becerisi için ek tekrar gereksinimi göstermektedir.",
    strengths:
      "Görsel yönergeleri takip etme, rutinlere uyum sağlama ve kısa süreli dikkatini sürdürme alanlarında güçlü yönler göstermektedir.",
    improvementAreas:
      "Bağımsız başlatma, genelleme ve beceriyi farklı ortamlarda sürdürme alanlarında destek gereksinimi bulunmaktadır.",
  };

  return (
    defaults[fieldName] ??
    `${courseName ?? "Ders"} kapsamında öğrencinin bireysel performansına uygun, ölçülebilir ve uygulanabilir bir destek açıklaması hazırlanmalıdır.`
  );
}
