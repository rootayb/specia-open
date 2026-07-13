export type ToolGoal = {
  id: string;
  sortOrder: number;
  courseName: string;
  learningArea: string;
  learningOutcome: string;
  processComponents: string[];
  criterion: string | null;
  methodTechnique: string | null;
  materials: string | null;
  evaluationMethods: string | null;
  latestProgressPercent: number | null;
  latestStatus: "not_started" | "in_progress" | "completed" | "needs_support" | null;
};

export type ToolDocument = {
  id: string;
  title: string;
  updatedAt: string;
  startDate: string | null;
  endDate: string | null;
  learningEnvironmentText: string | null;
  physicalEnvironmentText: string | null;
  socialInteractionText: string | null;
  digitalSupportsText: string | null;
  generalEvaluation: string | null;
  goals: ToolGoal[];
};

export type ToolStudent = {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
  classroom: string | null;
  diagnosis: string | null;
  strengths: string | null;
  improvementAreas: string | null;
  behaviorNotes: string | null;
  currentSupport: string | null;
  supportMaterials: string | null;
  educationAdjustments: string | null;
  developmentHistory: string | null;
  reinforcers: ToolReinforcer[];
  sensoryMenuItems: ToolSensoryMenuItem[];
  dailyDataEntries: ToolDailyDataEntry[];
  documents: ToolDocument[];
};

export type ToolReinforcer = {
  id: string;
  title: string;
  category: string;
  useCase: string | null;
  deliveryType: string | null;
  notes: string | null;
  strengthLevel: number;
  isActive: boolean;
  createdAt: string;
};

export type ToolSensoryMenuItem = {
  id: string;
  title: string;
  category: string;
  useWhen: string | null;
  durationLabel: string | null;
  materials: string | null;
  notes: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
};

export type ToolDailyDataEntry = {
  id: string;
  documentId: string | null;
  measuredAt: string;
  sessionLabel: string | null;
  skillArea: string;
  target: string;
  metricType: string;
  metricValue: number | null;
  setting: string | null;
  note: string | null;
  outcome: string | null;
  createdAt: string;
  createdByName: string;
};

export type SupportProfile = {
  headline: string;
  strengths: string[];
  focusAreas: string[];
  classAdjustments: string[];
  familyActions: string[];
  riskTone: "stable" | "watch" | "priority";
};

export type GoalBreakdown = {
  title: string;
  stepLabel: string;
  sessionFocus: string[];
  measurementPlan: string[];
};

export type SessionIntensityInput = {
  weeklySessionCount: number;
  durationMinutes: number;
  goalCount: number;
  completedGoalCount: number;
  averageProgressPercent: number;
  homeSupportLevel: "low" | "medium" | "high";
};

export type SessionIntensityAnalysis = {
  weeklyMinutes: number;
  activeGoalCount: number;
  minutesPerActiveGoal: number;
  densityLabel: "low" | "balanced" | "intense";
  recommendation: string;
  coachingNote: string;
};

export type StrategyDeck = {
  environment: string[];
  communication: string[];
  regulation: string[];
  materials: string[];
};

export type AbcEntryInput = {
  antecedent: string;
  behavior: string;
  consequence: string;
  setting?: string;
};

export type AbcInsight = {
  topAntecedents: string[];
  topConsequences: string[];
  topSettings: string[];
  summary: string;
  nextSteps: string[];
};

export type NarrativeGeneratorInput = {
  studentName: string;
  mode: "social_story" | "task_analysis";
  title: string;
  context: string;
  expectedBehavior: string;
  supportCue: string;
  steps: string[];
};

export type NarrativeGeneratorOutput = {
  title: string;
  intro: string;
  body: string[];
  closing: string;
};

function cleanText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function splitIdeas(value?: string | null, max = 4) {
  const cleaned = cleanText(value);
  if (!cleaned) {
    return [];
  }

  const items = cleaned
    .split(/[\n.;,]/)
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return Array.from(new Set(items)).slice(0, max);
}

function limitUnique(items: Array<string | null | undefined>, max = 4) {
  return Array.from(
    new Set(
      items
        .map((item) => cleanText(item))
        .filter(Boolean),
    ),
  ).slice(0, max);
}

function formatStudentName(student: Pick<ToolStudent, "firstName" | "lastName">) {
  return `${student.firstName} ${student.lastName}`.trim();
}

function frequencyList(items: Array<string | null | undefined>, max = 3) {
  const counts = new Map<string, number>();

  items.forEach((item) => {
    const cleaned = cleanText(item);
    if (!cleaned) {
      return;
    }

    counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0], "tr"))
    .slice(0, max)
    .map(([value]) => value);
}

