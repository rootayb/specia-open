"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  FileText,
  Folder,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  deletePersonalNoteAction,
  savePersonalNoteAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { useActionFeedback } from "@/components/ui/action-toast";
import { confirmModal } from "@/components/ui/confirm-modal";
import { cn } from "@/lib/utils";

type NoteColor = "yellow" | "blue" | "green" | "pink" | "gray";

type PersonalNoteRecord = {
  id: string;
  title: string;
  content: string;
  category: string;
  color: NoteColor;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
};

type NoteDraft = {
  id?: string;
  title: string;
  content: string;
  category: string;
  color: NoteColor;
  isPinned: boolean;
};

type AutoSaveState = "idle" | "saving" | "saved" | "error";

const emptyDraft: NoteDraft = {
  title: "",
  content: "",
  category: "Genel",
  color: "yellow",
  isPinned: false,
};

const colorOptions: Array<{ value: NoteColor; label: string; className: string }> = [
  { value: "yellow", label: "Sari", className: "bg-[#f9d66b]" },
  { value: "blue", label: "Mavi", className: "bg-[#7cc7f7]" },
  { value: "green", label: "Yesil", className: "bg-[#84d9a8]" },
  { value: "pink", label: "Pembe", className: "bg-[#f5a3bc]" },
  { value: "gray", label: "Gri", className: "bg-[#c6cad2]" },
];

const noteTintClasses: Record<NoteColor, string> = {
  yellow: "border-[#f9d66b]/24 bg-[#f9d66b]/8",
  blue: "border-[#7cc7f7]/24 bg-[#7cc7f7]/8",
  green: "border-[#84d9a8]/24 bg-[#84d9a8]/8",
  pink: "border-[#f5a3bc]/24 bg-[#f5a3bc]/8",
  gray: "border-[color:var(--panel-border)] bg-white/[0.04]",
};

const formatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function toDraft(note: PersonalNoteRecord): NoteDraft {
  return {
    id: note.id,
    title: note.title,
    content: note.content,
    category: note.category,
    color: note.color,
    isPinned: note.isPinned,
  };
}

function previewText(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > 92 ? `${normalized.slice(0, 89)}...` : normalized;
}

function buildLocalTitle(note: NoteDraft) {
  const explicitTitle = note.title.trim();
  if (explicitTitle) {
    return explicitTitle;
  }

  const firstLine = note.content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Yeni Not";
  }

  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
}

function noteFingerprint(note: NoteDraft) {
  return JSON.stringify({
    id: note.id ?? "",
    title: note.title.trim(),
    content: note.content.trim(),
    category: note.category.trim() || "Genel",
    color: note.color,
    isPinned: note.isPinned,
  });
}

