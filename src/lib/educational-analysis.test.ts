import { describe, expect, it } from "vitest";

import type {
  EducationalProgressEntryRecord,
  EducationalProgressGoalRecord,
} from "@/lib/data";
import {
  buildGoalAnalysis,
  buildGoalSummary,
  buildPhaseStats,
  computePerformanceValue,
  computeStepPerformance,
  computeTrend,
  groupByPhase,
  suggestNextPhase,
  GOAL_TARGET_PERFORMANCE,
  type GoalAnalysisDataPoint,
} from "@/lib/educational-analysis";
import type { GoalProgressStatus, LearningPhase } from "@/lib/prisma-shim";

function entry(
  partial: Partial<EducationalProgressEntryRecord> & { measuredAt: string },
): EducationalProgressEntryRecord {
  return {
    id: `e-${partial.measuredAt}`,
    status: "in_progress",
    phase: "acquisition",
    progressPercent: 0,
    note: "",
    nextStep: "",
    updatedAt: partial.measuredAt,
    createdBy: { id: "u1", name: "Öğretmen", email: "t@example.com" },
    ...partial,
  };
}

function point(
  value: number,
  phase: LearningPhase,
  index: number,
): GoalAnalysisDataPoint {
  return {
    date: `2026-06-${`${index + 1}`.padStart(2, "0")}`,
    value,
    label: `${index + 1}. Kayıt`,
    status: "in_progress",
    phase,
    note: "",
  };
}

function points(values: Array<[number, LearningPhase]>): GoalAnalysisDataPoint[] {
  return values.map(([value, phase], index) => point(value, phase, index));
}

function goal(history: EducationalProgressEntryRecord[]): EducationalProgressGoalRecord {
  const latest = history[0] ?? null;
  return {
    id: "g1",
    sortOrder: 0,
    courseName: "Matematik",
    learningArea: "Sayılar",
    learningOutcome: "Öğrenci iki basamaklı sayıları toplar.",
    processComponents: [],
    criterion: "%80 başarı",
    methodTechnique: "",
    materials: "",
    tendencies: "",
    evaluationMethods: "",
    latestEntry: latest,
    history,
  };
}

describe("computeStepPerformance", () => {
  it("computes independent/total ratio as percent", () => {
    expect(computeStepPerformance(3, 4)).toBe(75);
    expect(computeStepPerformance(0, 5)).toBe(0);
    expect(computeStepPerformance(5, 5)).toBe(100);
  });

  it("guards against invalid totals and overshoot", () => {
    expect(computeStepPerformance(2, 0)).toBe(0);
    expect(computeStepPerformance(10, 4)).toBe(100);
  });
});

describe("computePerformanceValue", () => {
  it("uses the percent value directly when present", () => {
    expect(computePerformanceValue({ progressPercent: 65, status: "in_progress" })).toBe(65);
  });

  it("falls back to qualitative mapping when percent is zero but status implies progress", () => {
    expect(computePerformanceValue({ progressPercent: 0, status: "completed" })).toBe(100);
    expect(computePerformanceValue({ progressPercent: 0, status: "needs_support" })).toBe(25);
  });

  it("keeps a genuine zero for not_started", () => {
    expect(computePerformanceValue({ progressPercent: 0, status: "not_started" })).toBe(0);
  });

  it("returns null for uncomputable records", () => {
    expect(
      computePerformanceValue({ progressPercent: Number.NaN, status: "in_progress" }),
    ).toBeNull();
  });
});

describe("computeTrend", () => {
  it("flags insufficient data with fewer than two records", () => {
    expect(computeTrend([])).toBe("insufficient_data");
    expect(computeTrend([40])).toBe("insufficient_data");
  });

  it("detects increasing, decreasing and stable", () => {
    expect(computeTrend([40, 55, 75])).toBe("increasing");
    expect(computeTrend([80, 60, 40])).toBe("decreasing");
    expect(computeTrend([50, 52, 51])).toBe("stable");
  });
});

describe("buildGoalSummary", () => {
  it("reports steady progress over the last records", () => {
    expect(buildGoalSummary([40, 55, 70], "increasing")).toContain("düzenli ilerleme");
  });

  it("warns on a drop in the last record", () => {
    expect(buildGoalSummary([70, 75, 60], "stable")).toContain("düşüş");
  });

  it("highlights reaching the target threshold", () => {
    expect(buildGoalSummary([60, 90], "increasing")).toContain(`%${GOAL_TARGET_PERFORMANCE}`);
  });

  it("notes stability when there is no meaningful change", () => {
    expect(buildGoalSummary([50, 50, 50], "stable")).toContain("anlamlı bir değişim");
  });
});

