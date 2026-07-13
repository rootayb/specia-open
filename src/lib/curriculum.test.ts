import { describe, expect, it } from "vitest";

import {
  buildFallbackSuggestion,
  buildPlanRowDefaults,
  getCourseById,
  listCurriculumCourses,
} from "@/lib/curriculum";

describe("curriculum helpers", () => {
  it("lists courses and loads Turkish catalog content from section-based data", () => {
    const courses = listCurriculumCourses();
    const turkish = getCourseById("turkce");
    const music = getCourseById("muzik");
    const math = getCourseById("matematik");

    expect(courses.length).toBe(11);
    expect(turkish?.hasCatalogContent).toBe(true);
    expect(turkish?.themes.length).toBeGreaterThan(0);
    expect(turkish?.themes.some((theme) => theme.outcomes.length > 0)).toBe(true);
    expect(music?.hasCatalogContent).toBe(true);
    expect(math?.themes[0]?.tendencies.length).toBeGreaterThan(0);
  });

  it("builds sensible default plan row values from tendency overrides", () => {
    const defaults = buildPlanRowDefaults({
      courseName: "Matematik",
      learningArea: "Sayılar ve Nicelikler (1)",
      learningOutcome: "20'ye kadar sayabilme",
      processComponents: ["Nesneleri sayar."],
      tendencies: ["Merak", "Odaklanma"],
    });

    expect(defaults.criterion).toBe("4/5 (%80)");
    expect(defaults.materials).toBe("");
    expect(defaults.methodTechnique).toBe("");
    expect(defaults.tendencies).toContain("E1.1 Merak");
    expect(defaults.tendencies).toContain("E1.2 Bağımsızlık");
    expect(defaults.tendencies).not.toContain("E3.2 Odaklanma");
    expect(defaults.processComponents).toEqual(["Nesneleri sayar."]);
  });

  it("matches section-based Turkish theme names by trailing theme label", () => {
    const defaults = buildPlanRowDefaults({
      courseName: "Türkçe",
      learningArea: "İlk Okuma Yazmaya Hazırlık / Merak Ediyorum",
      learningOutcome: "Hazırlık becerisi",
      processComponents: [],
      tendencies: [],
    });

    expect(defaults.tendencies).toBe("E1.1 Merak; E2.1 Empati; E2.3 Girişkenlik");
  });

  it("returns fallback text for free-text fields", () => {
    const suggestion = buildFallbackSuggestion("generalEvaluation");
    expect(suggestion.length).toBeGreaterThan(20);
  });
});
