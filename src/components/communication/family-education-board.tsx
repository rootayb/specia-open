"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  deleteFamilyEducationPlanAction,
  deleteFamilyEducationResponseAction,
  saveFamilyEducationPlanAction,
} from "@/app/actions";
import { FamilyEducationResponseForm } from "@/components/communication/family-education-response-form";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import { PanelPageIntro } from "@/components/layout/panel-page-intro";
import { SectionHeading } from "@/components/ui/section-heading";
import type { FamilyEducationPlanInput } from "@/lib/schemas";
import { cn } from "@/lib/utils";

/* ─── Tipler ─────────────────────────────────────────────────── */

type StudentOption = {
  id: string;
  firstName: string;
  lastName: string;
  classroom: string | null;
};

type ResponseStatus = "done" | "partial" | "not_done";

type FamilyEducationResponseRecord = {
  id: string;
  status: ResponseStatus;
  content: string | null;
  imageMimeType: string | null;
  imageName: string | null;
  createdAt: Date;
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
};

type FamilyEducationPlanRecord = {
  id: string;
  title: string;
  cadence: "daily" | "weekly" | "monthly";
  weeklyFocus: string | null;
  homeActivity: string | null;
  familySuggestion: string | null;
  sharedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  student: {
    id: string;
    firstName: string;
    lastName: string;
    classroom: string | null;
  };
  createdBy: {
    id: string;
    name: string | null;
    email: string;
  };
  responses: FamilyEducationResponseRecord[];
};

/* ─── Sabitler ───────────────────────────────────────────────── */

const cadenceLabels: Record<FamilyEducationPlanRecord["cadence"], string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
};

const responseStatusMeta: Record<
  ResponseStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  done: { label: "Yaptık", tone: "success" },
  partial: { label: "Kısmen", tone: "warning" },
  not_done: { label: "Yapamadık", tone: "danger" },
};

/* ─── Yardımcılar ────────────────────────────────────────────── */

function buildEmptyPlan(studentId?: string): FamilyEducationPlanInput {
  return {
    studentId: studentId ?? "",
    title: "",
    cadence: "weekly",
    weeklyFocus: "",
    homeActivity: "",
    familySuggestion: "",
    // Veliyle paylaşıma açık sayılması için doğrudan "shared".
    status: "shared",
    sharedAt: new Date().toISOString().slice(0, 10),
  };
}

function formatDate(value?: Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(date);
}

/* ─── Yanıt listesi (ortak) ──────────────────────────────────── */

