"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition, type DragEvent } from "react";
import type { AttendanceOutcome, EducationServiceType, SessionStatus, SessionType } from "@/lib/prisma-shim";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  Grip,
  History,
  Trash2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deleteInstitutionSessionAction,
  deleteSessionRoomAction,
  saveQuickSessionNoteAction,
  deleteSessionTimeSlotAction,
  saveInstitutionSessionAction,
  saveSessionRoomAction,
  saveSessionTimeSlotAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { WorkspaceCardGrid } from "@/components/ui/workspace-switcher";
import { confirmModal } from "@/components/ui/confirm-modal";
import { cn, formatDateInput } from "@/lib/utils";

const sessionTypeLabels: Record<SessionType, string> = {
  individual: "Bireysel",
  group: "Grup",
  speech: "Dil Konusma",
  occupational: "Ergoterapi",
  psychomotor: "Psikomotor",
  resource_room: "Kaynak Oda",
  makeup: "Telafi",
  parent_meeting: "Veli Görüşmesi",
};

const sessionStatusLabels: Record<SessionStatus, string> = {
  planned: "Planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const attendanceOutcomeLabels: Record<AttendanceOutcome, string> = {
  attended: "Geldi",
  absent: "Gelmedi",
  excused: "Mazeretli",
  to_makeup: "Telafiye Aktarılacak",
  cancelled: "İptal",
};

const makeupEducationTypeLabels: Record<"individual" | "group", string> = {
  individual: "Bireysel",
  group: "Grup",
};

const studentDragType = "text/specia-student";
const sessionDragType = "text/specia-session";

const weekdayLabels = ["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"];

type WorkspaceId = "grid" | "hızlı-not" | "yerlesim" | "saatler" | "odalar" | "geçmiş";

type RoomRecord = {
  id: string;
  name: string;
  color: string | null;
  isActive?: boolean;
  archivedAt?: Date | null;
  _count?: {
    sessions: number;
  };
};

type TimeSlotRecord = {
  id: string;
  name: string;
  startTime: string;
  durationMinutes: number;
  sortOrder: number;
};

type SessionRecord = {
  id: string;
  sessionDate: Date;
  startTime: string;
  durationMinutes: number;
  sessionType: SessionType;
  status: SessionStatus;
  attendanceVerified: boolean;
  attendanceVerificationReference: string | null;
  attendanceOutcome: AttendanceOutcome | null;
  makeupReference: string | null;
  makeupEducationType: EducationServiceType | null;
  notes: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  };
  teacher: {
    id: string;
    name: string;
    branch: string | null;
  } | null;
  room: {
    id: string;
    name: string;
    color: string | null;
    isActive?: boolean;
  } | null;
  timeSlot: {
    id: string;
    name: string;
    startTime: string;
    durationMinutes: number;
    sortOrder: number;
  } | null;
  createdBy: {
    id: string;
    name: string | null;
  };
  updatedBy?: {
    id: string;
    name: string | null;
  } | null;
};

type TeacherOption = {
  id: string;
  name?: string | null;
  title?: string | null;
  branch?: string | null;
};

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  classroom?: string | null;
  ramReports?: {
    id: string;
    weeklyIndividualHours: number;
    weeklyGroupHours: number;
    validUntil: Date | null;
  }[];
};

type ConstraintWarning = {
  id: string;
  type: "student_daily_limit" | "student_weekly_ram" | "teacher_daily_limit" | "teacher_weekly_limit" | "ram_expiry";
  severity: "warning" | "error";
  targetId: string;
  targetName: string;
  message: string;
  date?: string;
};

type RoomFormState = {
  id?: string;
  name: string;
  color: string;
};

type TimeSlotFormState = {
  id?: string;
  name: string;
  startTime: string;
  durationMinutes: number;
  sortOrder: number;
};

type SessionFormState = {
  id?: string;
  studentId: string;
  teacherId: string;
  roomId: string;
  timeSlotId: string;
  sessionDate: string;
  startTime: string;
  durationMinutes: number;
  sessionType: SessionType;
  status: SessionStatus;
  attendanceVerified: boolean;
  attendanceVerificationReference: string;
  attendanceOutcome: AttendanceOutcome | "";
  makeupReference: string;
  makeupEducationType: "individual" | "group" | "";
  notes: string;
};

type QuickNoteFormState = {
  id: string;
  status: SessionStatus;
  notes: string;
};

const emptyRoomForm: RoomFormState = {
  name: "",
  color: "#f5f5f5",
};

const emptyTimeSlotForm: TimeSlotFormState = {
  name: "",
  startTime: "09:00",
  durationMinutes: 40,
  sortOrder: 0,
};

function formatStudent(option: StudentOption) {
  return `${option.firstName} ${option.lastName}`.trim();
}

