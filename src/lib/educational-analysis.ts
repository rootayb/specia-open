import type { GoalProgressStatus, LearningPhase } from "@/lib/prisma-shim";

import type {
  EducationalProgressEntryRecord,
  EducationalProgressGoalRecord,
} from "@/lib/data";
import {
  LEARNING_PHASES,
  LEARNING_PHASE_META,
  getNextLearningPhase,
} from "@/lib/learning-phases";

/* ─── Sabitler ───────────────────────────────────────────────── */

/** Bir hedefin "ulaşıldı" sayıldığı varsayılan başarı eşiği (%). */
export const GOAL_TARGET_PERFORMANCE = 80;

/**
 * İlk ve son kayıt arasında bir eğilim sayılması için gereken minimum
 * yüzdelik fark. Bunun altındaki değişimler "durağan" kabul edilir.
 */
const TREND_THRESHOLD = 5;

/**
 * Nitel (durum) verisini sayısal ilerleme değerine çeviren eşleme.
 * Yalnızca yüzdelik değer girilmemiş kayıtlar için yedek olarak kullanılır.
 */
const QUALITATIVE_PERFORMANCE: Record<string, number> = {
  not_started: 0,
  needs_support: 25,
  in_progress: 50,
  completed: 100,
};

/* ─── Tipler ─────────────────────────────────────────────────── */

export type GoalTrend = "increasing" | "decreasing" | "stable" | "insufficient_data";

export type GoalAnalysisDataPoint = {
  /** ISO tarih (measuredAt). */
  date: string;
  /** 0-100 aralığında hesaplanmış performans değeri. */
  value: number;
  /** Grafik etiketi, örn. "3. Kayıt". */
  label: string;
  status: GoalProgressStatus;
  /** Kaydın alındığı öğrenme aşaması. */
  phase: LearningPhase;
  note: string;
};

export type PhaseStat = {
  phase: LearningPhase;
  recordCount: number;
  latestValue: number | null;
  latestDate: string | null;
  trend: GoalTrend;
  /** Aşamadaki son kayıt hedef eşiğinin üzerinde mi? */
  meetsTarget: boolean;
  dataPoints: GoalAnalysisDataPoint[];
};

export type PhaseSuggestion = {
  currentPhase: LearningPhase;
  suggestedPhase: LearningPhase | null;
  message: string;
};

/* ─── Aşama analizi ──────────────────────────────────────────── */

/**
 * Bir aşamadan bir sonrakine geçiş önerisi için gereken ardışık
 * hedef-üstü kayıt sayısı (özel eğitimde yaygın "3 ardışık oturum" ölçütü).
 */
export const PHASE_ADVANCE_STREAK = 3;

/** Veri noktalarını öğretim sırasına göre aşama bazlı serilere ayırır. */
export function groupByPhase(
  dataPoints: GoalAnalysisDataPoint[],
): Map<LearningPhase, GoalAnalysisDataPoint[]> {
  const groups = new Map<LearningPhase, GoalAnalysisDataPoint[]>();
  for (const phase of LEARNING_PHASES) {
    groups.set(phase, []);
  }
  for (const point of dataPoints) {
    groups.get(point.phase)?.push(point);
  }
  return groups;
}

/** Her aşama için kayıt sayısı, son değer ve eğilim üretir (öğretim sırasıyla). */
export function buildPhaseStats(dataPoints: GoalAnalysisDataPoint[]): PhaseStat[] {
  const groups = groupByPhase(dataPoints);

  return LEARNING_PHASES.map((phase) => {
    const points = groups.get(phase) ?? [];
    const values = points.map((point) => point.value);
    const latest = points[points.length - 1] ?? null;

    return {
      phase,
      recordCount: points.length,
      latestValue: latest?.value ?? null,
      latestDate: latest?.date ?? null,
      trend: computeTrend(values),
      meetsTarget: (latest?.value ?? 0) >= GOAL_TARGET_PERFORMANCE,
      dataPoints: points,
    };
  });
}

