"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ClipboardCopy, GripVertical, Loader2, Pencil, Plus, Save, Sparkles, Trash2 } from "lucide-react";

import { saveEvaluationAction } from "@/app/degerlendirmeler-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  computeSkillSummary,
  createSkillSession,
  createSkillStep,
  parseSkillAnalysisData,
  SKILL_MARK_CYCLE,
  SKILL_MARK_DESCRIPTIONS,
  SKILL_MARK_LABELS,
  type SkillMark,
  type SkillSession,
  type SkillStep,
  type SkillTemplateSummary,
} from "@/lib/skill-analysis";
import { generateSkillFeedback } from "@/lib/skill-feedback";

type StudentData = {
  id: string;
  firstName: string;
  lastName: string;
  schoolName: string | null;
  schoolNumber: string | null;
};

type EvaluationDoc = {
  id?: string;
  studentId: string;
  title: string;
  type: string;
  kazanim: string | null;
  evaluationType: string | null;
  evaluationDate: string | Date | null;
  evaluatorName?: string | null;
  data: unknown;
  student: StudentData;
};

const MARK_TONE: Record<SkillMark, string> = {
  "": "text-[color:var(--panel-text-soft)] hover:bg-[color:var(--panel-bg-hover)]",
  B: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
  I: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
  H: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
};

