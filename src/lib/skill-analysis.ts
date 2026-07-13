/**
 * "Beceri Analizi" (zincirleme beceri / task analysis) değerlendirme türünün
 * paylaşılan tip ve hesaplama yardımcıları. Veriler EvaluationDocument.data
 * (JSON) içinde, type="beceri" olarak saklanır. Otomatik hesaplanan özet
 * (bağımsız basamak sayısı/yüzdesi) burada tek kaynaktan üretilir; UI ve PDF
 * aynı fonksiyonu kullanır.
 */

export type SkillMark = "" | "B" | "I" | "H";

export type SkillStep = {
  id: string;
  text: string;
};

export type SkillSession = {
  id: string;
  /** ISO veya "YYYY-MM-DD" biçiminde tarih. */
  date: string;
};

export type SkillSessionSummary = {
  sessionId: string;
  /** Bağımsız (B) gerçekleşen basamak sayısı. */
  count: number;
  /** Bağımsız basamak yüzdesi (tam sayı). */
  percent: number;
};

/** Admin tarafından tanımlanan hazır beceri şablonu (basamak metinleri). */
export type SkillTemplateSummary = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  steps: string[];
};

export type SkillAnalysisData = {
  observer: string;
  targetSkill: string;
  phase: string;
  /** Öğretmenin düzenleyebildiği, PDF'in ayrı sayfasında gösterilen dönüt/analiz metni. */
  analysis: string;
  steps: SkillStep[];
  sessions: SkillSession[];
  /** marks[stepId][sessionId] = işaret değeri. */
  marks: Record<string, Record<string, SkillMark>>;
  /** Kaydederken hesaplanan özet (ileride grafik için). UI/PDF anlık yeniden hesaplar. */
  summary?: SkillSessionSummary[];
};

/** Hücre tek tıkla bu sırayla döner. */
export const SKILL_MARK_CYCLE: SkillMark[] = ["", "B", "I", "H"];

/** Saklanan değer ASCII ("I"); ekranda Türkçe "İ" gösterilir. */
export const SKILL_MARK_LABELS: Record<SkillMark, string> = {
  "": "",
  B: "B",
  I: "İ",
  H: "H",
};

export const SKILL_MARK_DESCRIPTIONS: { value: Exclude<SkillMark, "">; label: string }[] = [
  { value: "B", label: "Bağımsız" },
  { value: "I", label: "İpuçlu" },
  { value: "H", label: "Hatalı / Yapamadı" },
];

function isSkillMark(value: unknown): value is SkillMark {
  return value === "" || value === "B" || value === "I" || value === "H";
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** Ham JSON `data`'yı güvenli biçimde SkillAnalysisData'ya çözer. */
export function parseSkillAnalysisData(data: unknown): SkillAnalysisData {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  const steps: SkillStep[] = Array.isArray(record.steps)
    ? record.steps.map((value, index) => {
        const step = value && typeof value === "object" ? (value as Partial<SkillStep>) : {};
        return {
          id: typeof step.id === "string" && step.id ? step.id : `step-${index}`,
          text: asString(step.text),
        };
      })
    : [];

  const sessions: SkillSession[] = Array.isArray(record.sessions)
    ? record.sessions.map((value, index) => {
        const session = value && typeof value === "object" ? (value as Partial<SkillSession>) : {};
        return {
          id: typeof session.id === "string" && session.id ? session.id : `session-${index}`,
          date: asString(session.date),
        };
      })
    : [];

  const rawMarks = record.marks && typeof record.marks === "object"
    ? (record.marks as Record<string, unknown>)
    : {};
  const marks: Record<string, Record<string, SkillMark>> = {};
  for (const [stepId, row] of Object.entries(rawMarks)) {
    if (!row || typeof row !== "object") {
      continue;
    }
    const parsedRow: Record<string, SkillMark> = {};
    for (const [sessionId, mark] of Object.entries(row as Record<string, unknown>)) {
      if (isSkillMark(mark) && mark !== "") {
        parsedRow[sessionId] = mark;
      }
    }
    marks[stepId] = parsedRow;
  }

  return {
    observer: asString(record.observer),
    targetSkill: asString(record.targetSkill),
    phase: asString(record.phase),
    analysis: asString(record.analysis),
    steps,
    sessions,
    marks,
  };
}

/** Belirli bir basamak-oturum hücresinin değerini döndürür. */
export function getSkillMark(
  data: Pick<SkillAnalysisData, "marks">,
  stepId: string,
  sessionId: string,
): SkillMark {
  return data.marks[stepId]?.[sessionId] ?? "";
}

/**
 * Her oturum için bağımsız (B) basamak sayısı ve yüzdesini hesaplar.
 * Yüzde = (B sayısı / toplam basamak sayısı) × 100, tam sayıya yuvarlanır.
 */
export function computeSkillSummary(data: SkillAnalysisData): SkillSessionSummary[] {
  const totalSteps = data.steps.length;
  return data.sessions.map((session) => {
    let count = 0;
    for (const step of data.steps) {
      if (getSkillMark(data, step.id, session.id) === "B") {
        count += 1;
      }
    }
    const percent = totalSteps > 0 ? Math.round((count / totalSteps) * 100) : 0;
    return { sessionId: session.id, count, percent };
  });
}

export function createSkillStep(text = ""): SkillStep {
  return { id: `step-${Math.random().toString(36).slice(2, 10)}`, text };
}

export function createSkillSession(date = ""): SkillSession {
  return { id: `session-${Math.random().toString(36).slice(2, 10)}`, date };
}

/** "YYYY-MM-DD" / ISO tarihini "dd.MM.yyyy" biçimine çevirir; boşsa "-". */
export function formatSkillSessionDate(value: string): string {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short" }).format(date);
}
