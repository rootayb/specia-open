import type { LearningPhase } from "@/lib/prisma-shim";

/**
 * Özel eğitim öğrenme aşamaları için tek meta kaynağı.
 * Sıralama öğretimsel ilerleyişi yansıtır: edinim → akıcılık → kalıcılık → genelleme.
 */
export const LEARNING_PHASES: LearningPhase[] = [
  "acquisition",
  "fluency",
  "maintenance",
  "generalization",
];

export type LearningPhaseMeta = {
  label: string;
  shortLabel: string;
  /** Veli görünümü ve ipuçları için teknik olmayan açıklama. */
  description: string;
  /** Grafik/rozet renk token kökü, örn. --panel-phase-acquisition. */
  colorVar: string;
  bgVar: string;
  borderVar: string;
};

export const LEARNING_PHASE_META: Record<LearningPhase, LearningPhaseMeta> = {
  acquisition: {
    label: "Edinim",
    shortLabel: "Edinim",
    description: "Beceri yeni öğretiliyor; doğru yapma oranı artırılmaya çalışılıyor.",
    colorVar: "var(--panel-phase-acquisition)",
    bgVar: "var(--panel-phase-acquisition-bg)",
    borderVar: "var(--panel-phase-acquisition-border)",
  },
  fluency: {
    label: "Akıcılık",
    shortLabel: "Akıcılık",
    description: "Beceri öğrenildi; hız ve rahatlık kazandırma çalışılıyor.",
    colorVar: "var(--panel-phase-fluency)",
    bgVar: "var(--panel-phase-fluency-bg)",
    borderVar: "var(--panel-phase-fluency-border)",
  },
  maintenance: {
    label: "Kalıcılık",
    shortLabel: "Kalıcılık",
    description: "Öğretim bittikten sonra becerinin korunup korunmadığı izleniyor.",
    colorVar: "var(--panel-phase-maintenance)",
    bgVar: "var(--panel-phase-maintenance-bg)",
    borderVar: "var(--panel-phase-maintenance-border)",
  },
  generalization: {
    label: "Genelleme",
    shortLabel: "Genelleme",
    description: "Becerinin farklı ortam, kişi ve araçlarla kullanımı izleniyor.",
    colorVar: "var(--panel-phase-generalization)",
    bgVar: "var(--panel-phase-generalization-bg)",
    borderVar: "var(--panel-phase-generalization-border)",
  },
};

/** Bir aşamadan sonra gelen öğretimsel aşama; genellemenin devamı yoktur. */
export function getNextLearningPhase(phase: LearningPhase): LearningPhase | null {
  const index = LEARNING_PHASES.indexOf(phase);
  if (index < 0 || index >= LEARNING_PHASES.length - 1) {
    return null;
  }
  return LEARNING_PHASES[index + 1];
}

export function getLearningPhaseLabel(phase: LearningPhase): string {
  return LEARNING_PHASE_META[phase].label;
}