/** Sondan başlayarak kaç kaydın hedef eşiğinde/üzerinde olduğunu sayar. */
function countTrailingAtTarget(values: number[]): number {
  let count = 0;
  for (let i = values.length - 1; i >= 0; i -= 1) {
    if (values[i] >= GOAL_TARGET_PERFORMANCE) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

/**
 * Son kaydın aşamasına göre aşama geçiş önerisi üretir:
 * mevcut aşamada art arda PHASE_ADVANCE_STREAK kayıt hedefe ulaştıysa
 * bir sonraki aşama önerilir; genellemede ise hedefin genellendiği belirtilir.
 * Kayıt yoksa null döner.
 */
export function suggestNextPhase(dataPoints: GoalAnalysisDataPoint[]): PhaseSuggestion | null {
  const latest = dataPoints[dataPoints.length - 1];
  if (!latest) {
    return null;
  }

  const currentPhase = latest.phase;
  const phasePoints = dataPoints.filter((point) => point.phase === currentPhase);
  const streak = countTrailingAtTarget(phasePoints.map((point) => point.value));
  const currentLabel = LEARNING_PHASE_META[currentPhase].label.toLocaleLowerCase("tr-TR");

  if (streak >= PHASE_ADVANCE_STREAK) {
    const nextPhase = getNextLearningPhase(currentPhase);
    if (!nextPhase) {
      return {
        currentPhase,
        suggestedPhase: null,
        message: `Genelleme aşamasında son ${streak} kayıt hedefin üzerinde; beceri farklı ortamlara genellenmiş görünüyor.`,
      };
    }

    return {
      currentPhase,
      suggestedPhase: nextPhase,
      message: `${LEARNING_PHASE_META[currentPhase].label} aşamasında son ${streak} kayıt %${GOAL_TARGET_PERFORMANCE} hedefine ulaştı; ${LEARNING_PHASE_META[nextPhase].label.toLocaleLowerCase("tr-TR")} çalışmasına geçilebilir.`,
    };
  }

  const remaining = PHASE_ADVANCE_STREAK - streak;
  return {
    currentPhase,
    suggestedPhase: null,
    message:
      streak > 0
        ? `Aşama geçişi için ${currentLabel} aşamasında hedef üzerinde ${remaining} ardışık kayıt daha gerekiyor.`
        : `Çalışma ${currentLabel} aşamasında sürüyor; aşama geçişi için ${PHASE_ADVANCE_STREAK} ardışık hedef-üstü kayıt gerekiyor.`,
  };
}

export type GoalAnalysis = {
  goalId: string;
  goalTitle: string;
  course: string;
  learningArea: string;
  /** Hedeflenen kazanım / ölçüt. */
  targetOutcome: string;
  /** İlk ilerleme kaydının tarihi (yoksa yedek başlangıç tarihi). */
  startDate: string | null;
  latestRecordDate: string | null;
  currentPerformance: number;
  targetPerformance: number;
  status: GoalProgressStatus;
  /** Son kaydın öğrenme aşaması (kayıt yoksa edinim). */
  currentPhase: LearningPhase;
  trend: GoalTrend;
  summary: string;
  recordCount: number;
  dataPoints: GoalAnalysisDataPoint[];
  phaseStats: PhaseStat[];
  phaseSuggestion: PhaseSuggestion | null;
};

/* ─── Performans hesabı ──────────────────────────────────────── */

function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Beceri basamaklarına göre tutulan kayıtlar için başarı yüzdesi:
 * bağımsız gerçekleşen basamak / toplam basamak * 100.
 * Öğretmen bu değeri girdiğinde `progressPercent` alanında saklanır;
 * fonksiyon hesaplamayı doğrulanabilir ve test edilebilir kılar.
 */
export function computeStepPerformance(independentSteps: number, totalSteps: number): number {
  if (!Number.isFinite(totalSteps) || totalSteps <= 0) {
    return 0;
  }
  const independent = Number.isFinite(independentSteps) ? Math.max(0, independentSteps) : 0;
  return clampPercent((Math.min(independent, totalSteps) / totalSteps) * 100);
}

/**
 * Bir ilerleme kaydından 0-100 performans değeri üretir.
 * - Yüzdelik değer (`progressPercent`) varsa doğrudan kullanılır.
 * - Yüzdelik 0 ama durum ilerleme içeriyorsa nitel değer sayısala çevrilir.
 * - Hesaplanamayan kayıtlar için `null` döner (grafikte atlanır).
 */
export function computePerformanceValue(
  entry: { progressPercent: number; status: string },
): number | null {
  const percent = entry.progressPercent;

  if (typeof percent === "number" && Number.isFinite(percent) && percent > 0) {
    return clampPercent(percent);
  }

  // Yüzdelik girilmemiş (0) ancak durum ilerlemeyi ima ediyorsa nitel değere düş.
  if (percent === 0 && entry.status && entry.status !== "not_started") {
    return QUALITATIVE_PERFORMANCE[entry.status];
  }

  if (typeof percent === "number" && Number.isFinite(percent)) {
    return clampPercent(percent);
  }

  return null;
}

/* ─── Trend hesabı ───────────────────────────────────────────── */

/**
 * Kayıt değerlerine (eskiden yeniye sıralı) göre gelişim eğilimi:
 * son değer ilkinden anlamlı yüksekse artıyor, düşükse düşüyor,
 * fark eşiğin altındaysa sabit, iki kayıttan azsa yetersiz.
 */
export function computeTrend(values: number[]): GoalTrend {
  if (values.length < 2) {
    return "insufficient_data";
  }

  const first = values[0];
  const last = values[values.length - 1];
  const diff = last - first;

  if (diff >= TREND_THRESHOLD) return "increasing";
  if (diff <= -TREND_THRESHOLD) return "decreasing";
  return "stable";
}

/** Diziyi sondan başlayarak kaç kayıt üst üste artmış sayar. */
function countTrailingIncreases(values: number[]): number {
  let count = 0;
  for (let i = values.length - 1; i > 0; i -= 1) {
    if (values[i] > values[i - 1]) {
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

/* ─── Otomatik yorum ─────────────────────────────────────────── */

/**
 * Veri noktalarından kullanıcıya görünür, teknik bilgi gerektirmeyen
 * tek cümlelik otomatik gelişim yorumu üretir.
 */
export function buildGoalSummary(values: number[], trend: GoalTrend): string {
  if (values.length === 0) {
    return "Henüz ilerleme kaydı eklenmemiştir.";
  }

  if (values.length === 1) {
    return `İlk kayıt %${values[0]} olarak alınmıştır; eğilim için daha fazla kayıt gereklidir.`;
  }

  const current = values[values.length - 1];
  const previous = values[values.length - 2];

  if (current >= GOAL_TARGET_PERFORMANCE) {
    return `Hedefe ulaşma oranı %${GOAL_TARGET_PERFORMANCE}'in üzerindedir (son kayıt %${current}).`;
  }

  if (current < previous) {
    return "Performans son kayıtta düşüş göstermiştir, öğretim yöntemi gözden geçirilebilir.";
  }

  const trailingIncreases = countTrailingIncreases(values);
  if (trend === "increasing" && trailingIncreases >= 2) {
    return `Öğrenci son ${trailingIncreases + 1} kayıtta düzenli ilerleme göstermiştir.`;
  }

  if (trend === "increasing") {
    return "Öğrenci genel olarak ilerleme göstermektedir.";
  }

  if (trend === "decreasing") {
    return "Genel eğilim düşüş yönündedir, öğretim yöntemi gözden geçirilebilir.";
  }

  return "Son kayıtlar arasında anlamlı bir değişim görülmemektedir.";
}

/* ─── Hedef analizi ──────────────────────────────────────────── */

/**
 * Tek bir BEP hedefinin ilerleme geçmişini, grafik ve karta hazır
 * analiz nesnesine dönüştürür. Geçmiş, en yeni kayıt başta gelecek
 * şekilde (DESC) beklenir.
 */
export function buildGoalAnalysis(
  goal: EducationalProgressGoalRecord,
  options?: { startDateFallback?: string | null },
): GoalAnalysis {
  // Geçmişi eskiden yeniye sırala ve hesaplanabilir kayıtları al.
  const ascending = goal.history
    .slice()
    .sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime());

  const dataPoints: GoalAnalysisDataPoint[] = [];
  ascending.forEach((entry) => {
    const value = computePerformanceValue(entry);
    if (value === null) {
      return;
    }
    dataPoints.push({
      date: entry.measuredAt,
      value,
      label: `${dataPoints.length + 1}. Kayıt`,
      status: entry.status,
      phase: entry.phase,
      note: entry.note,
    });
  });

  const values = dataPoints.map((point) => point.value);
  const trend = computeTrend(values);
  const latestPoint = dataPoints[dataPoints.length - 1] ?? null;
  const firstPoint = dataPoints[0] ?? null;

  const goalTitle = goal.learningOutcome?.trim() || `${goal.courseName} / ${goal.learningArea}`;

  return {
    goalId: goal.id,
    goalTitle,
    course: goal.courseName,
    learningArea: goal.learningArea,
    targetOutcome: goal.criterion?.trim() || goal.learningOutcome?.trim() || "",
    startDate: firstPoint?.date ?? options?.startDateFallback ?? null,
    latestRecordDate: latestPoint?.date ?? null,
    currentPerformance: latestPoint?.value ?? 0,
    targetPerformance: GOAL_TARGET_PERFORMANCE,
    status: goal.latestEntry?.status ?? "not_started",
    currentPhase: latestPoint?.phase ?? "acquisition",
    trend,
    summary: buildGoalSummary(values, trend),
    recordCount: dataPoints.length,
    dataPoints,
    phaseStats: buildPhaseStats(dataPoints),
    phaseSuggestion: suggestNextPhase(dataPoints),
  };
}
