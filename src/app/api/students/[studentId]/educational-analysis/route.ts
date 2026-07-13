import { ApiError, handleApiError } from "@/lib/api/errors";
import { enforceRateLimit } from "@/lib/api/permissions";
import { successResponse } from "@/lib/api/response";
import { getStudentEducationalAnalysis } from "@/lib/data";
import { requireApiUser } from "@/lib/session";

/**
 * GET /api/students/:studentId/educational-analysis
 *
 * İlgili öğrencinin BEP amaçlarını ve ilerleme kayıtlarını grafik/karta
 * hazır eğitsel analiz verisine dönüştürerek döndürür. Erişim mevcut rol
 * ve belge yetki kurallarıyla sınırlıdır; kapsam dışı öğrenci 404 verir,
 * böylece IDOR ve kurum dışı erişim engellenir.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  try {
    await enforceRateLimit("educational_analysis", 120, 60 * 1000);

    const user = await requireApiUser();
    if (!user) {
      throw new ApiError("UNAUTHORIZED", "Bu işlem için giriş yapmanız gerekmektedir.", 401);
    }

    const { studentId } = await params;
    const analysis = await getStudentEducationalAnalysis(user, studentId);

    if (!analysis) {
      throw new ApiError(
        "NOT_FOUND",
        "Öğrenci bulunamadı veya eğitsel analiz görüntüleme yetkiniz yok.",
        404,
      );
    }

    return successResponse(analysis, "Eğitsel analiz hazırlandı.");
  } catch (error) {
    return handleApiError(error);
  }
}
