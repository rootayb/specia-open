import rawCatalog from "@/data/kaba_degerlendirme_ayristirilmis.json";

export type CourseEvaluationCatalogRow = {
  unitName: string;
  learningArea: string;
  learningOutcome: string;
  processComponent: string;
};

export type CourseEvaluationCourseOption = {
  courseId: string;
  courseName: string;
};

type CourseEvaluationCatalogCourse = CourseEvaluationCourseOption & {
  rows: CourseEvaluationCatalogRow[];
};

type RawCourseEvaluationPage = {
  page?: number;
  section?: string;
  content?: string[];
};

type PendingOutcome = {
  unitName: string;
  learningArea: string;
  learningOutcome: string;
  hasProcessComponent: boolean;
};

const RAW_PAGES = ((rawCatalog as { pages?: RawCourseEvaluationPage[] }).pages ?? []).filter(
  (page) => Array.isArray(page.content),
);

const COURSE_ID_MAP: Record<string, string> = {
  "Türkçe": "turkce",
  Matematik: "matematik",
  "Hayat Bilgisi ve Günlük Yaşam Becerileri":
    "hayat_bilgisi_ve_gunluk_yasam_becerileri",
  "Sosyal Beceriler": "sosyal_beceriler",
  "İletişim Becerileri": "iletisim_becerileri",
  "Sağlıklı Yaşam ve Güvenlik Becerileri":
    "saglikli_yasam_ve_guvenlik_becerileri",
  "Bağımsız Yaşam Becerileri": "bagimsiz_yasam_becerileri",
  "Din Kültürü ve Ahlak Bilgisi": "din_kulturu_ve_ahlak_bilgisi",
  Müzik: "muzik",
  "Beden Eğitimi ve Spor": "beden_egitimi_oyun_ve_spor",
  "Görsel Sanatlar ve El Becerileri": "gorsel_sanatlar",
};

const CODE_PATTERN = /^([A-ZÇĞİÖŞÜ](?:[A-ZÇĞİÖŞÜ0-9]*\.)+[0-9]+\.?)\s*(.+)$/u;
const INLINE_PROCESS_PATTERN = /^(.+?(?:abilme|ebilme))(?:\s+)([A-ZÇĞİÖŞÜ].+)$/u;

