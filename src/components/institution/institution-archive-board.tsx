"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  deleteInstitutionArchiveRecordAction,
  saveInstitutionArchiveRecordAction,
} from "@/app/actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { Field, inputClassName } from "@/components/ui/field";
import { confirmModal } from "@/components/ui/confirm-modal";
import type { InstitutionArchiveRecordInput } from "@/lib/schemas";

type ArchiveRecord = {
  id: string;
  title: string;
  section: "inspection_file" | "institution_archive";
  category: string;
  documentNumber: string | null;
  responsibleUnit: string | null;
  issuedAt: Date | null;
  reviewDate: Date | null;
  fileName: string | null;
  fileUrl: string | null;
  mimeType: string | null;
  fileSize: number | null;
  notes: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

const sectionLabels: Record<ArchiveRecord["section"], string> = {
  inspection_file: "Denetim dosyasi",
  institution_archive: "Kurum evraki",
};

const emptyForm = (): InstitutionArchiveRecordInput => ({
  title: "",
  section: "institution_archive",
  category: "",
  documentNumber: "",
  responsibleUnit: "",
  issuedAt: "",
  reviewDate: "",
  fileName: "",
  fileUrl: "",
  uploadedFileName: "",
  uploadedMimeType: "",
  uploadedBase64: "",
  notes: "",
});

function formatDate(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
}

function formatFileSize(value?: number | null) {
  if (!value) {
    return "-";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function SummaryPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-medium text-neutral-300">
      {children}
    </span>
  );
}

export function InstitutionArchiveBoard({
  records,
  totalCount,
  inspectionCount,
  reviewDueCount,
}: {
  records: ArchiveRecord[];
  totalCount: number;
  inspectionCount: number;
  reviewDueCount: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState<InstitutionArchiveRecordInput>(emptyForm());
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const filteredRecords = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase("tr-TR");
    if (!normalized) {
      return records;
    }

    return records.filter((record) =>
      [
        record.title,
        record.category,
        record.documentNumber ?? "",
        record.responsibleUnit ?? "",
        record.fileName ?? "",
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR")
        .includes(normalized),
    );
  }, [records, search]);

  async function readSelectedFile(file: File | null) {
    if (!file) {
      setForm((current) => ({
        ...current,
        uploadedBase64: "",
        uploadedFileName: "",
        uploadedMimeType: "",
      }));
      return;
    }

    const result = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Dosya okunamadi."));
      reader.readAsDataURL(file);
    });

    const [, base64 = ""] = result.split(",", 2);
    setForm((current) => ({
      ...current,
      uploadedBase64: base64,
      uploadedFileName: file.name,
      uploadedMimeType: file.type || "application/octet-stream",
      fileName: file.name,
      title: current.title || file.name.replace(/\.[^.]+$/, ""),
    }));
  }

  function resetForm() {
    setForm(emptyForm());
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <div className="text-sm text-neutral-500">Toplam evrak</div>
          <div className="mt-3 text-4xl font-semibold text-white">{totalCount}</div>
          <div className="mt-2 text-sm text-neutral-400">Kurum arsivindeki kayıtlar</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-500">Denetim dosyasi</div>
          <div className="mt-3 text-4xl font-semibold text-white">{inspectionCount}</div>
          <div className="mt-2 text-sm text-neutral-400">Denetimde kullanilan belgeler</div>
        </Card>
        <Card>
          <div className="text-sm text-neutral-500">Yaklasan kontrol</div>
          <div className="mt-3 text-4xl font-semibold text-white">{reviewDueCount}</div>
          <div className="mt-2 text-sm text-neutral-400">30 gun içinde yeniden bakilacak</div>
        </Card>
      </div>

      <div className="grid gap-6 2xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
            Yeni Evrak
          </div>
          <div className="mt-2 text-2xl font-semibold text-white">Kurum dosyasina ekle</div>
          <p className="mt-2 text-sm leading-6 text-neutral-400">
            Denetim için gereken belgeleri ve kurum içinde saklamak istediginiz evraki buraya ekleyin.
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Field label="Bölüm">
              <select
                className={inputClassName()}
                value={form.section}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    section: event.target.value as InstitutionArchiveRecordInput["section"],
                  }))
                }
              >
                {Object.entries(sectionLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Kategori">
              <input
                className={inputClassName()}
                value={form.category}
                onChange={(event) =>
                  setForm((current) => ({ ...current, category: event.target.value }))
                }
                placeholder="Ruhsat, personel, mali evrak..."
              />
            </Field>

            <Field label="Belge basligi" className="md:col-span-2">
              <input
                className={inputClassName()}
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              />
            </Field>

            <Field label="Belge numarasi">
              <input
                className={inputClassName()}
                value={form.documentNumber ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, documentNumber: event.target.value }))
                }
              />
            </Field>

            <Field label="Ilgili birim">
              <input
                className={inputClassName()}
                value={form.responsibleUnit ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, responsibleUnit: event.target.value }))
                }
              />
            </Field>

            <Field label="Belge tarihi">
              <input
                type="date"
                className={inputClassName()}
                value={form.issuedAt ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, issuedAt: event.target.value }))
                }
              />
            </Field>

            <Field label="Bir sonraki kontrol tarihi">
              <input
                type="date"
                className={inputClassName()}
                value={form.reviewDate ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, reviewDate: event.target.value }))
                }
              />
            </Field>

            <Field label="Dosya seç" hint="PDF, görsel ve ofis belgeleri desteklenir. Azami 10 MB.">
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                className={inputClassName()}
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  void readSelectedFile(file);
                }}
              />
            </Field>

            <Field label="Harici bağlantı">
              <input
                className={inputClassName()}
                value={form.fileUrl ?? ""}
                onChange={(event) =>
                  setForm((current) => ({ ...current, fileUrl: event.target.value }))
                }
                placeholder="https://..."
              />
            </Field>

            <Field label="Notlar" className="md:col-span-2">
              <textarea
                rows={5}
                className={inputClassName()}
                value={form.notes ?? ""}
                onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await saveInstitutionArchiveRecordAction(form);
                  setMessage(result.message);
                  showResult(result, {
                    successTitle: form.id ? "Evrak guncellendi" : "Evrak eklendi",
                    errorTitle: form.id ? "Evrak guncellenemedi" : "Evrak eklenemedi",
                  });
                  if (result.success) {
                    resetForm();
                    router.refresh();
                  }
                });
              }}
            >
              {isPending ? "Kaydediliyor..." : form.id ? "Kaydı Güncelle" : "Evrak Ekle"}
            </Button>
            {form.id ? (
              <Button variant="ghost" onClick={resetForm}>
                Vazgec
              </Button>
            ) : null}
          </div>

          {message ? <div className="mt-3 text-sm text-neutral-400">{message}</div> : null}
        </Card>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.24em] text-neutral-500">
                Arşiv
              </div>
              <div className="mt-2 text-2xl font-semibold text-white">Kayitli evraklar</div>
            </div>
            <div className="w-full max-w-sm">
              <input
                className={inputClassName()}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Baslik veya kategori ara"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {filteredRecords.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-sm text-neutral-500">
                Gosterilecek evrak bulunmuyor.
              </div>
            ) : (
              filteredRecords.map((record) => {
                const fileHref =
                  record.mimeType || record.fileSize
                    ? `/api/institution-archive-files/${record.id}`
                    : record.fileUrl;

                return (
                  <DisclosureCard
                    key={record.id}
                    title={record.title}
                    description={`${sectionLabels[record.section]} / ${record.category}`}
                    summary={[
                      <SummaryPill key="section">{sectionLabels[record.section]}</SummaryPill>,
                      <SummaryPill key="date">{formatDate(record.issuedAt)}</SummaryPill>,
                      <SummaryPill key="review">{formatDate(record.reviewDate)}</SummaryPill>,
                    ]}
                    className="rounded-[var(--panel-radius-card)]"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="text-sm text-neutral-300">
                        <div className="font-semibold text-white">Belge numarasi</div>
                        <div className="mt-1">{record.documentNumber || "-"}</div>
                      </div>
                      <div className="text-sm text-neutral-300">
                        <div className="font-semibold text-white">Ilgili birim</div>
                        <div className="mt-1">{record.responsibleUnit || "-"}</div>
                      </div>
                      <div className="text-sm text-neutral-300">
                        <div className="font-semibold text-white">Dosya</div>
                        <div className="mt-1">
                          {record.fileName || "-"}
                          {record.fileSize ? ` / ${formatFileSize(record.fileSize)}` : ""}
                        </div>
                      </div>
                      <div className="text-sm text-neutral-300">
                        <div className="font-semibold text-white">Ekleyen</div>
                        <div className="mt-1">{record.createdBy.name ?? record.createdBy.email}</div>
                      </div>
                    </div>

                    {record.notes ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-neutral-300">
                        {record.notes}
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setForm({
                            id: record.id,
                            title: record.title,
                            section: record.section,
                            category: record.category,
                            documentNumber: record.documentNumber ?? "",
                            responsibleUnit: record.responsibleUnit ?? "",
                            issuedAt: record.issuedAt
                              ? new Date(record.issuedAt).toISOString().slice(0, 10)
                              : "",
                            reviewDate: record.reviewDate
                              ? new Date(record.reviewDate).toISOString().slice(0, 10)
                              : "",
                            fileName: record.fileName ?? "",
                            fileUrl: record.fileUrl ?? "",
                            uploadedFileName: "",
                            uploadedMimeType: "",
                            uploadedBase64: "",
                            notes: record.notes ?? "",
                          })
                        }
                      >
                        Düzenle
                      </Button>
                      {fileHref ? (
                        <a href={fileHref} target="_blank" rel="noreferrer">
                          <Button variant="ghost">Görüntüle</Button>
                        </a>
                      ) : null}
                      <Button
                        variant="danger"
                        disabled={isPending}
                        onClick={() => {
                          (async () => {
                            const confirmed = await confirmModal({
                              title: "Arşiv Belgesini Sil",
                              message: `"${record.title}" isimli arşiv evrak kaydını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
                              variant: "danger",
                              confirmText: "Kalıcı Olarak Sil",
                              cancelText: "Vazgeç",
                            });

                            if (!confirmed) return;

                            startTransition(async () => {
                              const result = await deleteInstitutionArchiveRecordAction({ id: record.id });
                              setMessage(result.message);
                              showResult(result, {
                                successTitle: "Evrak silindi",
                                errorTitle: "Evrak silinemedi",
                              });
                              if (result.success) {
                                if (form.id === record.id) {
                                  resetForm();
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
                  </DisclosureCard>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