export function getDocumentProgressSnapshot(document?: ToolDocument | null) {
  if (!document) {
    return {
      goalCount: 0,
      completedGoalCount: 0,
      averageProgressPercent: 0,
    };
  }

  const goalCount = document.goals.length;
  const completedGoalCount = document.goals.filter((goal) => goal.latestStatus === "completed").length;
  const progressValues = document.goals
    .map((goal) => goal.latestProgressPercent ?? 0)
    .filter((value) => Number.isFinite(value));

  return {
    goalCount,
    completedGoalCount,
    averageProgressPercent:
      progressValues.length > 0
        ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
        : 0,
  };
}

export function buildSupportProfile(
  student: ToolStudent | null,
  document?: ToolDocument | null,
): SupportProfile {
  if (!student) {
    return {
      headline: "Öğrenci secildiginde araclar mevcut kayitlardan otomatik özet uretir.",
      strengths: [],
      focusAreas: [],
      classAdjustments: [],
      familyActions: [],
      riskTone: "stable",
    };
  }

  const progress = getDocumentProgressSnapshot(document);
  const strengths = limitUnique(
    [
      ...splitIdeas(student.strengths),
      ...document?.goals.slice(0, 2).map((goal) => `${goal.courseName}: ${goal.learningOutcome}`) ?? [],
    ],
    4,
  );

  const focusAreas = limitUnique(
    [
      ...splitIdeas(student.improvementAreas),
      ...splitIdeas(student.behaviorNotes, 2),
      cleanText(student.diagnosis) ? `Tani baglamini ders ici uyarlamayla birlikte ele alin: ${cleanText(student.diagnosis)}` : "",
    ],
    4,
  );

  const classAdjustments = limitUnique(
    [
      ...splitIdeas(student.educationAdjustments),
      ...splitIdeas(document?.learningEnvironmentText, 2),
      ...splitIdeas(document?.physicalEnvironmentText, 2),
      cleanText(document?.digitalSupportsText)
        ? `Dijital destekleri kısa tekrar bloklari halinde planlayin: ${cleanText(document?.digitalSupportsText)}`
        : "",
      cleanText(student.supportMaterials)
        ? `Destek materyallerini seanslar arasi tutarli kullanin: ${cleanText(student.supportMaterials)}`
        : "",
    ],
    4,
  );

  const familyActions = limitUnique(
    [
      cleanText(student.currentSupport)
        ? `Ev tarafinda süren destek akışını netlestirin: ${cleanText(student.currentSupport)}`
        : "",
      ...splitIdeas(document?.socialInteractionText, 2),
      ...splitIdeas(document?.generalEvaluation, 2),
      cleanText(student.developmentHistory)
        ? `Aileyle geçmiş gelişim notlarini ayni hedef diliyle tekrar gozden gecirin.`
        : "",
    ],
    4,
  );

  const riskScore =
    (focusAreas.length >= 3 ? 2 : focusAreas.length >= 1 ? 1 : 0) +
    (progress.goalCount > 0 && progress.averageProgressPercent < 40 ? 1 : 0) +
    (progress.goalCount > 0 && progress.completedGoalCount === 0 ? 1 : 0);

  return {
    headline:
      progress.goalCount > 0
        ? `${formatStudentName(student)} için ${progress.goalCount} hedefli calisma gorunuyor. Ortalama ilerleme %${progress.averageProgressPercent}.`
        : `${formatStudentName(student)} için heniz hedef baglanmamis; profil öğrenci kayıtları uzerinden olusturuldu.`,
    strengths,
    focusAreas,
    classAdjustments,
    familyActions,
    riskTone: riskScore >= 3 ? "priority" : riskScore >= 1 ? "watch" : "stable",
  };
}

function fallbackSteps(goal: ToolGoal) {
  return [
    `${goal.learningOutcome} hedefini tek oturumluk kucuk davranislara ayirin.`,
    `${goal.courseName} dersi için model sunum + rehberli tekrar planlayin.`,
    `Ayni beceriyi farkli materyal veya baglamda genelleyerek oturumu kapatin.`,
  ];
}

