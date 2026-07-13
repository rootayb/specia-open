"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteInstitutionApplicationAction,
  reviewInstitutionApplicationAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";

type Application = {
  id: string;
  institutionName: string;
  institutionType: "rehabilitation_center" | "public_special_education_practice_school";
  contactName: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  status: "new" | "reviewing" | "approved" | "rejected";
  adminNotes?: string | null;
  reviewedAt?: string | Date | null;
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  createdAt: string | Date;
};

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function statusLabel(status: Application["status"]) {
  const labels: Record<Application["status"], string> = {
    new: "Yeni",
    reviewing: "İnceleniyor",
    approved: "Onaylandı",
    rejected: "Reddedildi",
  };

  return labels[status];
}

export function InstitutionApplicationReviewBoard({
  applications,
}: {
  applications: Application[];
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [drafts, setDrafts] = useState<Record<string, { status: Application["status"]; adminNotes: string }>>(
    Object.fromEntries(
      applications.map((application) => [
        application.id,
        {
          status: application.status,
          adminNotes: application.adminNotes ?? "",
        },
      ]),
    ),
  );
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  return (
    <div className="grid gap-4">
      {applications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
          Henüz kurum başvurusu bulunmuyor.
        </div>
      ) : (
        applications.map((application) => (
          <div
            key={application.id}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="text-lg font-semibold text-white">{application.institutionName}</div>
                <div className="text-xs font-medium uppercase tracking-[0.16em] text-neutral-500">
                  {application.institutionType === "public_special_education_practice_school"
                    ? "Özel Eğitim Uygulama Okulu"
                    : "Özel Eğitim ve Rehabilitasyon Merkezi"}
                </div>
                <div className="text-sm text-neutral-400">
                  {application.contactName} · {application.email}
                  {application.phone ? ` · ${application.phone}` : ""}
                </div>
                <div className="text-sm text-neutral-500">
                  Başvuru tarihi: {formatDateTime(application.createdAt)}
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm text-neutral-300">
                {statusLabel(application.status)}
              </div>
            </div>

            {application.message ? (
              <p className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-sm leading-7 text-neutral-300">
                {application.message}
              </p>
            ) : null}

            <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr_auto]">
              <select
                className={inputClassName()}
                value={drafts[application.id]?.status ?? application.status}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [application.id]: {
                      status: event.target.value as Application["status"],
                      adminNotes: current[application.id]?.adminNotes ?? "",
                    },
                  }))
                }
              >
                <option value="new">Yeni</option>
                <option value="reviewing">İnceleniyor</option>
                <option value="approved">Onaylandı</option>
                <option value="rejected">Reddedildi</option>
              </select>

              <textarea
                className={inputClassName()}
                rows={3}
                placeholder="Admin notu veya geri dönüş notu..."
                value={drafts[application.id]?.adminNotes ?? ""}
                onChange={(event) =>
                  setDrafts((current) => ({
                    ...current,
                    [application.id]: {
                      status: current[application.id]?.status ?? application.status,
                      adminNotes: event.target.value,
                    },
                  }))
                }
              />

              <div className="grid gap-2">
                <Button
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await reviewInstitutionApplicationAction({
                        id: application.id,
                        status: drafts[application.id]?.status ?? application.status,
                        adminNotes: drafts[application.id]?.adminNotes ?? "",
                        sendEmail: false,
                      });
                      setMessage(result.message);
                      showResult(result, {
                        successTitle: "Başvuru durumu kaydedildi",
                        errorTitle: "Başvuru durumu kaydedilemedi",
                      });
                      if (result.success) {
                        router.refresh();
                      }
                    });
                  }}
                >
                  {isPending ? "Kaydediliyor..." : "Durumu Kaydet"}
                </Button>

                <Button
                  variant="secondary"
                  disabled={
                    isPending || (drafts[application.id]?.status ?? application.status) === "new"
                  }
                  onClick={() => {
                    startTransition(async () => {
                      const result = await reviewInstitutionApplicationAction({
                        id: application.id,
                        status: drafts[application.id]?.status ?? application.status,
                        adminNotes: drafts[application.id]?.adminNotes ?? "",
                        sendEmail: true,
                      });
                      setMessage(result.message);
                      showResult(result, {
                        successTitle: "Başvuru maili gönderildi",
                        errorTitle: "Başvuru maili gönderilemedi",
                      });
                      if (result.success) {
                        router.refresh();
                      }
                    });
                  }}
                >
                  {isPending ? "Gonderiliyor..." : "Mail Gonder"}
                </Button>

                <div className="text-xs text-neutral-500">
                  Mail gonderimi incelemede, onaylandi veya reddedildi durumlari için kullanilir.
                </div>

                <Button
                  variant="danger"
                  disabled={isPending}
                  onClick={() => {
                    if (
                      !window.confirm(
                        `${application.institutionName} kurum basvurusu silinsin mi?`,
                      )
                    ) {
                      return;
                    }

                    startTransition(async () => {
                      const result = await deleteInstitutionApplicationAction({
                        id: application.id,
                      });
                      setMessage(result.message);
                      showResult(result, {
                        successTitle: "Başvuru silindi",
                        errorTitle: "Başvuru silinemedi",
                      });
                      if (result.success) {
                        router.refresh();
                      }
                    });
                  }}
                >
                  {isPending ? "Siliniyor..." : "Basvuruyu Sil"}
                </Button>
              </div>
            </div>

            {(application.reviewedAt || application.reviewedBy) && (
              <div className="mt-3 text-sm text-neutral-500">
                Son işlem:{" "}
                {application.reviewedAt ? formatDateTime(application.reviewedAt) : "-"}
                {application.reviewedBy ? ` · ${application.reviewedBy.name}` : ""}
              </div>
            )}
          </div>
        ))
      )}

      {message ? <div className="text-sm text-neutral-400">{message}</div> : null}
    </div>
  );
}