export function PersonalNotesBoard({ notes }: { notes: PersonalNoteRecord[] }) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const initialDraftFingerprint = noteFingerprint(notes[0] ? toDraft(notes[0]) : emptyDraft);
  const [isPending, startTransition] = useTransition();
  const [notesState, setNotesState] = useState(notes);
  const [activeCategory, setActiveCategory] = useState("Tum Notlar");
  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id ?? null);
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState<NoteDraft>(notes[0] ? toDraft(notes[0]) : emptyDraft);
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>("idle");
  const lastSavedFingerprintRef = useRef(initialDraftFingerprint);
  const draftFingerprintRef = useRef(initialDraftFingerprint);
  const saveSequenceRef = useRef(0);

  const activeNote = useMemo(
    () => notesState.find((note) => note.id === activeNoteId) ?? null,
    [activeNoteId, notesState],
  );

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    notesState.forEach((note) => {
      counts.set(note.category, (counts.get(note.category) ?? 0) + 1);
    });

    return [
      { label: "Tum Notlar", count: notesState.length },
      ...Array.from(counts.entries())
        .sort(([left], [right]) => left.localeCompare(right, "tr"))
        .map(([label, count]) => ({ label, count })),
    ];
  }, [notesState]);

  const filteredNotes = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");

    return notesState.filter((note) => {
      const categoryMatches =
        activeCategory === "Tum Notlar" || note.category === activeCategory;
      const queryMatches =
        !normalizedQuery ||
        `${note.title} ${note.content} ${note.category}`
          .toLocaleLowerCase("tr-TR")
          .includes(normalizedQuery);

      return categoryMatches && queryMatches;
    });
  }, [activeCategory, notesState, query]);

  const persistDraft = useCallback(
    async (note: NoteDraft, options: { activateSavedNote?: boolean } = {}) => {
      if (!note.content.trim()) {
        return;
      }

      const fingerprint = noteFingerprint(note);
      if (fingerprint === lastSavedFingerprintRef.current) {
        return;
      }

      const sequence = saveSequenceRef.current + 1;
      saveSequenceRef.current = sequence;
      setAutoSaveState("saving");

      const result = await savePersonalNoteAction({
        id: note.id,
        title: note.title,
        content: note.content,
        category: note.category,
        color: note.color,
        isPinned: note.isPinned,
      });

      if (!result.success) {
        if (saveSequenceRef.current === sequence) {
          setAutoSaveState("error");
        }
        showResult(result, {
          errorTitle: "Not kaydedilemedi",
        });
        return;
      }

      const savedId = result.id ?? note.id;
      if (!savedId) {
        return;
      }

      const savedAt = new Date().toISOString();
      const existingCreatedAt =
        notesState.find((item) => item.id === savedId)?.createdAt ?? savedAt;
      const savedNote: PersonalNoteRecord = {
        id: savedId,
        title: buildLocalTitle(note),
        content: note.content.trim(),
        category: note.category.trim() || "Genel",
        color: note.color,
        isPinned: note.isPinned,
        createdAt: existingCreatedAt,
        updatedAt: savedAt,
      };

      setNotesState((current) => {
        const existingIndex = current.findIndex((item) => item.id === savedId);
        const nextNotes =
          existingIndex >= 0
            ? current.map((item) => (item.id === savedId ? savedNote : item))
            : [savedNote, ...current];

        return nextNotes.sort((left, right) => {
          if (left.isPinned !== right.isPinned) {
            return left.isPinned ? -1 : 1;
          }

          return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
        });
      });

      const savedFingerprint = noteFingerprint({
        ...note,
        id: savedId,
        category: savedNote.category,
        title: note.title,
        content: note.content,
      });
      const shouldUpdateEditor =
        options.activateSavedNote !== false && draftFingerprintRef.current === fingerprint;

      if (shouldUpdateEditor) {
        lastSavedFingerprintRef.current = savedFingerprint;
        setActiveNoteId(savedId);
        setDraft((current) => (current.id ? current : { ...current, id: savedId }));

        if (saveSequenceRef.current === sequence) {
          setAutoSaveState("saved");
        }
      }
    },
    [notesState, showResult],
  );

  useEffect(() => {
    draftFingerprintRef.current = noteFingerprint(draft);

    if (!draft.content.trim() || noteFingerprint(draft) === lastSavedFingerprintRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistDraft(draft);
    }, 900);

    return () => window.clearTimeout(timeoutId);
  }, [draft, persistDraft]);

  function createNewNote() {
    void persistDraft(draft, { activateSavedNote: false });
    const nextDraft = {
      ...emptyDraft,
      category: activeCategory === "Tum Notlar" ? "Genel" : activeCategory,
    };

    lastSavedFingerprintRef.current = noteFingerprint(nextDraft);
    setActiveNoteId(null);
    setDraft(nextDraft);
    setAutoSaveState("idle");
  }

  function selectNote(note: PersonalNoteRecord) {
    void persistDraft(draft, { activateSavedNote: false });
    const nextDraft = toDraft(note);

    lastSavedFingerprintRef.current = noteFingerprint(nextDraft);
    setActiveNoteId(note.id);
    setDraft(nextDraft);
    setAutoSaveState("idle");
  }

  function deleteNote() {
    if (!draft.id) {
      return;
    }

    (async () => {
      const confirmed = await confirmModal({
        title: "Notu Sil",
        message: `"${draft.title || "Adsız Not"}" isimli notu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
        variant: "danger",
        confirmText: "Kalıcı Olarak Sil",
        cancelText: "Vazgeç",
      });

      if (!confirmed) return;

      startTransition(async () => {
        const result = await deletePersonalNoteAction({ id: draft.id! });

        showResult(result, {
          successTitle: "Not silindi",
          errorTitle: "Not silinemedi",
        });

        if (result.success) {
          const nextNotes = notesState.filter((note) => note.id !== draft.id);
          const nextNote = nextNotes[0] ?? null;

          setNotesState(nextNotes);
          setActiveNoteId(nextNote?.id ?? null);
          setDraft(nextNote ? toDraft(nextNote) : emptyDraft);
          lastSavedFingerprintRef.current = noteFingerprint(nextNote ? toDraft(nextNote) : emptyDraft);
          setAutoSaveState("idle");
          router.refresh();
        }
      });
    })();
  }

  return (
    <div className="overflow-hidden rounded-[30px] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] text-[color:var(--panel-text)] shadow-[var(--panel-shadow)]">
      <div className="grid min-h-[min(760px,calc(100vh-170px))] lg:grid-cols-[230px_330px_minmax(0,1fr)]">
        <aside className="border-b border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/72 p-4 lg:border-r lg:border-b-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-lg font-semibold tracking-[-0.03em]">Notlar</div>
            <Button
              size="icon"
              className="size-10"
              onClick={createNewNote}
              aria-label="Yeni not"
              title="Yeni not"
            >
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="mt-5 grid gap-1">
            {categories.map((category) => (
              <button
                key={category.label}
                type="button"
                onClick={() => setActiveCategory(category.label)}
                className={cn(
                  "flex min-h-11 items-center justify-between gap-3 rounded-2xl px-3 text-left text-sm font-medium transition",
                  activeCategory === category.label
                    ? "bg-[color:var(--panel-bg-elevated)] text-[color:var(--panel-text)] shadow-sm"
                    : "text-[color:var(--panel-text-muted)] hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]",
                )}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  <Folder className="size-4 shrink-0" />
                  <span className="truncate">{category.label}</span>
                </span>
                <span className="shrink-0 text-xs text-[color:var(--panel-text-soft)]">
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="border-b border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)]/70 lg:border-r lg:border-b-0">
          <div className="border-b border-[color:var(--panel-border)] p-4">
            <div className="flex min-h-11 items-center gap-2 rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/70 px-3 text-[color:var(--panel-text-soft)]">
              <Search className="size-4" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Ara"
                className="h-11 min-w-0 flex-1 bg-transparent text-sm text-[color:var(--panel-text)] outline-none placeholder:text-[color:var(--panel-text-soft)]"
              />
            </div>
          </div>

          <div className="max-h-[330px] overflow-y-auto p-3 lg:max-h-none">
            {filteredNotes.length === 0 ? (
              <div className="grid min-h-52 place-items-center rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] px-5 text-center text-sm text-[color:var(--panel-text-soft)]">
                Not bulunamadı.
              </div>
            ) : (
              <div className="grid gap-2">
                {filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => selectNote(note)}
                    className={cn(
                      "rounded-[var(--panel-radius-card)] border p-4 text-left transition",
                      noteTintClasses[note.color],
                      activeNoteId === note.id
                        ? "bg-[color:var(--panel-bg-hover)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]"
                        : "hover:bg-[color:var(--panel-bg-hover)]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[color:var(--panel-text)]">
                          {note.title}
                        </div>
                        <div className="mt-1 text-xs text-[color:var(--panel-text-soft)]">
                          {formatter.format(new Date(note.updatedAt))}
                        </div>
                      </div>
                      {note.isPinned ? <Pin className="size-4 shrink-0 text-[#f9d66b]" /> : null}
                    </div>
                    <div className="mt-3 line-clamp-2 text-sm leading-6 text-[color:var(--panel-text-muted)]">
                      {previewText(note.content)}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="flex min-h-[540px] flex-col bg-[color:var(--panel-bg-base)]/45">
          <div className="flex flex-col gap-3 border-b border-[color:var(--panel-border)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-2 text-sm text-[color:var(--panel-text-soft)]">
              <FileText className="size-4" />
              <span className="truncate">
                {draft.id && activeNote?.updatedAt
                  ? formatter.format(new Date(activeNote.updatedAt))
                  : "Yeni not"}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <div
                className={cn(
                  "inline-flex min-h-9 items-center rounded-xl border border-[color:var(--panel-border)] px-3 text-xs font-medium",
                  autoSaveState === "error"
                    ? "text-[#ffb9c2]"
                    : "text-[color:var(--panel-text-soft)]",
                )}
              >
                {autoSaveState === "saving"
                  ? "Kaydediliyor"
                  : autoSaveState === "error"
                    ? "Kaydedilemedi"
                    : autoSaveState === "saved"
                      ? "Kaydedildi"
                      : "Hazir"}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-[color:var(--panel-text-muted)]"
                onClick={() => setDraft((current) => ({ ...current, isPinned: !current.isPinned }))}
              >
                <Pin className={cn("size-4", draft.isPinned && "fill-current text-[#f9d66b]")} />
                {draft.isPinned ? "Sabit" : "Sabitle"}
              </Button>
              {draft.id ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-[#ffb9c2] hover:bg-[#ff6b7a]/10 hover:text-[#ffd8dc]"
                  onClick={deleteNote}
                  disabled={isPending}
                >
                  <Trash2 className="size-4" />
                  Sil
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 p-4">
            <input
              value={draft.title}
              onChange={(event) =>
                setDraft((current) => ({ ...current, title: event.target.value }))
              }
              placeholder="Baslik"
              className="w-full rounded-none border-0 bg-transparent text-3xl font-semibold tracking-[-0.04em] text-[color:var(--panel-text)] outline-none placeholder:text-[color:var(--panel-text-soft)]"
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="Kategori"
                className="min-h-11 rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3 text-sm font-medium text-[color:var(--panel-text)] outline-none transition placeholder:text-[color:var(--panel-text-soft)] focus:border-[color:var(--panel-border-strong)] focus:bg-[color:var(--panel-bg-hover)]"
              />
              <div className="flex items-center gap-1 rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-1">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() =>
                      setDraft((current) => ({ ...current, color: option.value }))
                    }
                    title={option.label}
                    aria-label={option.label}
                    className={cn(
                      "size-9 rounded-xl border border-white/15 transition",
                      option.className,
                      draft.color === option.value
                        ? "opacity-100 shadow-[inset_0_0_0_2px_rgba(255,255,255,0.85)]"
                        : "opacity-75 hover:opacity-100",
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          <textarea
            value={draft.content}
            onChange={(event) =>
              setDraft((current) => ({ ...current, content: event.target.value }))
            }
            placeholder="Notunuzu yazin..."
            className="min-h-[360px] flex-1 resize-none border-0 bg-transparent px-4 pb-6 text-[17px] leading-8 text-[color:var(--panel-text)] outline-none placeholder:text-[color:var(--panel-text-soft)] selection:bg-white/20 selection:text-white"
          />
        </section>
      </div>
    </div>
  );
}
