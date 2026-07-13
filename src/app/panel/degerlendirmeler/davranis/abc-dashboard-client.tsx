"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity,
  ClipboardCheck,
  FileText,
  User,
  Plus,
  ArrowUpRight,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Trash2,
} from "lucide-react";
import { deleteAbcLogAction } from "@/app/abc-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PanelPageIntro } from "@/components/layout/panel-page-intro";
import { SectionHeading } from "@/components/ui/section-heading";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { BehaviorProfileEditor } from "@/components/degerlendirmeler/behavior-profile-editor";
import { AbcLabelingModal } from "@/components/degerlendirmeler/abc-labeling-modal";
import { BehaviorEvaluationDisclaimerGate } from "@/components/degerlendirmeler/behavior-evaluation-disclaimer";
import { analyzeAbcLogs } from "@/lib/abc-engine";

type Behavior = {
  id: string;
  name: string;
  trackingType: string;
};

type AbcLog = {
  id: string;
  studentId: string;
  behaviorId: string;
  timestamp: string;
  durationSeconds: number;
  frequency: number;
  lessonName: string | null;
  subTopic: string | null;
  classSize: number | null;
  antecedentTag: string | null;
  antecedentDisplay: string | null;
  consequenceTag: string | null;
  consequenceDisplay: string | null;
  teacherNotes: string | null;
  inferredFunction: string | null;
  confidenceScore: number | null;
  behavior: {
    name: string;
  };
};

type Student = {
  id: string;
  name: string;
  behaviors: Behavior[];
  abcLogs: AbcLog[];
};

type AbcDashboardClientProps = {
  students: Student[];
  currentUserRole: string;
};

/**
 * Gözlem kayıtlarını kaydedildikleri davranış adı altında gruplar; her grup
 * açılır/kapanır bir kart olarak gösterilerek gün sonu değerlendirme
 * ekranında veriler dağınık bir liste yerine kategorize edilmiş, taranması
 * kolay bloklar halinde sunulur.
 */
function groupLogsByBehavior(logs: AbcLog[]) {
  const groups = new Map<string, { behaviorId: string; name: string; logs: AbcLog[] }>();
  for (const log of logs) {
    const existing = groups.get(log.behaviorId);
    if (existing) {
      existing.logs.push(log);
    } else {
      groups.set(log.behaviorId, { behaviorId: log.behaviorId, name: log.behavior.name, logs: [log] });
    }
  }
  return Array.from(groups.values());
}