function slugifyCourseName(value: string) {
  const lowered = value.toLocaleLowerCase("tr-TR");

  return lowered
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeLine(value: string) {
  return value.replace(/\s+/g, " ").trim().replace(/^[-–•\s]+|[-–•\s]+$/g, "");
}

function buildRowSignature(row: CourseEvaluationCatalogRow) {
  return [
    normalizeLine(row.unitName),
    normalizeLine(row.learningArea),
    normalizeLine(row.learningOutcome),
    normalizeLine(row.processComponent),
  ].join("||");
}

function isNoiseLine(value: string) {
  if (!value || value === "ÜNİTE") {
    return true;
  }

  if (/^\d+\.\s*TEMA:?$/iu.test(value)) {
    return true;
  }

  if (/^\d+\.[A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜçğıöşü]/u.test(value)) {
    return true;
  }

  const lettersOnly = value.replace(/[^A-Za-zÇĞİÖŞÜçğıöşü]/g, "");

  return (
    !!lettersOnly &&
    lettersOnly === lettersOnly.toLocaleUpperCase("tr-TR") &&
    !/[a-zçğıöşü]/u.test(value)
  );
}

function splitSection(section: string) {
  const [courseName, unitName] = section.includes(" - ")
    ? section.split(" - ", 2).map((item) => item.trim())
    : [section.trim(), section.trim()];

  return {
    courseName,
    unitName,
  };
}

function parseCodeLine(value: string) {
  const match = CODE_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const learningArea = match[1]?.replace(/\.+$/g, "").trim();
  let learningOutcome = match[2]?.trim();

  if (!learningArea || !learningOutcome) {
    return null;
  }

  let inlineProcessComponent = "";

  const inlineMatch = INLINE_PROCESS_PATTERN.exec(learningOutcome);
  if (inlineMatch?.[1] && inlineMatch[2]) {
    learningOutcome = inlineMatch[1].trim();
    inlineProcessComponent = inlineMatch[2].trim();
  }

  return {
    learningArea,
    learningOutcome,
    inlineProcessComponent,
  };
}

function normalizeCourseEvaluationCatalog() {
  const courses: CourseEvaluationCatalogCourse[] = [];
  const courseMap = new Map<string, CourseEvaluationCatalogCourse>();
  const pendingByCourseId = new Map<string, PendingOutcome>();

  const ensureCourse = (courseName: string) => {
    const courseId = COURSE_ID_MAP[courseName] ?? slugifyCourseName(courseName);
    const existing = courseMap.get(courseId);
    if (existing) {
      return existing;
    }

    const created: CourseEvaluationCatalogCourse = {
      courseId,
      courseName,
      rows: [],
    };

    courseMap.set(courseId, created);
    courses.push(created);
    return created;
  };

  const flushPending = (courseId: string) => {
    const pending = pendingByCourseId.get(courseId);
    const course = courseMap.get(courseId);

    if (!pending || !course || pending.hasProcessComponent) {
      pendingByCourseId.delete(courseId);
      return;
    }

    course.rows.push({
      unitName: pending.unitName,
      learningArea: pending.learningArea,
      learningOutcome: pending.learningOutcome,
      processComponent: "",
    });

    pendingByCourseId.delete(courseId);
  };

  for (const page of RAW_PAGES) {
    const section = page.section?.trim();
    if (!section || section.toLocaleLowerCase("tr-TR").includes("kapak")) {
      continue;
    }

    const { courseName, unitName } = splitSection(section);
    const course = ensureCourse(courseName);

    for (const rawLine of page.content ?? []) {
      const line = normalizeLine(rawLine);
      if (isNoiseLine(line)) {
        continue;
      }

      const parsedCodeLine = parseCodeLine(line);
      if (parsedCodeLine) {
        flushPending(course.courseId);

        pendingByCourseId.set(course.courseId, {
          unitName,
          learningArea: parsedCodeLine.learningArea,
          learningOutcome: parsedCodeLine.learningOutcome,
          hasProcessComponent: false,
        });

        if (parsedCodeLine.inlineProcessComponent) {
          course.rows.push({
            unitName,
            learningArea: parsedCodeLine.learningArea,
            learningOutcome: parsedCodeLine.learningOutcome,
            processComponent: parsedCodeLine.inlineProcessComponent,
          });

          pendingByCourseId.set(course.courseId, {
            unitName,
            learningArea: parsedCodeLine.learningArea,
            learningOutcome: parsedCodeLine.learningOutcome,
            hasProcessComponent: true,
          });
        }

        continue;
      }

      const pending = pendingByCourseId.get(course.courseId);
      if (!pending) {
        continue;
      }

      course.rows.push({
        unitName: pending.unitName,
        learningArea: pending.learningArea,
        learningOutcome: pending.learningOutcome,
        processComponent: line,
      });

      pending.hasProcessComponent = true;
    }
  }

  for (const course of courses) {
    flushPending(course.courseId);

    const uniqueRows: CourseEvaluationCatalogRow[] = [];
    const seenRowSignatures = new Set<string>();

    course.rows.forEach((row) => {
      const signature = buildRowSignature(row);
      if (!signature || seenRowSignatures.has(signature)) {
        return;
      }

      seenRowSignatures.add(signature);
      uniqueRows.push(row);
    });

    course.rows = uniqueRows;
  }

  return courses;
}

const courseEvaluationCatalog = normalizeCourseEvaluationCatalog();

export function listCourseEvaluationCourses(): CourseEvaluationCourseOption[] {
  return courseEvaluationCatalog.map(({ courseId, courseName }) => ({
    courseId,
    courseName,
  }));
}

export function getCourseEvaluationCourseById(courseId?: string) {
  return courseEvaluationCatalog.find((course) => course.courseId === courseId);
}

export function getCourseEvaluationCatalog() {
  return courseEvaluationCatalog;
}
