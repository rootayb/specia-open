"use client";

import { useEffect, useRef, useState, useTransition, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookText,
  CornerDownLeft,
  FileText,
  Search,
  Users,
  X,
  Loader2,
  ClipboardList,
  CalendarClock,
  Calendar,
  FolderOpen,
} from "lucide-react";
import type { QuickActionItem } from "@/components/layout/quick-actions-modal";
import { searchGlobalAction } from "@/app/search-actions";
import { cn } from "@/lib/utils";

type Props = {
  items: QuickActionItem[];
};

type DbSearchResult = {
  type: "student" | "document" | "note" | "evaluation" | "ram" | "meeting" | "file";
  label: string;
  description: string;
  href: string;
};

export function SpotlightSearch({ items }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dbResults, setDbResults] = useState<DbSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [, startTransition] = useTransition();

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle state
  const openSearch = () => {
    setIsOpen(true);
    setQuery("");
    setDbResults([]);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 80);
  };

  const closeSearch = () => {
    setIsOpen(false);
  };

  // Keyboard shortcut listener (Cmd+K / Ctrl+K / Esc)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (isOpen) {
          closeSearch();
        } else {
          openSearch();
        }
      } else if (event.key === "Escape") {
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeSearch();
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  // Debounced database search when typing
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setDbResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let cancelled = false;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const response = await searchGlobalAction(trimmed);
        if (cancelled) {
          return;
        }
        if (response.success && response.results) {
          setDbResults(response.results);
        } else {
          setDbResults([]);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        console.error("Global search failed:", error);
        setDbResults([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(delayDebounceFn);
    };
  }, [query]);

  // Filtered menu links (routes)
  const filteredMenuLinks = query.trim()
    ? items.filter(
        (item) =>
          item.label.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")) ||
          item.description.toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")),
      )
    : items.slice(0, 5); // Default menu quick links

  // Suggested searches to show when search is empty
  const defaultSuggestedSearches = [
    { label: "BEP kitaplığını aç", href: "/panel/bep" },
    { label: "Değerlendirme merkezini aç", href: "/panel/degerlendirmeler" },
    { label: "Öğrenci listesini aç", href: "/panel/ogrenciler" },
  ];

  // Grouping items based on whether query is active
  const studentResults = dbResults.filter((r) => r.type === "student");
  const documentResults = dbResults.filter((r) => r.type === "document");
  const evaluationResults = dbResults.filter((r) => r.type === "evaluation");
  const ramResults = dbResults.filter((r) => r.type === "ram");
  const meetingResults = dbResults.filter((r) => r.type === "meeting");
  const fileResults = dbResults.filter((r) => r.type === "file");
  const noteResults = dbResults.filter((r) => r.type === "note");

  const totalList: Array<{
    label: string;
    description?: string;
    href: string;
    icon?: ComponentType<{ className?: string }>;
    isDbResult?: boolean;
    dbType?: "student" | "document" | "note" | "evaluation" | "ram" | "meeting" | "file";
  }> = query.trim()
    ? [
        ...studentResults.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: Users,
          isDbResult: true,
          dbType: r.type,
        })),
        ...documentResults.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: FileText,
          isDbResult: true,
          dbType: r.type,
        })),
        ...evaluationResults.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: ClipboardList,
          isDbResult: true,
          dbType: r.type,
        })),
        ...ramResults.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: CalendarClock,
          isDbResult: true,
          dbType: r.type,
        })),
        ...meetingResults.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: Calendar,
          isDbResult: true,
          dbType: r.type,
        })),
        ...fileResults.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: FolderOpen,
          isDbResult: true,
          dbType: r.type,
        })),
        ...noteResults.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: BookText,
          isDbResult: true,
          dbType: r.type,
        })),
        ...filteredMenuLinks.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: r.icon,
        })),
      ]
    : [
        ...filteredMenuLinks.map((r) => ({
          label: r.label,
          description: r.description,
          href: r.href,
          icon: r.icon,
        })),
        ...defaultSuggestedSearches.map((r) => ({
          label: r.label,
          href: r.href,
          icon: Search,
        })),
      ];

  const totalItems = totalList.length;

  // Arrow keys navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (totalItems === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (event.key === "Enter") {
      event.preventDefault();
      const selectedItem = totalList[selectedIndex];
      if (selectedItem?.href) {
        startTransition(() => {
          router.push(selectedItem.href);
          closeSearch();
        });
      }
    }
  };

  // Reset index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Highlight matched search text
  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return <span>{text}</span>;

    // Split search words to highlight each matched word individually
    const words = search.split(/\s+/).filter(Boolean);
    if (words.length === 0) return <span>{text}</span>;

    const escapedWords = words.map(w => w.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|");
    const regex = new RegExp(`(${escapedWords})`, "gi");
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          regex.test(part) ? (
            <mark key={index} className="bg-white/10 text-white font-semibold rounded-sm px-0.5">
              {part}
            </mark>
          ) : (
            <span key={index}>{part}</span>
          ),
        )}
      </>
    );
  };

  return (
    <>
      {/* Search Input Trigger in Header */}
      <button
        type="button"
        onClick={openSearch}
        className={cn(
          "group flex items-center justify-between gap-3 text-xs text-[color:var(--panel-text-soft)] bg-[color:var(--panel-bg-canvas)] border border-[color:var(--panel-border)] rounded-xl px-3.5 py-2.5 transition hover:bg-[color:var(--panel-bg-hover)] cursor-pointer w-full lg:w-48 xl:w-60 shadow-sm",
        )}
      >
        <span className="flex items-center gap-2">
          <Search className="size-4 text-[color:var(--panel-text-soft)] group-hover:text-[color:var(--panel-text)] transition" />
          <span>Platformda ara...</span>
        </span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] font-medium tracking-widest text-[color:var(--panel-text-soft)] select-none">
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Spotlight Overlay Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/80 backdrop-blur-md px-4 py-16 sm:py-24">
          <div
            ref={containerRef}
            className="w-full max-w-2xl overflow-hidden rounded-[16px] border border-white/10 bg-neutral-950/90 shadow-[var(--panel-shadow)] backdrop-blur-2xl transition-all"
          >
            {/* Search Input Area */}
            <div className="relative flex items-center border-b border-white/5 px-4 py-3">
              <Search className="size-5 text-neutral-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Öğrenci adı, BEP belgesi veya notlarda arayın..."
                className="ml-3 h-9 w-full bg-transparent text-sm text-white placeholder-neutral-500 outline-none"
              />
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="size-4 animate-spin text-neutral-400" />
                ) : query.trim() ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="rounded-lg p-1 text-neutral-400 hover:bg-white/5 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}
                <kbd className="hidden sm:inline-flex items-center rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-neutral-400 select-none">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Results / Suggestions Dropdown */}
            <div className="max-h-[420px] overflow-y-auto px-3 py-4">
              {totalItems === 0 ? (
                <div className="py-12 text-center text-sm text-neutral-500">
                  Aramanızla eşleşen sonuç bulunamadı.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 1. Students Section */}
                  {query.trim() && studentResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        Öğrenciler
                      </div>
                      <div className="space-y-1">
                        {studentResults.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border border-white/10",
                                  active ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                  <Users className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {highlightText(item.label, query)}
                                  </div>
                                  <p className="text-xs text-neutral-500 truncate max-w-[420px]">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  Profile Git
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. BEP Documents Section */}
                  {query.trim() && documentResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        BEP Planları
                      </div>
                      <div className="space-y-1">
                        {documentResults.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border border-white/10",
                                  active ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                  <FileText className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {highlightText(item.label, query)}
                                  </div>
                                  <p className="text-xs text-neutral-500 truncate max-w-[420px]">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  BEP&apos;e Git
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. Course Evaluations Section */}
                  {query.trim() && evaluationResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        Kaba Değerlendirme & Raporlar
                      </div>
                      <div className="space-y-1">
                        {evaluationResults.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border border-white/10",
                                  active ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                  <ClipboardList className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {highlightText(item.label, query)}
                                  </div>
                                  <p className="text-xs text-neutral-500 truncate max-w-[420px]">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  Rapora Git
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 4. RAM Tracking Section */}
                  {query.trim() && ramResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        RAM Rapor Takibi
                      </div>
                      <div className="space-y-1">
                        {ramResults.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border border-white/10",
                                  active ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                  <CalendarClock className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {highlightText(item.label, query)}
                                  </div>
                                  <p className="text-xs text-neutral-500 truncate max-w-[420px]">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  RAM Sayfasına Git
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 5. Coordination Meetings Section */}
                  {query.trim() && meetingResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        Toplantılar
                      </div>
                      <div className="space-y-1">
                        {meetingResults.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border border-white/10",
                                  active ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                  <Calendar className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {highlightText(item.label, query)}
                                  </div>
                                  <p className="text-xs text-neutral-500 truncate max-w-[420px]">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  Toplantılara Git
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 6. Student Files Section */}
                  {query.trim() && fileResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        Öğrenci Evrak Arşivi
                      </div>
                      <div className="space-y-1">
                        {fileResults.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border border-white/10",
                                  active ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                  <FolderOpen className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {highlightText(item.label, query)}
                                  </div>
                                  <p className="text-xs text-neutral-500 truncate max-w-[420px]">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  Belgelere Git
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 7. Personal Notes Section */}
                  {query.trim() && noteResults.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        Kişisel Notlar
                      </div>
                      <div className="space-y-1">
                        {noteResults.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border border-white/10",
                                  active ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                  <BookText className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {highlightText(item.label, query)}
                                  </div>
                                  <p className="text-xs text-neutral-500 truncate max-w-[420px]">
                                    {item.description}
                                  </p>
                                </div>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  Not Defterine Git
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 8. Menu links / Suggested Links section */}
                  {filteredMenuLinks.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        {query.trim() ? "Menüler & Sayfalar" : "Hızlı Bağlantılar"}
                      </div>
                      <div className="space-y-1">
                        {filteredMenuLinks.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;
                          const Icon = item.icon;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "flex size-7 items-center justify-center rounded-lg border border-white/10",
                                  active ? "bg-white/10 text-white" : "bg-white/5 text-neutral-400"
                                )}>
                                  <Icon className="size-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-semibold">
                                    {highlightText(item.label, query)}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-neutral-500 truncate max-w-[420px]">
                                      {highlightText(item.description, query)}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  Sayfaya Git
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 9. Suggested Searches Section (Only when query is empty) */}
                  {!query.trim() && defaultSuggestedSearches.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                        Önerilen Aramalar
                      </div>
                      <div className="space-y-1">
                        {defaultSuggestedSearches.map((item) => {
                          const overallIndex = totalList.findIndex((r) => r.href === item.href && r.label === item.label);
                          const active = selectedIndex === overallIndex;

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={closeSearch}
                              className={cn(
                                "flex items-center justify-between rounded-xl px-3 py-2 transition text-sm",
                                active
                                  ? "bg-white/8 text-white"
                                  : "text-neutral-400 hover:bg-white/4 hover:text-white",
                              )}
                            >
                              <div className="flex items-center gap-3">
                                <Search className="size-4 text-neutral-500" />
                                <span>{item.label}</span>
                              </div>
                              {active && (
                                <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                                  Aç
                                  <CornerDownLeft className="size-3.5" />
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Help / Footer Hint */}
            <div className="border-t border-white/5 px-5 py-3 bg-neutral-950/40 text-[10px] text-neutral-500 flex items-center justify-between select-none">
              <span>Seçmek için ↑↓, gitmek için Enter tuşunu kullanın.</span>
              <span>Specia Spotlight</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
