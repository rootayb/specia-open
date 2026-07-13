import { describe, expect, it } from "vitest";

import { generateSkillFeedback } from "@/lib/skill-feedback";
import type { SkillAnalysisData } from "@/lib/skill-analysis";

function buildData(overrides: Partial<SkillAnalysisData> = {}): SkillAnalysisData {
  return {
    observer: "",
    targetSkill: "El Yıkama",
    phase: "",
    analysis: "",
    steps: [],
    sessions: [],
    marks: {},
    ...overrides,
  };
}

describe("generateSkillFeedback", () => {
  it("basamak veya oturum yoksa yönlendirici uyarı döner", () => {
    expect(generateSkillFeedback(buildData())).toContain("en az bir basamak");
  });

  it("işaretleme yapılmamışsa uyarı döner", () => {
    const data = buildData({
      steps: [{ id: "s1", text: "Musluğu açar" }],
      sessions: [{ id: "o1", date: "2024-01-01" }],
    });
    expect(generateSkillFeedback(data)).toContain("işaretleme yapılmadığından");
  });

  it("düşük bağımsızlık oranında destek vurgulu cümle üretir", () => {
    const data = buildData({
      steps: [
        { id: "s1", text: "Musluğu açar" },
        { id: "s2", text: "Ellerini ıslatır" },
        { id: "s3", text: "Sabunlar" },
        { id: "s4", text: "Durular" },
      ],
      sessions: [{ id: "o1", date: "2024-01-01" }],
      marks: { s1: { o1: "B" }, s2: { o1: "H" }, s3: { o1: "H" }, s4: { o1: "H" } },
    });
    const feedback = generateSkillFeedback(data);
    expect(feedback).toContain("El Yıkama");
    expect(feedback).toContain("%25");
  });

  it("tüm basamaklar bağımsızsa tam bağımsızlık cümlesi üretir", () => {
    const data = buildData({
      steps: [
        { id: "s1", text: "Musluğu açar" },
        { id: "s2", text: "Ellerini ıslatır" },
      ],
      sessions: [{ id: "o1", date: "2024-01-01" }],
      marks: { s1: { o1: "B" }, s2: { o1: "B" } },
    });
    const feedback = generateSkillFeedback(data);
    expect(feedback).toContain("%100");
  });

  it("oturumlar arası artışta gelişim cümlesi ekler", () => {
    const data = buildData({
      steps: [
        { id: "s1", text: "Musluğu açar" },
        { id: "s2", text: "Ellerini ıslatır" },
      ],
      sessions: [
        { id: "o1", date: "2024-01-01" },
        { id: "o2", date: "2024-01-08" },
      ],
      marks: {
        s1: { o1: "H", o2: "B" },
        s2: { o1: "H", o2: "B" },
      },
    });
    const feedback = generateSkillFeedback(data);
    expect(feedback).toMatch(/yükselmiştir|artış/);
  });

  it("tutarlı şekilde hatalı basamağı destek önerisiyle vurgular", () => {
    const data = buildData({
      steps: [
        { id: "s1", text: "Musluğu açar" },
        { id: "s2", text: "Tırnak çevresini ovalar" },
      ],
      sessions: [
        { id: "o1", date: "2024-01-01" },
        { id: "o2", date: "2024-01-08" },
      ],
      marks: {
        s1: { o1: "B", o2: "B" },
        s2: { o1: "H", o2: "H" },
      },
    });
    const feedback = generateSkillFeedback(data);
    expect(feedback).toContain("Tırnak çevresini ovalar");
  });

  it("aynı girdi için her zaman aynı metni üretir (deterministik)", () => {
    const data = buildData({
      steps: [{ id: "s1", text: "Musluğu açar" }],
      sessions: [{ id: "o1", date: "2024-01-01" }],
      marks: { s1: { o1: "B" } },
    });
    expect(generateSkillFeedback(data)).toBe(generateSkillFeedback(data));
  });
});
