import { successResponse } from "@/lib/api/response";
import { handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/permissions";
import { listCurriculumCourses } from "@/lib/curriculum";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Hem web hem mobil kullanımda ortak sınır: dakikada maks 120 istek
    await enforceRateLimit("public_curriculum", 120, 60 * 1000);
    const courses = listCurriculumCourses();
    return successResponse(courses);
  } catch (error) {
    return handleApiError(error);
  }
}
