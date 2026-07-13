import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getStudentAccessWhere } from "@/lib/permissions";
import { AbcDashboardClient } from "./abc-dashboard-client";

export default async function AbcEvaluationPage() {
  const user = await requireUser();
  if (user.role === "parent") {
    redirect("/panel");
  }

  // Fetch all students the user has access to
  const students = await prisma.student.findMany({
    where: getStudentAccessWhere(user),
    select: {
      id: true,
      firstName: true,
      lastName: true,
      behaviors: {
        select: {
          id: true,
          name: true,
          trackingType: true,
        },
      },
      abcLogs: {
        orderBy: { timestamp: "desc" },
        select: {
          id: true,
          studentId: true,
          behaviorId: true,
          timestamp: true,
          durationSeconds: true,
          frequency: true,
          lessonName: true,
          subTopic: true,
          classSize: true,
          antecedentTag: true,
          antecedentDisplay: true,
          consequenceTag: true,
          consequenceDisplay: true,
          teacherNotes: true,
          inferredFunction: true,
          confidenceScore: true,
          behavior: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: [
      { firstName: "asc" },
      { lastName: "asc" }
    ]
  });

  // Map to clear typescript-friendly format
  const mappedStudents = students.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.lastName}`,
    behaviors: s.behaviors,
    abcLogs: s.abcLogs.map((log) => ({
      ...log,
      timestamp: log.timestamp.toISOString(),
    })),
  }));

  return (
    <AbcDashboardClient
      students={mappedStudents}
      currentUserRole={user.role}
    />
  );
}
