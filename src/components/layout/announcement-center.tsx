"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Bell, Megaphone, X } from "lucide-react";

import { Button } from "@/components/ui/button";

type Announcement = {
  id: string;
  title: string;
  summary?: string | null;
  content: string;
  showAsPopup: boolean;
  publishedAt: string | Date;
  updatedAt: string | Date;
};

const DISMISSED_STORAGE_KEY = "specia:dismissed-announcements";
const MOBILE_BREAKPOINT = 640;

const subscribeMounted = () => () => {};

function subscribeViewport(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function getAnnouncementVersion(announcement: Announcement) {
  const updatedAt =
    typeof announcement.updatedAt === "string"
      ? announcement.updatedAt
      : announcement.updatedAt.toISOString();

  return `${announcement.id}:${updatedAt}`;
}

function readDismissedAnnouncements() {
  try {
    const stored = window.localStorage.getItem(DISMISSED_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeDismissedAnnouncements(value: Record<string, string>) {
  window.localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(value));
}

export function AnnouncementCenter({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const isMounted = useSyncExternalStore(subscribeMounted, () => true, () => false);
  const isMobileViewport = useSyncExternalStore(
    subscribeViewport,
    () => window.innerWidth < MOBILE_BREAKPOINT,
    () => false,
  );
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    return readDismissedAnnouncements();
  });

  function dismissAnnouncement(announcement: Announcement) {
    const nextDismissed = {
      ...dismissed,
      [announcement.id]: getAnnouncementVersion(announcement),
    };

    setDismissed(nextDismissed);
    writeDismissedAnnouncements(nextDismissed);
  }

  const unreadAnnouncements = useMemo(
    () =>
      announcements.filter(
        (announcement) => dismissed[announcement.id] !== getAnnouncementVersion(announcement),
      ),
    [announcements, dismissed],
  );

  const popupAnnouncement = useMemo(
    () => unreadAnnouncements.find((announcement) => announcement.showAsPopup) ?? null,
    [unreadAnnouncements],
  );

  const canUsePortal = isMounted && typeof document !== "undefined";

  const panelContent = (
    <div className="rounded-[16px] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] p-4 shadow-[var(--panel-shadow)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)]">
            Specia
          </div>
          <div className="mt-1 text-base font-semibold text-[color:var(--panel-text)]">
            Duyurular ve guncellemeler
          </div>
        </div>
        <button
          type="button"
          className="rounded-lg border border-[color:var(--panel-border)] p-2 text-[color:var(--panel-text-muted)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
          onClick={() => setIsPanelOpen(false)}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="grid max-h-[min(70vh,420px)] gap-3 overflow-y-auto pr-1">
        {announcements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[color:var(--panel-border)] px-4 py-8 text-sm text-[color:var(--panel-text-soft)]">
            Yayinlanmis duyuru bulunmuyor.
          </div>
        ) : (
          announcements.map((announcement) => {
            const isUnread =
              dismissed[announcement.id] !== getAnnouncementVersion(announcement);

            return (
              <div
                key={announcement.id}
                className="rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-[color:var(--panel-text)]">{announcement.title}</div>
                      {isUnread ? (
                        <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-black">
                          Yeni
                        </span>
                      ) : null}
                    </div>
                    {announcement.summary ? (
                      <div className="text-sm text-[color:var(--panel-text-muted)]">{announcement.summary}</div>
                    ) : null}
                    <div className="whitespace-pre-line text-sm leading-6 text-[color:var(--panel-text-muted)]">
                      {announcement.content}
                    </div>
                    <div className="text-xs text-[color:var(--panel-text-soft)]">
                      {formatDateTime(announcement.publishedAt)}
                    </div>
                  </div>
                </div>
                {isUnread ? (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={() => dismissAnnouncement(announcement)}
                    >
                      Okundu olarak isaretle
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  const popupContent = popupAnnouncement ? (
    <div className="fixed inset-0 z-[130] overflow-y-auto bg-black/70 px-4 py-20 sm:flex sm:items-center sm:justify-center sm:py-6">
      <div className="mx-auto w-full max-w-xl rounded-[16px] border border-[color:var(--panel-border)] bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] p-4 shadow-[var(--panel-shadow)] sm:max-h-[calc(100vh-2rem)] sm:overflow-y-auto sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3 py-1 text-xs uppercase tracking-[0.24em] text-[color:var(--panel-text-soft)]">
              <Megaphone className="size-3.5" />
              Guncelleme
            </div>
            <div className="text-xl font-semibold text-[color:var(--panel-text)]">{popupAnnouncement.title}</div>
            {popupAnnouncement.summary ? (
              <div className="text-sm text-[color:var(--panel-text-muted)]">{popupAnnouncement.summary}</div>
            ) : null}
            <div className="whitespace-pre-line text-sm leading-7 text-[color:var(--panel-text-muted)]">
              {popupAnnouncement.content}
            </div>
            <div className="text-xs text-[color:var(--panel-text-soft)]">
              {formatDateTime(popupAnnouncement.publishedAt)}
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg border border-[color:var(--panel-border)] p-2 text-[color:var(--panel-text-muted)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
            onClick={() => dismissAnnouncement(popupAnnouncement)}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => dismissAnnouncement(popupAnnouncement)}>Kapat</Button>
          <Button
            variant="secondary"
            onClick={() => {
              dismissAnnouncement(popupAnnouncement);
              setIsPanelOpen(true);
            }}
          >
            Tum duyurulari gor
          </Button>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="relative z-[70]">
        <Button variant="secondary" onClick={() => setIsPanelOpen((current) => !current)}>
          <Bell className="mr-2 size-4" />
          Guncellemeler
          {isMounted && unreadAnnouncements.length > 0 ? (
            <span className="ml-2 rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-black">
              {unreadAnnouncements.length}
            </span>
          ) : null}
        </Button>

        {isPanelOpen && !isMobileViewport ? (
          <div className="absolute right-0 top-full z-[80] mt-3 w-[360px]">{panelContent}</div>
        ) : null}
      </div>

      {canUsePortal && isPanelOpen && isMobileViewport
        ? createPortal(
            <div className="fixed inset-x-4 top-20 z-[120]">{panelContent}</div>,
            document.body,
          )
        : null}

      {canUsePortal && popupContent ? createPortal(popupContent, document.body) : null}
    </>
  );
}
