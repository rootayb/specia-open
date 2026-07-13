"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  CheckCheck,
  Clock3,
  FileText,
  ImagePlus,
  MessageCircleMore,
  Paperclip,
  SendHorizonal,
  X,
} from "lucide-react";

import { markParentMessageReadAction, sendParentMessageAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";
import {
  parseParentMessageAttachment,
  type ParentMessageAttachmentMeta,
} from "@/lib/parent-message-attachments";
import { cn } from "@/lib/utils";

type RecipientOption = {
  key: string;
  studentId: string;
  studentName: string;
  studentClassroom: string | null;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: "parent" | "teacher";
};

type MessageRecord = {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  senderId: string;
  recipientId: string;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  };
  sender: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  recipient: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type DraftAttachment = {
  base64: string;
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
};

type ParsedMessageRecord = MessageRecord & {
  cleanBody: string;
  attachment: ParentMessageAttachmentMeta | null;
};

type ThreadRecord = {
  key: string;
  studentId: string;
  studentName: string;
  studentClassroom: string | null;
  counterpartId: string;
  counterpartName: string;
  counterpartRole: "parent" | "teacher" | "admin";
  threadLabel: string;
  preview: string;
  unreadCount: number;
  lastMessageAt: Date | null;
  messages: ParsedMessageRecord[];
};

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function buildThreadCounterpartId(
  message: MessageRecord,
  currentUserId: string,
  isAdminViewer: boolean,
) {
  if (isAdminViewer) {
    return [message.senderId, message.recipientId].sort().join(":");
  }

  return message.senderId === currentUserId ? message.recipientId : message.senderId;
}

function buildThreadRole(role: string) {
  if (role === "parent") {
    return "parent" as const;
  }

  if (role === "teacher") {
    return "teacher" as const;
  }

  return "admin" as const;
}

function buildThreadLabel(message: MessageRecord, currentUserId: string, isAdminViewer: boolean) {
  if (!isAdminViewer) {
    const counterpart = message.senderId === currentUserId ? message.recipient : message.sender;
    return counterpart.name;
  }

  const teacherParticipant =
    message.sender.role === "teacher"
      ? message.sender.name
      : message.recipient.role === "teacher"
        ? message.recipient.name
        : message.sender.name;
  const parentParticipant =
    message.sender.role === "parent"
      ? message.sender.name
      : message.recipient.role === "parent"
        ? message.recipient.name
        : message.recipient.name;

  return `${teacherParticipant} / ${parentParticipant}`;
}

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Dosya okunamadi."));
        return;
      }

      const [, base64 = ""] = result.split(",");
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Dosya okunamadi."));
    reader.readAsDataURL(file);
  });
}