function formatDateLabel(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatDateTime(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

function formatWeekday(date: Date) {
  return `${weekdayLabels[(date.getDay() + 6) % 7]} ${date
    .getDate()
    .toString()
    .padStart(2, "0")}`;
}

function formatTimeRange(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const endMinutes = (totalMinutes % 60).toString().padStart(2, "0");

  return `${startTime} - ${endHours}:${endMinutes}`;
}

function buildDateShift(date: Date, diffDays: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + diffDays);
  return formatDateInput(nextDate);
}

function buildQuery(date: string, teacherFilterId?: string) {
  const searchParams = new URLSearchParams();
  if (date) {
    searchParams.set("date", date);
  }
  if (teacherFilterId) {
    searchParams.set("teacherId", teacherFilterId);
  }
  const query = searchParams.toString();
  return query ? `/panel/seans-programi?${query}` : "/panel/seans-programi";
}

function getDefaultSessionForm(
  date: Date,
  timeSlots: TimeSlotRecord[],
  students: StudentOption[],
): SessionFormState {
  const firstSlot = timeSlots[0];

  return {
    studentId: students[0]?.id ?? "",
    teacherId: "",
    roomId: "",
    timeSlotId: firstSlot?.id ?? "",
    sessionDate: formatDateInput(date),
    startTime: firstSlot?.startTime ?? "09:00",
    durationMinutes: firstSlot?.durationMinutes ?? 40,
    sessionType: "individual",
    status: "planned",
    attendanceVerified: false,
    attendanceVerificationReference: "",
    attendanceOutcome: "",
    makeupReference: "",
    makeupEducationType: "",
    notes: "",
  };
}

function getResolvedSlotId(session: SessionRecord, timeSlots: TimeSlotRecord[]) {
  if (session.timeSlot?.id && timeSlots.some((slot) => slot.id === session.timeSlot?.id)) {
    return session.timeSlot.id;
  }

  return (
    timeSlots.find(
      (slot) =>
        slot.startTime === session.startTime && slot.durationMinutes === session.durationMinutes,
    )?.id ?? ""
  );
}

function getSessionTone(session: SessionRecord) {
  if (session.deletedAt) {
    return "border-amber-500/30 bg-amber-500/10";
  }

  if (session.student.id === "virtual-empty" || session.student.firstName === "Boş") {
    return "border-neutral-500/20 bg-neutral-500/5 text-neutral-400 border-dashed";
  }

  if (session.student.id === "virtual-signature" || session.student.firstName === "İmza") {
    return "border-indigo-500/30 bg-indigo-500/10 text-indigo-300";
  }

  if (session.status === "completed") {
    return "border-emerald-500/30 bg-emerald-500/10";
  }

  if (session.status === "cancelled") {
    return "border-rose-500/30 bg-rose-500/10";
  }

  return "border-white/10 bg-black/20";}

export function SessionScheduleManager({
  canManage,
  canTakeQuickNotes,
  currentUserId,
  focusDate,
  teacherFilterId,
  rooms,
  archivedRooms,
  timeSlots,
  sessions,
  historySessions,
  teachers,
  students,
}: {
  canManage: boolean;
  canTakeQuickNotes: boolean;
  currentUserId: string;
  focusDate: Date;
  teacherFilterId?: string;
  rooms: RoomRecord[];
  archivedRooms: RoomRecord[];
  timeSlots: TimeSlotRecord[];
  sessions: SessionRecord[];
  historySessions: SessionRecord[];
  teachers: TeacherOption[];
  students: StudentOption[];
}) {
  const router = useRouter();
  const virtualStudents = useMemo<StudentOption[]>(() => [
    { id: "virtual-empty", firstName: "Boş", lastName: "Seans", classroom: "Sistem", ramReports: [] },
    { id: "virtual-signature", firstName: "İmza", lastName: "Seansı", classroom: "Sistem", ramReports: [] },
  ], []);

  const allStudents = useMemo<StudentOption[]>(() => {
    return [...virtualStudents, ...students];
  }, [students, virtualStudents]);
  const [workspace, setWorkspace] = useState<WorkspaceId>("grid");
  const [roomForm, setRoomForm] = useState<RoomFormState>(emptyRoomForm);
  const [timeSlotForm, setTimeSlotForm] = useState<TimeSlotFormState>(emptyTimeSlotForm);
  const [sessionForm, setSessionForm] = useState<SessionFormState>(
    getDefaultSessionForm(focusDate, timeSlots, students),
  );
  const [roomMessage, setRoomMessage] = useState("");
  const [timeSlotMessage, setTimeSlotMessage] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [quickNoteMessage, setQuickNoteMessage] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [draggingStudentId, setDraggingStudentId] = useState("");
  const [draggingSessionId, setDraggingSessionId] = useState("");
  const [selectedQuickNoteSessionId, setSelectedQuickNoteSessionId] = useState("");
  const [historyTeacherFilter, setHistoryTeacherFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [quickNoteForm, setQuickNoteForm] = useState<QuickNoteFormState>({
    id: "",
    status: "completed",
    notes: "",
  });
  const [studentPoolTab, setStudentPoolTab] = useState<"all" | "no-session-today">("all");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const deferredStudentSearch = useDeferredValue(studentSearch.trim().toLocaleLowerCase("tr-TR"));

  useEffect(() => {
    setSessionForm((current) => {
      if (current.id) {
        return current;
      }

      return getDefaultSessionForm(focusDate, timeSlots, students);
    });
  }, [focusDate, students, timeSlots]);

  const [localSessions, setLocalSessions] = useState<SessionRecord[]>(sessions);

  useEffect(() => {
    setLocalSessions(sessions);
  }, [sessions]);

  const sessionLookup = useMemo(
    () => Object.fromEntries(localSessions.map((session) => [session.id, session])),
    [localSessions],
  );

  const dailyActiveSessions = useMemo(
    () =>
      localSessions.filter(
        (session) =>
          !session.deletedAt &&
          session.status !== "cancelled" &&
          formatDateInput(session.sessionDate) === formatDateInput(focusDate),
    ),
    [localSessions, focusDate],
  );

  const activeWeekSessions = useMemo(
    () => localSessions.filter((session) => !session.deletedAt && session.status !== "cancelled"),
    [localSessions],
  );

  const studentWeeklyStats = useMemo(() => {
    const stats: Record<string, { individual: number; group: number }> = {};
    localSessions.forEach((s) => {
      if (s.deletedAt || s.status === "cancelled") return;
      const studentId = s.student.id;
      stats[studentId] ??= { individual: 0, group: 0 };
      if (s.sessionType === "group") {
        stats[studentId].group++;
      } else if (s.sessionType !== "parent_meeting") {
        stats[studentId].individual++;
      }
    });
    return stats;
  }, [localSessions]);

  const filteredStudents = useMemo(() => {
    let result = students;

    if (studentPoolTab === "no-session-today") {
      const focusDateStr = formatDateInput(focusDate);
      const studentsWithSessionsToday = new Set(
        localSessions
          .filter((s) => !s.deletedAt && s.status !== "cancelled" && formatDateInput(s.sessionDate) === focusDateStr)
          .map((s) => s.student.id)
      );
      result = students.filter((student) => !studentsWithSessionsToday.has(student.id));
    }

    if (!deferredStudentSearch) {
      return result;
    }

    return result.filter((student) => {
      const label = `${student.firstName} ${student.lastName} ${student.classroom ?? ""}`
        .trim()
        .toLocaleLowerCase("tr-TR");

      return label.includes(deferredStudentSearch);
    });
  }, [deferredStudentSearch, studentPoolTab, students, localSessions, focusDate]);

  const dailyTeachers = useMemo(() => {
    const list = [...teachers];
    const hasUnassigned = localSessions.some(
      (s) =>
        !s.deletedAt &&
        s.status !== "cancelled" &&
        formatDateInput(s.sessionDate) === formatDateInput(focusDate) &&
        !s.teacher?.id
    );
    if (hasUnassigned) {
      list.push({ id: "unassigned", name: "Atanmamış", title: null, branch: null });
    }
    return list;
  }, [teachers, localSessions, focusDate]);

  const dailyGroupedSessions = useMemo(() => {
    const focusDateStr = formatDateInput(focusDate);
    return localSessions.reduce<Record<string, SessionRecord[]>>((accumulator, session) => {
      if (formatDateInput(session.sessionDate) !== focusDateStr) {
        return accumulator;
      }
      if (session.deletedAt || session.status === "cancelled") {
        return accumulator;
      }
      const resolvedSlotId = getResolvedSlotId(session, timeSlots);
      if (!resolvedSlotId) {
        return accumulator;
      }
      const teacherId = session.teacher?.id || "unassigned";
      const key = `${resolvedSlotId}:${teacherId}`;
      accumulator[key] ??= [];
      accumulator[key].push(session);
      return accumulator;
    }, {});
  }, [localSessions, focusDate, timeSlots]);

  const quickNoteSessions = useMemo(() => {
    if (!canTakeQuickNotes) {
      return [];
    }

    const baseSessions = [...localSessions, ...historySessions].filter(
      (session, index, collection) =>
        !session.deletedAt && collection.findIndex((candidate) => candidate.id === session.id) === index,
    );

    const scopedSessions =
      canManage || !currentUserId
        ? baseSessions
        : baseSessions.filter(
            (session) => session.teacher?.id === currentUserId || session.createdBy.id === currentUserId,
          );

    return scopedSessions.sort((left, right) => {
      const dateDiff = right.sessionDate.getTime() - left.sessionDate.getTime();
      if (dateDiff !== 0) {
        return dateDiff;
      }

      return right.startTime.localeCompare(left.startTime);
    });
  }, [canManage, canTakeQuickNotes, currentUserId, historySessions, localSessions]);

  const filteredHistorySessions = useMemo(() => {
    const normalizedSearch = historySearch.trim().toLocaleLowerCase("tr-TR");
    const focusDateStr = formatDateInput(focusDate);

    return historySessions.filter((session) => {
      const archivedOnSelectedDay = Boolean(session.deletedAt) && formatDateInput(session.sessionDate) === focusDateStr;
      const teacherMatches =
        !historyTeacherFilter || session.teacher?.id === historyTeacherFilter;
      const searchMatches =
        !normalizedSearch ||
        `${session.student.firstName} ${session.student.lastName} ${session.teacher?.name ?? ""} ${
          session.notes ?? ""
        }`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedSearch);

      return archivedOnSelectedDay && teacherMatches && searchMatches;
    });
  }, [focusDate, historySearch, historySessions, historyTeacherFilter]);

  const constraintWarnings = useMemo(() => {
    const warnings: ConstraintWarning[] = [];

    // Student daily count
    const studentDailyCounts: Record<string, number> = {};
    dailyActiveSessions.forEach((session) => {
      const dateStr = formatDateInput(session.sessionDate);
      const key = `${session.student.id}:${dateStr}`;
      studentDailyCounts[key] = (studentDailyCounts[key] || 0) + 1;
    });

    Object.entries(studentDailyCounts).forEach(([key, count]) => {
      if (count > 2) {
        const [studentId, dateStr] = key.split(":");
        const student = students.find((s) => s.id === studentId);
        const studentName = student ? `${student.firstName} ${student.lastName}` : "Öğrenci";
        warnings.push({
          id: `student-daily-${studentId}-${dateStr}`,
          type: "student_daily_limit",
          severity: "warning",
          targetId: studentId,
          targetName: studentName,
          message: `${studentName} için ${dateStr} tarihinde günlük seans limiti (maks. 2 seans) aşıldı: Planlanan ${count} seans.`,
          date: dateStr,
        });
      }
    });

    // Teacher daily count
    const teacherDailyCounts: Record<string, number> = {};
    dailyActiveSessions.forEach((session) => {
      if (!session.teacher?.id) {
        return;
      }
      const dateStr = formatDateInput(session.sessionDate);
      const key = `${session.teacher.id}:${dateStr}`;
      teacherDailyCounts[key] = (teacherDailyCounts[key] || 0) + 1;
    });

    Object.entries(teacherDailyCounts).forEach(([key, count]) => {
      if (count > 8) {
        const [teacherId, dateStr] = key.split(":");
        const teacher = teachers.find((t) => t.id === teacherId);
        const teacherName = teacher ? (teacher.name || "Öğretmen") : "Öğretmen";
        warnings.push({
          id: `teacher-daily-${teacherId}-${dateStr}`,
          type: "teacher_daily_limit",
          severity: "error",
          targetId: teacherId,
          targetName: teacherName,
          message: `${teacherName} için ${dateStr} tarihinde günlük limit (8 ders) aşıldı: Planlanan ${count} seans.`,
          date: dateStr,
        });
      }
    });

    const summarizeSessionDays = (items: SessionRecord[]) => {
      const dayCounts = new Map<string, number>();
      items.forEach((item) => {
        const key = formatWeekday(item.sessionDate);
        dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
      });
      return Array.from(dayCounts.entries())
        .map(([day, count]) => `${day}: ${count}`)
        .join(", ");
    };

    const teacherWeeklyCounts: Record<string, number> = {};
    activeWeekSessions.forEach((session) => {
      if (!session.teacher?.id) {
        return;
      }
      const teacherId = session.teacher.id;
      teacherWeeklyCounts[teacherId] = (teacherWeeklyCounts[teacherId] || 0) + 1;
    });

    Object.entries(teacherWeeklyCounts).forEach(([teacherId, count]) => {
      if (count > 40) {
        const teacher = teachers.find((t) => t.id === teacherId);
        const teacherName = teacher ? (teacher.name || "Öğretmen") : "Öğretmen";
        warnings.push({
          id: `teacher-weekly-${teacherId}`,
          type: "teacher_weekly_limit",
          severity: "error",
          targetId: teacherId,
          targetName: teacherName,
          message: `${teacherName} için haftalık limit (40 ders) aşıldı: Planlanan ${count} seans. Günler: ${summarizeSessionDays(activeWeekSessions.filter((session) => session.teacher?.id === teacherId))}.`,
        });
      }
    });

    // Student RAM limits & expiration for the visible daily plan
    students.forEach((student) => {
      const studentId = student.id;
      const studentName = `${student.firstName} ${student.lastName}`;

      const studentSessions = activeWeekSessions.filter((s) => s.student.id === studentId);
      const individualCount = studentSessions.filter(
        (s) => s.sessionType !== "group" && s.sessionType !== "parent_meeting",
      ).length;
      const groupCount = studentSessions.filter((s) => s.sessionType === "group").length;

      const activeRam =
        student.ramReports && student.ramReports.length > 0 ? student.ramReports[0] : null;

      if (activeRam) {
        if (activeRam.weeklyIndividualHours > 0 && individualCount > activeRam.weeklyIndividualHours) {
          warnings.push({
            id: `student-weekly-ind-${studentId}`,
            type: "student_weekly_ram",
            severity: "error",
            targetId: studentId,
            targetName: studentName,
            message: `${studentName} için haftalık RAM bireysel seans limiti (${activeRam.weeklyIndividualHours}) aşıldı: Planlanan ${individualCount} seans. Günler: ${summarizeSessionDays(studentSessions.filter((s) => s.sessionType !== "group" && s.sessionType !== "parent_meeting"))}.`,
          });
        }
        if (activeRam.weeklyGroupHours > 0 && groupCount > activeRam.weeklyGroupHours) {
          warnings.push({
            id: `student-weekly-grp-${studentId}`,
            type: "student_weekly_ram",
            severity: "error",
            targetId: studentId,
            targetName: studentName,
            message: `${studentName} için haftalık RAM grup seansı limiti (${activeRam.weeklyGroupHours}) aşıldı: Planlanan ${groupCount} seans. Günler: ${summarizeSessionDays(studentSessions.filter((s) => s.sessionType === "group"))}.`,
          });
        }

        if (activeRam.validUntil) {
          const validUntilDate = new Date(activeRam.validUntil);
          const limitTime = new Date(focusDate);
          limitTime.setDate(limitTime.getDate() + 30);

          if (validUntilDate < focusDate) {
            warnings.push({
              id: `student-ram-expired-${studentId}`,
              type: "ram_expiry",
              severity: "error",
              targetId: studentId,
              targetName: studentName,
              message: `${studentName} RAM Raporu geçerlilik süresi dolmuş (${formatDateLabel(
                validUntilDate,
              )}).`,
            });
          } else if (validUntilDate < limitTime) {
            warnings.push({
              id: `student-ram-expiring-${studentId}`,
              type: "ram_expiry",
              severity: "warning",
              targetId: studentId,
              targetName: studentName,
              message: `${studentName} RAM Raporu geçerlilik süresi 30 gün içinde doluyor (${formatDateLabel(
                validUntilDate,
              )}).`,
            });
          }
        }
      }
    });

    return warnings;
  }, [activeWeekSessions, dailyActiveSessions, students, teachers, focusDate]);

  const selectedQuickNoteSession =
    quickNoteSessions.find((session) => session.id === selectedQuickNoteSessionId) ?? null;

  useEffect(() => {
    if (selectedQuickNoteSessionId && selectedQuickNoteSession) {
      return;
    }

    if (quickNoteSessions.length === 0) {
      setSelectedQuickNoteSessionId("");
      setQuickNoteForm({
        id: "",
        status: "completed",
        notes: "",
      });
      return;
    }

    const nextSession = quickNoteSessions[0];
    setSelectedQuickNoteSessionId(nextSession.id);
    setQuickNoteForm({
      id: nextSession.id,
      status: nextSession.status,
      notes: nextSession.notes ?? "",
    });
  }, [quickNoteSessions, selectedQuickNoteSession, selectedQuickNoteSessionId]);

  const completedCount = localSessions.filter((session) => session.status === "completed").length;
  const cancelledCount = localSessions.filter((session) => session.status === "cancelled").length;
  const historyCount = filteredHistorySessions.length;

  const selectedStudent = allStudents.find((student) => student.id === sessionForm.studentId) ?? null;
  const selectedTeacher = teachers.find((teacher) => teacher.id === sessionForm.teacherId) ?? null;
  const selectedRoom = rooms.find((room) => room.id === sessionForm.roomId) ?? null;

  function resetRoomForm() {
    setRoomForm(emptyRoomForm);
    setRoomMessage("");
  }

  function resetTimeSlotForm() {
    setTimeSlotForm(emptyTimeSlotForm);
    setTimeSlotMessage("");
  }

  function resetSessionForm() {
    setSessionForm(getDefaultSessionForm(focusDate, timeSlots, students));
    setSessionMessage("");
  }

  function getWeeklyRamLimitError(studentId: string, sessionType: SessionType, ignoredSessionId?: string) {
    if (studentId === "virtual-empty" || studentId === "virtual-signature") {
      return "";
    }
    const student = allStudents.find((item) => item.id === studentId);
    const activeRam = student?.ramReports?.[0] ?? null;
    if (!student || !activeRam || sessionType === "parent_meeting") {
      return "";
    }

    const isGroupSession = sessionType === "group";
    const limit = isGroupSession ? activeRam.weeklyGroupHours : activeRam.weeklyIndividualHours;
    if (limit <= 0) {
      return "";
    }

    const currentCount = activeWeekSessions.filter((session) => {
      if (session.id === ignoredSessionId || session.student.id !== studentId) {
        return false;
      }
      return isGroupSession
        ? session.sessionType === "group"
        : session.sessionType !== "group" && session.sessionType !== "parent_meeting";
    }).length;

    if (currentCount + 1 <= limit) {
      return "";
    }

    const label = isGroupSession ? "grup" : "bireysel";
    return `${student.firstName} ${student.lastName} için haftalık ${label} seans hakkı dolu (${currentCount}/${limit}).`;
  }

  function writeDragData(event: DragEvent, type: typeof studentDragType | typeof sessionDragType, id: string) {
    const prefix = type === studentDragType ? "student" : "session";
    event.dataTransfer.effectAllowed = type === studentDragType ? "copy" : "move";
    event.dataTransfer.setData(type, id);
    event.dataTransfer.setData("text/plain", `${prefix}:${id}`);
  }

  function readDragData(event: DragEvent, type: typeof studentDragType | typeof sessionDragType) {
    const customValue = event.dataTransfer.getData(type);
    if (customValue) {
      return customValue;
    }

    const plainValue = event.dataTransfer.getData("text/plain");
    const prefix = type === studentDragType ? "student:" : "session:";
    return plainValue.startsWith(prefix) ? plainValue.slice(prefix.length) : "";
  }

  function openQuickNoteSession(session: SessionRecord) {
    if (!canTakeQuickNotes) {
      return;
    }

    setWorkspace("hızlı-not");
    setSelectedQuickNoteSessionId(session.id);
    setQuickNoteMessage("");
    setQuickNoteForm({
      id: session.id,
      status: session.status,
      notes: session.notes ?? "",
    });
  }

  function fillSessionForm(session: SessionRecord) {
    setWorkspace("grid");
    setSessionForm({
      id: session.id,
      studentId: session.student.id,
      teacherId: session.teacher?.id ?? "",
      roomId: "",
      timeSlotId: getResolvedSlotId(session, timeSlots),
      sessionDate: formatDateInput(session.sessionDate),
      startTime: session.startTime,
      durationMinutes: session.durationMinutes,
      sessionType: session.sessionType,
      status: session.status,
      attendanceVerified: session.attendanceVerified,
      attendanceVerificationReference: session.attendanceVerificationReference ?? "",
      attendanceOutcome: session.attendanceOutcome ?? "",
      makeupReference: session.makeupReference ?? "",
      makeupEducationType:
        session.makeupEducationType === "individual" || session.makeupEducationType === "group"
          ? session.makeupEducationType
          : "",
      notes: session.notes ?? "",
    });
  }

  function startRoomSave() {
    startTransition(async () => {
      const result = await saveSessionRoomAction(roomForm);
      setRoomMessage(result.message);
      showResult(result, {
        successTitle: roomForm.id ? "Oda guncellendi" : "Oda eklendi",
        errorTitle: roomForm.id ? "Oda guncellenemedi" : "Oda eklenemedi",
      });
      if (result.success) {
        resetRoomForm();
        router.refresh();
      }
    });
  }

  function startTimeSlotSave() {
    startTransition(async () => {
      const result = await saveSessionTimeSlotAction(timeSlotForm);
      setTimeSlotMessage(result.message);
      showResult(result, {
        successTitle: timeSlotForm.id ? "Ders saati guncellendi" : "Ders saati eklendi",
        errorTitle: timeSlotForm.id ? "Ders saati guncellenemedi" : "Ders saati eklenemedi",
      });
      if (result.success) {
        resetTimeSlotForm();
        router.refresh();
      }
    });
  }

  function startSessionSave() {
    const student = allStudents.find((s) => s.id === sessionForm.studentId);
    const teacher = teachers.find((t) => t.id === sessionForm.teacherId) || null;
    const slot = timeSlots.find((ts) => ts.id === sessionForm.timeSlotId) || null;
    
    let parsedDate = new Date(focusDate);
    if (sessionForm.sessionDate) {
      const parts = sessionForm.sessionDate.split("-");
      if (parts.length === 3) {
        parsedDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0, 0);
      }
    }

    const previousSessions = [...localSessions];
    const isEdit = Boolean(sessionForm.id);
    const tempId = `temp-${Date.now()}`;
    const weeklyLimitError = getWeeklyRamLimitError(
      sessionForm.studentId,
      sessionForm.sessionType,
      sessionForm.id,
    );

    if (!slot) {
      const message = "Seans eklemek için tanımlı bir ders saati seçin.";
      setSessionMessage(message);
      showResult(
        { success: false, message },
        { errorTitle: "Ders saati seçilmedi" },
      );
      return;
    }

    if (weeklyLimitError) {
      setSessionMessage(weeklyLimitError);
      showResult(
        { success: false, message: weeklyLimitError },
        { errorTitle: "Haftalık sınır aşıldı" },
      );
      return;
    }

    if (isEdit) {
      setLocalSessions((current) =>
        current.map((s) =>
          s.id === sessionForm.id
            ? {
                ...s,
                sessionDate: parsedDate,
                startTime: sessionForm.startTime,
                durationMinutes: Number(sessionForm.durationMinutes),
                sessionType: sessionForm.sessionType,
                status: sessionForm.status,
                attendanceVerified: sessionForm.attendanceVerified,
                attendanceVerificationReference:
                  sessionForm.attendanceVerificationReference || null,
                attendanceOutcome: sessionForm.attendanceOutcome || null,
                makeupReference: sessionForm.makeupReference || null,
                makeupEducationType: sessionForm.makeupEducationType || null,
                notes: sessionForm.notes || null,
                student: student
                  ? { id: student.id, firstName: student.firstName, lastName: student.lastName, classroom: student.classroom || null }
                  : s.student,
                teacher: teacher
                  ? { id: teacher.id, name: teacher.name || "", branch: teacher.branch || null }
                  : null,
                room: null,
                timeSlot: slot
                  ? { id: slot.id, name: slot.name, startTime: slot.startTime, durationMinutes: slot.durationMinutes, sortOrder: slot.sortOrder }
                  : null,
              }
            : s
        )
      );
    } else {
      const optimisticSession: SessionRecord = {
        id: tempId,
        sessionDate: parsedDate,
        startTime: sessionForm.startTime,
        durationMinutes: Number(sessionForm.durationMinutes),
        sessionType: sessionForm.sessionType,
        status: sessionForm.status,
        attendanceVerified: sessionForm.attendanceVerified,
        attendanceVerificationReference: sessionForm.attendanceVerificationReference || null,
        attendanceOutcome: sessionForm.attendanceOutcome || null,
        makeupReference: sessionForm.makeupReference || null,
        makeupEducationType: sessionForm.makeupEducationType || null,
        notes: sessionForm.notes || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        student: student
          ? { id: student.id, firstName: student.firstName, lastName: student.lastName, classroom: student.classroom || null }
          : { id: "", firstName: "", lastName: "", classroom: null },
        teacher: teacher
          ? { id: teacher.id, name: teacher.name || "", branch: teacher.branch || null }
          : null,
        room: null,
        timeSlot: slot
          ? { id: slot.id, name: slot.name, startTime: slot.startTime, durationMinutes: slot.durationMinutes, sortOrder: slot.sortOrder }
          : null,
        createdBy: { id: currentUserId, name: "" },
      };
      setLocalSessions((current) => [...current, optimisticSession]);
    }

    startTransition(async () => {
      const result = await saveInstitutionSessionAction({
        ...sessionForm,
        roomId: "",
        attendanceOutcome: sessionForm.attendanceOutcome || undefined,
        makeupEducationType: sessionForm.makeupEducationType || undefined,
      });
      setSessionMessage(result.message);

      if (!result.success) {
        setLocalSessions(previousSessions);
      } else if (!isEdit && result.id) {
        setLocalSessions((current) =>
          current.map((s) => (s.id === tempId ? { ...s, id: result.id! } : s))
        );
      }

      showResult(result, {
        successTitle: sessionForm.id ? "Seans guncellendi" : "Seans eklendi",
        errorTitle: sessionForm.id ? "Seans guncellenemedi" : "Seans eklenemedi",
      });

      if (result.success) {
        resetSessionForm();
        router.refresh();
      }
    });
  }

  function archiveSession(sessionId: string) {
    const previousSessions = [...localSessions];
    setLocalSessions((current) => current.filter((s) => s.id !== sessionId));

    startTransition(async () => {
      const result = await deleteInstitutionSessionAction({ id: sessionId });
      setSessionMessage(result.message);

      if (!result.success) {
        setLocalSessions(previousSessions);
      }

      showResult(result, {
        successTitle: "Seans silindi",
        errorTitle: "Seans silinemedi",
      });

      if (result.success) {
        if (sessionForm.id === sessionId) {
          resetSessionForm();
        }
        router.refresh();
      }
    });
  }

  function startQuickNoteSave() {
    if (!quickNoteForm.id) {
      return;
    }

    startTransition(async () => {
      const result = await saveQuickSessionNoteAction(quickNoteForm);
      setQuickNoteMessage(result.message);
      showResult(result, {
        successTitle: "Seans notu kaydedildi",
        errorTitle: "Seans notu kaydedilemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  }

  function startDropMove(sessionId: string, date: Date, slot: TimeSlotRecord, newTeacherId?: string) {
    const session = sessionLookup[sessionId];
    if (!session) {
      return;
    }

    const teacherId = newTeacherId !== undefined ? newTeacherId : (session.teacher?.id ?? "");
    const previousSessions = [...localSessions];
    const matchedTeacher = teachers.find((t) => t.id === teacherId);

    setLocalSessions((current) =>
      current.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              sessionDate: date,
              startTime: slot.startTime,
              durationMinutes: slot.durationMinutes,
              teacher: matchedTeacher
                ? {
                    id: matchedTeacher.id,
                    name: matchedTeacher.name || "Atanmadı",
                    branch: matchedTeacher.branch || null,
                  }
                : null,
              room: null,
              timeSlot: {
                id: slot.id,
                name: slot.name,
                startTime: slot.startTime,
                durationMinutes: slot.durationMinutes,
                sortOrder: slot.sortOrder,
              },
            }
          : s
      )
    );

    startTransition(async () => {
      const result = await saveInstitutionSessionAction({
        id: session.id,
        studentId: session.student.id,
        teacherId,
        roomId: "",
        timeSlotId: slot.id,
        sessionDate: formatDateInput(date),
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
        sessionType: session.sessionType,
        status: session.status,
        attendanceVerified: session.attendanceVerified,
        attendanceVerificationReference: session.attendanceVerificationReference ?? "",
        attendanceOutcome: session.attendanceOutcome ?? undefined,
        makeupReference: session.makeupReference ?? "",
        makeupEducationType:
          session.makeupEducationType === "individual" || session.makeupEducationType === "group"
            ? session.makeupEducationType
            : undefined,
        notes: session.notes ?? "",
      });

      setSessionMessage(result.message);
      setDraggingSessionId("");

      if (!result.success) {
        setLocalSessions(previousSessions);
      }

      showResult(result, {
        successTitle: "Seans tasindi",
        errorTitle: "Seans tasinamadi",
      });

      if (result.success) {
        router.refresh();
      }
    });
  }

  function startDropCreate(studentId: string, date: Date, slot: TimeSlotRecord, customTeacherId?: string) {
    const student = allStudents.find((s) => s.id === studentId);
    if (!student) {
      return;
    }
    const weeklyLimitError = getWeeklyRamLimitError(studentId, sessionForm.sessionType);
    if (weeklyLimitError) {
      setDraggingStudentId("");
      setSessionMessage(weeklyLimitError);
      showResult(
        { success: false, message: weeklyLimitError },
        { errorTitle: "Haftalık sınır aşıldı" },
      );
      return;
    }

    const previousSessions = [...localSessions];
    const tempId = `temp-${Date.now()}`;
    const teacherId = customTeacherId !== undefined ? customTeacherId : (teacherFilterId || sessionForm.teacherId);
    const roomId = "";

    const matchedTeacher = teachers.find((t) => t.id === teacherId);

    const optimisticSession: SessionRecord = {
      id: tempId,
      sessionDate: date,
      startTime: slot.startTime,
      durationMinutes: slot.durationMinutes,
      sessionType: sessionForm.sessionType,
      status: "planned",
      attendanceVerified: false,
      attendanceVerificationReference: null,
      attendanceOutcome: null,
      makeupReference: null,
      makeupEducationType: null,
      notes: sessionForm.notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      student: {
        id: studentId,
        firstName: student.firstName,
        lastName: student.lastName,
        classroom: student.classroom || null,
      },
      teacher: matchedTeacher
        ? {
            id: matchedTeacher.id,
            name: matchedTeacher.name || "Atanmadı",
            branch: matchedTeacher.branch || null,
          }
        : null,
      room: null,
      timeSlot: {
        id: slot.id,
        name: slot.name,
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
        sortOrder: slot.sortOrder,
      },
      createdBy: {
        id: currentUserId,
        name: "",
      },
    };

    setLocalSessions((current) => [...current, optimisticSession]);

    startTransition(async () => {
      const result = await saveInstitutionSessionAction({
        studentId,
        teacherId,
        roomId: "",
        timeSlotId: slot.id,
        sessionDate: formatDateInput(date),
        startTime: slot.startTime,
        durationMinutes: slot.durationMinutes,
        sessionType: sessionForm.sessionType,
        status: "planned",
        attendanceVerified: false,
        attendanceVerificationReference: "",
        makeupReference: "",
        notes: sessionForm.notes,
      });

      setSessionMessage(result.message);

      if (!result.success) {
        setLocalSessions(previousSessions);
      } else if (result.id) {
        setLocalSessions((current) =>
          current.map((s) => (s.id === tempId ? { ...s, id: result.id! } : s))
        );
      }

      showResult(result, {
        successTitle: "Seans eklendi",
        errorTitle: "Seans eklenemedi",
      });

      if (result.success) {
        setSessionForm((current) => ({
          ...current,
          studentId,
          sessionDate: formatDateInput(date),
          timeSlotId: slot.id,
          startTime: slot.startTime,
          durationMinutes: slot.durationMinutes,
          status: "planned",
          roomId: "",
        }));
        router.refresh();
      }
    });
  }

  function renderDailySessionCard(session: SessionRecord) {
    const sessionDateStr = formatDateInput(session.sessionDate);
    const isVirtual = session.student.id === "virtual-empty" || session.student.id === "virtual-signature" || session.student.classroom === "Sistem";
    const sessionWarnings = isVirtual ? [] : constraintWarnings.filter((warning) => {
      if (warning.targetId === session.student.id) {
        if (warning.type === "ram_expiry" || warning.type === "student_weekly_ram") {
          return true;
        }
        if (warning.type === "student_daily_limit" && warning.date === sessionDateStr) {
          return true;
        }
      }
      if (session.teacher?.id && warning.targetId === session.teacher.id) {
        if (warning.type === "teacher_weekly_limit") {
          return true;
        }
        if (warning.type === "teacher_daily_limit" && warning.date === sessionDateStr) {
          return true;
        }
      }
      return false;
    });

    const hasErrors = sessionWarnings.some((w) => w.severity === "error");
    const warningTooltip = sessionWarnings.map((w) => w.message).join("\n");

    return (
      <div key={session.id} className="relative group">
        {canManage && !session.deletedAt ? (
          <button
            type="button"
            className="absolute right-1 top-1 z-10 inline-flex size-6 items-center justify-center rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 shadow-sm transition hover:border-rose-400 hover:bg-rose-500/25 hover:text-rose-100 cursor-pointer"
            onClick={(event) => {
              event.stopPropagation();
              (async () => {
                const confirmed = await confirmModal({
                  title: "Seansı Sil",
                  message: "Bu seansı programdan silmek istediğinize emin misiniz?",
                  variant: "danger",
                  confirmText: "Seansı Sil",
                  cancelText: "Vazgeç",
                });
                if (confirmed) {
                  archiveSession(session.id);
                }
              })();
            }}
            aria-label="Seansı sil"
          >
            <Trash2 className="size-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          draggable={canManage}
          onDragStart={(event) => {
            if (!canManage) {
              return;
            }
            writeDragData(event, sessionDragType, session.id);
            setDraggingSessionId(session.id);
          }}
          onDragEnd={() => setDraggingSessionId("")}
          onClick={() => {
            if (canManage) {
              fillSessionForm(session);
              return;
            }
            openQuickNoteSession(session);
          }}
          className={cn(
            "w-full text-left transition rounded-lg border px-2 py-1",
            canManage && "pr-10",
            getSessionTone(session),
            draggingSessionId === session.id ? "opacity-50" : "opacity-100",
            canManage ? "cursor-move hover:bg-white/[0.06]" : "cursor-default",
          )}
        >
          <div className={cn(
            "flex items-center gap-1 truncate font-semibold leading-tight text-white",
            isVirtual ? "text-[13.5px]" : "text-[12px]"
          )}>
            <span className="truncate">
              {session.student.firstName} {session.student.lastName}
            </span>
            {sessionWarnings.length > 0 ? (
              <span
                className={cn(
                  "shrink-0 cursor-help",
                  hasErrors ? "text-rose-400 animate-pulse" : "text-amber-400",
                )}
                title={warningTooltip}
                onClick={(e) => e.stopPropagation()}
              >
                <AlertTriangle className="size-2.5" />
              </span>
            ) : null}
          </div>
          {!isVirtual && (
            <div className="mt-0.5 flex items-center justify-between text-[9px] text-neutral-400 leading-none">
              <span className="opacity-80">
                {sessionTypeLabels[session.sessionType]}
              </span>
            </div>
          )}
        </button>
      </div>
    );
  }

  const workspaceCards = canManage
    ? [
        {
          id: "grid" as const,
          icon: CalendarDays,
          title: "Günlük Plan",
          description: "Öğrencileri saat hücresine sürükleyerek günlük plan oluşturun.",
          value: `${dailyActiveSessions.length} aktif seans`,
        },
        {
          id: "hızlı-not" as const,
          icon: Grip,
          title: "Hızlı Not",
          description: "Seans sonunda kısa not düşüp durum bilgisini hızla güncelleyin.",
          value: `${quickNoteSessions.length} uygun seans`,
        },
        {
          id: "saatler" as const,
          icon: Clock3,
          title: "Plan Ayarları",
          description: "Saat bloklarını tek sekmeden yönetin.",
          value: `${timeSlots.length} saat`,
        },
        {
          id: "geçmiş" as const,
          icon: History,
          title: "Geçmiş",
          description: "Tamamlanan, iptal edilen ve arşivlenen seansları filtreleyin.",
          value: `${historySessions.length} kayıt`,
        },
      ]
    : [
        {
          id: "grid" as const,
          icon: CalendarDays,
          title: "Günlük Plan",
          description: "Atanmış seans programını saat sırasına göre takip edin.",
          value: `${dailyActiveSessions.length} aktif seans`,
        },
        {
          id: "hızlı-not" as const,
          icon: Grip,
          title: "Hızlı Not",
          description: "Kendi seanslarınız için kısa notu ve sonucu tek yerden girin.",
          value: `${quickNoteSessions.length} seans`,
        },
        {
          id: "geçmiş" as const,
          icon: History,
          title: "Geçmiş",
          description: "Eski seansların ve tamamlanan kayıtların özetini görün.",
          value: `${historySessions.length} kayıt`,
        },
      ];

  return (
    <div className="grid gap-4">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(buildQuery(buildDateShift(focusDate, -1), teacherFilterId))}
            >
              Önceki Gün
            </Button>
            <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-neutral-300 min-h-9 flex items-center font-semibold">
              {formatDateLabel(focusDate)}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(buildQuery(buildDateShift(focusDate, 1), teacherFilterId))}
            >
              Sonraki Gün
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(buildQuery(formatDateInput(new Date()), teacherFilterId))}
            >
              Bugün
            </Button>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto">
            {teachers.length > 1 ? (
              <select
                className={cn(inputClassName(), "w-full sm:min-w-[200px] sm:w-auto text-xs py-1.5 px-3 min-h-9 rounded-xl")}
                value={teacherFilterId ?? ""}
                onChange={(event) =>
                  router.push(buildQuery(formatDateInput(focusDate), event.target.value))
                }
              >
                <option value="">Tüm Öğretmenler</option>
                {teachers.map((teacher) => (
                  <option key={teacher.id} value={teacher.id}>
                    {teacher.name} {teacher.branch ? `(${teacher.branch})` : ""}
                  </option>
                ))}
              </select>
            ) : null}

            <a
              href={`/api/pdf/seans-programi?date=${formatDateInput(focusDate)}${
                teacherFilterId ? `&teacherId=${teacherFilterId}` : ""
              }`}
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto"
            >
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <FileText className="mr-2 size-4" />
                PDF
              </Button>
            </a>
          </div>
        </div>

        <div className="mt-3 grid gap-3 grid-cols-2 2xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            <div className="text-xs text-neutral-500">Günlük seans</div>
            <div className="mt-0.5 text-xl font-bold text-white">{dailyActiveSessions.length}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            <div className="text-xs text-neutral-500">Tamamlanan</div>
            <div className="mt-0.5 text-xl font-bold text-white">{completedCount}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            <div className="text-xs text-neutral-500">İptal / Arşiv</div>
            <div className="mt-0.5 text-xl font-bold text-white">
              {cancelledCount + historyCount}
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/10 px-3 py-2">
            <div className="text-xs text-neutral-500">Aktif saatler</div>
            <div className="mt-0.5 text-xl font-bold text-white">
              {timeSlots.length}
            </div>
          </div>
        </div>
      </div>

      <WorkspaceCardGrid
        compact
        items={workspaceCards}
        activeId={workspace}
        onChange={(nextWorkspace) => setWorkspace(nextWorkspace as WorkspaceId)}
        className={cn(canManage ? "2xl:grid-cols-4" : "2xl:grid-cols-3")}
      />

      {workspace === "grid" ? (
        <div className="grid gap-6">
          {/* Top Row: Student Pool & Constraint Warnings side by side */}
          {canManage ? (
            <div className="grid gap-6 xl:grid-cols-2">
              {/* 1. Student Pool Card */}
              <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5 flex flex-col h-[440px]">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      Öğrenci Havuzu
                    </div>
                    <div className="mt-1 text-xs text-neutral-400">
                      Sürükleyip ders hücrelerine bırakın
                    </div>
                  </div>
                  
                  {/* Tab Selector */}
                  <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1 border border-white/5 shrink-0">
                    <button
                      type="button"
                      onClick={() => setStudentPoolTab("all")}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-medium rounded-lg transition",
                        studentPoolTab === "all" ? "bg-white/10 text-white font-semibold shadow-sm" : "text-neutral-400 hover:text-white"
                      )}
                    >
                      Tümü
                    </button>
                    <button
                      type="button"
                      onClick={() => setStudentPoolTab("no-session-today")}
                      className={cn(
                        "px-2.5 py-1 text-[10px] font-medium rounded-lg transition",
                        studentPoolTab === "no-session-today" ? "bg-white/10 text-white font-semibold shadow-sm" : "text-neutral-400 hover:text-white"
                      )}
                    >
                      Dersi Olmayanlar
                    </button>
                  </div>
                </div>

                {/* Inline filter settings under header */}
                <div className="flex flex-wrap gap-2.5 items-center mt-3">
                  <input
                    className={cn(inputClassName(), "flex-1 min-w-[120px] text-xs py-1 px-2")}
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Öğrenci ara..."
                  />
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-neutral-500 font-medium">Tip:</span>
                    <select
                      className={cn(inputClassName(), "py-1 px-1.5 text-[11px] w-24 bg-white/[0.02]")}
                      value={sessionForm.sessionType}
                      onChange={(event) =>
                        setSessionForm((current) => ({
                          ...current,
                          sessionType: event.target.value as SessionType,
                        }))
                      }
                    >
                      {Object.entries(sessionTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Vertically scrollable list of students */}
                <div className="flex-1 overflow-y-auto mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {!studentSearch.trim() && (
                    <>
                      {/* Boş Seans */}
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          writeDragData(event, studentDragType, "virtual-empty");
                          setDraggingStudentId("virtual-empty");
                          setSessionForm((current) => ({ ...current, studentId: "virtual-empty" }));
                        }}
                        onDragEnd={() => setDraggingStudentId("")}
                        onClick={() =>
                          setSessionForm((current) => ({
                            ...current,
                            studentId: "virtual-empty",
                          }))
                        }
                        className={cn(
                          "w-full cursor-grab rounded-xl border px-2.5 py-2 text-left transition active:cursor-grabbing",
                          sessionForm.studentId === "virtual-empty"
                            ? "border-neutral-500/50 bg-neutral-500/20"
                            : "border-neutral-500/20 bg-neutral-500/5 hover:bg-neutral-500/10 border-dashed",
                          draggingStudentId === "virtual-empty" && "border-neutral-400/50 bg-neutral-500/20 opacity-80",
                        )}
                      >
                        <div className="truncate text-[12px] font-semibold leading-tight text-neutral-300">
                          Boş Seans
                        </div>
                        <div className="mt-1 truncate text-[10px] leading-none text-neutral-500">
                          Sistem Planlama
                        </div>
                      </button>

                      {/* İmza Seansı */}
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          writeDragData(event, studentDragType, "virtual-signature");
                          setDraggingStudentId("virtual-signature");
                          setSessionForm((current) => ({ ...current, studentId: "virtual-signature" }));
                        }}
                        onDragEnd={() => setDraggingStudentId("")}
                        onClick={() =>
                          setSessionForm((current) => ({
                            ...current,
                            studentId: "virtual-signature",
                          }))
                        }
                        className={cn(
                          "w-full cursor-grab rounded-xl border px-2.5 py-2 text-left transition active:cursor-grabbing",
                          sessionForm.studentId === "virtual-signature"
                            ? "border-indigo-500/50 bg-indigo-500/20"
                            : "border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10",
                          draggingStudentId === "virtual-signature" && "border-indigo-400/50 bg-indigo-500/20 opacity-80",
                        )}
                      >
                        <div className="truncate text-[12px] font-semibold leading-tight text-indigo-300">
                          İmza Seansı
                        </div>
                        <div className="mt-1 truncate text-[10px] leading-none text-indigo-400">
                          Sistem Planlama
                        </div>
                      </button>
                    </>
                  )}
                  {filteredStudents.length === 0 && studentSearch.trim() ? (
                    <div className="col-span-full text-center rounded-xl border border-dashed border-white/10 py-6 text-xs text-neutral-500">
                      Aramayla eşleşen öğrenci bulunamadı.
                    </div>
                  ) : (
                    filteredStudents.map((student) => {
                      const stats = studentWeeklyStats[student.id] || { individual: 0, group: 0 };
                      const activeReport = student.ramReports && student.ramReports.length > 0 ? student.ramReports[0] : null;

                      return (
                        <button
                          key={student.id}
                          type="button"
                          draggable
                          onDragStart={(event) => {
                            writeDragData(event, studentDragType, student.id);
                            setDraggingStudentId(student.id);
                            setSessionForm((current) => ({ ...current, studentId: student.id }));
                          }}
                          onDragEnd={() => setDraggingStudentId("")}
                          onClick={() =>
                            setSessionForm((current) => ({
                              ...current,
                              studentId: student.id,
                            }))
                          }
                          className={cn(
                            "w-full cursor-grab rounded-xl border px-2.5 py-2 text-left transition active:cursor-grabbing",
                            sessionForm.studentId === student.id
                              ? "border-white/30 bg-white/10"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                            draggingStudentId === student.id && "border-sky-400/50 bg-sky-500/10 opacity-80",
                          )}
                        >
                          <div className="truncate text-[12px] font-semibold leading-tight text-white">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="mt-1 truncate text-[10px] leading-none text-neutral-500">
                            {student.classroom || "Sınıf bilgisi yok"}
                          </div>
                          
                          {/* Live Quota Badge */}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {activeReport ? (
                              <>
                                <span className={cn(
                                  "rounded px-0.5 py-0.1 text-[7.5px] font-semibold leading-none",
                                  stats.individual >= activeReport.weeklyIndividualHours
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                )}>
                                  B: {stats.individual}/{activeReport.weeklyIndividualHours}
                                </span>
                                <span className={cn(
                                  "rounded px-0.5 py-0.1 text-[7.5px] font-semibold leading-none",
                                  stats.group >= activeReport.weeklyGroupHours
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                )}>
                                  G: {stats.group}/{activeReport.weeklyGroupHours}
                                </span>
                              </>
                            ) : (
                              <span className="rounded bg-neutral-500/10 text-neutral-400 border border-neutral-500/20 px-0.5 py-0.1 text-[7.5px] font-semibold leading-none">
                                Planlanan: {stats.individual + stats.group}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 2. Kısıt Kontrolü Card */}
              <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5 flex flex-col h-[440px]">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                    Kısıt Kontrolü
                  </div>
                  {constraintWarnings.length > 0 ? (
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-bold",
                        constraintWarnings.some((w) => w.severity === "error")
                          ? "border-rose-500/30 bg-rose-500/20 text-rose-400"
                          : "border-amber-500/30 bg-amber-500/20 text-amber-400",
                      )}
                    >
                      {constraintWarnings.length} Uyarı
                    </span>
                  ) : (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                      Sorun Yok
                    </span>
                  )}
                </div>
                <div className="mt-2 text-sm font-semibold text-white">Planlama Uyum Durumu</div>
                <p className="mt-1 text-xs leading-4 text-neutral-400">
                  Günlük planlama sırasında yasal kısıtlar, çakışmalar ve RAM limitleri gerçek zamanlı denetlenir.
                </p>

                <div className="mt-3 flex-1 overflow-y-auto grid gap-2 pr-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {constraintWarnings.length === 0 ? (
                    <div className="flex items-center gap-2 rounded-xl border border-dashed border-white/10 px-4 py-8 text-xs text-neutral-500 justify-center">
                      <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                      Plan yasal limitlere tamamen uygundur.
                    </div>
                  ) : (
                    constraintWarnings.map((warning) => (
                      <div
                        key={warning.id}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 text-xs leading-5",
                          warning.severity === "error"
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
                            : "border-amber-500/30 bg-amber-500/10 text-amber-200",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            className={cn(
                              "mt-0.5 size-3.5 shrink-0",
                              warning.severity === "error" ? "text-rose-400" : "text-amber-400",
                            )}
                          />
                          <div>{warning.message}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {/* Main Planner Grid Container (Full Width) */}
          <div className="grid gap-6">
              <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4 mb-4">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                      Seans Programı Planlayıcı
                    </div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {formatWeekday(focusDate)} Planı
                    </div>
                  </div>
                </div>

                {timeSlots.length === 0 ? (
                  <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
                    Planlama yapabilmek için önce ders saatlerini tanımlayın.
                  </div>
                ) : (
                  <>
                    {/* Daily Grid Mobile View */}
                        <div className="mt-6 grid gap-4 lg:hidden">
                          {timeSlots.map((slot) => {
                            const slotSessions = localSessions.filter(
                              (s) =>
                                !s.deletedAt &&
                                s.status !== "cancelled" &&
                                formatDateInput(s.sessionDate) === formatDateInput(focusDate) &&
                                getResolvedSlotId(s, timeSlots) === slot.id
                            );

                            return (
                              <div
                                key={`mobile-daily-${slot.id}`}
                                className="rounded-[var(--panel-radius-card)] border border-white/10 bg-black/20 p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="text-sm font-semibold text-white">
                                      {formatTimeRange(slot.startTime, slot.durationMinutes)}
                                    </div>
                                    <div className="mt-1 text-xs text-neutral-500">{slot.name}</div>
                                  </div>
                                  <div className="text-xs text-neutral-500">{slotSessions.length} seans</div>
                                </div>

                                <div className="mt-4 grid gap-3">
                                  {slotSessions.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-xs text-neutral-500">
                                      Kayıt yok
                                    </div>
                                  ) : (
                                    slotSessions.map((session) => (
                                      <div key={session.id} className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3 relative group">
                                        {canManage && !session.deletedAt ? (
                                          <button
                                            type="button"
                                            className="absolute right-2 top-2 z-10 inline-flex h-7 items-center gap-0.5 rounded-full border border-rose-400/30 bg-rose-500/15 px-2 text-[11px] font-semibold text-rose-100 shadow-sm transition hover:border-rose-300/50 hover:bg-rose-500/25 hover:text-white"
                                            onClick={(event) => {
                                              event.stopPropagation();
                                              (async () => {
                                                const confirmed = await confirmModal({
                                                  title: "Seansı Sil",
                                                  message: "Bu seansı programdan silmek istediğinize emin misiniz?",
                                                  variant: "danger",
                                                  confirmText: "Seansı Sil",
                                                  cancelText: "Vazgeç",
                                                });
                                                if (confirmed) {
                                                  archiveSession(session.id);
                                                }
                                              })();
                                            }}
                                            aria-label="Seansi sil"
                                          >
                                            <X className="size-2.5" />
                                            Sil
                                          </button>
                                        ) : null}
                                        <div className="flex items-center justify-between gap-2 pr-14">
                                          <div className="text-[15px] font-semibold text-white">
                                            {session.student.firstName} {session.student.lastName}
                                          </div>
                                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-neutral-400 font-semibold shrink-0">
                                            {sessionTypeLabels[session.sessionType]}
                                          </span>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between text-xs text-neutral-400">
                                          <div>Öğretmen: {session.teacher?.name || "Atanmadı"}</div>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Daily Grid Desktop View */}
                        <div className="mt-6 hidden overflow-x-auto lg:block">
                          <div 
                            className="overflow-hidden rounded-[var(--panel-radius-card)] border border-white/15 bg-black/20"
                            style={{ minWidth: `${180 + dailyTeachers.length * 160}px` }}
                          >
                            <div 
                              className="grid bg-black/30"
                              style={{
                                gridTemplateColumns: `180px repeat(${dailyTeachers.length}, minmax(160px, 1fr))`
                              }}
                            >
                              <div className="flex items-center border-b border-r border-white/20 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-neutral-300">
                                Saatler
                              </div>
                              {dailyTeachers.map((teacher) => (
                                <div
                                  key={teacher.id}
                                  className="border-b border-r border-white/20 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-neutral-100 last:border-r-0"
                                >
                                  <div>{teacher.name}</div>
                                  {teacher.branch ? (
                                    <div className="text-[10px] font-normal text-neutral-500 mt-0.5">{teacher.branch}</div>
                                  ) : (
                                    <div className="text-[10px] font-normal text-neutral-600 mt-0.5">-</div>
                                  )}
                                </div>
                              ))}

                              {timeSlots.map((slot) => [
                                <div
                                  key={`${slot.id}-label`}
                                  className="flex flex-col justify-center border-r border-t border-white/20 bg-black/25 px-3 py-3 text-sm text-neutral-300"
                                >
                                  <div className="font-semibold text-white text-sm leading-none">
                                    {formatTimeRange(slot.startTime, slot.durationMinutes)}
                                  </div>
                                  <div className="mt-1 text-[11px] text-neutral-500">
                                    {slot.name}
                                  </div>
                                </div>,
                                ...dailyTeachers.map((teacher) => {
                                  const cellKey = `${slot.id}:${teacher.id}`;
                                  const cellSessions = dailyGroupedSessions[cellKey] ?? [];

                                  return (
                                    <div
                                      key={`${slot.id}-${teacher.id}`}
                                      className={cn(
                                        "min-h-[78px] border-r border-t border-white/15 px-2 py-2 transition last:border-r-0 hover:bg-white/[0.04]",
                                        (draggingStudentId || draggingSessionId) && "bg-sky-500/[0.03] ring-1 ring-inset ring-sky-400/20",
                                      )}
                                      onDragOver={(event) => {
                                        if (!canManage) return;
                                        event.preventDefault();
                                        event.dataTransfer.dropEffect = draggingSessionId ? "move" : "copy";
                                      }}
                                      onDrop={(event) => {
                                        if (!canManage) return;
                                        event.preventDefault();
                                        const studentId = readDragData(event, studentDragType);
                                        const targetTeacherId = teacher.id === "unassigned" ? "" : teacher.id;
                                        if (studentId) {
                                          setDraggingStudentId("");
                                          startDropCreate(studentId, focusDate, slot, targetTeacherId);
                                          return;
                                        }

                                        const sessionId = readDragData(event, sessionDragType);
                                        if (sessionId) {
                                          setDraggingSessionId("");
                                          startDropMove(sessionId, focusDate, slot, targetTeacherId);
                                        }
                                      }}
                                    >
                                      {cellSessions.length > 0 ? (
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                          <div className="text-[8px] uppercase tracking-[0.18em] text-neutral-600 font-bold leading-none">
                                            {cellSessions.length} SEANS
                                          </div>
                                        </div>
                                      ) : null}

                                      <div className="grid gap-1">
                                        {cellSessions.map((session) => renderDailySessionCard(session))}
                                      </div>
                                    </div>
                                  );
                                })
                              ])}
                            </div>
                          </div>
                        </div>
                  </>
                )}
              </div>

          </div>
        </div>
      ) : null}

      {workspace === "yerlesim" && canManage ? (
        <div className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Seans Düzenleme
            </div>
            <div className="mt-2 text-lg font-semibold text-white">
              {sessionForm.id ? "Seçili seansi duzenleyin" : "Yeni seans ayrintisi"}
            </div>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Gridden bir hucre veya seans secerek bu alani hizli düzenleme için kullanin.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Öğrenci">
                <select
                  className={inputClassName()}
                  value={sessionForm.studentId}
                  onChange={(event) =>
                    setSessionForm((current) => ({ ...current, studentId: event.target.value }))
                  }
                >
                  <option value="">Öğrenci seçin</option>
                  {allStudents.map((student) => (
                    <option key={student.id} value={student.id}>
                      {formatStudent(student)} {student.classroom ? `(${student.classroom})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Öğretmen">
                <select
                  className={inputClassName()}
                  value={sessionForm.teacherId}
                  onChange={(event) =>
                    setSessionForm((current) => ({ ...current, teacherId: event.target.value }))
                  }
                >
                  <option value="">Öğretmen seçin</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name} {teacher.branch ? `(${teacher.branch})` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tarih">
                <input
                  type="date"
                  className={inputClassName()}
                  value={sessionForm.sessionDate}
                  onChange={(event) =>
                    setSessionForm((current) => ({ ...current, sessionDate: event.target.value }))
                  }
                />
              </Field>

              <Field label="Ders saati">
                <select
                  className={inputClassName()}
                  value={sessionForm.timeSlotId}
                  onChange={(event) => {
                    const nextTimeSlotId = event.target.value;
                    const selectedSlot = timeSlots.find((slot) => slot.id === nextTimeSlotId);
                    setSessionForm((current) => ({
                      ...current,
                      timeSlotId: nextTimeSlotId,
                      startTime: selectedSlot?.startTime ?? current.startTime,
                      durationMinutes: selectedSlot?.durationMinutes ?? current.durationMinutes,
                    }));
                  }}
                >
                  <option value="" disabled>Ders saati seçin</option>
                  {timeSlots.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.name} / {formatTimeRange(slot.startTime, slot.durationMinutes)}
                    </option>
                  ))}
                </select>
              </Field>


              <Field label="Seans tipi">
                <select
                  className={inputClassName()}
                  value={sessionForm.sessionType}
                  onChange={(event) =>
                    setSessionForm((current) => ({
                      ...current,
                      sessionType: event.target.value as SessionType,
                    }))
                  }
                >
                  {Object.entries(sessionTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Durum">
                <select
                  className={inputClassName()}
                  value={sessionForm.status}
                  onChange={(event) =>
                    setSessionForm((current) => ({
                      ...current,
                      status: event.target.value as SessionStatus,
                    }))
                  }
                >
                  {Object.entries(sessionStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Devam doğrulaması">
                <label className="flex min-h-11 items-center gap-3 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-neutral-300">
                  <input
                    type="checkbox"
                    checked={sessionForm.attendanceVerified}
                    onChange={(event) =>
                      setSessionForm((current) => ({
                        ...current,
                        attendanceVerified: event.target.checked,
                      }))
                    }
                  />
                  BKDS / biyometrik devam doğrulandı
                </label>
              </Field>

              <Field label="Doğrulama referansı">
                <input
                  className={inputClassName()}
                  value={sessionForm.attendanceVerificationReference}
                  onChange={(event) =>
                    setSessionForm((current) => ({
                      ...current,
                      attendanceVerificationReference: event.target.value,
                    }))
                  }
                  placeholder="Örn. BKDS-2026-000123"
                />
              </Field>

              <Field label="Devam durumu" hint="Geldi/gelmedi/mazeretli gibi yoklama sonucu">
                <select
                  className={inputClassName()}
                  value={sessionForm.attendanceOutcome}
                  onChange={(event) =>
                    setSessionForm((current) => ({
                      ...current,
                      attendanceOutcome: event.target.value as AttendanceOutcome | "",
                    }))
                  }
                >
                  <option value="">Belirtilmedi</option>
                  {Object.entries(attendanceOutcomeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              {sessionForm.sessionType === "makeup" ? (
                <Field label="Telafi türü" hint="Hangi eğitim türünün telafisi (haftalık/aylık limit için)">
                  <select
                    className={inputClassName()}
                    value={sessionForm.makeupEducationType}
                    onChange={(event) =>
                      setSessionForm((current) => ({
                        ...current,
                        makeupEducationType: event.target.value as "individual" | "group" | "",
                      }))
                    }
                  >
                    <option value="" disabled>
                      Telafi türü seçin
                    </option>
                    {Object.entries(makeupEducationTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}

              {sessionForm.sessionType === "makeup" ? (
                <Field label="Telafi dayanak referansı" className="md:col-span-2">
                  <input
                    className={inputClassName()}
                    value={sessionForm.makeupReference}
                    onChange={(event) =>
                      setSessionForm((current) => ({
                        ...current,
                        makeupReference: event.target.value,
                      }))
                    }
                    placeholder="Onay, tutanak veya önceki seans referansı"
                  />
                </Field>
              ) : null}

              <Field label="Notlar" className="md:col-span-2">
                <textarea
                  className={cn(inputClassName(), "min-h-24")}
                  value={sessionForm.notes}
                  onChange={(event) =>
                    setSessionForm((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Hedef, materyal, notlar"
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button disabled={isPending} onClick={startSessionSave}>
                {isPending
                  ? "Kaydediliyor..."
                  : sessionForm.id
                    ? "Seansi Güncelle"
                    : "Seans Ekle"}
              </Button>
              {sessionForm.id ? (
                <Button
                  variant="ghost"
                  onClick={async () => {
                    const currentSessionId = sessionForm.id;
                    if (!currentSessionId) {
                      return;
                    }
                    const confirmed = await confirmModal({
                      title: "Seansı Sil",
                      message: "Bu seansı programdan silmek istediğinize emin misiniz?",
                      variant: "danger",
                      confirmText: "Seansı Sil",
                      cancelText: "Vazgeç",
                    });
                    if (confirmed) {
                      archiveSession(currentSessionId);
                    }
                  }}
                >
                  Seansi Sil
                </Button>
              ) : null}
              <Button variant="ghost" onClick={resetSessionForm}>
                Temizle
              </Button>
            </div>

            {sessionMessage ? <div className="mt-3 text-sm text-neutral-400">{sessionMessage}</div> : null}
          </div>

          <div className="grid gap-6">
            <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Seçili Özet
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {selectedStudent ? formatStudent(selectedStudent) : "Öğrenci secilmedi"}
              </div>

              <div className="mt-4 grid gap-3 text-sm text-neutral-300">
                <div>Öğretmen: {selectedTeacher?.name ?? "Secilmedi"}</div>
                <div>Oda: {selectedRoom?.name ?? "Secilmedi"}</div>
                <div>Tarih: {sessionForm.sessionDate || "-"}</div>
                <div>
                  Saat: {formatTimeRange(sessionForm.startTime, sessionForm.durationMinutes)}
                </div>
                <div>Tip: {sessionTypeLabels[sessionForm.sessionType]}</div>
                <div>Durum: {sessionStatusLabels[sessionForm.status]}</div>
              </div>
            </div>

            <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Hizli Öğrenci Secimi
              </div>
              <div className="mt-2 text-lg font-semibold text-white">Listeden seçin</div>
              <div className="mt-4">
                <input
                  className={inputClassName()}
                  value={studentSearch}
                  onChange={(event) => setStudentSearch(event.target.value)}
                  placeholder="Öğrenci adı veya sınıf ara"
                />
              </div>
              <div className="mt-4 grid max-h-[420px] gap-3 overflow-y-auto pr-1">
                {filteredStudents.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() =>
                      setSessionForm((current) => ({
                        ...current,
                        studentId: student.id,
                      }))
                    }
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left transition",
                      sessionForm.studentId === student.id
                        ? "border-white/30 bg-white/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
                    )}
                  >
                    <div className="font-semibold text-white">
                      {student.firstName} {student.lastName}
                    </div>
                    <div className="mt-1 text-xs text-neutral-500">
                      {student.classroom || "Sınıf bilgisi yok"}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {workspace === "saatler" && canManage ? (
        <div className="grid gap-6">
          <div className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
          <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Saat Bloğu Ekle
            </div>
            <div className="mt-2 text-lg font-semibold text-white">Günlük plan bloklarını düzenleyin</div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="Başlık">
                <input
                  className={inputClassName()}
                  value={timeSlotForm.name}
                  onChange={(event) =>
                    setTimeSlotForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="1. Ders"
                />
              </Field>
              <Field label="Başlangıç">
                <input
                  type="time"
                  className={inputClassName()}
                  value={timeSlotForm.startTime}
                  onChange={(event) =>
                    setTimeSlotForm((current) => ({ ...current, startTime: event.target.value }))
                  }
                />
              </Field>
              <Field label="Süre (dk)">
                <input
                  type="number"
                  min={15}
                  max={180}
                  step={5}
                  className={inputClassName()}
                  value={timeSlotForm.durationMinutes}
                  onChange={(event) =>
                    setTimeSlotForm((current) => ({
                      ...current,
                      durationMinutes: Number(event.target.value),
                    }))
                  }
                />
              </Field>
              <Field label="Sıra">
                <input
                  type="number"
                  min={0}
                  className={inputClassName()}
                  value={timeSlotForm.sortOrder}
                  onChange={(event) =>
                    setTimeSlotForm((current) => ({
                      ...current,
                      sortOrder: Number(event.target.value),
                    }))
                  }
                />
              </Field>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button disabled={isPending} onClick={startTimeSlotSave}>
                {isPending
                  ? "Kaydediliyor..."
                  : timeSlotForm.id
                    ? "Saati Güncelle"
                    : "Saat Ekle"}
              </Button>
              {timeSlotForm.id ? (
                <Button variant="ghost" onClick={resetTimeSlotForm}>
                  Vazgeç
                </Button>
              ) : null}
            </div>

            {timeSlotMessage ? <div className="mt-3 text-sm text-neutral-400">{timeSlotMessage}</div> : null}
          </div>

          <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Aktif Saatler
            </div>
            <div className="mt-2 text-lg font-semibold text-white">Gridde görünen bloklar</div>

            <div className="mt-6 grid gap-3">
              {timeSlots.map((slot) => (
                <div key={slot.id} className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">{slot.name}</div>
                      <div className="mt-1 text-sm text-neutral-500">
                        {formatTimeRange(slot.startTime, slot.durationMinutes)}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setTimeSlotForm({
                            id: slot.id,
                            name: slot.name,
                            startTime: slot.startTime,
                            durationMinutes: slot.durationMinutes,
                            sortOrder: slot.sortOrder,
                          })
                        }
                      >
                        Düzenle
                      </Button>
                      <Button
                        variant="danger"
                        disabled={isPending}
                        onClick={() => {
                          (async () => {
                            const confirmed = await confirmModal({
                              title: "Ders Saatini Sil",
                              message: `"${slot.name}" ders saatini silmek istediğinize emin misiniz?`,
                              variant: "danger",
                              confirmText: "Kalıcı Olarak Sil",
                              cancelText: "Vazgeç",
                            });
                            if (!confirmed) return;
                            startTransition(async () => {
                              const result = await deleteSessionTimeSlotAction({ id: slot.id });
                            setTimeSlotMessage(result.message);
                            showResult(result, {
                              successTitle: "Ders saati silindi",
                              errorTitle: "Ders saati silinemedi",
                            });
                            if (result.success) {
                              if (timeSlotForm.id === slot.id) {
                                resetTimeSlotForm();
                              }
                              router.refresh();
                            }
                          });
                        })();
                      }}
                      >
                        Sil
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      ) : null}


      {workspace === "hızlı-not" ? (
        <div className="grid gap-6 2xl:grid-cols-[360px_1fr]">
          <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
              Seans Listesi
            </div>
            <div className="mt-2 text-lg font-semibold text-white">Not girilecek seansi seçin</div>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Kısa notu, seans sonucu ve gerekiyorsa sonraki adimi bu alandan hizlica kaydedin.
            </p>

            <div className="mt-5 grid max-h-[620px] gap-3 overflow-y-auto pr-1">
              {quickNoteSessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-sm text-neutral-500">
                  Hızlı not eklenebilecek seans bulunmuyor.
                </div>
              ) : (
                quickNoteSessions.map((session) => {
                  const isSelected = session.id === selectedQuickNoteSessionId;

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => openQuickNoteSession(session)}
                      className={cn(
                        "rounded-2xl border px-4 py-4 text-left transition",
                        isSelected
                          ? "border-white/20 bg-white/[0.08]"
                          : "border-white/10 bg-black/20 hover:bg-white/[0.05]",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold text-white">
                            {session.student.firstName} {session.student.lastName}
                          </div>
                          <div className="mt-1 text-xs text-neutral-400">
                            {formatDateLabel(session.sessionDate)} /{" "}
                            {formatTimeRange(session.startTime, session.durationMinutes)}
                          </div>
                        </div>
                        <div className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-neutral-300">
                          {sessionStatusLabels[session.status]}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-1 text-xs text-neutral-400">
                        <div>{sessionTypeLabels[session.sessionType]}</div>
                        <div>{session.teacher?.name ?? "Öğretmen atanamadı"}</div>
                        <div>{session.room?.name ?? "Oda belirtilmedi"}</div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                  Hızlı Not
                </div>
                <div className="mt-2 text-lg font-semibold text-white">Seans sonucu ve kısa açıklama</div>
              </div>
              {selectedQuickNoteSession ? (
                <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-300">
                  {selectedQuickNoteSession.student.firstName} {selectedQuickNoteSession.student.lastName}
                </div>
              ) : null}
            </div>

            {selectedQuickNoteSession ? (
              <>
                <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Tarih</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {formatDateLabel(selectedQuickNoteSession.sessionDate)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Saat</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {formatTimeRange(
                        selectedQuickNoteSession.startTime,
                        selectedQuickNoteSession.durationMinutes,
                      )}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Öğretmen</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {selectedQuickNoteSession.teacher?.name ?? "Belirtilmedi"}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
                    <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Oda</div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {selectedQuickNoteSession.room?.name ?? "Belirtilmedi"}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-[220px_1fr]">
                  <Field label="Seans sonucu">
                    <select
                      className={inputClassName()}
                      value={quickNoteForm.status}
                      onChange={(event) =>
                        setQuickNoteForm((current) => ({
                          ...current,
                          status: event.target.value as SessionStatus,
                        }))
                      }
                    >
                      {Object.entries(sessionStatusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Kısa seans notu">
                    <textarea
                      rows={7}
                      className={cn(inputClassName(), "resize-none")}
                      placeholder="Bugün neler çalışıldığını ve dikkat edilmesi gereken kısa notu yazın."
                      value={quickNoteForm.notes}
                      onChange={(event) =>
                        setQuickNoteForm((current) => ({ ...current, notes: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button disabled={isPending || !quickNoteForm.id} onClick={startQuickNoteSave}>
                    {isPending ? "Kaydediliyor..." : "Notu Kaydet"}
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={!selectedQuickNoteSession}
                    onClick={() =>
                      setQuickNoteForm({
                        id: selectedQuickNoteSession.id,
                        status: selectedQuickNoteSession.status,
                        notes: selectedQuickNoteSession.notes ?? "",
                      })
                    }
                  >
                    Temizle
                  </Button>
                </div>

                {quickNoteMessage ? (
                  <div className="mt-3 text-sm text-neutral-400">{quickNoteMessage}</div>
                ) : null}
              </>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
                Sağ tarafta not girmek için önce bir seans seçin.
              </div>
            )}
          </div>
        </div>
      ) : null}

      {workspace === "geçmiş" ? (
        <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-neutral-500">
                Geçmiş Kayıtlar
              </div>
              <div className="mt-2 text-lg font-semibold text-white">
                {formatDateLabel(focusDate)} gününden çıkarılan seanslar
              </div>
            </div>
            <div className="text-sm text-neutral-500">{filteredHistorySessions.length} kayıt</div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <input
              className={inputClassName()}
              value={historySearch}
              onChange={(event) => setHistorySearch(event.target.value)}
              placeholder="Öğrenci, öğretmen veya not ara"
            />
            <select
              className={inputClassName()}
              value={historyTeacherFilter}
              onChange={(event) => setHistoryTeacherFilter(event.target.value)}
            >
              <option value="">Tüm öğretmenler</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-6 grid gap-3">
            {filteredHistorySessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
                Bu günden çıkarılmış seans kaydı bulunmuyor.
              </div>
            ) : (
              filteredHistorySessions.map((session) => (
                <div key={session.id} className={cn("rounded-2xl border px-4 py-4", getSessionTone(session))}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-white">
                        {session.student.firstName} {session.student.lastName}
                      </div>
                      <div className="mt-1 text-sm text-neutral-400">
                        {formatDateLabel(session.sessionDate)} /{" "}
                        {formatTimeRange(session.startTime, session.durationMinutes)} /{" "}
                        {sessionTypeLabels[session.sessionType]}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="rounded-full border border-white/10 px-3 py-1 text-xs text-neutral-300">
                        {session.deletedAt ? "Arşiv" : sessionStatusLabels[session.status]}
                      </div>
                      {canManage && !session.deletedAt ? (
                        <Button
                          variant="danger"
                          onClick={() => {
                            (async () => {
                              const confirmed = await confirmModal({
                                title: "Seansı Sil",
                                message: "Bu seansı programdan silmek istediğinize emin misiniz?",
                                variant: "danger",
                                confirmText: "Seansı Sil",
                                cancelText: "Vazgeç",
                              });
                              if (confirmed) {
                                archiveSession(session.id);
                              }
                            })();
                          }}
                        >
                          Sil
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 text-sm text-neutral-400 md:grid-cols-2 2xl:grid-cols-3">
                    <div>Öğretmen: {session.teacher?.name ?? "Atanmadı"}</div>
                    <div>Oluşturan: {session.createdBy.name ?? "-"}</div>
                    <div>Son güncelleyen: {session.updatedBy?.name ?? session.createdBy.name ?? "-"}</div>
                  </div>

                  {session.notes ? (
                    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-sm text-neutral-300">
                      {session.notes}
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
