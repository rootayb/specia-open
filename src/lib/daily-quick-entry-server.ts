import type { LearningPhase } from "@/lib/prisma-shim";

import { getDocumentAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

type ScopedUser = Parameters<typeof getDocumentAccessWhere>[0];

const RECENT_ENTRY_LIMIT = 10;
const GOAL_HISTORY_LIMIT = 12;

export type DailyQuickEntryGoalHistoryPoint = {
  id: string;
  value: number;
  phase: LearningPhase;
  measuredAt: Date;
};

export type DailyQuickEntryGoal = {
  id: string;
  courseName: string;
  learningArea: string;
  learningOutcome: string;
  /** Hedefin son ölçümleri (yeniden eskiye): mini grafik ve aşama önerisi için. */
  history: DailyQuickEntryGoalHistoryPoint[];
};

export type DailyQuickEntryRecord = {
  id: string;
  value: number;
  phase: LearningPhase;
  note: string | null;
  measuredAt: Date;
  planRow: {
    id: string;
    courseName: string;
    learningArea: string;
    learningOutcome: string;
  };
};

export type DailyQuickEntryStudent = {
  id: string;
  firstName: string;
  lastName: string;
  documentId: string;
  goals: DailyQuickEntryGoal[];
  recentEntries: DailyQuickEntryRecord[];
};

export async function loadDailyQuickEntryStudents(
  user: ScopedUser,
): Promise<DailyQuickEntryStudent[]> {
  const documents = await prisma.bepDocument.findMany({
    where: {
      ...getDocumentAccessWhere(user),
      planRows: { some: {} },
    },
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      student: {
        select: { id: true, firstName: true, lastName: true },
      },
      planRows: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          courseName: true,
          learningArea: true,
          learningOutcome: true,
          dailyQuickEntries: {
            orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }],
            take: GOAL_HISTORY_LIMIT,
            select: {
              id: true,
              value: true,
              phase: true,
              measuredAt: true,
            },
          },
        },
      },
      dailyQuickEntries: {
        orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }],
        take: RECENT_ENTRY_LIMIT,
        select: {
          id: true,
          value: true,
          phase: true,
          note: true,
          measuredAt: true,
          planRow: {
            select: { id: true, courseName: true, learningArea: true, learningOutcome: true },
          },
        },
      },
    },
  });

  const byStudent = new Map<string, DailyQuickEntryStudent>();

  for (const document of documents) {
    if (byStudent.has(document.student.id)) {
      continue;
    }

    byStudent.set(document.student.id, {
      id: document.student.id,
      firstName: document.student.firstName,
      lastName: document.student.lastName,
      documentId: document.id,
      goals: document.planRows.map((row) => ({
        id: row.id,
        courseName: row.courseName,
        learningArea: row.learningArea,
        learningOutcome: row.learningOutcome,
        history: row.dailyQuickEntries as DailyQuickEntryGoal["history"],
      })),
      recentEntries: document.dailyQuickEntries as DailyQuickEntryRecord[],
    });
  }

  return Array.from(byStudent.values()).sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "tr"),
  );
}
