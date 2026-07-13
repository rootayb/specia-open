import { BepLibraryBoard } from "@/components/bep/bep-library-board";
import { getStudentsForUser } from "@/lib/data";
import { canCreateBep, shouldShowBepApprovalFlow } from "@/lib/permissions";
import { requireUser } from "@/lib/session";

export default async function BepLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireUser();
  const { studentId } = await searchParams;
  const showApprovalFlow = shouldShowBepApprovalFlow(user);
  const students = await getStudentsForUser(user);
  const groupedStudents = students
    .filter((student) => student.documents.length > 0 || student.id === studentId)
    .map((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      schoolName: student.schoolName,
      classroom: student.classroom,
      documents: student.documents.map((document) => ({
        id: document.id,
        title: document.title,
        status: document.status,
        approvalStatus: document.approvalStatus,
        updatedAt: document.updatedAt.toISOString(),
      })),
    }));
  return (
    <BepLibraryBoard
      students={groupedStudents}
      initialStudentId={studentId}
      showApprovalFlow={showApprovalFlow}
      canCreate={canCreateBep(user.role)}
    />
  );
}
