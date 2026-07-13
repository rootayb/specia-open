import { getCourseEvaluationCourseById } from "@/lib/course-evaluation-catalog";
import type { CourseEvaluationDocumentInput } from "@/lib/schemas";

export type CourseEvaluationTemplateRow = CourseEvaluationDocumentInput["rows"][number];
const MULTI_COURSE_ID = "__multi__";

function uniqueCourseIds(courseIds: string[]) {
  return Array.from(new Set(courseIds.filter(Boolean)));
}

export function buildCourseEvaluationRows(courseId?: string): CourseEvaluationTemplateRow[] {
  const course = getCourseEvaluationCourseById(courseId);
  if (!course) {
    return [];
  }

  return course.rows.map((row, index) => ({
    sortOrder: index,
    courseId: course.courseId,
    courseName: course.courseName,
    unitName: row.unitName,
    learningArea: row.learningArea,
    learningOutcome: row.learningOutcome,
    processComponent: row.processComponent,
    result: "",
  }));
}

export function buildCourseEvaluationRowsForCourses(courseIds: string[]) {
  return uniqueCourseIds(courseIds).flatMap((courseId, courseIndex) =>
    buildCourseEvaluationRows(courseId).map((row, index) => ({
      ...row,
      sortOrder: courseIndex * 1000 + index,
    })),
  );
}

export function buildCourseEvaluationCourseSummary(courseNames: string[]) {
  const uniqueNames = Array.from(new Set(courseNames.map((name) => name.trim()).filter(Boolean)));
  if (uniqueNames.length === 0) return "";
  if (uniqueNames.length === 1) return uniqueNames[0] ?? "";
  if (uniqueNames.length === 2) return uniqueNames.join(", ");
  return `${uniqueNames[0]} + ${uniqueNames.length - 1} ders`;
}

export function buildCourseEvaluationTitle(courseNames?: string[] | string) {
  const summary = Array.isArray(courseNames)
    ? buildCourseEvaluationCourseSummary(courseNames)
    : courseNames?.trim() ?? "";
  return summary ? `${summary} Kaba Değerlendirme` : "Kaba Değerlendirme";
}

export function buildCourseEvaluationDocumentMeta(courseIds: string[]) {
  const uniqueIds = uniqueCourseIds(courseIds);
  const courseNames = uniqueIds
    .map((courseId) => getCourseEvaluationCourseById(courseId)?.courseName ?? "")
    .filter(Boolean);
  const summary = buildCourseEvaluationCourseSummary(courseNames);

  return {
    courseId: uniqueIds.length > 1 ? MULTI_COURSE_ID : uniqueIds[0] ?? "",
    courseName: uniqueIds.length > 1 ? summary || "Coklu ders değerlendirmesi" : courseNames[0] ?? "",
    title: buildCourseEvaluationTitle(courseNames),
    selectedCourseIds: uniqueIds,
  };
}

export function emptyCourseEvaluationValues(
  studentId: string,
  evaluatorName?: string | null,
): CourseEvaluationDocumentInput {
  return {
    studentId,
    title: "Kaba Değerlendirme",
    courseId: "",
    courseName: "",
    selectedCourseIds: [],
    evaluatorName: evaluatorName?.trim() || "",
    evaluationDate: new Date().toISOString().slice(0, 10),
    rows: [],
  };
}
