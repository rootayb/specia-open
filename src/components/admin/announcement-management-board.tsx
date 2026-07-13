"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deletePlatformAnnouncementAction,
  savePlatformAnnouncementAction,
  togglePlatformAnnouncementAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";

type Announcement = {
  id: string;
  title: string;
  summary?: string | null;
  content: string;
  isActive: boolean;
  showAsPopup: boolean;
  publishedAt: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  updatedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

type FormState = {
  id?: string;
  title: string;
  summary: string;
  content: string;
  isActive: boolean;
  showAsPopup: boolean;
};

const initialForm: FormState = {
  title: "",
  summary: "",
  content: "",
  isActive: true,
  showAsPopup: true,
};

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function AnnouncementManagementBoard({
  announcements,
}: {
  announcements: Announcement[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialForm);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const activeCount = useMemo(
    () => announcements.filter((announcement) => announcement.isActive).length,
    [announcements],
  );

  const popupCount = useMemo(
    () =>
      announcements.filter(
        (announcement) => announcement.isActive && announcement.showAsPopup,
      ).length,
    [announcements],
  );

  function resetForm() {
    setForm(initialForm);
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="text-sm text-neutral-500">Toplam duyuru</div>
          <div className="mt-2 text-2xl font-semibold text-white">{announcements.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="text-sm text-neutral-500">Aktif</div>
          <div className="mt-2 text-2xl font-semibold text-white">{activeCount}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
          <div className="text-sm text-neutral-500">Popup gosterimli</div>
          <div className="mt-2 text-2xl font-semibold text-white">{popupCount}</div>
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
              Duyuru Editoru
            </div>
            <div className="mt-2 text-xl font-semibold text-white">
              {form.id ? "Duyuruyu düzenle" : "Yeni duyuru yayinla"}
            </div>
          </div>
          {form.id ? (
            <Button variant="ghost" onClick={resetForm} disabled={isPending}>
              Yeni form
            </Button>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4">
          <Field label="Baslik">
            <input
              className={inputClassName()}
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>

          <Field label="Kısa özet" hint="Sag ust butondaki listede kısa aciklama olarak gorunur.">
            <input
              className={inputClassName()}
              value={form.summary}
              onChange={(event) =>
                setForm((current) => ({ ...current, summary: event.target.value }))
              }
            />
          </Field>

          <Field label="Içerik">
            <textarea
              className={inputClassName()}
              rows={6}
              value={form.content}
              onChange={(event) =>
                setForm((current) => ({ ...current, content: event.target.value }))
              }
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.checked }))
                }
              />
              Yayinda aktif olsun
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-neutral-200">
              <input
                type="checkbox"
                checked={form.showAsPopup}
                onChange={(event) =>
                  setForm((current) => ({ ...current, showAsPopup: event.target.checked }))
                }
              />
              Panele giriste popup olarak göster
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await savePlatformAnnouncementAction(form);
                  setMessage(result.message);
                  showResult(result, {
                    successTitle: form.id ? "Duyuru guncellendi" : "Duyuru yayinlandi",
                    errorTitle: form.id ? "Duyuru guncellenemedi" : "Duyuru yayinlanamadi",
                  });
                  if (result.success) {
                    resetForm();
                    router.refresh();
                  }
                });
              }}
            >
              {isPending ? "Kaydediliyor..." : form.id ? "Duyuruyu Güncelle" : "Duyuru Yayinla"}
            </Button>
            {form.id ? (
              <Button variant="secondary" disabled={isPending} onClick={resetForm}>
                Vazgec
              </Button>
            ) : null}
          </div>

          {message ? <div className="text-sm text-neutral-400">{message}</div> : null}
        </div>
      </div>

      <div className="grid gap-4">
        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
            Henüz duyuru olusturulmadi.
          </div>
        ) : (
          announcements.map((announcement) => (
            <div
              key={announcement.id}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-lg font-semibold text-white">{announcement.title}</div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300">
                      {announcement.isActive ? "Aktif" : "Pasif"}
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-neutral-300">
                      {announcement.showAsPopup ? "Popup" : "Sadece liste"}
                    </div>
                  </div>
                  {announcement.summary ? (
                    <div className="text-sm text-neutral-400">{announcement.summary}</div>
                  ) : null}
                  <div className="text-sm leading-7 text-neutral-300">{announcement.content}</div>
                  <div className="text-xs text-neutral-500">
                    Yayin: {formatDateTime(announcement.publishedAt)} · Olusturan:{" "}
                    {announcement.createdBy.name ?? announcement.createdBy.email}
                  </div>
                </div>

                <div className="grid gap-2 sm:min-w-[180px]">
                  <Button
                    variant="ghost"
                    disabled={isPending}
                    onClick={() =>
                      setForm({
                        id: announcement.id,
                        title: announcement.title,
                        summary: announcement.summary ?? "",
                        content: announcement.content,
                        isActive: announcement.isActive,
                        showAsPopup: announcement.showAsPopup,
                      })
                    }
                  >
                    Düzenle
                  </Button>
                  <Button
                    variant="secondary"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await togglePlatformAnnouncementAction({
                          id: announcement.id,
                          isActive: !announcement.isActive,
                        });
                        setMessage(result.message);
                        showResult(result, {
                          successTitle: announcement.isActive ? "Duyuru pasife alindi" : "Duyuru aktif edildi",
                          errorTitle: "Duyuru durumu guncellenemedi",
                        });
                        if (result.success) {
                          router.refresh();
                        }
                      });
                    }}
                  >
                    {announcement.isActive ? "Pasife Al" : "Aktif Et"}
                  </Button>
                  <Button
                    variant="danger"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await deletePlatformAnnouncementAction({
                          id: announcement.id,
                        });
                        setMessage(result.message);
                        showResult(result, {
                          successTitle: "Duyuru silindi",
                          errorTitle: "Duyuru silinemedi",
                        });
                        if (result.success) {
                          if (form.id === announcement.id) {
                            resetForm();
                          }
                          router.refresh();
                        }
                      });
                    }}
                  >
                    Sil
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