export function buildGoalBreakdown(goal: ToolGoal | null): GoalBreakdown {
  if (!goal) {
    return {
      title: "Bir hedef secildiginde sistem mikro adim akışı olusturur.",
      stepLabel: "Hazir değil",
      sessionFocus: [],
      measurementPlan: [],
    };
  }

  const processDrivenSteps =
    goal.processComponents.length > 0
      ? goal.processComponents.slice(0, 3).map((item, index) => {
          const labels = ["Modelle", "Birlikte uygula", "Bagimsiz dene"];
          return `${labels[index] ?? "Calis"}: ${item}`;
        })
      : fallbackSteps(goal);

  const measurementPlan = limitUnique(
    [
      cleanText(goal.criterion)
        ? `Basari olcutu: ${cleanText(goal.criterion)}`
        : "Basari olcutunu oturum oncesi netlestirin ve ayni olcutle tekrar edin.",
      cleanText(goal.evaluationMethods)
        ? `Değerlendirme yöntemi: ${cleanText(goal.evaluationMethods)}`
        : "Her oturum sonunda kısa performans notu alin.",
      goal.latestProgressPercent !== null
        ? `Son kayitli ilerleme: %${goal.latestProgressPercent}`
        : "Bu hedef için henüz ilerleme kaydı yok.",
    ],
    3,
  );

  return {
    title: `${goal.courseName} / ${goal.learningArea}`,
    stepLabel: goal.learningOutcome,
    sessionFocus: limitUnique(
      [
        ...processDrivenSteps,
        cleanText(goal.methodTechnique)
          ? `Yöntem-teknik: ${cleanText(goal.methodTechnique)}`
          : "",
        cleanText(goal.materials) ? `Materyal odagi: ${cleanText(goal.materials)}` : "",
      ],
      5,
    ),
    measurementPlan,
  };
}

export function analyzeSessionIntensity(
  input: SessionIntensityInput,
): SessionIntensityAnalysis {
  const weeklyMinutes = Math.max(0, input.weeklySessionCount) * Math.max(0, input.durationMinutes);
  const activeGoalCount = Math.max(1, input.goalCount - input.completedGoalCount);
  const homeSupportBonus =
    input.homeSupportLevel === "high" ? 10 : input.homeSupportLevel === "medium" ? 5 : 0;
  const minutesPerActiveGoal = Number(
    ((weeklyMinutes + homeSupportBonus) / activeGoalCount).toFixed(1),
  );

  let densityLabel: SessionIntensityAnalysis["densityLabel"] = "balanced";
  if (minutesPerActiveGoal < 18) {
    densityLabel = "low";
  } else if (minutesPerActiveGoal > 40) {
    densityLabel = "intense";
  }

  let recommendation = "Seans yogunlugu aktif hedeflerle dengeli gorunuyor.";
  let coachingNote = "Oturum sonu notlarini ayni hafta içinde hedef bazli isleyin.";

  if (densityLabel === "low") {
    recommendation =
      input.averageProgressPercent < 45
        ? "Aktif hedef basi ayrilan süre dusuk. Hedef sayisini daraltin ya da haftalık tekrar yogunlugunu artirin."
        : "Ilerleme korunuyorsa hedefleri daha net bloklara ayirarak ayni süreyle devam edebilirsiniz.";
    coachingNote =
      "Dusuk yogunlukta her seans için tek olculebilir davranis secmek verimi artirir.";
  } else if (densityLabel === "intense") {
    recommendation =
      input.averageProgressPercent > 70
        ? "Yogunluk yuksek. Tamamlanmaya yakin hedefleri kapatip yeni hedefleri kademeli acabilirsiniz."
        : "Süre yuksek ama ilerleme beklenen seviyede değil. Uygulama yöntemini ve genelleme basamaklarini gozden gecirin.";
    coachingNote =
      "Yuksek yogunlukta kısa mola, duyusal düzenleme ve aileye sade takip görevi eklemek yorulmayi azaltir.";
  }

  return {
    weeklyMinutes,
    activeGoalCount,
    minutesPerActiveGoal,
    densityLabel,
    recommendation,
    coachingNote,
  };
}

