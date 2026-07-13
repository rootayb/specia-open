import { describe, expect, it } from "vitest";

import {
  FORM_TEMPLATES,
  buildInitialFormValues,
  getFormTemplate,
  sanitizeFormValues,
} from "./forms";

describe("FORM_TEMPLATES kataloğu", () => {
  it("slug'lar benzersizdir", () => {
    const slugs = FORM_TEMPLATES.map((template) => template.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("her şablonda alan kimlikleri benzersizdir", () => {
    for (const template of FORM_TEMPLATES) {
      const fieldIds = template.sections.flatMap((section) =>
        section.fields.map((field) => field.id),
      );
      expect(new Set(fieldIds).size, `${template.slug} şablonunda tekrar eden alan var`).toBe(
        fieldIds.length,
      );
    }
  });

  it("her şablonda en az bir bölüm ve alan vardır", () => {
    for (const template of FORM_TEMPLATES) {
      expect(template.sections.length).toBeGreaterThan(0);
      for (const section of template.sections) {
        expect(section.fields.length, `${template.slug}/${section.id} bölümü boş`).toBeGreaterThan(0);
      }
    }
  });

  it("select ve checklist alanları seçenek içerir", () => {
    for (const template of FORM_TEMPLATES) {
      for (const section of template.sections) {
        for (const field of section.fields) {
          if (field.type === "select" || field.type === "checklist") {
            expect(
              field.options?.length ?? 0,
              `${template.slug}/${field.id} seçenekleri eksik`,
            ).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it("PDF dosya adı için student_name alanı yaygın şablonlarda bulunur", () => {
    const withStudentName = FORM_TEMPLATES.filter((template) =>
      template.sections.some((section) =>
        section.fields.some((field) => field.id === "student_name"),
      ),
    );
    expect(withStudentName.length).toBe(FORM_TEMPLATES.length);
  });
});

describe("getFormTemplate", () => {
  it("bilinen slug için şablonu döndürür", () => {
    expect(getFormTemplate("beceri-gorev-analizi")?.title).toContain("Görev Analizi");
  });

  it("bilinmeyen slug için null döner", () => {
    expect(getFormTemplate("olmayan-form")).toBeNull();
  });
});

describe("buildInitialFormValues", () => {
  it("öğrenci bağlamından varsayılanları doldurur", () => {
    const template = getFormTemplate("egitsel-degerlendirme-istegi")!;
    const values = buildInitialFormValues(template, {
      currentUserName: "Ayşe Yılmaz",
      student: {
        firstName: "Elif",
        lastName: "Kaya",
        guardianName: "Selin Kaya",
        guardianPhone: "5550001122",
        strengths: "Görsel hafızası güçlü",
      },
    });
    expect(values.student_name).toBe("Elif Kaya");
    expect(values.parent_phone).toBe("5550001122");
    expect(values.teacher_signature).toBe("Ayşe Yılmaz");
    expect(values.strengths).toBe("Görsel hafızası güçlü");
  });
});

describe("sanitizeFormValues", () => {
  it("yalnızca şablonda tanımlı string alanları geçirir", () => {
    const template = getFormTemplate("abc-gozlem-kaydi")!;
    const values = sanitizeFormValues(template, {
      record1_antecedent: "Sınıfa girdiğimde.",
      unknown_field: "atlanmalı",
      setting: "Sınıf",
    });
    expect(values.record1_antecedent).toBe("Sınıfa girdiğimde.");
    expect(values.setting).toBe("Sınıf");
    expect("unknown_field" in values).toBe(false);
  });
});
