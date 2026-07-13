import { FormsLibraryBoard } from "@/components/forms/forms-library-board";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { withDbRetry } from "@/lib/db-errors";
import {
  canAccessEducationalAnalysis,
  canCreateBep,
  getStudentAccessWhere,
  hasModuleAccess,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function canAccessFormLibrary(user: Awaited<ReturnType<typeof requireUser>>) {
  const canUseBepModule =
    canCreateBep(user.role) && hasModuleAccess(user.role, user.allowedModules, "bep");

  return canUseBepModule || canAccessEducationalAnalysis(user.role, user.allowedModules);
}

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireUser();

  if (!canAccessFormLibrary(user)) {
    return (
      <Card>
        <SectionHeading
          eyebrow="Erişim"
          title="Bu alan yalnızca BEP ve analiz yetkisi olan kullanıcılar için açıktır."
          description="Bu alanda öğrenci için gerekli formu seçip doldurabilir ve çıktı alabilirsiniz."
        />
      </Card>
    );
  }

  interface FormStudent {
    id: string;
    firstName: string;
    lastName: string;
    schoolName: string | null;
    schoolNumber: string | null;
    classroom: string | null;
    kademe: string | null;
    district: string | null;
    birthDate: Date | null;
    diagnosis: string | null;
    placementDecision: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
    developmentHistory: string | null;
    strengths: string | null;
    improvementAreas: string | null;
    behaviorNotes: string | null;
    bepStartDate: Date | null;
    bepEndDate: Date | null;
  }

  let resolvedSearchParams;
  let students: FormStudent[] = [];

  try {
    resolvedSearchParams = await searchParams;
    students = await withDbRetry(() =>
      prisma.student.findMany({
        where: getStudentAccessWhere(user),
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
        select: {
          id: true,
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
      }),
    );
  } catch (error) {
    console.error("Failed to load students for forms library:", error);
    return (
      <Card className="p-6">
        <SectionHeading
          eyebrow="Hata"
          title="Veriler yüklenemedi"
          description="Öğrenci verileri yüklenirken bir veritabanı hatası oluştu. Lütfen sayfayı yenileyip tekrar deneyin veya sistem yöneticisiyle iletişime geçin."
        />
      </Card>
    );
  }

  // Tek öğrencide ?studentId redirect'i yapılmaz: board zaten ilk öğrenciyi
  // varsayılan seçer; redirect sayfayı ikinci kez tam yüklemeye zorluyordu.
  const studentId = resolvedSearchParams?.studentId;

  const mappedStudents = students.map((student) => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    schoolName: student.schoolName,
    classroom: student.classroom,
    schoolNumber: student.schoolNumber,
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
  }));

  return (
    <FormsLibraryBoard
      students={mappedStudents}
      initialStudentId={studentId}
      currentUserName={user.name ?? user.email}
    />
  );
}