export function BeceriAnaliziEditor({
  document,
  isParent = false,
  templates = [],
}: {
  document: EvaluationDoc;
  isParent?: boolean;
  templates?: SkillTemplateSummary[];
}) {
  const router = useRouter();
  const { showResult } = useActionFeedback();
  const [isPending, startTransition] = useTransition();

  const initial = useMemo(() => parseSkillAnalysisData(document.data), [document.data]);

  const [title, setTitle] = useState(document.title || "Beceri Analizi Veri Kayıt Formu");
  const [observer, setObserver] = useState(initial.observer || document.evaluatorName || "");
  const [targetSkill, setTargetSkill] = useState(initial.targetSkill);
  const [phase, setPhase] = useState(initial.phase);
  const [analysisText, setAnalysisText] = useState(initial.analysis);
  const [isEditingAnalysis, setIsEditingAnalysis] = useState(false);
  const [steps, setSteps] = useState<SkillStep[]>(
    initial.steps.length > 0 ? initial.steps : [createSkillStep()],
  );
  const [sessions, setSessions] = useState<SkillSession[]>(
    initial.sessions.length > 0 ? initial.sessions : [createSkillSession()],
  );
  const [marks, setMarks] = useState<Record<string, Record<string, SkillMark>>>(initial.marks);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [templateCategory, setTemplateCategory] = useState("");

  const readOnly = isParent;

  const templateCategories = useMemo(() => {
    const unique = new Set(
      templates.map((item) => item.category).filter((category): category is string => Boolean(category)),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "tr"));
  }, [templates]);

  const templatesInCategory = useMemo(
    () => templates.filter((item) => item.category === templateCategory),
    [templates, templateCategory],
  );

  const applyTemplate = (templateId: string) => {
    const template = templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }
    setTargetSkill(template.name);
    setSteps(template.steps.map((text) => createSkillStep(text)));
    setMarks({});
  };

  const summary = useMemo(
    () => computeSkillSummary({ ...initial, steps, sessions, marks }),
    [initial, steps, sessions, marks],
  );
  const summaryBySession = useMemo(() => {
    const map = new Map<string, { count: number; percent: number }>();
    summary.forEach((item) => map.set(item.sessionId, item));
    return map;
  }, [summary]);

  const generatedFeedback = useMemo(
    () => generateSkillFeedback({ ...initial, targetSkill, steps, sessions, marks }),
    [initial, targetSkill, steps, sessions, marks],
  );

  const displayedAnalysis = analysisText.trim() ? analysisText : generatedFeedback;

  const handleCopyFeedback = () => {
    navigator.clipboard
      .writeText(displayedAnalysis)
      .then(() => showResult({ success: true, message: "Dönüt metni panoya kopyalandı." }, {}))
      .catch(() =>
        showResult(
          { success: false, message: "Metin kopyalanamadı, lütfen elle seçip kopyalayın." },
          {},
        ),
      );
  };

  const handleToggleEditAnalysis = () => {
    if (!isEditingAnalysis && !analysisText.trim()) {
      setAnalysisText(generatedFeedback);
    }
    setIsEditingAnalysis((prev) => !prev);
  };

  // ─── Basamak işlemleri ─────────────────────────────────────────────────────
  const addStep = () => setSteps((prev) => [...prev, createSkillStep()]);
  const updateStep = (id: string, text: string) =>
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, text } : step)));
  const removeStep = (id: string) => {
    setSteps((prev) => (prev.length > 1 ? prev.filter((step) => step.id !== id) : prev));
    setMarks((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (index: number) => {
    if (dragIndex === null || dragIndex === index) {
      return;
    }
    setSteps((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  // ─── Oturum işlemleri ──────────────────────────────────────────────────────
  const addSession = () => setSessions((prev) => [...prev, createSkillSession()]);
  const updateSession = (id: string, date: string) =>
    setSessions((prev) => prev.map((session) => (session.id === id ? { ...session, date } : session)));
  const removeSession = (id: string) => {
    setSessions((prev) => (prev.length > 1 ? prev.filter((session) => session.id !== id) : prev));
    setMarks((prev) => {
      const next: Record<string, Record<string, SkillMark>> = {};
      for (const [stepId, row] of Object.entries(prev)) {
        const rest = { ...row };
        delete rest[id];
        next[stepId] = rest;
      }
      return next;
    });
  };

  // ─── Hücre işaretleme (tek tıkla döner) ────────────────────────────────────
  const cycleMark = (stepId: string, sessionId: string) => {
    if (readOnly) {
      return;
    }
    setMarks((prev) => {
      const current = prev[stepId]?.[sessionId] ?? "";
      const nextValue = SKILL_MARK_CYCLE[(SKILL_MARK_CYCLE.indexOf(current) + 1) % SKILL_MARK_CYCLE.length];
      const nextRow = { ...(prev[stepId] ?? {}) };
      if (nextValue === "") {
        delete nextRow[sessionId];
      } else {
        nextRow[sessionId] = nextValue;
      }
      return { ...prev, [stepId]: nextRow };
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      const cleanedSteps = steps.map((step) => ({ ...step, text: step.text.trim() }));
      const data = {
        observer: observer.trim(),
        targetSkill: targetSkill.trim(),
        phase: phase.trim(),
        analysis: displayedAnalysis.trim(),
        steps: cleanedSteps,
        sessions,
        marks,
        summary,
      };

      const result = await saveEvaluationAction({
        id: document.id,
        studentId: document.studentId,
        title: title.trim(),
        type: "beceri",
        kazanim: targetSkill.trim() || null,
        evaluationType: "Beceri Analizi",
        evaluationDate: document.evaluationDate
          ? new Date(document.evaluationDate).toISOString().split("T")[0]
          : null,
        evaluatorName: observer.trim() || null,
        data,
      });

      showResult(result, {
        successTitle: "Beceri analizi kaydedildi",
        errorTitle: "Hata oluştu",
      });

      if (result.success) {
        if (!document.id && result.id) {
          router.push(`/panel/degerlendirmeler/beceri-analizi/${result.id}`);
        } else {
          router.refresh();
        }
      }
    });
  };

  return (
    <div className="grid gap-6">
      {/* Üst aksiyon çubuğu */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/panel/degerlendirmeler/ogretim-sonu">
            <Button size="icon" variant="ghost" className="h-10 w-10 rounded-xl" title="Değerlendirmelere Geri Dön">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[color:var(--panel-text)]">
              {document.id ? "Beceri Analizini Düzenle" : "Yeni Beceri Analizi"}
            </h1>
            <p className="text-xs text-[color:var(--panel-text-muted)]">
              {document.student.firstName} {document.student.lastName} için Beceri Analizi
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {document.id ? (
            <>
              <a href={`/api/pdf/degerlendirmeler/${document.id}`} target="_blank" rel="noreferrer">
                <Button variant="secondary" className="h-10">
                  PDF
                </Button>
              </a>
              <a href={`/api/docx/degerlendirmeler/${document.id}`}>
                <Button variant="secondary" className="h-10">
                  Word
                </Button>
              </a>
            </>
          ) : null}
          {!readOnly ? (
            <Button onClick={handleSave} disabled={isPending} className="h-10 gap-2">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Kaydet
            </Button>
          ) : null}
        </div>
      </div>

      {/* Genel bilgiler */}
      <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-5">
        {!readOnly && templates.length > 0 ? (
          <div className="mb-4 grid gap-4 sm:grid-cols-2">
            <Field label="1. Kategori Seçin">
              <select
                value={templateCategory}
                onChange={(event) => setTemplateCategory(event.target.value)}
                className={inputClassName()}
              >
                <option value="">Kategori seçin...</option>
                {templateCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="2. Şablondan Doldur">
              <select
                key={templateCategory}
                defaultValue=""
                disabled={!templateCategory}
                onChange={(event) => {
                  if (event.target.value) {
                    applyTemplate(event.target.value);
                    event.target.value = "";
                  }
                }}
                className={`${inputClassName()} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <option value="">
                  {templateCategory ? "Beceri seçin..." : "Önce kategori seçin"}
                </option>
                {templatesInCategory.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </Field>
            <p className="sm:col-span-2 text-xs text-[color:var(--panel-text-soft)]">
              Önce kategori, ardından hazır bir beceri şablonu seçerek basamakları otomatik doldurun; sonradan elle düzenleyebilirsiniz.
            </p>
          </div>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="Rapor Başlığı">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={readOnly}
              className={inputClassName()}
            />
          </Field>
          <Field label="Öğrenci">
            <input
              value={`${document.student.firstName} ${document.student.lastName}`}
              readOnly
              disabled
              className={`${inputClassName()} cursor-not-allowed opacity-70`}
            />
          </Field>
          <Field label="Gözlemci">
            <input
              value={observer}
              onChange={(event) => setObserver(event.target.value)}
              disabled={readOnly}
              placeholder="Gözlemcinin adı soyadı"
              className={inputClassName()}
            />
          </Field>
          <Field label="Hedef Beceri / Hedef Uyaran">
            <input
              value={targetSkill}
              onChange={(event) => setTargetSkill(event.target.value)}
              disabled={readOnly}
              placeholder="Örn: El yıkama"
              className={inputClassName()}
            />
          </Field>
          <Field label="Evre">
            <input
              value={phase}
              onChange={(event) => setPhase(event.target.value)}
              disabled={readOnly}
              placeholder="Örn: Kazandırma"
              className={inputClassName()}
            />
          </Field>
        </div>
      </div>

      {/* Değerlendirme matrisi */}
      <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-[color:var(--panel-text-muted)]">
            {SKILL_MARK_DESCRIPTIONS.map((item) => (
              <span key={item.value} className="inline-flex items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center rounded-md text-[11px] font-bold",
                    MARK_TONE[item.value],
                  )}
                >
                  {SKILL_MARK_LABELS[item.value]}
                </span>
                {item.label}
              </span>
            ))}
            <span className="text-[color:var(--panel-text-soft)]">Boş = Gözlenmedi</span>
          </div>
          {!readOnly ? (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={addStep} className="h-9 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Basamak
              </Button>
              <Button size="sm" variant="secondary" onClick={addSession} className="h-9 gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Oturum
              </Button>
            </div>
          ) : null}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 min-w-[260px] rounded-tl-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[color:var(--panel-text-soft)]">
                  Beceri Basamakları
                </th>
                {sessions.map((session) => (
                  <th
                    key={session.id}
                    className="min-w-[120px] border-b border-r border-t border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-2 py-2 align-top"
                  >
                    <div className="flex flex-col items-center gap-1">
                      <input
                        type="date"
                        value={session.date}
                        onChange={(event) => updateSession(session.id, event.target.value)}
                        disabled={readOnly}
                        className="w-full rounded-lg border border-[color:var(--panel-border)] bg-black/20 px-2 py-1 text-center text-xs text-[color:var(--panel-text)] outline-none focus:border-[color:var(--panel-border-strong)]"
                      />
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => removeSession(session.id)}
                          className="text-[color:var(--panel-text-soft)] transition hover:text-rose-300"
                          title="Oturumu sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.map((step, index) => (
                <tr
                  key={step.id}
                  onDragOver={(event) => {
                    if (dragIndex !== null) {
                      event.preventDefault();
                      handleDragOver(index);
                    }
                  }}
                >
                  <td className="sticky left-0 z-10 border-b border-l border-r border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-2 py-1.5">
                    <div className="flex items-center gap-1.5">
                      {!readOnly ? (
                        <span
                          draggable
                          onDragStart={() => handleDragStart(index)}
                          onDragEnd={handleDragEnd}
                          className="cursor-grab text-[color:var(--panel-text-soft)] active:cursor-grabbing"
                          title="Sıralamak için sürükleyin"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                      ) : null}
                      <span className="w-5 shrink-0 text-center text-xs font-semibold text-[color:var(--panel-text-soft)]">
                        {index + 1}.
                      </span>
                      <input
                        value={step.text}
                        onChange={(event) => updateStep(step.id, event.target.value)}
                        disabled={readOnly}
                        placeholder="Beceri basamağı"
                        className="w-full rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm text-[color:var(--panel-text)] outline-none focus:border-[color:var(--panel-border)] focus:bg-black/20"
                      />
                      {!readOnly ? (
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          className="text-[color:var(--panel-text-soft)] transition hover:text-rose-300"
                          title="Basamağı sil"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                  {sessions.map((session) => {
                    const mark = marks[step.id]?.[session.id] ?? "";
                    return (
                      <td
                        key={session.id}
                        className="border-b border-r border-[color:var(--panel-border)] p-1 text-center"
                      >
                        <button
                          type="button"
                          onClick={() => cycleMark(step.id, session.id)}
                          disabled={readOnly}
                          className={cn(
                            "mx-auto flex h-8 w-full min-w-[40px] items-center justify-center rounded-md text-sm font-bold transition",
                            MARK_TONE[mark],
                          )}
                          title="Tıklayarak B / İ / H seçin"
                        >
                          {SKILL_MARK_LABELS[mark]}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* Otomatik hesaplanan, salt okunur özet satırları */}
              <tr>
                <td className="sticky left-0 z-10 border-b border-l border-r border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-3 py-2 text-xs font-semibold text-[color:var(--panel-text)]">
                  Bağımsız gerçekleşen basamak sayısı
                </td>
                {sessions.map((session) => (
                  <td
                    key={session.id}
                    className="border-b border-r border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-2 py-2 text-center text-sm font-semibold text-[color:var(--panel-text)]"
                  >
                    {summaryBySession.get(session.id)?.count ?? 0}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="sticky left-0 z-10 rounded-bl-xl border-b border-l border-r border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-3 py-2 text-xs font-semibold text-[color:var(--panel-text)]">
                  Bağımsız gerçekleşen basamak yüzdesi
                </td>
                {sessions.map((session) => (
                  <td
                    key={session.id}
                    className="border-b border-r border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-2 py-2 text-center text-sm font-semibold text-emerald-300"
                  >
                    %{summaryBySession.get(session.id)?.percent ?? 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Otomatik dönüt önerisi */}
      <div className="rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[color:var(--panel-text)]">
            <Sparkles className="h-4 w-4 text-[color:var(--panel-text-soft)]" />
            Otomatik Dönüt Önerisi
          </div>
          {!readOnly ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleCopyFeedback} className="h-9 gap-1.5">
                <ClipboardCopy className="h-3.5 w-3.5" /> Kopyala
              </Button>
              <Button size="sm" variant="secondary" onClick={handleToggleEditAnalysis} className="h-9 gap-1.5">
                <Pencil className="h-3.5 w-3.5" /> {isEditingAnalysis ? "Tamam" : "Düzenle"}
              </Button>
            </div>
          ) : null}
        </div>
        {isEditingAnalysis ? (
          <textarea
            value={analysisText}
            onChange={(event) => setAnalysisText(event.target.value)}
            rows={6}
            className={`${inputClassName()} mt-3 leading-6`}
            placeholder="Dönüt/analiz metnini buraya yazın..."
          />
        ) : (
          <p className="mt-3 text-sm leading-6 text-[color:var(--panel-text-muted)]">{displayedAnalysis}</p>
        )}
        <p className="mt-2 text-xs text-[color:var(--panel-text-soft)]">
          Bu metin, girilen basamak ve oturum işaretlemelerinden otomatik üretilmiştir; &quot;Düzenle&quot; ile kaydetmeden önce kendi sözlerinizle değiştirebilirsiniz. PDF çıktısında ayrı bir sayfada yer alır.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[color:var(--panel-text-muted)]">
        {label}
      </label>
      {children}
    </div>
  );
}
