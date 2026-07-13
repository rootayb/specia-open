/* eslint-disable @typescript-eslint/no-explicit-any */
import { getStudentAccessWhere } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getProcessComponentLabels } from "@/lib/process-component-schedules";
import type { ToolStudent } from "@/lib/special-education-tools";

type SpecialEducationAccessUser = Parameters<typeof getStudentAccessWhere>[0];

export async function loadSpecialEducationToolStudents(
  user: SpecialEducationAccessUser,
  options?: {
    includeDailyData?: boolean;
    includeDocuments?: boolean;
    includeReinforcers?: boolean;
    includeSensory?: boolean;
  },
): Promise<ToolStudent[]> {
  const includeDailyData = options?.includeDailyData ?? false;
  const includeDocuments = options?.includeDocuments ?? false;
  const includeReinforcers = options?.includeReinforcers ?? false;
  const includeSensory = options?.includeSensory ?? false;

  const students = await prisma.student.findMany({
    where: getStudentAccessWhere(user),
    orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      schoolName: true,
      classroom: true,
      diagnosis: true,
      strengths: true,
      improvementAreas: true,
      behaviorNotes: true,
      currentSupport: true,
      supportMaterials: true,
      educationAdjustments: true,
      developmentHistory: true,
      specialEducationReinforcers: includeReinforcers
        ? {
            orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
            select: {
              id: true,
              title: true,
              category: true,
              useCase: true,
              deliveryType: true,
              notes: true,
              strengthLevel: true,
              isActive: true,
              createdAt: true,
            },
          }
        : false,
      sensoryRegulationMenuItems: includeSensory
        ? {
            orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
            select: {
              id: true,
              title: true,
              category: true,
              useWhen: true,
              durationLabel: true,
              materials: true,
              notes: true,
              sortOrder: true,
              isActive: true,
              createdAt: true,
            },
          }
        : false,
      specialEducationDailyDataEntries: includeDailyData
        ? {
            orderBy: [{ measuredAt: "desc" }, { createdAt: "desc" }],
            take: 120,
            select: {
              id: true,
              documentId: true,
              measuredAt: true,
              sessionLabel: true,
              skillArea: true,
              target: true,
              metricType: true,
              metricValue: true,
              setting: true,
              note: true,
              outcome: true,
              createdAt: true,
              createdBy: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          }
        : false,
      documents: includeDocuments
        ? {
            orderBy: { updatedAt: "desc" },
            // Araçlar yalnızca en güncel BEP belgesini kullanır; tüm belgeleri
            // hedef satırlarıyla çekmek sorguyu gereksiz ağırlaştırıyordu.
            take: 1,
            select: {
              id: true,
              title: true,
              updatedAt: true,
              startDate: true,
              endDate: true,
              learningEnvironmentText: true,
              physicalEnvironmentText: true,
              socialInteractionText: true,
              digitalSupportsText: true,
              generalEvaluation: true,
              planRows: {
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  sortOrder: true,
                  courseName: true,
                  learningArea: true,
                  learningOutcome: true,
                  processComponents: true,
                  criterion: true,
                  methodTechnique: true,
                  materials: true,
                  evaluationMethods: true,
                  goalProgressEntries: {
                    orderBy: [{ measuredAt: "desc" }, { updatedAt: "desc" }],
                    take: 1,
                    select: {
                      progressPercent: true,
                      status: true,
                    },
                  },
                },
              },
            },
          }
        : false,
    },
  });

  return (students as any[]).map((student: any) => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    schoolName: student.schoolName,
    classroom: student.classroom,
    diagnosis: student.diagnosis,
    strengths: student.strengths,
    improvementAreas: student.improvementAreas,
    behaviorNotes: student.behaviorNotes,
    currentSupport: student.currentSupport,
    supportMaterials: student.supportMaterials,
    educationAdjustments: student.educationAdjustments,
    developmentHistory: student.developmentHistory,
    reinforcers:
      includeReinforcers && student.specialEducationReinforcers
        ? student.specialEducationReinforcers.map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            useCase: item.useCase,
            deliveryType: item.deliveryType,
            notes: item.notes,
            strengthLevel: item.strengthLevel,
            isActive: item.isActive,
            createdAt: item.createdAt.toISOString(),
          }))
        : [],
    sensoryMenuItems:
      includeSensory && student.sensoryRegulationMenuItems
        ? student.sensoryRegulationMenuItems.map((item: any) => ({
            id: item.id,
            title: item.title,
            category: item.category,
            useWhen: item.useWhen,
            durationLabel: item.durationLabel,
            materials: item.materials,
            notes: item.notes,
            sortOrder: item.sortOrder,
            isActive: item.isActive,
            createdAt: item.createdAt.toISOString(),
          }))
        : [],
    dailyDataEntries:
      includeDailyData && student.specialEducationDailyDataEntries
        ? student.specialEducationDailyDataEntries.map((entry: any) => ({
            id: entry.id,
            documentId: entry.documentId,
            measuredAt: entry.measuredAt.toISOString(),
            sessionLabel: entry.sessionLabel,
            skillArea: entry.skillArea,
            target: entry.target,
            metricType: entry.metricType,
            metricValue: entry.metricValue,
            setting: entry.setting,
            note: entry.note,
            outcome: entry.outcome,
            createdAt: entry.createdAt.toISOString(),
            createdByName: entry.createdBy.name ?? entry.createdBy.email,
          }))
        : [],
    documents:
      includeDocuments && student.documents
        ? student.documents.map((document: any) => ({
            id: document.id,
            title: document.title,
            updatedAt: document.updatedAt.toISOString(),
            startDate: document.startDate?.toISOString() ?? null,
            endDate: document.endDate?.toISOString() ?? null,
            learningEnvironmentText: document.learningEnvironmentText,
            physicalEnvironmentText: document.physicalEnvironmentText,
            socialInteractionText: document.socialInteractionText,
            digitalSupportsText: document.digitalSupportsText,
            generalEvaluation: document.generalEvaluation,
            goals: document.planRows.map((goal: any) => ({
              id: goal.id,
              sortOrder: goal.sortOrder,
              courseName: goal.courseName,
              learningArea: goal.learningArea,
              learningOutcome: goal.learningOutcome,
              processComponents: getProcessComponentLabels(goal.processComponents),
              criterion: goal.criterion,
              methodTechnique: goal.methodTechnique,
              materials: goal.materials,
              evaluationMethods: goal.evaluationMethods,
              latestProgressPercent: goal.goalProgressEntries[0]?.progressPercent ?? null,
              latestStatus: goal.goalProgressEntries[0]?.status ?? null,
            })),
          }))
        : [],
  }));
}
