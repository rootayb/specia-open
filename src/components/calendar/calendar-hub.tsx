"use client";

import type { CalendarEventScope, UserRole } from "@/lib/prisma-shim";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  ListTodo,
  PlusSquare,
  FileText,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { deleteCalendarEventAction, saveCalendarEventAction } from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import type { CalendarEventInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

type CalendarEventRecord = {
  id: string;
  title: string;
  description: string | null;
  scope: CalendarEventScope;
  startAt: Date;
  endAt: Date;
  assignedUserId: string | null;
  studentId: string | null;
  assignedUser: { id: string; name: string; email: string } | null;
  owner: { id: string; name: string; email: string };
  student: { id: string; firstName: string; lastName: string; classroom: string | null } | null;
};

type SessionRecord = {
  id: string;
  sessionDate: Date;
  startTime: string;
  durationMinutes: number;
  sessionType: string;
  status: string;
  student: { id: string; firstName: string; lastName: string; classroom: string | null };
  teacher: { id: string; name: string; branch: string | null } | null;
  room: { id: string; name: string; color: string | null } | null;
};

type FormOption = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  classroom?: string | null;
};

type UpcomingItem = {
  type: "event" | "session";
  startsAt: Date;
  title: string;
  subtitle: string;
};

type TimelineItem = {
  id: string;
  type: "event" | "session";
  startsAt: Date;
  endsAt: Date;
  title: string;
  subtitle: string;
  badge: string;
  note?: string | null;
  meta: string[];
  canEdit?: boolean;
  event?: CalendarEventRecord;
  session?: SessionRecord;
};

type WorkspaceId = "day" | "month" | "event" | "upcoming";

const scopeLabels: Record<CalendarEventScope, string> = {
  institution: "Kurum",
  personal: "Kişisel",
};

const sessionTypeLabels: Record<string, string> = {
  individual: "Bireysel",
  group: "Grup",
  speech: "Dil Konuşma",
  occupational: "Ergoterapi",
  psychomotor: "Psikomotor",
  resource_room: "Kaynak Oda",
  makeup: "Telafi",
  parent_meeting: "Veli Görüşmesi",
};

const sessionStatusLabels: Record<string, string> = {
  planned: "Planlandı",
  completed: "Tamamlandı",
  cancelled: "İptal",
};