export function AbcDashboardClient({ students, currentUserRole }: AbcDashboardClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"behaviors" | "labeling" | "reporting">("behaviors");
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const [activeLabelingLog, setActiveLabelingLog] = useState<AbcLog | null>(null);
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  // Find active student data
  const activeStudent = students.find((s) => s.id === selectedStudentId);

  // Group logs
  const rawLogs = activeStudent?.abcLogs.filter((log) => !log.antecedentTag || !log.consequenceTag) || [];
  const labeledLogs = activeStudent?.abcLogs.filter((log) => log.antecedentTag && log.consequenceTag) || [];
  const rawLogGroups = groupLogsByBehavior(rawLogs);
  const labeledLogGroups = groupLogsByBehavior(labeledLogs);

  // Generate RAM report analytics
  const reportData = activeStudent
    ? analyzeAbcLogs(
        activeStudent.behaviors[0]?.name || "Problem Davranış",
        activeStudent.abcLogs.map((l) => ({
          durationSeconds: l.durationSeconds,
          frequency: l.frequency,
          antecedentTag: l.antecedentTag,
          consequenceTag: l.consequenceTag,
        }))
      )
    : null;

  const handleCopyReport = () => {
    if (reportData?.reportText) {
      navigator.clipboard.writeText(reportData.reportText);
      alert("Rapor metni panoya kopyalandı!");
    }
  };

  const handleDeleteLog = (id: string) => {
    if (!confirm("Bu gözlem kaydını silmek istediğinize emin misiniz?")) return;

    startTransition(async () => {
      const result = await deleteAbcLogAction({ id });
      showResult(result, {
        successTitle: "Kayıt Silindi",
        errorTitle: "Hata"
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-6">
      <PanelPageIntro
        eyebrow="Değerlendirmeler"
        title="UDA Temelli ABC Otomasyon Modülü"
      />

      <BehaviorEvaluationDisclaimerGate>
      {/* Student Selector Card */}
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <User className="size-5" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-[color:var(--panel-text-soft)]">
              Aktif Öğrenci
            </label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="mt-0.5 bg-transparent text-sm font-semibold text-[color:var(--panel-text)] focus:outline-none cursor-pointer border-none p-0 pr-6"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id} className="bg-neutral-900 text-white">
                  {student.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeStudent && (
          <Link
            href={`/panel/degerlendirmeler/davranis/anlik?studentId=${activeStudent.id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 text-xs font-bold transition shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20"
          >
            <Activity className="size-4 animate-pulse" />
            Sınıf İçi Anlık Veri Girişi
            <ArrowUpRight className="size-3.5" />
          </Link>
        )}
      </Card>

      {/* Tabs Switcher */}
      {activeStudent ? (
        <div className="grid gap-6">
          <div className="flex border-b border-[color:var(--panel-border)] overflow-x-auto select-none gap-2">
            <button
              onClick={() => setActiveTab("behaviors")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === "behaviors"
                  ? "border-emerald-500 text-white"
                  : "border-transparent text-[color:var(--panel-text-soft)] hover:text-white"
              }`}
            >
              <Activity className="size-4" />
              1. Hedef Davranışlar
            </button>
            <button
              onClick={() => setActiveTab("labeling")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === "labeling"
                  ? "border-emerald-500 text-white"
                  : "border-transparent text-[color:var(--panel-text-soft)] hover:text-white"
              }`}
            >
              <ClipboardCheck className="size-4" />
              2. Gün Sonu Değerlendirme
              {rawLogs.length > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                  {rawLogs.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("reporting")}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
                activeTab === "reporting"
                  ? "border-emerald-500 text-white"
                  : "border-transparent text-[color:var(--panel-text-soft)] hover:text-white"
              }`}
            >
              <FileText className="size-4" />
              3. RAM Raporu & Analiz
            </button>
          </div>

          {/* Tab Contents */}
          {activeTab === "behaviors" && (
            <BehaviorProfileEditor
              studentId={activeStudent.id}
              studentName={activeStudent.name}
              initialBehaviors={activeStudent.behaviors}
            />
          )}

          {activeTab === "labeling" && (
            <div className="grid gap-6">
              {/* Raw Logs (Awaiting label) */}
              <Card padding="md" className="space-y-4">
                <SectionHeading title="Yorumlanmayı Bekleyen Gözlemler (Ham Veriler)" />
                <p className="text-xs text-[color:var(--panel-text-soft)]">
                  Öğretmenin gün içinde mobil veri giriş ekranından kaydettiği ham veriler. Davranış öncesi (A) ve sonrasını (C) seçerek analizi tamamlayın.
                </p>

                {rawLogGroups.length === 0 ? (
                  <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] p-8 text-center text-sm text-[color:var(--panel-text-soft)] flex items-center justify-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-400" />
                    Yorumlanmayı bekleyen ham veri bulunmuyor. Tüm gözlemler güncellendi!
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {rawLogGroups.map((group) => (
                      <DisclosureCard
                        key={group.behaviorId}
                        title={group.name}
                        defaultOpen
                        summary={
                          <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400 border border-red-500/20">
                            {group.logs.length} ham kayıt
                          </span>
                        }
                      >
                        <div className="grid gap-3">
                          {group.logs.map((log) => (
                            <div
                              key={log.id}
                              className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl border border-dashed border-red-500/20 bg-red-500/[0.01] transition hover:bg-red-500/[0.03]"
                            >
                              <div className="min-w-0">
                                <span className="text-xs text-[color:var(--panel-text-soft)]">
                                  {new Date(log.timestamp).toLocaleString("tr-TR", {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  })}
                                </span>
                                {log.lessonName && (
                                  <div className="mt-1 text-xs text-[color:var(--panel-text-muted)]">
                                    Ders: {log.lessonName} {log.subTopic ? `| ${log.subTopic}` : ""}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="text-xs text-[color:var(--panel-text-soft)] font-medium">
                                  {log.durationSeconds > 0 ? `Süre: ${log.durationSeconds} sn` : `Sıklık: ${log.frequency} kez`}
                                </span>
                                <Button
                                  size="sm"
                                  className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold"
                                  onClick={() => setActiveLabelingLog(log)}
                                >
                                  Yorumla
                                  <ChevronRight className="size-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DisclosureCard>
                    ))}
                  </div>
                )}
              </Card>

              {/* Labeled Logs History */}
              <Card padding="md" className="space-y-4">
                <SectionHeading title="Tamamlanan ABC Gözlem Kayıtları" />

                {labeledLogGroups.length === 0 ? (
                  <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] p-8 text-center text-sm text-[color:var(--panel-text-soft)]">
                    Henüz yorumlanmış ve analiz edilmiş bir gözlem kaydı bulunmuyor.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {labeledLogGroups.map((group) => (
                      <DisclosureCard
                        key={group.behaviorId}
                        title={group.name}
                        defaultOpen
                        summary={
                          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-400 border border-emerald-500/20">
                            {group.logs.length} yorumlanmış kayıt
                          </span>
                        }
                      >
                        <div className="grid gap-3">
                          {group.logs.map((log) => (
                            <div
                              key={log.id}
                              className="grid gap-4 p-4 rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] transition hover:border-[color:var(--panel-border-strong)] sm:grid-cols-[1fr_auto]"
                            >
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs text-[color:var(--panel-text-soft)]">
                                    {new Date(log.timestamp).toLocaleString("tr-TR", {
                                      dateStyle: "short",
                                      timeStyle: "short",
                                    })}
                                  </span>
                                  {log.lessonName && (
                                    <span className="text-xs text-[color:var(--panel-text-muted)] bg-[color:var(--panel-bg-elevated)] px-2 py-0.5 rounded border border-[color:var(--panel-border)]">
                                      {log.lessonName}
                                    </span>
                                  )}
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2 text-xs pt-1">
                                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-white/5">
                                    <span className="text-neutral-500 font-bold block mb-1">A (Antecedent - Öncesi)</span>
                                    <span className="text-neutral-200">{log.antecedentDisplay}</span>
                                  </div>
                                  <div className="p-2.5 rounded-lg bg-neutral-900 border border-white/5">
                                    <span className="text-neutral-500 font-bold block mb-1">C (Consequence - Sonrası)</span>
                                    <span className="text-neutral-200">{log.consequenceDisplay}</span>
                                  </div>
                                </div>

                                {log.teacherNotes && (
                                  <div className="text-xs italic text-neutral-400 bg-black/10 p-2 rounded-lg border border-white/5">
                                    Not: {log.teacherNotes}
                                  </div>
                                )}

                                <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs">
                                  <div>
                                    <span className="text-neutral-500">Davranış İşlevi:</span>{" "}
                                    <span className="font-bold text-emerald-400">{log.inferredFunction}</span>
                                  </div>
                                  <div>
                                    <span className="text-neutral-500">Güven Puanı:</span>{" "}
                                    <span className="font-semibold text-white">%{(log.confidenceScore! * 100).toFixed(0)}</span>
                                  </div>
                                  <div>
                                    <span className="text-neutral-500">Ölçüm:</span>{" "}
                                    <span className="text-white">{log.durationSeconds > 0 ? `Süre (${log.durationSeconds} sn)` : `Sıklık (${log.frequency})`}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex sm:flex-col justify-end items-end gap-2 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                  onClick={() => handleDeleteLog(log.id)}
                                  disabled={isPending}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DisclosureCard>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "reporting" && (
            <div className="grid gap-6">
              {/* Analytics summary */}
              <div className="grid gap-4 sm:grid-cols-3">
                <Card padding="sm" className="flex flex-col justify-between h-28">
                  <span className="text-xs text-[color:var(--panel-text-soft)]">Toplam Gözlem Süresi</span>
                  <span className="text-2xl font-bold text-white mt-2">
                    {activeStudent.abcLogs.length} Ders Saati
                  </span>
                  <span className="text-[10px] text-[color:var(--panel-text-muted)] mt-1">Sistematik UDA Takibi</span>
                </Card>
                <Card padding="sm" className="flex flex-col justify-between h-28">
                  <span className="text-xs text-[color:var(--panel-text-soft)]">Baskın Davranış İşlevi</span>
                  <span className="text-xl font-bold text-emerald-400 mt-2 truncate" title={reportData?.primaryFunction}>
                    {reportData?.primaryFunction || "Yetersiz Veri"}
                  </span>
                  <span className="text-[10px] text-[color:var(--panel-text-muted)] mt-1">
                    Güven Oranı: {reportData && reportData.confidenceScore > 0 ? `%${Math.round(reportData.confidenceScore * 100)}` : "Hesaplanamadı"}
                  </span>
                </Card>
                <Card padding="sm" className="flex flex-col justify-between h-28">
                  <span className="text-xs text-[color:var(--panel-text-soft)]">Ortalama Davranış Süresi</span>
                  <span className="text-2xl font-bold text-white mt-2">
                    {reportData?.avgDuration || 0} Saniye
                  </span>
                  <span className="text-[10px] text-[color:var(--panel-text-muted)] mt-1">Kayıt Başına Ortalama</span>
                </Card>
              </div>

              {/* RAM Report Text */}
              <Card padding="md" className="space-y-4">
                <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                  <SectionHeading title="RAM Sene Sonu Eğitsel Değerlendirme Davranış Raporu" />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCopyReport}
                    disabled={!reportData || reportData.totalCount === 0 || reportData.labeledCount === 0}
                    className="flex items-center gap-2 border border-white/10"
                  >
                    <Copy className="size-4" />
                    Kopyala
                  </Button>
                </div>

                <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] text-sm leading-8 font-sans text-neutral-300 select-all whitespace-pre-wrap">
                  {reportData?.reportText}
                </div>

                <div className="flex gap-2 p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 text-xs leading-relaxed">
                  <AlertCircle className="size-4 shrink-0 mt-0.5" />
                  <span>
                    Bu rapor metni, Uygulamalı Davranış Analizi (UDA) standartlarına göre sisteme işlenen gözlemlerden otomatik olarak analiz edilerek üretilmiştir. RAM sene sonu Eğitsel Değerlendirme İstek Formu davranış alanına doğrudan kopyalanıp yapıştırılabilir.
                  </span>
                </div>
              </Card>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-[var(--panel-radius-card)] border border-dashed border-[color:var(--panel-border)] p-12 text-center text-sm text-[color:var(--panel-text-soft)]">
          Öğrenci kaydı bulunmuyor.
        </div>
      )}

      {/* Labeling modal portal */}
      {activeLabelingLog && (
        <AbcLabelingModal
          log={activeLabelingLog}
          onClose={() => setActiveLabelingLog(null)}
          onSuccess={() => {
            setActiveLabelingLog(null);
            router.refresh();
          }}
        />
      )}
      </BehaviorEvaluationDisclaimerGate>
    </div>
  );
}