export function ParentMessageHub({
  currentUserId,
  canCompose,
  isAdminViewer,
  recipientOptions,
  messages,
}: {
  currentUserId: string;
  canCompose: boolean;
  isAdminViewer: boolean;
  recipientOptions: RecipientOption[];
  messages: MessageRecord[];
}) {
  const router = useRouter();
  const [activeThreadKey, setActiveThreadKey] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(recipientOptions[0]?.studentId ?? "");
  const [recipientId, setRecipientId] = useState(recipientOptions[0]?.recipientId ?? "");
  const [body, setBody] = useState("");
  const [feedback, setFeedback] = useState("");
  const [attachment, setAttachment] = useState<DraftAttachment | null>(null);
  const [isSending, startSendTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();
  const autoMarkedIdsRef = useRef<Set<string>>(new Set());

  const parsedMessages = useMemo<ParsedMessageRecord[]>(
    () =>
      messages.map((message) => {
        const parsed = parseParentMessageAttachment(message.body);
        return {
          ...message,
          cleanBody: parsed.body,
          attachment: parsed.attachment,
        };
      }),
    [messages],
  );

  const threads = useMemo<ThreadRecord[]>(() => {
    const threadMap = new Map<string, ThreadRecord>();

    for (const message of parsedMessages) {
      const counterpartId = buildThreadCounterpartId(message, currentUserId, isAdminViewer);
      const key = `${message.student.id}:${counterpartId}`;
      const threadLabel = buildThreadLabel(message, currentUserId, isAdminViewer);

      const existing = threadMap.get(key);
      const preview =
        message.cleanBody ||
        (message.attachment?.mimeType?.startsWith("image/")
          ? "Gorsel gönderildi"
          : message.attachment
            ? "Belge gönderildi"
            : "Mesaj");

      if (!existing) {
        threadMap.set(key, {
          key,
          studentId: message.student.id,
          studentName: `${message.student.firstName} ${message.student.lastName}`,
          studentClassroom: message.student.classroom,
          counterpartId,
          counterpartName: threadLabel,
          counterpartRole: buildThreadRole(
            message.senderId === currentUserId ? message.recipient.role : message.sender.role,
          ),
          threadLabel,
          preview,
          unreadCount:
            message.recipientId === currentUserId && !message.readAt && !isAdminViewer ? 1 : 0,
          lastMessageAt: message.createdAt,
          messages: [message],
        });
        continue;
      }

      existing.messages.push(message);
      existing.preview = preview;
      existing.lastMessageAt = message.createdAt;
      if (message.recipientId === currentUserId && !message.readAt && !isAdminViewer) {
        existing.unreadCount += 1;
      }
    }

    for (const option of recipientOptions) {
      const key = `${option.studentId}:${option.recipientId}`;
      if (threadMap.has(key)) {
        continue;
      }

      threadMap.set(key, {
        key,
        studentId: option.studentId,
        studentName: option.studentName,
        studentClassroom: option.studentClassroom,
        counterpartId: option.recipientId,
        counterpartName: option.recipientName,
        counterpartRole: option.recipientRole,
        threadLabel: option.recipientName,
        preview: "Yeni bir mesaj baslatin",
        unreadCount: 0,
        lastMessageAt: null,
        messages: [],
      });
    }

    return Array.from(threadMap.values())
      .map((thread) => ({
        ...thread,
        messages: thread.messages.sort(
          (left, right) =>
            new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
        ),
      }))
      .sort((left, right) => {
        const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
        const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;
        return rightTime - leftTime;
      });
  }, [currentUserId, isAdminViewer, parsedMessages, recipientOptions]);

  const resolvedActiveThreadKey =
    threads.find((thread) => thread.key === activeThreadKey)?.key ?? threads[0]?.key ?? "";

  const activeThread =
    threads.find((thread) => thread.key === resolvedActiveThreadKey) ?? threads[0] ?? null;

  const resolvedStudentId =
    recipientOptions.some((option) => option.studentId === selectedStudentId)
      ? selectedStudentId
      : activeThread?.studentId ?? recipientOptions[0]?.studentId ?? "";

  const availableRecipients = useMemo(
    () => recipientOptions.filter((option) => option.studentId === resolvedStudentId),
    [recipientOptions, resolvedStudentId],
  );

  useEffect(() => {
    return () => {
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
    };
  }, [attachment]);

  useEffect(() => {
    if (!activeThread || isAdminViewer || isSyncing) {
      return;
    }

    const unreadIds = activeThread.messages
      .filter(
        (message) =>
          message.recipientId === currentUserId &&
          !message.readAt &&
          !autoMarkedIdsRef.current.has(message.id),
      )
      .map((message) => message.id);

    if (!unreadIds.length) {
      return;
    }

    unreadIds.forEach((id) => autoMarkedIdsRef.current.add(id));
    startSyncTransition(async () => {
      await Promise.all(unreadIds.map((id) => markParentMessageReadAction({ id })));
      router.refresh();
    });
  }, [activeThread, currentUserId, isAdminViewer, isSyncing, router]);

  const activeRecipientId = availableRecipients.some((option) => option.recipientId === recipientId)
    ? recipientId
    : availableRecipients.find((option) => option.recipientId === activeThread?.counterpartId)
        ?.recipientId ?? availableRecipients[0]?.recipientId ?? "";

  async function handleAttachmentChange(file: File | null) {
    if (!file) {
      return;
    }

    const base64 = await fileToBase64(file);
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }

    setAttachment({
      base64,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    });
  }

  function clearAttachment() {
    if (attachment?.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl);
    }
    setAttachment(null);
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="min-h-[680px] rounded-[30px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4">
        <div className="flex items-center justify-between gap-3 border-b border-[color:var(--panel-border)] pb-4">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)]">
              Konusmalar
            </div>
            <div className="mt-2 text-lg font-semibold text-[color:var(--panel-text)]">
              {threads.length} aktif baslik
            </div>
          </div>
          <div className="rounded-full border border-[color:var(--panel-border)] px-3 py-1 text-xs font-medium text-[color:var(--panel-text-muted)]">
            {messages.filter((message) => message.recipientId === currentUserId && !message.readAt).length} yeni
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          {threads.length === 0 ? (
            <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] px-4 py-8 text-sm text-[color:var(--panel-text-soft)]">
              Bu alan, ogretmen ve veli arasindaki öğrenci bazli konusmalar için hazir.
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.key}
                type="button"
                onClick={() => setActiveThreadKey(thread.key)}
                className={cn(
                  "rounded-[var(--panel-radius-card)] border px-4 py-4 text-left transition",
                  activeThread?.key === thread.key
                    ? "border-transparent bg-[color:var(--panel-bg-elevated)]"
                    : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/55 hover:bg-[color:var(--panel-bg-hover)]",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold text-[color:var(--panel-text)]">
                      {thread.studentName}
                    </div>
                    <div className="mt-1 truncate text-sm text-[color:var(--panel-text-muted)]">
                      {thread.threadLabel}
                      {thread.studentClassroom ? ` / ${thread.studentClassroom}` : ""}
                    </div>
                  </div>
                  {thread.unreadCount > 0 ? (
                    <div className="inline-flex min-w-7 items-center justify-center rounded-full bg-white px-2 py-1 text-xs font-semibold text-[color:var(--panel-bg-base)]">
                      {thread.unreadCount}
                    </div>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="line-clamp-2 text-sm leading-6 text-[color:var(--panel-text-soft)]">
                    {thread.preview}
                  </div>
                  <div className="shrink-0 text-xs text-[color:var(--panel-text-soft)]">
                    {thread.lastMessageAt ? formatTime(thread.lastMessageAt) : "Hazir"}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="flex min-h-[680px] flex-col overflow-hidden rounded-[30px] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]">
        {activeThread ? (
          <>
            <div className="border-b border-[color:var(--panel-border)] px-5 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)]">
                    Aktif Konusma
                  </div>
                  <div className="mt-2 truncate text-2xl font-semibold tracking-[-0.04em] text-[color:var(--panel-text)]">
                    {activeThread.studentName}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[color:var(--panel-text-muted)]">
                    <span>{activeThread.threadLabel}</span>
                    {activeThread.studentClassroom ? <span>/ {activeThread.studentClassroom}</span> : null}
                  </div>
                </div>
                <div className="rounded-full border border-[color:var(--panel-border)] px-3 py-1.5 text-sm text-[color:var(--panel-text-muted)]">
                  {activeThread.messages.length} mesaj
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <div className="grid gap-4">
                {activeThread.messages.length === 0 ? (
                  <div className="grid min-h-[280px] place-items-center rounded-[16px] border border-dashed border-[color:var(--panel-border)] px-6 py-10 text-center">
                    <div>
                      <MessageCircleMore className="mx-auto size-9 text-[color:var(--panel-text-soft)]" />
                      <div className="mt-4 text-lg font-semibold text-[color:var(--panel-text)]">
                        Bu konusma henüz baslamadi
                      </div>
                      <div className="mt-2 text-sm leading-7 text-[color:var(--panel-text-muted)]">
                        Ogrenciye ait güncel bilgi, ev calismasi veya belgeyi burada dogrudan paylasabilirsiniz.
                      </div>
                    </div>
                  </div>
                ) : (
                  activeThread.messages.map((message) => {
                    const outgoing = isAdminViewer
                      ? message.sender.role === "teacher"
                      : message.senderId === currentUserId;

                    return (
                      <div
                        key={message.id}
                        className={cn("flex", outgoing ? "justify-end" : "justify-start")}
                      >
                        <div
                          className={cn(
                            "max-w-[min(100%,760px)] rounded-2xl px-4 py-2.5 shadow-[0_20px_50px_-44px_rgba(0,0,0,0.9)]",
                            outgoing
                              ? "bg-white text-[color:var(--panel-bg-base)]"
                              : "border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/70 text-[color:var(--panel-text)]",
                          )}
                        >
                          <div
                            className={cn(
                              "flex flex-wrap items-center gap-2 text-xs font-medium",
                              outgoing ? "text-slate-500" : "text-[color:var(--panel-text-soft)]",
                            )}
                          >
                            <span>{message.sender.name}</span>
                            <span>•</span>
                            <span>{formatDateTime(message.createdAt)}</span>
                            {message.readAt && outgoing ? (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <CheckCheck className="size-3.5" />
                                  Okundu
                                </span>
                              </>
                            ) : !outgoing ? (
                              <>
                                <span>•</span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock3 className="size-3.5" />
                                  {message.readAt ? "Okundu" : "Yeni"}
                                </span>
                              </>
                            ) : null}
                          </div>

                          <div
                            className={cn(
                              "mt-3 whitespace-pre-wrap text-sm leading-7",
                              outgoing ? "text-slate-700" : "text-[color:var(--panel-text-muted)]",
                            )}
                          >
                            {message.cleanBody}
                          </div>

                          {message.attachment ? (
                            <div
                              className={cn(
                                "mt-4 overflow-hidden rounded-[var(--panel-radius-card)] border",
                                outgoing
                                  ? "border-slate-200 bg-slate-50"
                                  : "border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]",
                              )}
                            >
                              {message.attachment.mimeType?.startsWith("image/") ? (
                                <a
                                  href={`/api/student-files/${message.attachment.fileId}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="relative block aspect-[4/3] w-full"
                                >
                                  <Image
                                    src={`/api/student-files/${message.attachment.fileId}`}
                                    alt={message.attachment.fileName}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                </a>
                              ) : null}
                              <a
                                href={`/api/student-files/${message.attachment.fileId}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 px-4 py-3"
                              >
                                {message.attachment.mimeType?.startsWith("image/") ? (
                                  <ImagePlus className="size-4 shrink-0" />
                                ) : (
                                  <FileText className="size-4 shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-medium">
                                    {message.attachment.fileName}
                                  </div>
                                  <div
                                    className={cn(
                                      "text-xs",
                                      outgoing ? "text-slate-500" : "text-[color:var(--panel-text-soft)]",
                                    )}
                                  >
                                    {message.attachment.mimeType?.startsWith("image/")
                                      ? "Gorsel"
                                      : "Belge"}
                                  </div>
                                </div>
                              </a>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="border-t border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/55 px-4 py-4 sm:px-5">
              {canCompose ? (
                <div className="grid gap-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <select
                      className={inputClassName()}
                      value={resolvedStudentId}
                      onChange={(event) => setSelectedStudentId(event.target.value)}
                    >
                      <option value="">Öğrenci seçin</option>
                      {Array.from(
                        recipientOptions.reduce<Map<string, { id: string; label: string }>>(
                          (map, option) => {
                            map.set(option.studentId, {
                              id: option.studentId,
                              label: option.studentClassroom
                                ? `${option.studentName} / ${option.studentClassroom}`
                                : option.studentName,
                            });
                            return map;
                          },
                          new Map(),
                        ),
                      ).map(([, option]) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>

                    <select
                      className={inputClassName()}
                      value={activeRecipientId}
                      onChange={(event) => setRecipientId(event.target.value)}
                    >
                      <option value="">Alici seçin</option>
                      {availableRecipients.map((option) => (
                        <option key={option.key} value={option.recipientId}>
                          {option.recipientName} ({option.recipientRole === "parent" ? "Veli" : "Öğretmen"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {attachment ? (
                    <div className="flex flex-wrap items-center gap-3 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-3">
                      {attachment.previewUrl ? (
                        <Image
                          src={attachment.previewUrl}
                          alt={attachment.fileName}
                          width={64}
                          height={64}
                          unoptimized
                          className="size-16 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="grid size-16 place-items-center rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/70">
                          <FileText className="size-5 text-[color:var(--panel-text-soft)]" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-[color:var(--panel-text)]">
                          {attachment.fileName}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--panel-text-soft)]">
                          {attachment.mimeType.startsWith("image/") ? "Gorsel eki" : "Belge eki"}
                        </div>
                      </div>
                      <Button type="button" variant="ghost" onClick={clearAttachment}>
                        <X className="size-4" />
                        Kaldir
                      </Button>
                    </div>
                  ) : null}

                  <div className="flex flex-col gap-3 rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-3">
                    <textarea
                      className="min-h-28 w-full resize-none rounded-[var(--panel-radius-card)] border-0 bg-transparent px-3 py-2 text-sm leading-7 text-[color:var(--panel-text)] outline-none placeholder:text-[color:var(--panel-text-soft)]"
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      placeholder="Mesajinizi yazin. Ev calismasi, günlük bilgi veya kısa bir belge aciklamasi ekleyebilirsiniz."
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[color:var(--panel-border)] px-3 py-2 text-sm text-[color:var(--panel-text-muted)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]">
                          <Paperclip className="size-4" />
                          Belge veya gorsel
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                            onChange={async (event) => {
                              const file = event.target.files?.[0] ?? null;
                              if (file) {
                                await handleAttachmentChange(file);
                              }
                              event.target.value = "";
                            }}
                          />
                        </label>
                        {feedback ? (
                          <div className="text-sm text-[color:var(--panel-text-soft)]">{feedback}</div>
                        ) : null}
                      </div>

                      <Button
                        disabled={
                          isSending || !resolvedStudentId || !activeRecipientId || body.trim().length < 5
                        }
                        onClick={() =>
                          startSendTransition(async () => {
                            const result = await sendParentMessageAction({
                              studentId: resolvedStudentId,
                              recipientId: activeRecipientId,
                              subject: "",
                              body,
                              uploadedBase64: attachment?.base64,
                              uploadedFileName: attachment?.fileName,
                              uploadedMimeType: attachment?.mimeType,
                            });
                            setFeedback(result.message);
                            if (result.success) {
                              setBody("");
                              clearAttachment();
                              router.refresh();
                            }
                          })
                        }
                      >
                        <SendHorizonal className="size-4" />
                        {isSending ? "Gonderiliyor..." : "Gonder"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] px-4 py-6 text-sm text-[color:var(--panel-text-soft)]">
                  Admin tum öğretmen-veli mesajlarini izleyebilir. Yeni mesaj olusturma yalnizca öğretmen ve veli katilimcilari için aciktir.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid min-h-[680px] place-items-center px-6 text-center">
            <div>
              <MessageCircleMore className="mx-auto size-10 text-[color:var(--panel-text-soft)]" />
              <div className="mt-4 text-xl font-semibold text-[color:var(--panel-text)]">
                Henüz gorunecek bir konusma yok
              </div>
              <div className="mt-2 text-sm leading-7 text-[color:var(--panel-text-muted)]">
                Yeni bir veli-öğrenci eslesmesi veya ilk mesaj olustugunda sohbet listesi burada belirir.
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