function ResponseList({
  responses,
  canDelete,
  onDelete,
  isPending,
}: {
  responses: FamilyEducationResponseRecord[];
  canDelete?: boolean;
  onDelete?: (id: string) => void;
  isPending?: boolean;
}) {
  if (responses.length === 0) {
    return (
      <div className="rounded-[var(--panel-radius-md)] border border-dashed border-[color:var(--panel-border)] px-4 py-5 text-sm text-[color:var(--panel-text-soft)]">
        Henüz aile geri dönüşü eklenmemiş.
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {responses.map((response) => {
        const meta = responseStatusMeta[response.status];
        return (
          <div
            key={response.id}
            className="rounded-[var(--panel-radius-md)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={meta.tone}>{meta.label}</Badge>
                <span className="text-xs text-[color:var(--panel-text-muted)]">
                  {response.createdBy.name ?? "Veli"} · {formatDate(response.createdAt)}
                </span>
              </div>
              {canDelete && onDelete && (
                <Button
                  variant="danger"
                  size="sm"
                  disabled={isPending}
                  onClick={() => onDelete(response.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
            {response.content && (
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-[color:var(--panel-text-muted)]">
                {response.content}
              </p>
            )}
            {response.imageMimeType && (
              <a
                href={`/api/family-education/responses/${response.id}/image`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 block w-fit overflow-hidden rounded-[var(--panel-radius-sm)] border border-[color:var(--panel-border)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/family-education/responses/${response.id}/image`}
                  alt={response.imageName ?? "Aile geri dönüş görseli"}
                  className="max-h-44 w-auto object-cover"
                />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Plan içerik bloğu (ortak) ──────────────────────────────── */

function PlanContent({ plan }: { plan: FamilyEducationPlanRecord }) {
  const blocks = [
    { label: "Haftalık odak", value: plan.weeklyFocus },
    { label: "Evde uygulanacak etkinlik", value: plan.homeActivity },
    { label: "Aileye öneriler", value: plan.familySuggestion },
  ].filter((block) => block.value?.trim());

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-3">
      {blocks.map((block) => (
        <div key={block.label}>
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
            {block.label}
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-[color:var(--panel-text)]">
            {block.value}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ─── Ana bileşen ────────────────────────────────────────────── */

export function FamilyEducationBoard({
  students,
  plans,
  isReadOnly = false,
  initialStudentId,
}: {
  students: StudentOption[];
  plans: FamilyEducationPlanRecord[];
  isReadOnly?: boolean;
  initialStudentId?: string;
}) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [isPending, startTransition] = useTransition();

  const [studentFilter, setStudentFilter] = useState<string>(initialStudentId ?? "all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FamilyEducationPlanInput>(buildEmptyPlan(initialStudentId));

  const filteredPlans = useMemo(() => {
    if (isReadOnly || studentFilter === "all") return plans;
    return plans.filter((plan) => plan.student.id === studentFilter);
  }, [isReadOnly, plans, studentFilter]);

  function resetForm() {
    setForm(buildEmptyPlan(studentFilter !== "all" ? studentFilter : initialStudentId));
    setShowForm(false);
  }

  function openCreate() {
    setForm(buildEmptyPlan(studentFilter !== "all" ? studentFilter : initialStudentId));
    setShowForm(true);
  }

  function openEdit(plan: FamilyEducationPlanRecord) {
    setForm({
      id: plan.id,
      studentId: plan.student.id,
      title: plan.title,
      cadence: plan.cadence,
      weeklyFocus: plan.weeklyFocus ?? "",
      homeActivity: plan.homeActivity ?? "",
      familySuggestion: plan.familySuggestion ?? "",
      status: "shared",
      sharedAt: plan.sharedAt
        ? new Date(plan.sharedAt).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setShowForm(true);
  }

  function savePlan() {
    startTransition(async () => {
      const result = await saveFamilyEducationPlanAction(form);
      showResult(result, {
        successTitle: form.id ? "Yönlendirme güncellendi" : "Yönlendirme paylaşıldı",
        errorTitle: "Kaydedilemedi",
      });
      if (result.success) {
        resetForm();
        router.refresh();
      }
    });
  }

  function deletePlan(id: string) {
    if (!window.confirm("Bu yönlendirme silinsin mi?")) return;
    startTransition(async () => {
      const result = await deleteFamilyEducationPlanAction({ id });
      showResult(result, { successTitle: "Yönlendirme silindi", errorTitle: "Silinemedi" });
      if (result.success) router.refresh();
    });
  }

  function deleteResponse(id: string) {
    if (!window.confirm("Bu geri dönüş silinsin mi?")) return;
    startTransition(async () => {
      const result = await deleteFamilyEducationResponseAction({ id });
      showResult(result, { successTitle: "Geri dönüş silindi", errorTitle: "Silinemedi" });
      if (result.success) router.refresh();
    });
  }

  /* ── Veli görünümü ─────────────────────────────────────────── */
  if (isReadOnly) {
    return (
      <div className="grid gap-5">
        <PanelPageIntro
          eyebrow="Aile eğitimi"
          title="Öğretmen yönlendirmeleri"
          description="Öğretmenin paylaştığı çalışmaları görün; yaptıklarınızı görsel veya yazı ile geri bildirin."
        />

        {filteredPlans.length === 0 ? (
          <Card>
            <SectionHeading
              eyebrow="Yönlendirme"
              title="Henüz paylaşılmış aile eğitimi yönlendirmesi yok."
              description="Öğretmen bir çalışma paylaştığında burada görünür ve geri dönüş ekleyebilirsiniz."
            />
          </Card>
        ) : (
          filteredPlans.map((plan) => {
            const ownResponses = plan.responses;
            return (
              <Card key={plan.id} padding="md">
                <div className="grid gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                        {plan.student.firstName} {plan.student.lastName}
                        {plan.student.classroom ? ` · ${plan.student.classroom}` : ""}
                      </div>
                      <h3 className="mt-1 text-base font-medium text-[color:var(--panel-text)]">
                        {plan.title}
                      </h3>
                    </div>
                    <Badge tone="neutral" dot>
                      {cadenceLabels[plan.cadence]}
                    </Badge>
                  </div>

                  <PlanContent plan={plan} />

                  <FamilyEducationResponseForm planId={plan.id} />

                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                      Geri dönüşleriniz
                    </div>
                    <div className="mt-2">
                      <ResponseList
                        responses={ownResponses}
                        canDelete
                        onDelete={deleteResponse}
                        isPending={isPending}
                      />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    );
  }

  /* ── Öğretmen / kurum görünümü ─────────────────────────────── */
  return (
    <div className="grid gap-5">
      <PanelPageIntro
        eyebrow="Aile eğitimi"
        title="Aile yönlendirmeleri"
        description="Aileyle paylaşacağınız ev çalışmasını oluşturun; ailenin geri dönüşlerini buradan izleyin."
        actions={
          !showForm ? (
            <Button onClick={openCreate}>
              <Plus className="size-4" />
              Yeni yönlendirme
            </Button>
          ) : undefined
        }
      />

      {/* Plan formu */}
      {showForm && (
        <Card padding="md">
          <SectionHeading
            eyebrow="Yönlendirme"
            title={form.id ? "Yönlendirmeyi düzenle" : "Yeni yönlendirme"}
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Öğrenci">
              <select
                className={inputClassName()}
                value={form.studentId}
                onChange={(event) => setForm((f) => ({ ...f, studentId: event.target.value }))}
              >
                <option value="">Öğrenci seçin</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                    {student.classroom ? ` / ${student.classroom}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Sıklık">
              <select
                className={inputClassName()}
                value={form.cadence}
                onChange={(event) =>
                  setForm((f) => ({
                    ...f,
                    cadence: event.target.value as FamilyEducationPlanInput["cadence"],
                  }))
                }
              >
                {Object.entries(cadenceLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Başlık" className="sm:col-span-2">
              <input
                className={inputClassName()}
                value={form.title}
                onChange={(event) => setForm((f) => ({ ...f, title: event.target.value }))}
                placeholder="Örn. Bu hafta evde sayı çalışması"
              />
            </Field>

            <Field label="Haftalık odak" className="sm:col-span-2">
              <textarea
                className={`${inputClassName()} min-h-16`}
                value={form.weeklyFocus ?? ""}
                onChange={(event) => setForm((f) => ({ ...f, weeklyFocus: event.target.value }))}
                placeholder="Bu dönem ailenin odaklanacağı hedef…"
              />
            </Field>

            <Field label="Evde uygulanacak etkinlik" className="sm:col-span-2">
              <textarea
                className={`${inputClassName()} min-h-20`}
                value={form.homeActivity ?? ""}
                onChange={(event) => setForm((f) => ({ ...f, homeActivity: event.target.value }))}
                placeholder="Adım adım yapılacak çalışmalar…"
              />
            </Field>

            <Field label="Aileye öneriler" className="sm:col-span-2">
              <textarea
                className={`${inputClassName()} min-h-16`}
                value={form.familySuggestion ?? ""}
                onChange={(event) =>
                  setForm((f) => ({ ...f, familySuggestion: event.target.value }))
                }
                placeholder="Dikkat edilecek noktalar, ipuçları…"
              />
            </Field>

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <Button disabled={isPending} onClick={savePlan}>
                {isPending ? "Kaydediliyor…" : form.id ? "Güncelle" : "Paylaş"}
              </Button>
              <Button variant="ghost" disabled={isPending} onClick={resetForm}>
                Vazgeç
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Plan listesi */}
      {filteredPlans.length === 0 ? (
        <Card>
          <SectionHeading
            eyebrow="Yönlendirme"
            title="Henüz yönlendirme yok."
            description="Yeni yönlendirme oluşturarak aileyle ev çalışması paylaşabilirsiniz."
          />
        </Card>
      ) : (
        filteredPlans.map((plan) => (
          <Card key={plan.id} padding="md">
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    {plan.student.firstName} {plan.student.lastName}
                    {plan.student.classroom ? ` · ${plan.student.classroom}` : ""}
                  </div>
                  <h3 className="mt-1 text-base font-medium text-[color:var(--panel-text)]">
                    {plan.title}
                  </h3>
                  <div className="mt-1 text-xs text-[color:var(--panel-text-soft)]">
                    {cadenceLabels[plan.cadence]} · Paylaşım: {formatDate(plan.sharedAt)}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => openEdit(plan)}
                  >
                    <Pencil className="size-3.5" />
                    Düzenle
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    disabled={isPending}
                    onClick={() => deletePlan(plan.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              <PlanContent plan={plan} />

              <div>
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[color:var(--panel-text-soft)]">
                    Aile geri dönüşleri
                  </div>
                  <span className="text-xs text-[color:var(--panel-text-soft)]">
                    {plan.responses.length} yanıt
                  </span>
                </div>
                <div className="mt-2">
                  <ResponseList responses={plan.responses} />
                </div>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
