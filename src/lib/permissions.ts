import type { Prisma, StaffModulePermission, UserRole } from "@/lib/prisma-shim";

export function isAdminRole(role?: UserRole | null) {
  return role === "admin";
}

export function isInstitutionRole(role?: UserRole | null) {
  return role === "institution";
}

export function isTeacherRole(role?: UserRole | null) {
  return role === "teacher";
}

export function isParentRole(role?: UserRole | null) {
  return role === "parent";
}

export function canManageInstitutionRecords(role?: UserRole | null) {
  return isAdminRole(role) || isInstitutionRole(role);
}

export function canCreateBep(role?: UserRole | null) {
  return isAdminRole(role) || isInstitutionRole(role) || isTeacherRole(role);
}

export function canApproveBep(role?: UserRole | null) {
  return isInstitutionRole(role);
}

export function shouldShowBepApprovalFlow(user: {
  role?: UserRole | null;
  institutionId?: string | null;
}) {
  return isInstitutionRole(user.role) || (isTeacherRole(user.role) && Boolean(user.institutionId));
}

export function canAccessBepApprovalInbox(user: {
  role?: UserRole | null;
  institutionId?: string | null;
}) {
  return isInstitutionRole(user.role);
}

export function canAccessEducationalAnalysis(
  role?: UserRole | null,
  allowedModules?: StaffModulePermission[] | null,
) {
  return (
    isAdminRole(role) ||
    isInstitutionRole(role) ||
    isParentRole(role) ||
    hasModuleAccess(role, allowedModules, "reports")
  );
}

export function canAccessSpecialEducationTools(role?: UserRole | null) {
  return isAdminRole(role) || isInstitutionRole(role) || isTeacherRole(role);
}

export function canAccessFamilyEducation(role?: UserRole | null) {
  return isAdminRole(role) || isInstitutionRole(role) || isTeacherRole(role) || isParentRole(role);
}

export function hasModuleAccess(
  role?: UserRole | null,
  allowedModules?: StaffModulePermission[] | null,
  module?: StaffModulePermission,
) {
  if (!module) {
    return true;
  }

  if (isAdminRole(role) || isInstitutionRole(role)) {
    return true;
  }

  const permissions = allowedModules ?? [];
  if (permissions.length === 0 || permissions.includes("all")) {
    return true;
  }

  return permissions.includes(module);
}

type ScopedUser = {
  id: string;
  role: UserRole;
  institutionId?: string | null;
};

export function getStudentAccessWhere(user: ScopedUser): Prisma.StudentWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  const baseFilter: Prisma.StudentWhereInput =
    isInstitutionRole(user.role)
      ? (user.institutionId ? { institutionId: user.institutionId } : { ownerId: user.id })
      : isParentRole(user.role)
      ? {
          parentStudentLinks: {
            some: {
              parentId: user.id,
            },
          },
        }
      : {
          ownerId: user.id,
          ...(user.institutionId ? { institutionId: user.institutionId } : {}),
        };

  return {
    OR: [
      baseFilter,
      {
        documents: {
          some: {
            transferInvites: {
              some: {
                fromUserId: user.id,
                status: "accepted",
                undoUntil: {
                  gt: new Date(),
                },
              },
            },
          },
        },
      },
    ],
  };
}

export function getDocumentAccessWhere(user: ScopedUser): Prisma.BepDocumentWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  const baseFilter: Prisma.BepDocumentWhereInput =
    isInstitutionRole(user.role)
      ? (user.institutionId ? { institutionId: user.institutionId } : { ownerId: user.id })
      : isParentRole(user.role)
      ? {
          student: {
            parentStudentLinks: {
              some: {
                parentId: user.id,
              },
            },
          },
        }
      : {
          ownerId: user.id,
          ...(user.institutionId ? { institutionId: user.institutionId } : {}),
        };

  return {
    OR: [
      baseFilter,
      {
        transferInvites: {
          some: {
            fromUserId: user.id,
            status: "accepted",
            undoUntil: {
              gt: new Date(),
            },
          },
        },
      },
    ],
  };
}

export function getCourseEvaluationAccessWhere(
  user: ScopedUser,
): Prisma.CourseEvaluationDocumentWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role)) {
    return user.institutionId ? { institutionId: user.institutionId } : { ownerId: user.id };
  }

  if (isParentRole(user.role)) {
    return {
      student: {
        parentStudentLinks: {
          some: {
            parentId: user.id,
          },
        },
      },
    };
  }

  return {
    ownerId: user.id,
    ...(user.institutionId ? { institutionId: user.institutionId } : {}),
  };
}

export function getEvaluationAccessWhere(
  user: ScopedUser,
): Prisma.EvaluationDocumentWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role)) {
    return user.institutionId ? { institutionId: user.institutionId } : { ownerId: user.id };
  }

  if (isParentRole(user.role)) {
    return {
      student: {
        parentStudentLinks: {
          some: {
            parentId: user.id,
          },
        },
      },
    };
  }

  // Teachers in an institution can access documents belonging to that institution
  return user.institutionId
    ? { institutionId: user.institutionId }
    : { ownerId: user.id };
}

