"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  ClipboardList,
  Copy,
  FileDown,
  Layers3,
  Target,
  Trash2,
} from "lucide-react";

import {
  deleteSensoryRegulationMenuItemAction,
  deleteSpecialEducationReinforcerAction,
  saveSensoryRegulationMenuItemAction,
  saveSpecialEducationReinforcerAction,
} from "@/app/special-education-tools-actions";
import { useActionToast } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";
import type { SpecialEducationToolSlug } from "@/lib/special-education-tools-catalog";
import type {
  SensoryRegulationMenuItemInput,
  SpecialEducationReinforcerInput,
} from "@/lib/schemas";
import {
  buildGoalBreakdown,
  buildNarrativeGeneratorOutput,
  buildSupportProfile,
  getDocumentProgressSnapshot,
  summarizeAbcEntries,
  type ToolStudent,
} from "@/lib/special-education-tools";

type Props = {
  tool: SpecialEducationToolSlug;
  toolMeta: {
    title: string;
    description: string;
  };
  students: ToolStudent[];
  initialStudentId?: string;
};

type AbcRecord = {
  id: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  setting: string;
};

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}



function parseLines(value: string) {
  return value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTextBlock(title: string, items: string[]) {
  return `${title}\n${(items.length ? items : ["Veri bulunmuyor"])
    .map((item) => `- ${item}`)
    .join("\n")}`;
}

function createReinforcerForm(studentId: string): SpecialEducationReinforcerInput {
  return {
    studentId,
    title: "",
    category: "Etkinlik",
    useCase: "",
    deliveryType: "",
    notes: "",
    strengthLevel: 3,
    isActive: true,
  };
}

function createSensoryForm(studentId: string): SensoryRegulationMenuItemInput {
  return {
    studentId,
    title: "",
    category: "Sakinlesme",
    useWhen: "",
    durationLabel: "",
    materials: "",
    notes: "",
    sortOrder: 0,
    isActive: true,
  };
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[var(--panel-radius-card)] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
      <div className="text-[11px] uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-50">{value}</div>
      <div className="mt-1 text-sm text-slate-400">{detail}</div>
    </div>
  );
}


