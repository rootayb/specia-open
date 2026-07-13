import { describe, expect, it } from "vitest";

import {
  analyzeSessionIntensity,
  buildGoalBreakdown,
  buildStrategyDeck,
  buildSupportProfile,
  getDocumentProgressSnapshot,
  summarizeAbcEntries,
  type ToolDocument,
  type ToolStudent,
} from "@/lib/special-education-tools";

const sampleDocument: ToolDocument = {
  id: "doc-1",
  title: "BEP Bahar Donemi",
  updatedAt: "2026-03-19T09:00:00.000Z",
  startDate: "2026-03-01T00:00:00.000Z",
  endDate: "2026-06-01T00:00:00.000Z",
  learningEnvironmentText: "Dikkati dagitan uyaranlar azaltildi. Kısa gecisler planlandi.",
  physicalEnvironmentText: "On sırada ve materyale yakin konumlandirma.",
  socialInteractionText: "Akran modeli ile esli calisma.",
  digitalSupportsText: "Kısa video ve gorsel siralama kartlari.",
  generalEvaluation: "Aileye haftalık tekrar notu paylasiliyor.",
  goals: [
    {
      id: "goal-1",
      sortOrder: 0,
      courseName: "Turkce",
      learningArea: "Dinleme",
      learningOutcome: "Iki asamali yonergeyi takip eder.",
      processComponents: ["Yoneirgeyi dinler.", "Ilk adimi uygular.", "Ikinci adimi tamamlar."],
      criterion: "4/5 dogru uygulama",
      methodTechnique: "Model olma ve ipucu azaltma",
      materials: "Gorsel siralama kartlari",
      evaluationMethods: "Gozlem formu",
      latestProgressPercent: 55,
      latestStatus: "in_progress",
    },
    {
      id: "goal-2",
      sortOrder: 1,
      courseName: "Matematik",
      learningArea: "Sayilar",
      learningOutcome: "10'a kadar ritmik sayar.",
      processComponents: [],
      criterion: null,
      methodTechnique: null,
      materials: null,
      evaluationMethods: null,
      latestProgressPercent: 20,
      latestStatus: "needs_support",
    },
  ],
};

const sampleStudent: ToolStudent = {
  id: "student-1",
  firstName: "Mert",
  lastName: "Aydin",
  schoolName: "Specia Ilkokulu",
  classroom: "2-A",
  diagnosis: "Dikkat ve iletişim destegi gerekiyor",
  strengths: "Gorsel ipuclarini hızlı takip eder. Akran modeli ile katilim artar.",
  improvementAreas: "Iki asamali yonergelerde sureklilik. Bagimsiz tamamlama.",
  behaviorNotes: "Gecislerde zorlanma, uzun etkinlikte dagilma.",
  currentSupport: "Haftada 2 bireysel seans ve evde 10 dakikalik tekrar",
  supportMaterials: "Gorsel program, zamanlayici, pekiştireç karti",
  educationAdjustments: "Kısa yonerge, oturum basi tekrar, somut materyal kullanimi",
  developmentHistory: "Dil gelişimi destek programi geçmişi var.",
  reinforcers: [],
  sensoryMenuItems: [],
  dailyDataEntries: [],
  documents: [sampleDocument],
};

describe("special education tools helpers", () => {
  it("summarizes progress snapshot from linked goals", () => {
    const snapshot = getDocumentProgressSnapshot(sampleDocument);

    expect(snapshot.goalCount).toBe(2);
    expect(snapshot.completedGoalCount).toBe(0);
    expect(snapshot.averageProgressPercent).toBe(38);
  });

  it("builds a support profile from student and document context", () => {
    const profile = buildSupportProfile(sampleStudent, sampleDocument);

    expect(profile.headline).toContain("Mert Aydin");
    expect(profile.strengths.length).toBeGreaterThan(0);
    expect(profile.focusAreas.some((item) => item.includes("Iki asamali"))).toBe(true);
    expect(profile.classAdjustments.length).toBeGreaterThan(0);
    expect(profile.familyActions.length).toBeGreaterThan(0);
    expect(profile.riskTone).toBe("priority");
  });

  it("turns a goal into session-ready micro steps", () => {
    const breakdown = buildGoalBreakdown(sampleDocument.goals[0]);

    expect(breakdown.title).toContain("Turkce");
    expect(breakdown.stepLabel).toContain("Iki asamali");
    expect(breakdown.sessionFocus.some((item) => item.includes("Modelle"))).toBe(true);
    expect(breakdown.measurementPlan.some((item) => item.includes("Basari olcutu"))).toBe(true);
  });

  it("flags low session density when active goals exceed available minutes", () => {
    const analysis = analyzeSessionIntensity({
      weeklySessionCount: 1,
      durationMinutes: 30,
      goalCount: 4,
      completedGoalCount: 0,
      averageProgressPercent: 20,
      homeSupportLevel: "low",
    });

    expect(analysis.weeklyMinutes).toBe(30);
    expect(analysis.activeGoalCount).toBe(4);
    expect(analysis.densityLabel).toBe("low");
    expect(analysis.recommendation).toContain("Hedef");
  });

  it("builds adaptation suggestions by category", () => {
    const deck = buildStrategyDeck(sampleStudent, sampleDocument);

    expect(deck.environment.length).toBeGreaterThan(0);
    expect(deck.communication.length).toBeGreaterThan(0);
    expect(deck.regulation.length).toBeGreaterThan(0);
    expect(deck.materials.some((item) => item.includes("Gorsel"))).toBe(true);
  });

  it("summarizes repeated abc patterns into actionable insights", () => {
    const insight = summarizeAbcEntries([
      {
        antecedent: "Bekleme",
        behavior: "Masadan kalkma",
        consequence: "Mola verildi",
        setting: "Sınıf",
      },
      {
        antecedent: "Bekleme",
        behavior: "Bagirma",
        consequence: "Mola verildi",
        setting: "Sınıf",
      },
      {
        antecedent: "Zor görev",
        behavior: "Kacma",
        consequence: "Görev ertelendi",
        setting: "Bireysel oda",
      },
    ]);

    expect(insight.topAntecedents[0]).toBe("Bekleme");
    expect(insight.topConsequences[0]).toBe("Mola verildi");
    expect(insight.topSettings[0]).toBe("Sınıf");
    expect(insight.nextSteps.length).toBeGreaterThan(0);
  });
});
