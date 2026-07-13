import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getStudentAccessWhere } from "@/lib/permissions";
import { AnlikGozlemClient } from "./anlik-gozlem-client";

type PageProps = {
  searchParams: Promise<{ studentId?: string }>;
};

export default async function AnlikGozlemPage({ searchParams }: PageProps) {
  const user = await requireUser();
  if (user.role === "parent") {
    redirect("/panel");
  }

  const { studentId } = await searchParams;

  if (!studentId) {
    redirect("/panel/degerlendirmeler/davranis");
  }

  // Fetch the student and their active behaviors
  const student = await prisma.student.findFirst({
    where: {
      id: studentId,
      ...getStudentAccessWhere(user),
    },
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
    },
  });

  if (!student) {
    redirect("/panel/degerlendirmeler/davranis");
  }

  const mappedStudent = {
    id: student.id,
    name: `${student.firstName} ${student.lastName}`,
    behaviors: student.behaviors.map((b) => ({
      id: b.id,
      name: b.name,
      trackingType: b.trackingType as "duration" | "frequency",
    })),
  };

  return (
    <AnlikGozlemClient
      student={mappedStudent}
    />
  );
}
