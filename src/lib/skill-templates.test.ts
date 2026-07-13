import { describe, expect, it } from "vitest";

import { parseSkillTemplateSteps } from "@/lib/skill-templates";

describe("parseSkillTemplateSteps", () => {
  it("geçerli string dizisini olduğu gibi döndürür", () => {
    expect(parseSkillTemplateSteps(["Musluğu açar", "Elini ıslatır"])).toEqual([
      "Musluğu açar",
      "Elini ıslatır",
    ]);
  });

  it("dizi olmayan değerlerde boş dizi döndürür", () => {
    expect(parseSkillTemplateSteps(null)).toEqual([]);
    expect(parseSkillTemplateSteps(undefined)).toEqual([]);
    expect(parseSkillTemplateSteps("metin")).toEqual([]);
    expect(parseSkillTemplateSteps({ steps: ["a"] })).toEqual([]);
  });

  it("string olmayan veya boş elemanları ayıklar", () => {
    expect(parseSkillTemplateSteps(["Adım 1", "", "  ", 42, null, "Adım 2"])).toEqual([
      "Adım 1",
      "Adım 2",
    ]);
  });
});
