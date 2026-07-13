export type RawCurriculumOutcome = {
  outcome_code: string;
  outcome_text: string;
  process_components?: string[];
};

export type RawCurriculumTheme = {
  theme_order?: number;
  theme_name: string;
  tendencies_text?: string;
  tendencies?: Array<{
    code?: string;
    name: string;
  }>;
  outcomes?: RawCurriculumOutcome[];
};

export type RawCurriculumSection = {
  section_name: string;
  themes?: RawCurriculumTheme[];
};

export type RawCurriculumCourse = {
  course_id: string;
  course_name: string;
  applicable_grade_levels?: number[];
  themes?: RawCurriculumTheme[];
  sections?: RawCurriculumSection[];
};

export type RawCurriculumCatalog = {
  curriculum_catalog: {
    courses: RawCurriculumCourse[];
  };
};

export type NormalizedCurriculumOutcome = {
  outcomeCode: string;
  outcomeText: string;
  processComponents: string[];
};

export type NormalizedCurriculumTheme = {
  themeOrder: number;
  themeName: string;
  tendencies: string[];
  outcomes: NormalizedCurriculumOutcome[];
};

export type NormalizedCurriculumCourse = {
  courseId: string;
  courseName: string;
  applicableGradeLevels: number[];
  hasCatalogContent: boolean;
  themes: NormalizedCurriculumTheme[];
};

function buildSectionThemeName(sectionName: string, themeName: string) {
  const normalizedSectionName = sectionName.trim();
  const normalizedThemeName = themeName.trim();

  if (
    normalizedSectionName.localeCompare(normalizedThemeName, "tr-TR", {
      sensitivity: "base",
    }) === 0
  ) {
    return normalizedThemeName;
  }

  return `${normalizedSectionName} / ${normalizedThemeName}`;
}

function normalizeTheme(
  theme: RawCurriculumTheme,
  themeOrder: number,
  sectionName?: string,
): NormalizedCurriculumTheme {
  return {
    themeOrder,
    themeName: sectionName
      ? buildSectionThemeName(sectionName, theme.theme_name)
      : theme.theme_name,
    tendencies: (theme.tendencies ?? [])
      .map((tendency) => tendency.name?.trim())
      .filter(Boolean),
    outcomes: (theme.outcomes ?? []).map((outcome) => ({
      outcomeCode: outcome.outcome_code,
      outcomeText: outcome.outcome_text,
      processComponents: outcome.process_components ?? [],
    })),
  };
}

export function normalizeCurriculumCourse(
  course: RawCurriculumCourse,
): NormalizedCurriculumCourse {
  const directThemes = course.themes ?? [];

  const themes =
    directThemes.length > 0
      ? directThemes.map((theme, index) => normalizeTheme(theme, theme.theme_order ?? index + 1))
      : (course.sections ?? []).flatMap((section) =>
          (section.themes ?? []).map((theme, index) =>
            normalizeTheme(theme, index + 1, section.section_name),
          ),
        );

  return {
    courseId: course.course_id,
    courseName: course.course_name,
    applicableGradeLevels: course.applicable_grade_levels ?? [],
    hasCatalogContent: themes.length > 0,
    themes,
  };
}

export function normalizeCurriculumCatalog(
  catalog: RawCurriculumCatalog,
): NormalizedCurriculumCourse[] {
  return catalog.curriculum_catalog.courses.map(normalizeCurriculumCourse);
}