describe("buildGoalAnalysis", () => {
  it("builds ordered data points, trend and current performance from history", () => {
    const history = [
      entry({ measuredAt: "2026-06-15", progressPercent: 75, status: "in_progress" }),
      entry({ measuredAt: "2026-06-08", progressPercent: 55, status: "in_progress" }),
      entry({ measuredAt: "2026-06-01", progressPercent: 40, status: "in_progress" }),
    ];

    const analysis = buildGoalAnalysis(goal(history));

    expect(analysis.dataPoints.map((p) => p.value)).toEqual([40, 55, 75]);
    expect(analysis.dataPoints.map((p) => p.label)).toEqual(["1. Kayıt", "2. Kayıt", "3. Kayıt"]);
    expect(analysis.startDate).toBe("2026-06-01");
    expect(analysis.latestRecordDate).toBe("2026-06-15");
    expect(analysis.currentPerformance).toBe(75);
    expect(analysis.trend).toBe("increasing");
    expect(analysis.recordCount).toBe(3);
  });

  it("handles empty history without breaking", () => {
    const analysis = buildGoalAnalysis(goal([]), { startDateFallback: "2026-05-01" });

    expect(analysis.dataPoints).toHaveLength(0);
    expect(analysis.trend).toBe("insufficient_data");
    expect(analysis.currentPerformance).toBe(0);
    expect(analysis.startDate).toBe("2026-05-01");
    expect(analysis.summary).toContain("Henüz");
  });

  it("converts qualitative-only completed records into numeric points", () => {
    const status: GoalProgressStatus = "completed";
    const history = [entry({ measuredAt: "2026-06-10", progressPercent: 0, status })];

    const analysis = buildGoalAnalysis(goal(history));

    expect(analysis.dataPoints[0].value).toBe(100);
  });

  it("carries the phase into data points and derives the current phase", () => {
    const history = [
      entry({ measuredAt: "2026-06-15", progressPercent: 85, phase: "fluency" }),
      entry({ measuredAt: "2026-06-01", progressPercent: 80, phase: "acquisition" }),
    ];

    const analysis = buildGoalAnalysis(goal(history));

    expect(analysis.dataPoints.map((p) => p.phase)).toEqual(["acquisition", "fluency"]);
    expect(analysis.currentPhase).toBe("fluency");
    expect(analysis.phaseStats).toHaveLength(4);
    expect(analysis.phaseSuggestion).not.toBeNull();
  });
});

describe("groupByPhase", () => {
  it("splits data points into instructional-order phase series", () => {
    const groups = groupByPhase(
      points([
        [40, "acquisition"],
        [60, "acquisition"],
        [85, "fluency"],
      ]),
    );

    expect(groups.get("acquisition")).toHaveLength(2);
    expect(groups.get("fluency")).toHaveLength(1);
    expect(groups.get("maintenance")).toHaveLength(0);
    expect(groups.get("generalization")).toHaveLength(0);
  });
});

describe("buildPhaseStats", () => {
  it("computes per-phase counts, latest values and trends", () => {
    const stats = buildPhaseStats(
      points([
        [40, "acquisition"],
        [60, "acquisition"],
        [82, "acquisition"],
        [70, "fluency"],
      ]),
    );

    const acquisition = stats.find((s) => s.phase === "acquisition");
    const fluency = stats.find((s) => s.phase === "fluency");
    const maintenance = stats.find((s) => s.phase === "maintenance");

    expect(acquisition?.recordCount).toBe(3);
    expect(acquisition?.latestValue).toBe(82);
    expect(acquisition?.trend).toBe("increasing");
    expect(acquisition?.meetsTarget).toBe(true);
    expect(fluency?.recordCount).toBe(1);
    expect(fluency?.meetsTarget).toBe(false);
    expect(maintenance?.latestValue).toBeNull();
    expect(maintenance?.trend).toBe("insufficient_data");
  });
});

describe("suggestNextPhase", () => {
  it("returns null without records", () => {
    expect(suggestNextPhase([])).toBeNull();
  });

  it("suggests the next phase after three consecutive on-target records", () => {
    const suggestion = suggestNextPhase(
      points([
        [80, "acquisition"],
        [85, "acquisition"],
        [90, "acquisition"],
      ]),
    );

    expect(suggestion?.currentPhase).toBe("acquisition");
    expect(suggestion?.suggestedPhase).toBe("fluency");
    expect(suggestion?.message).toContain("akıcılık");
  });

  it("does not suggest a transition while the streak is incomplete", () => {
    const suggestion = suggestNextPhase(
      points([
        [80, "acquisition"],
        [60, "acquisition"],
        [85, "acquisition"],
      ]),
    );

    expect(suggestion?.suggestedPhase).toBeNull();
    expect(suggestion?.message).toContain("ardışık");
  });

  it("only counts the streak within the current phase", () => {
    const suggestion = suggestNextPhase(
      points([
        [85, "acquisition"],
        [90, "acquisition"],
        [88, "fluency"],
      ]),
    );

    expect(suggestion?.currentPhase).toBe("fluency");
    expect(suggestion?.suggestedPhase).toBeNull();
  });

  it("reports generalization success instead of a next phase", () => {
    const suggestion = suggestNextPhase(
      points([
        [82, "generalization"],
        [88, "generalization"],
        [92, "generalization"],
      ]),
    );

    expect(suggestion?.suggestedPhase).toBeNull();
    expect(suggestion?.message).toContain("genellen");
  });
});
