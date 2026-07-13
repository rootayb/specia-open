import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { generateCustomFormPdf } from "@/lib/form-pdf";
import {
  buildInitialFormValues,
  getFormTemplate,
  sanitizeFormValues,
  type FormTemplateContext,
} from "@/lib/forms";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import {
  canAccessEducationalAnalysis,
  canCreateBep,
  getStudentAccessWhere,
  hasModuleAccess,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 30;

function canAccessFormLibrary(user: NonNullable<Awaited<ReturnType<typeof requireApiUser>>>) {
  const canUseBepModule =
    canCreateBep(user.role) && hasModuleAccess(user.role, user.allowedModules, "bep");

  return canUseBepModule || canAccessEducationalAnalysis(user.role, user.allowedModules);
}

async function buildTemplateContext(
  user: NonNullable<Awaited<ReturnType<typeof requireApiUser>>>,
  studentId?: string | null,
) {
  if (!studentId) {
    return {
      currentUserName: user.name ?? user.email,
      student: null,
    } satisfies FormTemplateContext;
  }

  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      ...getStudentAccessWhere(user),
    },
    select: {
      firstName: true,
      lastName: true,
      schoolName: true,
      schoolNumber: true,
      classroom: true,
      kademe: true,
      district: true,
      birthDate: true,
      diagnosis: true,
      placementDecision: true,
      guardianName: true,
      guardianPhone: true,
      developmentHistory: true,
      strengths: true,
      improvementAreas: true,
      behaviorNotes: true,
      bepStartDate: true,
      bepEndDate: true,
    },
  });

  if (!student) {
    throw new Error("Öğrenci bulunamadı.");
  }

  return {
    currentUserName: user.name ?? user.email,
    student: {
      firstName: student.firstName,
      lastName: student.lastName,
      schoolName: student.schoolName,
      schoolNumber: student.schoolNumber,
      classroom: student.classroom,
      kademe: student.kademe,
      district: student.district,
      birthDate: student.birthDate?.toISOString() ?? null,
      diagnosis: student.diagnosis,
      placementDecision: student.placementDecision,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      developmentHistory: student.developmentHistory,
      strengths: student.strengths,
      improvementAreas: student.improvementAreas,
      behaviorNotes: student.behaviorNotes,
      bepStartDate: student.bepStartDate?.toISOString() ?? null,
      bepEndDate: student.bepEndDate?.toISOString() ?? null,
    },
  } satisfies FormTemplateContext;
}

async function buildPdfResponse(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    await enforceRateLimit("pdf_generation", 10, 60 * 1000);
  } catch (error) {
    return handleApiError(error);
  }
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  if (!canAccessFormLibrary(user)) {
    return NextResponse.json({ error: "Bu alana erişim yetkiniz yok." }, { status: 403 });
  }

  const { slug } = await context.params;
  const template = getFormTemplate(slug);
  if (!template) {
    return NextResponse.json({ error: "Form sablonu bulunamadı." }, { status: 404 });
  }

  const payload =
    request.method === "POST"
      ? ((await request.json()) as {
          studentId?: string;
          values?: Record<string, unknown>;
        })
      : {
          studentId: new URL(request.url).searchParams.get("studentId") ?? undefined,
          values: {},
        };

  try {
    const templateContext = await buildTemplateContext(user, payload.studentId ?? null);
    const defaultValues = buildInitialFormValues(template, templateContext);
    const customValues = sanitizeFormValues(template, payload.values ?? {});
    const mergedValues = {
      ...defaultValues,
      ...Object.fromEntries(
        Object.entries(customValues).map(([key, value]) => [key, value.trim() ? value : defaultValues[key] ?? ""]),
      ),
    };

    const generatedAt = new Date();
    const bytes = await generateCustomFormPdf({
      template,
      values: mergedValues,
      institutionName:
        templateContext.student?.schoolName ?? user.institutionId ?? "Form Çıktısı",
      generatedByName: user.name ?? user.email,
      generatedAt,
      institutionId: user.institutionId,
    });

    const fileBase =
      mergedValues.student_name || mergedValues.student_first_name || template.title;
    const fileName = buildSafePdfFilename(`${fileBase}-${template.title}`, "form");

    // Yerel sürüm: evrak kontrol kodu damgası ve kaydı kaldırıldı.
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF olusturulamadi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return buildPdfResponse(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string }> },
) {
  return buildPdfResponse(request, context);
}
