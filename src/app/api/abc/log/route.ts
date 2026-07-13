import { NextRequest } from "next/server";
import { enforceAuth } from "@/lib/api/permissions";
import { successResponse } from "@/lib/api/response";
import { handleApiError, ApiError } from "@/lib/api/errors";
import { validateBody } from "@/lib/api/validation";
import { prisma } from "@/lib/prisma";
import { abcLogSchema } from "@/lib/schemas";
import { getStudentAccessWhere } from "@/lib/permissions";

export async function POST(req: NextRequest) {
  try {
    const user = await enforceAuth(req);
    if (user.role === "parent") {
      throw new ApiError("FORBIDDEN", "Veliler gözlem kaydı oluşturamaz.", 403);
    }

    const body = await validateBody(req, abcLogSchema);

    // Verify student access
    const student = await prisma.student.findFirst({
      where: {
        id: body.studentId,
        ...getStudentAccessWhere(user)
      },
      select: { id: true }
    });

    if (!student) {
      throw new ApiError("NOT_FOUND", "Öğrenci bulunamadı veya erişim yetkiniz yok.", 404);
    }

    // Verify behavior exists for student
    const behavior = await prisma.studentBehavior.findFirst({
      where: {
        id: body.behaviorId,
        studentId: body.studentId
      }
    });

    if (!behavior) {
      throw new ApiError("NOT_FOUND", "Seçilen davranış bu öğrenci için tanımlanmamış.", 404);
    }

    const logDate = body.timestamp ? new Date(body.timestamp) : new Date();

    const log = await prisma.abcLog.create({
      data: {
        studentId: body.studentId,
        behaviorId: body.behaviorId,
        timestamp: logDate,
        durationSeconds: body.durationSeconds,
        frequency: body.frequency,
        lessonName: body.lessonName || null,
        subTopic: body.subTopic || null,
        classSize: body.classSize || null,
        teacherId: user.id
      }
    });

    return successResponse(log, "Davranış kaydı başarıyla oluşturuldu.");
  } catch (error) {
    return handleApiError(error);
  }
}