const workspaceOptions = [
  { id: "day" as const, label: "Gun", icon: ListTodo },
  { id: "month" as const, label: "Ay", icon: CalendarDays },
  { id: "event" as const, label: "Etkinlik", icon: PlusSquare },
  { id: "upcoming" as const, label: "Yaklasan", icon: Clock3 },
];

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function formatDateKey(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function formatMonthTitle(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(value);
}

function formatDayTitle(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(value);
}

function formatWeekday(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { weekday: "short" }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(value);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function formatDateTimeLocal(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
}

function isSameDay(left: Date, right: Date) {
  return formatDateKey(left) === formatDateKey(right);
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function startOfWeek(value: Date) {
  const date = new Date(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildWeekDays(selectedDate: Date) {
  const first = startOfWeek(selectedDate);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

function buildMonthDays(selectedDate: Date) {
  const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  const first = startOfWeek(monthStart);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    return date;
  });
}

function emptyForm(selectedDate: Date): CalendarEventInput {
  const startAt = new Date(selectedDate);
  startAt.setHours(9, 0, 0, 0);
  const endAt = new Date(startAt);
  endAt.setHours(10, 0, 0, 0);
  return {
    title: "",
    description: "",
    scope: "personal",
    assignedUserId: "",
    studentId: "",
    startAt: formatDateTimeLocal(startAt),
    endAt: formatDateTimeLocal(endAt),
  };
}

export function CalendarHub({
  currentUserId,
  selectedDate,
  events,
  sessions,
  agendaEvents,
  agendaSessions,
  assignableUsers,
  students,
  upcomingItems,
  canCreateInstitutionEvents,
  canManageInstitutionEvents,
  canCreatePersonalEvents,
  canManageSessions,
}: {
  currentUserId: string;
  selectedDate: Date;
  events: CalendarEventRecord[];
  sessions: SessionRecord[];
  agendaEvents: CalendarEventRecord[];
  agendaSessions: SessionRecord[];
  assignableUsers: FormOption[];
  students: FormOption[];
  upcomingItems: UpcomingItem[];
  canCreateInstitutionEvents: boolean;
  canManageInstitutionEvents: boolean;
  canCreatePersonalEvents: boolean;
  canManageSessions: boolean;
}) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [workspace, setWorkspace] = useState<WorkspaceId>("day");
  const [form, setForm] = useState<CalendarEventInput>(emptyForm(selectedDate));
  const [isPending, startTransition] = useTransition();

  const weekDays = useMemo(() => buildWeekDays(selectedDate), [selectedDate]);
  const monthDays = useMemo(() => buildMonthDays(selectedDate), [selectedDate]);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const event of events) {
      const key = formatDateKey(new Date(event.startAt));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    for (const session of sessions) {
      const key = formatDateKey(new Date(session.sessionDate));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events, sessions]);

  const timelineItems = useMemo(() => {
    const eventItems: TimelineItem[] = agendaEvents.map((event) => ({
      id: event.id,
      type: "event",
      startsAt: new Date(event.startAt),
      endsAt: new Date(event.endAt),
      title: event.title,
      subtitle: event.student
        ? `${event.student.firstName} ${event.student.lastName}`
        : event.assignedUser?.name ?? event.owner.name,
      badge: scopeLabels[event.scope],
      note: event.description,
      meta: [
        `Sahibi: ${event.assignedUser?.name ?? event.owner.name}`,
        `Bitis: ${formatTime(new Date(event.endAt))}`,
      ],
      canEdit:
        event.owner.id === currentUserId ||
        (event.scope === "institution" && canManageInstitutionEvents),
      event,
    }));

    const sessionItems: TimelineItem[] = agendaSessions.map((session) => {
      const startsAt = new Date(session.sessionDate);
      const [hours, minutes] = session.startTime.split(":").map(Number);
      startsAt.setHours(hours, minutes, 0, 0);
      const endsAt = addMinutes(startsAt, session.durationMinutes);
      return {
        id: session.id,
        type: "session",
        startsAt,
        endsAt,
        title: `${session.student.firstName} ${session.student.lastName}`,
        subtitle: session.teacher?.name ?? "Öğretmen bekleniyor",
        badge: sessionTypeLabels[session.sessionType] ?? session.sessionType,
        note: session.room?.name ? `Oda: ${session.room.name}` : null,
        meta: [
          `Durum: ${sessionStatusLabels[session.status] ?? session.status}`,
          `Bitis: ${formatTime(endsAt)}`,
        ],
        session,
      };
    });

    return [...eventItems, ...sessionItems].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  }, [agendaEvents, agendaSessions, canManageInstitutionEvents, currentUserId]);

  const openDate = (date: Date | string) => {
    const key = typeof date === "string" ? date : formatDateKey(date);
    router.push(`/panel/takvim?date=${key}`);
  };

  const openEditor = (event?: CalendarEventRecord) => {
    if (event) {
      setForm({
        id: event.id,
        title: event.title,
        description: event.description ?? "",
        scope: event.scope,
        assignedUserId: event.assignedUserId ?? "",
        studentId: event.studentId ?? "",
        startAt: formatDateTimeLocal(new Date(event.startAt)),
        endAt: formatDateTimeLocal(new Date(event.endAt)),
      });
    } else {
      setForm(emptyForm(selectedDate));
    }
    setWorkspace("event");
  };

  const saveEvent = () => {
    startTransition(async () => {
      const result = await saveCalendarEventAction(form);
      showResult(result, {
        successTitle: form.id ? "Takvim kaydı guncellendi" : "Takvim kaydı eklendi",
        errorTitle: form.id ? "Takvim kaydı guncellenemedi" : "Takvim kaydı eklenemedi",
      });
      if (result.success) {
        setForm(emptyForm(selectedDate));
        setWorkspace("day");
        router.refresh();
      }
    });
  };

  const deleteEvent = (eventId: string) => {
    startTransition(async () => {
      const result = await deleteCalendarEventAction({ id: eventId });
      showResult(result, {
        successTitle: "Takvim kaydı silindi",
        errorTitle: "Takvim kaydı silinemedi",
      });
      if (result.success) {
        if (form.id === eventId) {
          setForm(emptyForm(selectedDate));
        }
        router.refresh();
      }
    });
  };

  const activeWorkspaces = workspaceOptions.filter((item) => canCreatePersonalEvents || item.id !== "event");

  return (
    <div className="grid gap-6">
      <div className="rounded-[32px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.07),transparent_52%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.015))] p-4 shadow-[0_30px_110px_-58px_rgba(0,0,0,0.95)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.32em] text-neutral-500">Takvim</div>
            <div className="mt-2 text-[2.15rem] font-medium tracking-[-0.065em] text-white sm:text-[2.55rem]">{formatMonthTitle(selectedDate)}</div>
            <div className="mt-1 text-[13px] font-medium text-neutral-400">{formatDayTitle(selectedDate)}</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => { const next = new Date(selectedDate); next.setMonth(next.getMonth() - 1); next.setDate(1); openDate(next); }}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="ghost" onClick={() => openDate(new Date())}>Bugun</Button>
            <Button variant="ghost" onClick={() => { const next = new Date(selectedDate); next.setMonth(next.getMonth() + 1); next.setDate(1); openDate(next); }}>
              <ChevronRight className="size-4" />
            </Button>
            <Link href={`/api/pdf/calendar?date=${formatDateKey(selectedDate)}`} target="_blank" rel="noreferrer">
              <Button variant="outline">
                <FileText className="size-4 mr-2" />
                PDF
              </Button>
            </Link>
            {canCreatePersonalEvents ? (
              <Button onClick={() => openEditor()}>
                <PlusSquare className="mr-2 size-4" />
                Yeni
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-1.5 rounded-[var(--panel-radius-card)] border border-white/8 bg-black/18 p-1.5">
          {activeWorkspaces.map((item) => {
            const Icon = item.icon;
            const active = workspace === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setWorkspace(item.id)}
                className={cn(
                  "inline-flex min-h-10 items-center gap-2 rounded-[18px] px-3.5 py-2 text-[13px] font-medium tracking-[-0.01em] transition",
                  active
                    ? "bg-white text-black shadow-[0_16px_40px_-28px_rgba(255,255,255,0.65)]"
                    : "text-neutral-400 hover:bg-white/[0.045] hover:text-white",
                )}
              >
                <Icon className="size-[15px]" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-5 overflow-x-auto">
          <div className="flex min-w-max gap-2 pb-1">
            {weekDays.map((date) => {
              const active = isSameDay(date, selectedDate);
              const count = countsByDay.get(formatDateKey(date)) ?? 0;
              return (
                <button
                  key={formatDateKey(date)}
                  type="button"
                  onClick={() => openDate(date)}
                  className={cn(
                    "flex min-w-[72px] flex-col items-center rounded-[var(--panel-radius-card)] border px-3 py-3 transition",
                    active
                      ? "border-white/85 bg-white text-black shadow-[0_18px_42px_-30px_rgba(255,255,255,0.6)]"
                      : "border-white/8 bg-white/[0.025] text-neutral-200 hover:border-white/16 hover:bg-white/[0.04]",
                  )}
                >
                  <div className={cn("text-[10px] uppercase tracking-[0.22em]", active ? "text-black/50" : "text-neutral-500")}>{formatWeekday(date)}</div>
                  <div className="mt-1.5 text-[22px] font-medium tracking-[-0.04em]">{date.getDate()}</div>
                  <div className="mt-2 flex min-h-4 items-center gap-1">
                    {count > 0 ? Array.from({ length: Math.min(3, count) }).map((_, i) => (
                      <span key={i} className={cn("size-1.5 rounded-full", active ? "bg-black/58" : "bg-white/72")} />
                    )) : <span className={cn("text-[10px] tracking-[0.12em]", active ? "text-black/40" : "text-neutral-600")}>bos</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {workspace === "month" ? (
        <div className="grid gap-6 2xl:grid-cols-[1.08fr_0.92fr]">
          <div className="rounded-[32px] border border-white/8 bg-white/[0.025] p-5">
            <div className="mb-5 text-[22px] font-medium tracking-[-0.04em] text-white">{formatMonthTitle(selectedDate)}</div>
            <div className="grid grid-cols-7 gap-2 text-center text-[10px] uppercase tracking-[0.22em] text-neutral-500">
              {["Pzt", "Sal", "Car", "Per", "Cum", "Cmt", "Paz"].map((label) => <div key={label} className="py-2">{label}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {monthDays.map((date) => {
                const active = isSameDay(date, selectedDate);
                const count = countsByDay.get(formatDateKey(date)) ?? 0;
                return (
                  <button
                    key={formatDateKey(date)}
                  type="button"
                  onClick={() => openDate(date)}
                  className={cn(
                      "min-h-[90px] rounded-[var(--panel-radius-card)] border px-2.5 py-3 text-left transition sm:min-h-[104px] sm:px-3",
                      active
                        ? "border-white/85 bg-white text-black shadow-[0_18px_44px_-34px_rgba(255,255,255,0.58)]"
                        : "border-white/8 bg-black/16 hover:border-white/16 hover:bg-white/[0.04]",
                      date.getMonth() !== selectedDate.getMonth() && !active ? "text-neutral-500" : "",
                    )}
                  >
                    <div className="text-sm font-medium">{date.getDate()}</div>
                    <div className="mt-3 flex gap-1">{Array.from({ length: Math.min(4, count) }).map((_, i) => <span key={i} className={cn("size-1.5 rounded-full", active ? "bg-black/65" : "bg-white/70")} />)}</div>
                    {count > 0 ? <div className={cn("mt-3 text-[11px]", active ? "text-black/60" : "text-neutral-500")}>{count} kayıt</div> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/8 bg-white/[0.025] p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">Seçili Gun</div>
            <div className="mt-2 text-[22px] font-medium tracking-[-0.04em] text-white">{formatDayTitle(selectedDate)}</div>
            <div className="mt-5 grid gap-3">
              {timelineItems.length === 0 ? <div className="rounded-[var(--panel-radius-card)] border border-dashed border-white/10 px-5 py-14 text-sm text-neutral-500">Bu gunde kayıt yok.</div> : timelineItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="rounded-[var(--panel-radius-card)] border border-white/8 bg-black/16 px-4 py-4">
                  <div className="text-sm text-neutral-500">{formatTime(item.startsAt)}</div>
                  <div className="mt-1 text-[17px] font-medium tracking-[-0.03em] text-white">{item.title}</div>
                  <div className="mt-1 text-[13px] text-neutral-400">{item.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {workspace === "day" ? (
        <div className="grid gap-6 2xl:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[32px] border border-white/8 bg-white/[0.025] p-5">
            <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">Gun Özeti</div>
            <div className="mt-2 text-[26px] font-medium tracking-[-0.055em] text-white">{formatDayTitle(selectedDate)}</div>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-3 2xl:grid-cols-1">
              <div className="rounded-[var(--panel-radius-card)] border border-white/8 bg-black/16 px-4 py-4"><div className="text-[13px] text-neutral-500">Etkinlik</div><div className="mt-2 text-[30px] font-medium tracking-[-0.05em] text-white">{agendaEvents.length}</div></div>
              <div className="rounded-[var(--panel-radius-card)] border border-white/8 bg-black/16 px-4 py-4"><div className="text-[13px] text-neutral-500">Seans</div><div className="mt-2 text-[30px] font-medium tracking-[-0.05em] text-white">{agendaSessions.length}</div></div>
              <div className="rounded-[var(--panel-radius-card)] border border-white/8 bg-black/16 px-4 py-4"><div className="text-[13px] text-neutral-500">Toplam</div><div className="mt-2 text-[30px] font-medium tracking-[-0.05em] text-white">{timelineItems.length}</div></div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/8 bg-white/[0.025] p-5">
            <div className="flex items-center justify-between gap-3">
              <div><div className="text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">Gun Akışı</div><div className="mt-2 text-[22px] font-medium tracking-[-0.04em] text-white">Zaman cizelgesi</div></div>
              {canCreatePersonalEvents ? <Button variant="ghost" onClick={() => openEditor()}>Bugune kayıt ekle</Button> : null}
            </div>
            <div className="mt-6 grid gap-4">
              {timelineItems.length === 0 ? <div className="rounded-[var(--panel-radius-card)] border border-dashed border-white/10 px-5 py-14 text-sm text-neutral-500">Secilen gunde kayıt yok.</div> : timelineItems.map((item) => (
                <div key={`${item.type}-${item.id}`} className="grid gap-3 sm:grid-cols-[90px_1fr]">
                  <div className="pt-1 text-[13px] text-neutral-500"><div className="font-medium text-white">{formatTime(item.startsAt)}</div><div className="mt-1">{formatTime(item.endsAt)}</div></div>
                  <div className="relative rounded-[var(--panel-radius-card)] border border-white/8 bg-black/18 px-4 py-4">
                    <div className="absolute left-0 top-5 h-9 w-[2px] rounded-r-full bg-white/42" />
                    <div className="ml-2">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><div className="text-[18px] font-medium tracking-[-0.03em] text-white">{item.title}</div><div className="mt-1 text-[13px] text-neutral-400">{item.subtitle}</div></div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-neutral-300">{item.badge}</span>
                          {item.event && item.canEdit ? <><Button variant="ghost" onClick={() => openEditor(item.event)}>Düzenle</Button><Button variant="danger" disabled={isPending} onClick={() => deleteEvent(item.event!.id)}>Sil</Button></> : null}
                          {item.session && canManageSessions ? <Link href={`/panel/seans-programi?date=${formatDateKey(item.session.sessionDate)}`}><Button variant="ghost">Ac</Button></Link> : null}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">{item.meta.map((meta) => <span key={meta} className="rounded-full border border-white/8 bg-white/[0.025] px-3 py-1 text-[11px] text-neutral-400">{meta}</span>)}</div>
                      {item.note ? <div className="mt-3 text-[13px] leading-6 text-neutral-300">{item.note}</div> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {workspace === "event" ? (
        canCreatePersonalEvents ? (
          <div className="grid gap-6 2xl:grid-cols-[0.72fr_1.28fr]">
            <div className="rounded-[32px] border border-white/8 bg-white/[0.025] p-5">
              <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">Seçili Gun</div>
              <div className="mt-2 text-[22px] font-medium tracking-[-0.04em] text-white">{formatDayTitle(selectedDate)}</div>
              <div className="mt-4 text-[13px] leading-7 text-neutral-400">Yeni kaydı secilen gunu baz alarak hizlica olusturun. Isterseniz öğrenciyle baglayin, isterseniz yalnızca takvime not dusun.</div>
            </div>

            <div className="rounded-[32px] border border-white/8 bg-white/[0.025] p-5">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">Etkinlik Formu</div><div className="mt-2 text-[22px] font-medium tracking-[-0.04em] text-white">{form.id ? "Kaydı düzenle" : "Yeni takvim kaydı"}</div></div>
                {form.id ? <Button variant="ghost" onClick={() => setForm(emptyForm(selectedDate))}>Temizle</Button> : null}
              </div>
              <div className="mt-6 grid gap-3.5 lg:grid-cols-2">
                <Field label="Baslik" className="lg:col-span-2"><input className={inputClassName()} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} /></Field>
                <Field label="Takvim türü"><select className={inputClassName()} value={form.scope} onChange={(event) => setForm((current) => ({ ...current, scope: event.target.value as CalendarEventScope, assignedUserId: event.target.value === "institution" ? "" : current.assignedUserId ?? "" }))}><option value="personal">Kişisel</option>{canCreateInstitutionEvents ? <option value="institution">Kurum</option> : null}</select></Field>
                <Field label="Bağlı öğrenci"><select className={inputClassName()} value={form.studentId ?? ""} onChange={(event) => setForm((current) => ({ ...current, studentId: event.target.value }))}><option value="">Baglama</option>{students.map((student) => <option key={student.id} value={student.id}>{student.firstName} {student.lastName}{student.classroom ? ` (${student.classroom})` : ""}</option>)}</select></Field>
                <Field label="Başlangıç"><input type="datetime-local" className={inputClassName()} value={form.startAt} onChange={(event) => setForm((current) => ({ ...current, startAt: event.target.value }))} /></Field>
                <Field label="Bitis"><input type="datetime-local" className={inputClassName()} value={form.endAt} onChange={(event) => setForm((current) => ({ ...current, endAt: event.target.value }))} /></Field>
                {form.scope === "personal" && assignableUsers.length > 0 ? <Field label="Kime ait" className="lg:col-span-2"><select className={inputClassName()} value={form.assignedUserId ?? ""} onChange={(event) => setForm((current) => ({ ...current, assignedUserId: event.target.value }))}><option value="">Kendime</option>{assignableUsers.map((member) => <option key={member.id} value={member.id}>{member.name} {member.email ? `(${member.email})` : ""}</option>)}</select></Field> : null}
                <Field label="Aciklama" className="lg:col-span-2"><textarea className={`${inputClassName()} min-h-28`} value={form.description ?? ""} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></Field>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button disabled={isPending} onClick={saveEvent}>{isPending ? "Kaydediliyor..." : form.id ? "Kaydı Güncelle" : "Takvime Ekle"}</Button>
                <Button variant="ghost" onClick={() => setWorkspace("day")}>Gune don</Button>
              </div>
            </div>
          </div>
        ) : <div className="rounded-[30px] border border-white/10 bg-white/[0.03] p-5 text-sm text-neutral-400">Bu hesap takvimi goruntuleyebilir, yeni kayıt ekleyemez.</div>
      ) : null}

      {workspace === "upcoming" ? (
        <div className="rounded-[32px] border border-white/8 bg-white/[0.025] p-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.28em] text-neutral-500">Yaklasan Kayıtlar</div>
          <div className="mt-2 text-[22px] font-medium tracking-[-0.04em] text-white">Siradaki akis</div>
          <div className="mt-6 grid gap-3">
            {upcomingItems.length === 0 ? <div className="rounded-[var(--panel-radius-card)] border border-dashed border-white/10 px-5 py-14 text-sm text-neutral-500">Yaklasan etkinlik veya seans yok.</div> : upcomingItems.map((item, index) => (
              <div key={`${item.type}-${index}-${item.startsAt.toISOString()}`} className="rounded-[var(--panel-radius-card)] border border-white/8 bg-black/16 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div><div className="text-[18px] font-medium tracking-[-0.03em] text-white">{item.title}</div><div className="mt-1 text-[13px] text-neutral-400">{item.subtitle}</div></div>
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] font-medium text-neutral-300">{item.type === "event" ? "Etkinlik" : "Seans"}</span>
                </div>
                <div className="mt-3 text-[13px] text-neutral-500">{formatDateTime(item.startsAt)}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