function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[var(--panel-radius-card)] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-5">
      <div className="text-sm font-semibold text-slate-50">{title}</div>
      <div className="mt-4 grid gap-2 text-sm leading-7 text-slate-300">
        {(items.length ? items : ["Veri bulunmuyor."]).map((item) => (
          <div
            key={item}
            className="rounded-2xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-3 py-2"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function getRiskToneLabel(value: "stable" | "watch" | "priority") {
  if (value === "priority") return "Oncelikli takip";
  if (value === "watch") return "Yakindan izleme";
  return "Dengeli gorunum";
}


function getToolIcon(tool: SpecialEducationToolSlug) {
  const className = "size-5";

  switch (tool) {
    case "support-profile":
      return <Brain className={className} />;
    case "reinforcer-pool":
      return <Target className={className} />;
    case "sensory-menu":
      return <Layers3 className={className} />;
    case "story-builder":
      return <Copy className={className} />;
    case "abc-analysis":
      return <ClipboardList className={className} />;
  }
}

export function SpecialEducationToolWorkspace({
  tool,
  toolMeta,
  students,
  initialStudentId,
}: Props) {
  const defaultStudentId = initialStudentId ?? students[0]?.id ?? "";
  const router = useRouter();
  const { showToast } = useActionToast();
  const [isPending, startTransition] = useTransition();
  const [studentId, setStudentId] = useState(defaultStudentId);
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [isPdfLoading, setIsPdfLoading] = useState(false);
  const [poolFeedback, setPoolFeedback] = useState("");
  const [menuFeedback, setMenuFeedback] = useState("");
  const [narrativeMode, setNarrativeMode] = useState<"social_story" | "task_analysis">("social_story");
  const [narrativeTitle, setNarrativeTitle] = useState("Derse gecis rutini");
  const [narrativeContext, setNarrativeContext] = useState("Ders baslarken");
  const [narrativeExpectedBehavior, setNarrativeExpectedBehavior] = useState(
    "Ben durur, dinler ve uygun adimi denerim.",
  );
  const [narrativeSupportCue, setNarrativeSupportCue] = useState("Gorsel kart ve kısa yonerge");
  const [narrativeStepsInput, setNarrativeStepsInput] = useState(
    "Dur\nDinle\nGorsel karta bak\nIlk adimi yap",
  );
  const [abcAntecedent, setAbcAntecedent] = useState("");
  const [abcBehavior, setAbcBehavior] = useState("");
  const [abcConsequence, setAbcConsequence] = useState("");
  const [abcSetting, setAbcSetting] = useState("");
  const [abcEntries, setAbcEntries] = useState<AbcRecord[]>([]);
  const [editingAbcId, setEditingAbcId] = useState<string | null>(null);
  const [reinforcerForm, setReinforcerForm] = useState<SpecialEducationReinforcerInput>(
    createReinforcerForm(defaultStudentId),
  );
  const [sensoryForm, setSensoryForm] = useState<SensoryRegulationMenuItemInput>(
    createSensoryForm(defaultStudentId),
  );

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? students[0] ?? null,
    [studentId, students],
  );
  const selectedDocument = selectedStudent?.documents[0] ?? null;
  const selectedGoal =
    selectedDocument?.goals.find((goal) => goal.id === selectedGoalId) ??
    selectedDocument?.goals[0] ??
    null;
  const progressSnapshot = getDocumentProgressSnapshot(selectedDocument);
  const supportProfile = buildSupportProfile(selectedStudent, selectedDocument);
  const goalBreakdown = buildGoalBreakdown(selectedGoal);
  const narrativeOutput = buildNarrativeGeneratorOutput({
    studentName: selectedStudent
      ? `${selectedStudent.firstName} ${selectedStudent.lastName}`
      : "Öğrenci",
    mode: narrativeMode,
    title: narrativeTitle,
    context: narrativeContext,
    expectedBehavior: narrativeExpectedBehavior,
    supportCue: narrativeSupportCue,
    steps: parseLines(narrativeStepsInput),
  });
  const abcInsight = summarizeAbcEntries(abcEntries);

  /** Aracın o anki içeriğini bölüm/alan çiftlerine çevirir; PDF çıktısında kullanılır. */
  function buildPdfSections(): Array<{ title: string; fields: Array<{ label: string; value: string }> }> {
    if (tool === "support-profile") {
      return [
        {
          title: "Özet",
          fields: [
            { label: "Genel Durum", value: supportProfile.headline },
            { label: "Takip Düzeyi", value: getRiskToneLabel(supportProfile.riskTone) },
          ],
        },
        {
          title: "Güçlü Yönler",
          fields: [{ label: "Öne Çıkanlar", value: supportProfile.strengths.join("\n") }],
        },
        {
          title: "Odak Alanları",
          fields: [{ label: "Öncelikler", value: supportProfile.focusAreas.join("\n") }],
        },
        {
          title: "Sınıf İçi Uyarlamalar",
          fields: [{ label: "Öneriler", value: supportProfile.classAdjustments.join("\n") }],
        },
        {
          title: "Aile ile İş Birliği",
          fields: [{ label: "Öneriler", value: supportProfile.familyActions.join("\n") }],
        },
      ];
    }

    if (tool === "reinforcer-pool") {
      const reinforcers = (selectedStudent?.reinforcers ?? []).filter((item) => item.isActive);
      return [
        {
          title: "Aktif Pekiştireçler",
          fields: reinforcers.slice(0, 24).map((item) => ({
            label: item.title,
            value: [
              item.category ? `Tür: ${item.category}` : "",
              item.deliveryType ? `Sunum: ${item.deliveryType}` : "",
              item.strengthLevel ? `Etki düzeyi: ${item.strengthLevel}` : "",
              item.useCase ? `Kullanım: ${item.useCase}` : "",
              item.notes ? `Not: ${item.notes}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          })),
        },
      ];
    }

    if (tool === "sensory-menu") {
      const items = (selectedStudent?.sensoryMenuItems ?? []).filter((item) => item.isActive);
      return [
        {
          title: "Duyusal Düzenleme Menüsü",
          fields: items.slice(0, 24).map((item) => ({
            label: item.title,
            value: [
              item.category ? `Kategori: ${item.category}` : "",
              item.useWhen ? `Ne zaman: ${item.useWhen}` : "",
              item.durationLabel ? `Süre: ${item.durationLabel}` : "",
              item.materials ? `Materyal: ${item.materials}` : "",
              item.notes ? `Not: ${item.notes}` : "",
            ]
              .filter(Boolean)
              .join("\n"),
          })),
        },
      ];
    }

    if (tool === "story-builder") {
      return [
        {
          title: narrativeOutput.title,
          fields: [
            { label: "Giriş", value: narrativeOutput.intro },
            { label: "Adımlar", value: narrativeOutput.body.join("\n") },
            { label: "Kapanış", value: narrativeOutput.closing },
          ],
        },
      ];
    }

    // abc-analysis
    return [
      {
        title: "ABC Kayıtları",
        fields: abcEntries.slice(0, 24).map((entry, index) => ({
          label: `Kayıt ${index + 1}${entry.setting ? ` · ${entry.setting}` : ""}`,
          value: [
            `Öncül: ${entry.antecedent}`,
            `Davranış: ${entry.behavior}`,
            `Sonuç: ${entry.consequence}`,
          ].join("\n"),
        })),
      },
      {
        title: "Özet ve Öneriler",
        fields: [
          { label: "Özet", value: abcInsight.summary },
          { label: "En Sık Öncüller", value: abcInsight.topAntecedents.join("\n") },
          { label: "En Sık Sonuçlar", value: abcInsight.topConsequences.join("\n") },
          { label: "Sonraki Adımlar", value: abcInsight.nextSteps.join("\n") },
        ],
      },
    ];
  }

  async function downloadToolPdf() {
    setIsPdfLoading(true);
    try {
      const response = await fetch(`/api/pdf/araclar/${tool}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent?.id,
          sections: buildPdfSections(),
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error || "PDF oluşturulamadı.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const popup = window.open(objectUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = `${toolMeta.title}.pdf`;
        anchor.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch (error) {
      showToast({
        title: "PDF alınamadı",
        message: error instanceof Error ? error.message : "PDF oluşturulamadı.",
        tone: "error",
      });
    } finally {
      setIsPdfLoading(false);
    }
  }

  async function copySection(title: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopyFeedback(`${title} panoya kopyalandi.`);
      window.setTimeout(() => setCopyFeedback(""), 2400);
    } catch {
      setCopyFeedback("Pano erişimi saglanamadi.");
    }
  }

  function changeStudent(nextStudentId: string) {
    setStudentId(nextStudentId);
    setSelectedGoalId("");
    setReinforcerForm(createReinforcerForm(nextStudentId));
    setSensoryForm(createSensoryForm(nextStudentId));
    setPoolFeedback("");
    setMenuFeedback("");
    setCopyFeedback("");
    setAbcEntries([]);
    setEditingAbcId(null);

    startTransition(() => {
      router.replace(`/panel/ozel-egitim-araclari/${tool}?studentId=${nextStudentId}`, {
        scroll: false,
      });
    });
  }

  if (students.length === 0) {
    return <Card>Öğrenci bulunmuyor.</Card>;
  }

  function renderSupportProfile() {
    return (
      <div className="grid gap-6">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                Öğrenci özet paneli
              </div>
              <h2 className="text-3xl font-semibold text-white">Destek profili</h2>
              <p className="max-w-3xl text-sm leading-7 text-neutral-300">{supportProfile.headline}</p>
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                copySection(
                  "Destek profili",
                  [
                    supportProfile.headline,
                    buildTextBlock("Güçlü yanlar", supportProfile.strengths),
                    buildTextBlock("Oncelikli alanlar", supportProfile.focusAreas),
                    buildTextBlock("Sınıf uyarlamalari", supportProfile.classAdjustments),
                    buildTextBlock("Aile odaklari", supportProfile.familyActions),
                  ].join("\n\n"),
                )
              }
            >
              <Copy className="mr-2 size-4" />
              Kopyala
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            <Metric
              label="Risk tonu"
              value={getRiskToneLabel(supportProfile.riskTone)}
              detail="Otomatik profil okuması"
            />
            <Metric
              label="Toplam hedef"
              value={`${progressSnapshot.goalCount}`}
              detail="En güncel plan kaydı"
            />
            <Metric
              label="Tamamlanan"
              value={`${progressSnapshot.completedGoalCount}`}
              detail="Kayitli hedef sonucu"
            />
            <Metric
              label="Ortalama ilerleme"
              value={`%${progressSnapshot.averageProgressPercent}`}
              detail="Son durum ortalamasi"
            />
          </div>
        </Card>

        <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <Card className="space-y-5">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Hedef odagi</div>
              <h3 className="text-xl font-semibold text-white">Mikro hedef parcasi</h3>
            </div>
            <Field
              label="Odak hedef"
              hint="Seçim yapilmazsa en güncel plandaki ilk hedef otomatik kullanilir."
            >
              <select
                className={inputClassName()}
                value={selectedGoal?.id ?? ""}
                onChange={(event) => setSelectedGoalId(event.target.value)}
                disabled={!selectedDocument || selectedDocument.goals.length === 0}
              >
                {selectedDocument?.goals.length ? null : (
                  <option value="">Secilebilir hedef yok</option>
                )}
                {(selectedDocument?.goals ?? []).map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.courseName} / {goal.learningOutcome}
                  </option>
                ))}
              </select>
            </Field>

            <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm font-semibold text-white">{goalBreakdown.title}</div>
              <div className="mt-2 text-sm text-neutral-300">{goalBreakdown.stepLabel}</div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Oturum odagi</div>
                  <div className="mt-3 grid gap-2 text-sm text-neutral-300">
                    {(goalBreakdown.sessionFocus.length
                      ? goalBreakdown.sessionFocus
                      : ["Odak adimi secildiginde burada listelenir."]).map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/6 bg-black/20 px-3 py-2"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">
                    Olcum plani
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-neutral-300">
                    {(goalBreakdown.measurementPlan.length
                      ? goalBreakdown.measurementPlan
                      : ["Olcum plani burada olusur."]).map((item) => (
                      <div
                        key={item}
                        className="rounded-2xl border border-white/6 bg-black/20 px-3 py-2"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-6">
            <SectionList title="Güçlü yanlar" items={supportProfile.strengths} />
            <SectionList title="Oncelikli alanlar" items={supportProfile.focusAreas} />
            <SectionList title="Sınıf uyarlamalari" items={supportProfile.classAdjustments} />
            <SectionList title="Aile odaklari" items={supportProfile.familyActions} />
          </div>
        </div>
      </div>
    );
  }

  function renderReinforcerPool() {
    const reinforcers = selectedStudent?.reinforcers ?? [];
    const activeCount = reinforcers.filter((item) => item.isActive).length;

    return (
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Kayıt formu</div>
            <h2 className="text-3xl font-semibold text-white">Pekiştireç havuzu</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Baslik">
              <input
                className={inputClassName()}
                value={reinforcerForm.title ?? ""}
                onChange={(event) =>
                  setReinforcerForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </Field>
            <Field label="Kategori">
              <input
                className={inputClassName()}
                value={reinforcerForm.category ?? ""}
                onChange={(event) =>
                  setReinforcerForm((current) => ({ ...current, category: event.target.value }))
                }
              />
            </Field>
            <Field label="Kullanim alani">
              <input
                className={inputClassName()}
                value={reinforcerForm.useCase ?? ""}
                onChange={(event) =>
                  setReinforcerForm((current) => ({ ...current, useCase: event.target.value }))
                }
              />
            </Field>
            <Field label="Sunum sekli">
              <input
                className={inputClassName()}
                value={reinforcerForm.deliveryType ?? ""}
                onChange={(event) =>
                  setReinforcerForm((current) => ({
                    ...current,
                    deliveryType: event.target.value,
                  }))
                }
              />
            </Field>
            <Field label="Guc duzeyi">
              <input
                type="number"
                min={1}
                max={5}
                className={inputClassName()}
                value={reinforcerForm.strengthLevel ?? 3}
                onChange={(event) =>
                  setReinforcerForm((current) => ({
                    ...current,
                    strengthLevel: Number(event.target.value || 3),
                  }))
                }
              />
            </Field>
            <Field label="Durum">
              <select
                className={inputClassName()}
                value={reinforcerForm.isActive ? "true" : "false"}
                onChange={(event) =>
                  setReinforcerForm((current) => ({
                    ...current,
                    isActive: event.target.value === "true",
                  }))
                }
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </Field>
          </div>

          <Field label="Not">
            <textarea
              className={`${inputClassName()} min-h-28`}
              rows={4}
              value={reinforcerForm.notes ?? ""}
              onChange={(event) =>
                setReinforcerForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isPending || !selectedStudent}
              onClick={() =>
                startTransition(async () => {
                  if (!selectedStudent) return;

                  const result = await saveSpecialEducationReinforcerAction({
                    ...reinforcerForm,
                    studentId: selectedStudent.id,
                  });
                  setPoolFeedback(result.message);
                  showToast({
                    title: result.success ? "Pekiştireç kaydedildi" : "Islem tamamlanmadi",
                    message: result.message,
                    tone: result.success ? "success" : "error",
                  });

                  if (result.success) {
                    setReinforcerForm(createReinforcerForm(selectedStudent.id));
                    router.refresh();
                  }
                })
              }
            >
              {reinforcerForm.id ? "Güncelle" : "Kaydet"}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                selectedStudent && setReinforcerForm(createReinforcerForm(selectedStudent.id))
              }
            >
              Temizle
            </Button>
          </div>

          {poolFeedback ? <div className="text-sm text-sky-200">{poolFeedback}</div> : null}
        </Card>

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Metric label="Toplam kayıt" value={`${reinforcers.length}`} detail="Tum pekistirecler" />
            <Metric label="Aktif havuz" value={`${activeCount}`} detail="Derste kullanilabilir" />
          </div>

          <Card className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Kayıtlar</div>
              <h3 className="text-xl font-semibold text-white">Mevcut pekistirecler</h3>
            </div>

            <div className="grid gap-3">
              {reinforcers.length ? (
                reinforcers.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-white">{item.title}</div>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-neutral-400">
                            {item.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                        <div className="text-sm text-neutral-400">
                          {item.category} / {item.strengthLevel} / 5
                        </div>
                        {item.useCase ? (
                          <div className="text-sm text-neutral-300">{item.useCase}</div>
                        ) : null}
                        {item.notes ? (
                          <div className="text-sm leading-7 text-neutral-400">{item.notes}</div>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setReinforcerForm({
                              id: item.id,
                              studentId: selectedStudent?.id ?? "",
                              title: item.title,
                              category: item.category,
                              useCase: item.useCase ?? "",
                              deliveryType: item.deliveryType ?? "",
                              notes: item.notes ?? "",
                              strengthLevel: item.strengthLevel,
                              isActive: item.isActive,
                            })
                          }
                        >
                          Düzenle
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `${item.title} silinecek.\n\nBu islem pekiştireç havuzundan bu kaydı kaldirir.\n\nDevam etmek istiyor musunuz?`,
                              )
                            ) {
                              return;
                            }

                            startTransition(async () => {
                              const result = await deleteSpecialEducationReinforcerAction({
                                id: item.id,
                              });
                              setPoolFeedback(result.message);
                              showToast({
                                title: result.success ? "Pekiştireç silindi" : "Silme tamamlanmadi",
                                message: result.message,
                                tone: result.success ? "success" : "error",
                              });
                              if (result.success) router.refresh();
                            });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[var(--panel-radius-card)] border border-dashed border-white/10 px-4 py-8 text-sm text-neutral-400">
                  Henüz pekistirec kaydı yok.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function renderSensoryMenu() {
    const menuItems = selectedStudent?.sensoryMenuItems ?? [];
    const activeCount = menuItems.filter((item) => item.isActive).length;

    return (
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Kayıt formu</div>
            <h2 className="text-3xl font-semibold text-white">Duyusal menu</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Baslik">
              <input
                className={inputClassName()}
                value={sensoryForm.title ?? ""}
                onChange={(event) =>
                  setSensoryForm((current) => ({ ...current, title: event.target.value }))
                }
              />
            </Field>
            <Field label="Kategori">
              <input
                className={inputClassName()}
                value={sensoryForm.category ?? ""}
                onChange={(event) =>
                  setSensoryForm((current) => ({ ...current, category: event.target.value }))
                }
              />
            </Field>
            <Field label="Ne zaman">
              <input
                className={inputClassName()}
                value={sensoryForm.useWhen ?? ""}
                onChange={(event) =>
                  setSensoryForm((current) => ({ ...current, useWhen: event.target.value }))
                }
              />
            </Field>
            <Field label="Süre">
              <input
                className={inputClassName()}
                value={sensoryForm.durationLabel ?? ""}
                onChange={(event) =>
                  setSensoryForm((current) => ({ ...current, durationLabel: event.target.value }))
                }
              />
            </Field>
            <Field label="Materyaller">
              <input
                className={inputClassName()}
                value={sensoryForm.materials ?? ""}
                onChange={(event) =>
                  setSensoryForm((current) => ({ ...current, materials: event.target.value }))
                }
              />
            </Field>
            <Field label="Sıra">
              <input
                type="number"
                min={0}
                className={inputClassName()}
                value={sensoryForm.sortOrder ?? 0}
                onChange={(event) =>
                  setSensoryForm((current) => ({
                    ...current,
                    sortOrder: Number(event.target.value || 0),
                  }))
                }
              />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Durum">
              <select
                className={inputClassName()}
                value={sensoryForm.isActive ? "true" : "false"}
                onChange={(event) =>
                  setSensoryForm((current) => ({
                    ...current,
                    isActive: event.target.value === "true",
                  }))
                }
              >
                <option value="true">Aktif</option>
                <option value="false">Pasif</option>
              </select>
            </Field>
          </div>

          <Field label="Not">
            <textarea
              className={`${inputClassName()} min-h-28`}
              rows={4}
              value={sensoryForm.notes ?? ""}
              onChange={(event) =>
                setSensoryForm((current) => ({ ...current, notes: event.target.value }))
              }
            />
          </Field>

          <div className="flex flex-wrap gap-3">
            <Button
              disabled={isPending || !selectedStudent}
              onClick={() =>
                startTransition(async () => {
                  if (!selectedStudent) return;

                  const result = await saveSensoryRegulationMenuItemAction({
                    ...sensoryForm,
                    studentId: selectedStudent.id,
                  });
                  setMenuFeedback(result.message);
                  showToast({
                    title: result.success ? "Duyusal kart kaydedildi" : "Islem tamamlanmadi",
                    message: result.message,
                    tone: result.success ? "success" : "error",
                  });

                  if (result.success) {
                    setSensoryForm(createSensoryForm(selectedStudent.id));
                    router.refresh();
                  }
                })
              }
            >
              {sensoryForm.id ? "Güncelle" : "Kaydet"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => selectedStudent && setSensoryForm(createSensoryForm(selectedStudent.id))}
            >
              Temizle
            </Button>
          </div>

          {menuFeedback ? <div className="text-sm text-sky-200">{menuFeedback}</div> : null}
        </Card>

        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Metric label="Toplam oge" value={`${menuItems.length}`} detail="Kayitli kart sayısı" />
            <Metric label="Aktif menu" value={`${activeCount}`} detail="Kullanima acik kart" />
          </div>

          <Card className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Kayıtlar</div>
              <h3 className="text-xl font-semibold text-white">Mevcut duyusal kartlar</h3>
            </div>

            <div className="grid gap-3">
              {menuItems.length ? (
                menuItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-semibold text-white">{item.title}</div>
                          <span className="rounded-full border border-white/10 px-2.5 py-1 text-xs text-neutral-400">
                            {item.isActive ? "Aktif" : "Pasif"}
                          </span>
                        </div>
                        <div className="text-sm text-neutral-400">
                          {item.category} / {item.durationLabel || "-"}
                        </div>
                        {item.useWhen ? (
                          <div className="text-sm text-neutral-300">{item.useWhen}</div>
                        ) : null}
                        {item.materials ? (
                          <div className="text-sm text-neutral-400">
                            Materyaller: {item.materials}
                          </div>
                        ) : null}
                        {item.notes ? (
                          <div className="text-sm leading-7 text-neutral-400">{item.notes}</div>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() =>
                            setSensoryForm({
                              id: item.id,
                              studentId: selectedStudent?.id ?? "",
                              title: item.title,
                              category: item.category,
                              useWhen: item.useWhen ?? "",
                              durationLabel: item.durationLabel ?? "",
                              materials: item.materials ?? "",
                              notes: item.notes ?? "",
                              sortOrder: item.sortOrder,
                              isActive: item.isActive,
                            })
                          }
                        >
                          Düzenle
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            if (
                              !window.confirm(
                                `${item.title} silinecek.\n\nBu islem duyusal menu listesinden bu karti kaldirir.\n\nDevam etmek istiyor musunuz?`,
                              )
                            ) {
                              return;
                            }

                            startTransition(async () => {
                              const result = await deleteSensoryRegulationMenuItemAction({
                                id: item.id,
                              });
                              setMenuFeedback(result.message);
                              showToast({
                                title: result.success ? "Duyusal kart silindi" : "Silme tamamlanmadi",
                                message: result.message,
                                tone: result.success ? "success" : "error",
                              });
                              if (result.success) router.refresh();
                            });
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[var(--panel-radius-card)] border border-dashed border-white/10 px-4 py-8 text-sm text-neutral-400">
                  Henüz duyusal menu kaydı yok.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  function renderStoryBuilder() {
    return (
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <Card className="space-y-5">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Metin olusturucu</div>
            <h2 className="text-3xl font-semibold text-white">Sosyal oyku / gorev analizi</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Mod">
              <select
                className={inputClassName()}
                value={narrativeMode}
                onChange={(event) =>
                  setNarrativeMode(event.target.value as "social_story" | "task_analysis")
                }
              >
                <option value="social_story">Sosyal oyku</option>
                <option value="task_analysis">Görev analizi</option>
              </select>
            </Field>
            <Field label="Baslik">
              <input
                className={inputClassName()}
                value={narrativeTitle}
                onChange={(event) => setNarrativeTitle(event.target.value)}
              />
            </Field>
            <Field label="Baglam">
              <input
                className={inputClassName()}
                value={narrativeContext}
                onChange={(event) => setNarrativeContext(event.target.value)}
              />
            </Field>
            <Field label="Beklenen davranis">
              <input
                className={inputClassName()}
                value={narrativeExpectedBehavior}
                onChange={(event) => setNarrativeExpectedBehavior(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Destek ipucu">
            <input
              className={inputClassName()}
              value={narrativeSupportCue}
              onChange={(event) => setNarrativeSupportCue(event.target.value)}
            />
          </Field>

          <Field label="Adimlar">
            <textarea
              className={`${inputClassName()} min-h-36`}
              rows={6}
              value={narrativeStepsInput}
              onChange={(event) => setNarrativeStepsInput(event.target.value)}
            />
          </Field>
        </Card>

        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Onizleme</div>
              <h3 className="text-xl font-semibold text-white">{narrativeOutput.title}</h3>
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                copySection(
                  narrativeOutput.title,
                  [narrativeOutput.intro, ...narrativeOutput.body, narrativeOutput.closing].join(
                    "\n",
                  ),
                )
              }
            >
              <Copy className="mr-2 size-4" />
              Kopyala
            </Button>
          </div>

          <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-5">
            <div className="space-y-3 text-sm leading-7 text-neutral-300">
              <div>{narrativeOutput.intro}</div>
              {narrativeOutput.body.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div className="text-neutral-400">{narrativeOutput.closing}</div>
            </div>
          </div>

          <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-neutral-400">
            Metinler kayıt yerine hizli kullanim için uretilir. Dilerseniz kopyalayip form, not veya
            veli iletisiminde kullanabilirsiniz.
          </div>
        </Card>
      </div>
    );
  }

  function renderAbcAnalysis() {
    const editingEntry = abcEntries.find((entry) => entry.id === editingAbcId) ?? null;

    return (
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(360px,1.05fr)]">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Davranis kaydı</div>
              <h2 className="text-3xl font-semibold text-white">ABC analizi</h2>
            </div>
            <Button
              variant="ghost"
              onClick={() =>
                copySection(
                  "ABC özeti",
                  [
                    abcInsight.summary,
                    buildTextBlock("Onculer", abcInsight.topAntecedents),
                    buildTextBlock("Sonuclar", abcInsight.topConsequences),
                    buildTextBlock("Sonraki adimlar", abcInsight.nextSteps),
                  ].join("\n\n"),
                )
              }
            >
              <Copy className="mr-2 size-4" />
              Kopyala
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Oncul">
              <input
                className={inputClassName()}
                value={abcAntecedent}
                onChange={(event) => setAbcAntecedent(event.target.value)}
              />
            </Field>
            <Field label="Davranis">
              <input
                className={inputClassName()}
                value={abcBehavior}
                onChange={(event) => setAbcBehavior(event.target.value)}
              />
            </Field>
            <Field label="Sonuc">
              <input
                className={inputClassName()}
                value={abcConsequence}
                onChange={(event) => setAbcConsequence(event.target.value)}
              />
            </Field>
            <Field label="Ortam">
              <input
                className={inputClassName()}
                value={abcSetting}
                onChange={(event) => setAbcSetting(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => {
                if (!abcAntecedent.trim() || !abcBehavior.trim() || !abcConsequence.trim()) return;

                if (editingEntry) {
                  setAbcEntries((current) =>
                    current.map((item) =>
                      item.id === editingEntry.id
                        ? {
                            ...item,
                            antecedent: abcAntecedent.trim(),
                            behavior: abcBehavior.trim(),
                            consequence: abcConsequence.trim(),
                            setting: abcSetting.trim(),
                          }
                        : item,
                    ),
                  );
                } else {
                  setAbcEntries((current) => [
                    {
                      id: `${Date.now()}-${current.length}`,
                      antecedent: abcAntecedent.trim(),
                      behavior: abcBehavior.trim(),
                      consequence: abcConsequence.trim(),
                      setting: abcSetting.trim(),
                    },
                    ...current,
                  ]);
                }

                setAbcAntecedent("");
                setAbcBehavior("");
                setAbcConsequence("");
                setAbcSetting("");
                setEditingAbcId(null);
              }}
            >
              {editingEntry ? "Kaydı güncelle" : "Kaydı ekle"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAbcAntecedent("");
                setAbcBehavior("");
                setAbcConsequence("");
                setAbcSetting("");
                setEditingAbcId(null);
              }}
            >
              Formu temizle
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setAbcEntries([]);
                setEditingAbcId(null);
              }}
            >
              Tumunu temizle
            </Button>
          </div>
        </Card>

        <div className="grid gap-6">
          <Card className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Hızlı özet</div>
              <h3 className="text-xl font-semibold text-white">Davranis deseni</h3>
            </div>
            <div className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-4 text-sm leading-7 text-neutral-300">
              {abcInsight.summary}
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <SectionList title="Sik onculer" items={abcInsight.topAntecedents} />
              <SectionList title="Sik sonuclar" items={abcInsight.topConsequences} />
              <SectionList title="Sonraki adimlar" items={abcInsight.nextSteps} />
            </div>
          </Card>

          <Card className="space-y-4">
            <div className="space-y-1">
              <div className="text-xs uppercase tracking-[0.18em] text-neutral-500">Kayıt listesi</div>
              <h3 className="text-xl font-semibold text-white">Girilen ABC kayıtları</h3>
            </div>

            <div className="grid gap-3">
              {abcEntries.length ? (
                abcEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="rounded-[var(--panel-radius-card)] border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1 text-sm text-neutral-300">
                        <div>
                          <span className="text-neutral-500">Oncul:</span> {entry.antecedent}
                        </div>
                        <div>
                          <span className="text-neutral-500">Davranis:</span> {entry.behavior}
                        </div>
                        <div>
                          <span className="text-neutral-500">Sonuc:</span> {entry.consequence}
                        </div>
                        {entry.setting ? (
                          <div>
                            <span className="text-neutral-500">Ortam:</span> {entry.setting}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setEditingAbcId(entry.id);
                            setAbcAntecedent(entry.antecedent);
                            setAbcBehavior(entry.behavior);
                            setAbcConsequence(entry.consequence);
                            setAbcSetting(entry.setting);
                          }}
                        >
                          Düzenle
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setAbcEntries((current) => current.filter((item) => item.id !== entry.id));
                            if (editingAbcId === entry.id) {
                              setEditingAbcId(null);
                              setAbcAntecedent("");
                              setAbcBehavior("");
                              setAbcConsequence("");
                              setAbcSetting("");
                            }
                          }}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[var(--panel-radius-card)] border border-dashed border-white/10 px-4 py-8 text-sm text-neutral-400">
                  Henüz ABC kaydı yok.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  let content: ReactNode = null;

  switch (tool) {
    case "support-profile":
      content = renderSupportProfile();
      break;
    case "reinforcer-pool":
      content = renderReinforcerPool();
      break;
    case "sensory-menu":
      content = renderSensoryMenu();
      break;
    case "story-builder":
      content = renderStoryBuilder();
      break;
    case "abc-analysis":
      content = renderAbcAnalysis();
      break;
  }

  return (
    <div className="grid gap-6">
      <Card variant="interactive" padding="lg" className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href={`/panel/ozel-egitim-araclari?studentId=${selectedStudent?.id ?? ""}`}
              className="inline-flex items-center gap-2 text-sm text-slate-300 transition hover:text-slate-50"
            >
              <ArrowLeft className="size-4" />
              Araç listesine dön
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-3 text-slate-50">
                {getToolIcon(tool)}
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
                  Araç çalışma alanı
                </div>
                <h1 className="mt-2 text-4xl font-semibold text-slate-50">{toolMeta.title}</h1>
              </div>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-slate-300">{toolMeta.description}</p>
          </div>

          <div className="w-full max-w-sm space-y-3 rounded-[var(--panel-radius-card)] border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.03)] p-4">
            <Field
              label="Öğrenci"
              hint="Bu araç doğrudan öğrenci seçimine göre çalışır. Ek bir BEP bağlaması gerektirmez."
            >
              <select
                className={inputClassName()}
                value={selectedStudent?.id ?? ""}
                onChange={(event) => changeStudent(event.target.value)}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.firstName} {student.lastName}
                  </option>
                ))}
              </select>
            </Field>
            <Button className="w-full" disabled={isPdfLoading} onClick={downloadToolPdf}>
              <FileDown className="mr-2 size-4" />
              {isPdfLoading ? "PDF hazırlanıyor..." : "PDF Çıktısı Al"}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-sm text-slate-400">
          <span className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-1">
            {selectedStudent?.schoolName || "Okul bilgisi yok"}
          </span>
          <span className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-1">
            {selectedStudent?.classroom || "Sınıf bilgisi yok"}
          </span>
          <span className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-1">
            {selectedStudent?.diagnosis || "Tanı bilgisi yok"}
          </span>
          <span className="rounded-full border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-1">
            Son güncelleme: {formatDate(selectedDocument?.updatedAt ?? null)}
          </span>
        </div>
      </Card>

      {content}

      {copyFeedback ? (
        <div className="rounded-2xl border border-sky-300/20 bg-sky-400/[0.08] px-4 py-3 text-sm text-sky-100">
          {copyFeedback}
        </div>
      ) : null}
    </div>
  );
}