export function buildStrategyDeck(
  student: ToolStudent | null,
  document?: ToolDocument | null,
): StrategyDeck {
  if (!student) {
    return {
      environment: [],
      communication: [],
      regulation: [],
      materials: [],
    };
  }

  const topGoal = document?.goals[0] ?? null;

  return {
    environment: limitUnique(
      [
        ...splitIdeas(document?.learningEnvironmentText, 2),
        ...splitIdeas(document?.physicalEnvironmentText, 2),
        student.classroom ? `${student.classroom} içinde dikkat dagitici uyaranlari azaltin.` : "",
      ],
      3,
    ),
    communication: limitUnique(
      [
        topGoal ? `${topGoal.learningOutcome} hedefine yonelik kısa ve tek asamali yonergeler kurun.` : "",
        cleanText(topGoal?.methodTechnique)
          ? `Iletişimde seçili yöntemi sabit kullanin: ${cleanText(topGoal?.methodTechnique)}`
          : "",
        ...splitIdeas(document?.socialInteractionText, 2),
      ],
      3,
    ),
    regulation: limitUnique(
      [
        ...splitIdeas(student.behaviorNotes, 2),
        cleanText(student.currentSupport)
          ? `Mevcut destek rutini bozulmadan gecis sinyalleri kullanin.`
          : "",
        document?.goals.some((goal) => goal.latestStatus === "needs_support")
          ? "Destek gereken hedefler için daha sik pekiştireç ve daha kısa uygulama dongusu planlayin."
          : "",
      ],
      3,
    ),
    materials: limitUnique(
      [
        cleanText(student.supportMaterials)
          ? `Hazir materyaller: ${cleanText(student.supportMaterials)}`
          : "",
        cleanText(topGoal?.materials) ? `Hedef materyali: ${cleanText(topGoal?.materials)}` : "",
        cleanText(document?.digitalSupportsText)
          ? `Dijital destekleri 5-10 dakikalik bloklar halinde sunun.`
          : "",
      ],
      3,
    ),
  };
}

export function summarizeAbcEntries(entries: AbcEntryInput[]): AbcInsight {
  if (entries.length === 0) {
    return {
      topAntecedents: [],
      topConsequences: [],
      topSettings: [],
      summary: "Kayıt eklendiginde tekrar eden tetikleyici ve sonuc kaliplari burada ozetlenir.",
      nextSteps: [],
    };
  }

  const topAntecedents = frequencyList(entries.map((entry) => entry.antecedent));
  const topConsequences = frequencyList(entries.map((entry) => entry.consequence));
  const topSettings = frequencyList(entries.map((entry) => entry.setting));

  const summary = [
    topAntecedents[0] ? `En sik oncul: ${topAntecedents[0]}.` : "",
    topSettings[0] ? `En sik ortam: ${topSettings[0]}.` : "",
    topConsequences[0] ? `En sik sonuc: ${topConsequences[0]}.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  const nextSteps = limitUnique(
    [
      topAntecedents[0] ? `Oncul durum için gorsel uyari veya once-sonra yapisi ekleyin: ${topAntecedents[0]}` : "",
      topSettings[0] ? `Bu ortama özel destek materyali hazirlayin: ${topSettings[0]}` : "",
      topConsequences[0] ? `Sonucu istemeden pekistirip pekistirmedigini ekipce gozden gecirin: ${topConsequences[0]}` : "",
    ],
    3,
  );

  return {
    topAntecedents,
    topConsequences,
    topSettings,
    summary,
    nextSteps,
  };
}

export function buildNarrativeGeneratorOutput(
  input: NarrativeGeneratorInput,
): NarrativeGeneratorOutput {
  const cleanedSteps = input.steps.map((step) => cleanText(step)).filter(Boolean);

  if (input.mode === "task_analysis") {
    return {
      title: input.title || "Görev Analizi",
      intro: `${input.studentName} için ${input.context} baglaminda görev adimlari netlestirildi.`,
      body:
        cleanedSteps.length > 0
          ? cleanedSteps.map((step, index) => `${index + 1}. ${step}`)
          : [
              "1. Görevi baslatmadan once materyalleri hazirla.",
              "2. Beklenen davranisi modelle.",
              "3. Adimlari sırayla tamamla ve kısa geribildirim ver.",
            ],
      closing: input.supportCue
        ? `Destek ipucu: ${input.supportCue}`
        : "Destek ipucu: Her adimdan sonra kısa ve net pekiştireç sun.",
    };
  }

  return {
    title: input.title || "Sosyal Oyku",
    intro: `Ben ${input.studentName}. ${input.context} oldugunda ne yapacagimi ogreniyorum.`,
    body: [
      `${input.expectedBehavior || "Bu durumda sakin kalip yonergeyi takip etmeye calisirim."}`,
      input.supportCue
        ? `Bunu yaparken bana su ipucu yardim eder: ${input.supportCue}.`
        : "Bunu yaparken ogretmenimin kısa ve net ipuclari bana yardim eder.",
      ...(cleanedSteps.length > 0
        ? cleanedSteps.map((step) => `Sonraki adimim: ${step}.`)
        : ["Sonraki adimim once durmak, sonra dinlemek ve uygun davranisi denemektir."]),
    ],
    closing: "Denedikce daha guvende hissederim ve basarabildigimi gorurum.",
  };
}