export function getStudentFileAccessWhere(user: ScopedUser): Prisma.StudentFileWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role)) {
    return user.institutionId ? { institutionId: user.institutionId } : { createdById: user.id };
  }

  if (isParentRole(user.role)) {
    return {
      studentId: { not: null },
      student: {
        is: {
          parentStudentLinks: {
            some: {
              parentId: user.id,
            },
          },
        },
      },
    };
  }

  return {
    OR: [
      { createdById: user.id },
      {
        student: {
          is: {
            ownerId: user.id,
            ...(user.institutionId ? { institutionId: user.institutionId } : {}),
          },
        },
      },
      ...(user.institutionId ? [{ institutionId: user.institutionId }] : []),
    ],
  };
}

export function getFamilyEducationPlanAccessWhere(
  user: ScopedUser,
): Prisma.FamilyEducationPlanWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role)) {
    return user.institutionId ? { institutionId: user.institutionId } : { createdById: user.id };
  }

  if (isTeacherRole(user.role)) {
    return {
      createdById: user.id,
      ...(user.institutionId ? { institutionId: user.institutionId } : {}),
    };
  }

  if (isParentRole(user.role)) {
    return {
      createdBy: {
        role: "teacher",
      },
      student: {
        parentStudentLinks: {
          some: {
            parentId: user.id,
          },
        },
      },
    };
  }

  return {
    id: "__no_family_education_access__",
  };
}

export function getParentMessageAccessWhere(user: ScopedUser): Prisma.ParentMessageWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role)) {
    return {
      id: "__no_parent_message_access__",
    };
  }

  if (isParentRole(user.role)) {
    return {
      OR: [{ senderId: user.id }, { recipientId: user.id }],
    };
  }

  if (!user.institutionId) {
    return {
      id: "__no_parent_message_access__",
    };
  }

  return {
    institutionId: user.institutionId,
    OR: [{ senderId: user.id }, { recipientId: user.id }],
  };
}

export function getCoordinationMeetingAccessWhere(
  user: ScopedUser,
): Prisma.CoordinationMeetingWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role)) {
    return user.institutionId ? { institutionId: user.institutionId } : { createdById: user.id };
  }

  if (isParentRole(user.role)) {
    return {
      OR: [
        { createdById: user.id },
        {
          student: {
            parentStudentLinks: {
              some: {
                parentId: user.id,
              },
            },
          },
        },
      ],
    };
  }

  return {
    OR: [
      { createdById: user.id },
      {
        student: {
          ownerId: user.id,
          ...(user.institutionId ? { institutionId: user.institutionId } : {}),
        },
      },
    ],
  };
}

export function getZumreMeetingAccessWhere(
  user: ScopedUser,
): Prisma.ZumreMeetingDocumentWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role)) {
    return user.institutionId ? { institutionId: user.institutionId } : { createdById: user.id };
  }

  if (isParentRole(user.role)) {
    return { id: "__no_zumre_access__" };
  }

  return {
    OR: [
      { createdById: user.id },
      ...(user.institutionId ? [{ institutionId: user.institutionId }] : []),
    ],
  };
}

export function getSessionAccessWhere(user: ScopedUser): Prisma.InstitutionSessionWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role)) {
    return user.institutionId ? { institutionId: user.institutionId } : { createdById: user.id };
  }

  if (isParentRole(user.role)) {
    return {
      student: {
        parentStudentLinks: {
          some: {
            parentId: user.id,
          },
        },
      },
    };
  }

  if (user.institutionId) {
    return { institutionId: user.institutionId };
  }

  return {
    teacherId: user.id,
  };
}

export function getSessionRoomAccessWhere(user: ScopedUser): Prisma.SessionRoomWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (user.institutionId) {
    return { institutionId: user.institutionId };
  }

  return {
    institutionId: "__no_room_access__",
  };
}

export function getCalendarEventAccessWhere(user: ScopedUser): Prisma.CalendarEventWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  const institutionEvents =
    user.institutionId
      ? {
          institutionId: user.institutionId,
          scope: "institution" as const,
        }
      : undefined;

  const personalEvents = {
    scope: "personal" as const,
    OR: [{ assignedUserId: user.id }, { ownerId: user.id }],
  };

  if (isParentRole(user.role)) {
    return institutionEvents
      ? {
          OR: [institutionEvents, personalEvents],
        }
      : personalEvents;
  }

  if (isInstitutionRole(user.role)) {
    return user.institutionId
      ? {
          OR: [
            institutionEvents ?? {},
            {
              institutionId: user.institutionId,
              scope: "personal",
            },
          ],
        }
      : personalEvents;
  }

  if (isTeacherRole(user.role)) {
    return institutionEvents
      ? {
          OR: [institutionEvents, personalEvents],
        }
      : personalEvents;
  }

  return personalEvents;
}

export function getUserManagementWhere(user: ScopedUser): Prisma.UserWhereInput {
  if (isAdminRole(user.role)) {
    return {};
  }

  if (isInstitutionRole(user.role) && user.institutionId) {
    return {
      institutionId: user.institutionId,
    };
  }

  return {
    id: user.id,
  };
}
