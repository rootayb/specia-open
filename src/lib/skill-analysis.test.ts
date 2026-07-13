import { describe, expect, it } from "vitest";

import {
  computeSkillSummary,
  getSkillMark,
  parseSkillAnalysisData,
  type SkillAnalysisData,
} from "@/lib/skill-analysis";

function buildData(overrides: Partial<SkillAnalysisData> = {}): SkillAnalysisData {
  return {
    observer: "",
    targetSkill: "",
    phase: "",
    analysis: "",
    steps: [],
    sessions: [],
    marks: {},
    ...overrides,
  };
}

describe("parseSkillAnalysisData", () => {
  it("boş/geçersiz girdide güvenli varsayılan döndürür", () => {
    const parsed = parseSkillAnalysisData(null);
    expect(parsed.steps).toEqual([]);
    expect(parsed.sessions).toEqual([]);
    expect(parsed.marks).toEqual({});
  });

  it("geçersiz işaret değerlerini ayıklar, geçerlileri korur", () => {
    const parsed = parseSkillAnalysisData({
      steps: [{ id: "s1", text: "Musluğu açar" }],
      sessions: [{ id: "o1", date: "2019-09-30" }],
      marks: { s1: { o1: "B", o2: "X" } },
    });
    expect(parsed.steps).toHaveLength(1);
    expect(getSkillMark(parsed, "s1", "o1")).toBe("B");
    expect(getSkillMark(parsed, "s1", "o2")).toBe("");
  });
});

describe("computeSkillSummary", () => {
  it("oturumdaki bağımsız (B) basamak sayısını ve yüzdesini hesaplar", () => {
    const data = buildData({
      steps: [
        { id: "s1", text: "1" },
        { id: "s2", text: "2" },
        { id: "s3", text: "3" },
        { id: "s4", text: "4" },
        { id: "s5", text: "5" },
        { id: "s6", text: "6" },
        { id: "s7", text: "7" },
        { id: "s8", text: "8" },
      ],
      sessions: [{ id: "o1", date: "2019-09-30" }],
      marks: {
        s1: { o1: "B" },
        s2: { o1: "B" },
        s3: { o1: "B" },
        s4: { o1: "B" },
        s5: { o1: "B" },
        s6: { o1: "B" },
        s7: { o1: "I" },
        s8: { o1: "H" },
      },
    });

    const [summary] = computeSkillSummary(data);
    // 8 basamağın 6'sı B → 6 / 8 = %75
    expect(summary.count).toBe(6);
    expect(summary.percent).toBe(75);
  });

  it("basamak yokken yüzdeyi 0 döndürür (sıfıra bölme yok)", () => {
    const data = buildData({ sessions: [{ id: "o1", date: "" }] });
    expect(computeSkillSummary(data)[0]).toEqual({ sessionId: "o1", count: 0, percent: 0 });
  });

  it("yalnızca B değerlerini sayar, diğer işaretleri saymaz", () => {
    const data = buildData({
      steps: [
        { id: "s1", text: "1" },
        { id: "s2", text: "2" },
      ],
      sessions: [
        { id: "o1", date: "" },
        { id: "o2", date: "" },
      ],
      marks: {
        s1: { o1: "B", o2: "I" },
        s2: { o1: "H", o2: "B" },
      },
    });

    const summary = computeSkillSummary(data);
    expect(summary[0]).toMatchObject({ count: 1, percent: 50 });
    expect(summary[1]).toMatchObject({ count: 1, percent: 50 });
  });
});
