"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Play, Square, Settings, Volume2, VolumeX, Shield, AlertTriangle, Plus, FlaskConical, ShieldCheck } from "lucide-react";
import { createAbcLogAction } from "@/app/abc-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import {
  BEHAVIOR_EVALUATION_DISCLAIMER_CONFIRM_LABEL,
  BEHAVIOR_EVALUATION_DISCLAIMER_TEXT,
  BEHAVIOR_EVALUATION_DISCLAIMER_TITLE,
  acceptBehaviorEvaluationDisclaimer,
  useBehaviorEvaluationDisclaimerAccepted,
} from "@/components/degerlendirmeler/behavior-evaluation-disclaimer";

type Behavior = {
  id: string;
  name: string;
  trackingType: "duration" | "frequency";
};

type Student = {
  id: string;
  name: string;
  behaviors: Behavior[];
};

type AnlikGozlemClientProps = {
  student: Student;
};

export function AnlikGozlemClient({ student }: AnlikGozlemClientProps) {
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const disclaimerAccepted = useBehaviorEvaluationDisclaimerAccepted();

  // Settings
  const [lessonName, setLessonName] = useState("Serbest Zaman");
  const [subTopic, setSubTopic] = useState("");
  const [classSize, setClassSize] = useState<number>(5);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Tracking states
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerStartRef = useRef<number | null>(null);

  // Limit behaviors to first 3
  const activeBehaviors = student.behaviors.slice(0, 3);

  // Audio synthesis helper for premium auditory haptics
  const playBeep = (type: "frequency" | "start" | "end") => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === "frequency") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        oscillator.stop(audioCtx.currentTime + 0.15);
      } else if (type === "start") {
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(330, audioCtx.currentTime); // Low/Warm E4
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        oscillator.stop(audioCtx.currentTime + 0.1);
      } else if (type === "end") {
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(554, audioCtx.currentTime); // Mid C#5
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        oscillator.start();
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
        oscillator.stop(audioCtx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("AudioContext block by browser policy or unsupported:", e);
    }
  };

  // Haptic feedback trigger
  const triggerHaptic = (pattern: number | number[]) => {
    if (typeof window !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  };

  // 1. Handling Frequency Taps (+1 count)
  const handleFrequencyTap = (behaviorId: string, name: string) => {
    if (activeTimerId) return; // Prevent logging during duration track
    
    // Feedback
    triggerHaptic(80);
    playBeep("frequency");

    startTransition(async () => {
      const result = await createAbcLogAction({
        studentId: student.id,
        behaviorId,
        frequency: 1,
        durationSeconds: 0,
        lessonName: lessonName || null,
        subTopic: subTopic || null,
        classSize: classSize || null,
        timestamp: new Date().toISOString()
      });

      if (!result.success) {
        showResult(result, { errorTitle: "Loglama Başarısız" });
      }
    });
  };

  // 2. Handling Duration Tracking (Timer Start on Hold)
  const handleDurationStart = (behaviorId: string) => {
    if (activeTimerId) return; // Prevent double trigger
    
    // Feedback
    triggerHaptic([40, 30, 40]);
    playBeep("start");

    setActiveTimerId(behaviorId);
    setElapsedSeconds(0);
    timerStartRef.current = Date.now();

    timerIntervalRef.current = setInterval(() => {
      if (timerStartRef.current) {
        setElapsedSeconds(Math.round((Date.now() - timerStartRef.current) / 1000));
      }
    }, 1000);
  };

  // 3. Handling Duration Release (Timer Stop on Release)
  const handleDurationRelease = (behaviorId: string) => {
    if (activeTimerId !== behaviorId) return;

    // Clear interval
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const duration = elapsedSeconds;
    setActiveTimerId(null);
    setElapsedSeconds(0);
    timerStartRef.current = null;

    // Feedback
    triggerHaptic(150);
    playBeep("end");

    if (duration < 1) {
      // Too short duration, ignore
      return;
    }

    startTransition(async () => {
      const result = await createAbcLogAction({
        studentId: student.id,
        behaviorId,
        frequency: 1,
        durationSeconds: duration,
        lessonName: lessonName || null,
        subTopic: subTopic || null,
        classSize: classSize || null,
        timestamp: new Date().toISOString()
      });

      if (!result.success) {
        showResult(result, { errorTitle: "Loglama Başarısız" });
      }
    });
  };

  // Clean intervals on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  // Bilimsel kullanım uyarısı onaylanmadan veri girişi ekranı kullanılamaz;
  // dashboard'daki gate ile aynı localStorage bayrağını paylaşır.
  if (!disclaimerAccepted) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6 text-center">
        <div className="size-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 mb-6">
          <FlaskConical className="size-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">{BEHAVIOR_EVALUATION_DISCLAIMER_TITLE}</h2>
        <p className="text-sm text-neutral-400 max-w-md mb-8 leading-relaxed">
          {BEHAVIOR_EVALUATION_DISCLAIMER_TEXT}
        </p>
        <button
          onClick={acceptBehaviorEvaluationDisclaimer}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-3 font-bold text-sm transition shadow-lg shadow-emerald-500/10"
        >
          <ShieldCheck className="size-4" />
          {BEHAVIOR_EVALUATION_DISCLAIMER_CONFIRM_LABEL}
        </button>
      </div>
    );
  }

  // Empty state warning if no behaviors defined
  if (activeBehaviors.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col justify-center items-center p-6 text-center">
        <div className="size-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 mb-6 animate-bounce">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-bold mb-2">Davranış Tanımlanmamış</h2>
        <p className="text-sm text-neutral-400 max-w-sm mb-8 leading-relaxed">
          {student.name} için henüz sisteme hedef davranış tanımlanmamış. Veri girişi arayüzünü kullanabilmek için önce davranış profili oluşturmalısınız.
        </p>
        <Link
          href={`/panel/degerlendirmeler/davranis?studentId=${student.id}`}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black px-6 py-3 font-bold text-sm transition shadow-lg shadow-emerald-500/10"
        >
          <Plus className="size-4" />
          Hedef Davranış Ekle
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans select-none overflow-hidden panel-surface">
      {/* Top Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-neutral-950 shrink-0">
        <Link href={`/panel/degerlendirmeler/davranis?studentId=${student.id}`} className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition">
          <ArrowLeft className="size-4" />
          Geri Dön
        </Link>
        <div className="text-center">
          <span className="block text-[9px] font-semibold text-neutral-500 uppercase tracking-[0.2em]">Veri Girişi</span>
          <span className="text-xs font-bold text-white">{student.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-neutral-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="size-4 text-emerald-400" /> : <VolumeX className="size-4 text-neutral-600" />}
          </button>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className={`text-neutral-400 hover:text-white transition ${showConfig ? "rotate-45 text-emerald-400" : ""}`}
          >
            <Settings className="size-4" />
          </button>
        </div>
      </header>

      {/* Dynamic Context Settings (Collapsible) */}
      {showConfig && (
        <div className="bg-neutral-950 border-b border-white/10 p-4 shrink-0 grid gap-3 grid-cols-2 text-xs">
          <div className="col-span-2 text-neutral-400 font-bold uppercase tracking-wider text-[9px]">Sınıf & Ders Bağlamı</div>
          <div>
            <label className="text-neutral-500 block mb-1">Ders Adı</label>
            <input
              type="text"
              value={lessonName}
              onChange={(e) => setLessonName(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none"
            />
          </div>
          <div>
            <label className="text-neutral-500 block mb-1">Alt Konu (Opsiyonel)</label>
            <input
              type="text"
              value={subTopic}
              onChange={(e) => setSubTopic(e.target.value)}
              className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none"
              placeholder="Örn: Kesirler"
            />
          </div>
          <div className="col-span-2">
            <label className="text-neutral-500 block mb-1">Sınıf Mevcudu</label>
            <input
              type="number"
              value={classSize}
              onChange={(e) => setClassSize(parseInt(e.target.value) || 0)}
              className="w-full bg-neutral-900 border border-white/10 rounded-lg p-2 text-white focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* Active Timer Indicator Overlay */}
      {activeTimerId && (
        <div className="bg-red-950/90 border-b border-red-500/20 px-4 py-2 flex items-center justify-between text-xs text-red-200 shrink-0 font-mono animate-pulse">
          <span className="flex items-center gap-1.5 font-bold">
            <Square className="size-3.5 fill-red-500 stroke-none" />
            SÜRE KAYDEDİLİYOR...
          </span>
          <span className="text-sm font-bold">{elapsedSeconds} sn</span>
        </div>
      )}

      {/* Grid container: 3 Giant ghost cups (Touch Zones) */}
      <div className={`flex-1 grid bg-black ${activeBehaviors.length === 1 ? "grid-rows-1" : activeBehaviors.length === 2 ? "grid-rows-2" : "grid-rows-3"}`}>
        {activeBehaviors.map((behavior, index) => {
          const isCurrentTimer = activeTimerId === behavior.id;
          const isOtherTimerActive = activeTimerId && activeTimerId !== behavior.id;

          // Distinct subtle color lines/ghost cards for visually guiding if looked
          const colors = [
            "border-red-500/20 bg-red-500/[0.005] active:bg-red-500/[0.03]",
            "border-amber-500/20 bg-amber-500/[0.005] active:bg-amber-500/[0.03]",
            "border-blue-500/20 bg-blue-500/[0.005] active:bg-blue-500/[0.03]"
          ];

          return (
            <div
              key={behavior.id}
              className={`relative flex flex-col justify-center items-center text-center p-6 border-b border-white/5 cursor-pointer touch-none transition-all ${
                colors[index % colors.length]
              } ${isCurrentTimer ? "bg-red-500/10 border-red-500/40" : ""} ${
                isOtherTimerActive ? "opacity-30 pointer-events-none" : ""
              }`}
              onMouseDown={() => {
                if (behavior.trackingType === "duration") {
                  handleDurationStart(behavior.id);
                } else {
                  handleFrequencyTap(behavior.id, behavior.name);
                }
              }}
              onMouseUp={() => {
                if (behavior.trackingType === "duration") {
                  handleDurationRelease(behavior.id);
                }
              }}
              onTouchStart={(e) => {
                e.preventDefault(); // Prevent ghost click triggering double logs
                if (behavior.trackingType === "duration") {
                  handleDurationStart(behavior.id);
                } else {
                  handleFrequencyTap(behavior.id, behavior.name);
                }
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                if (behavior.trackingType === "duration") {
                  handleDurationRelease(behavior.id);
                }
              }}
            >
              {/* Ghost Indicator */}
              <div className="absolute top-3 left-4 text-[10px] font-bold text-neutral-600 uppercase tracking-widest">
                Zon 0{index + 1}
              </div>

              {/* Behavior Name */}
              <h2 className="text-xl font-bold text-white tracking-wide max-w-[80%] uppercase select-none">
                {behavior.name}
              </h2>

              {/* Tracking type description badge */}
              <span className={`mt-2 rounded-full px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                behavior.trackingType === "duration" ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              }`}>
                {behavior.trackingType === "duration" ? "Süre (Dokun & Tut)" : "Sıklık (Dokun)"}
              </span>

              {/* Live action simulator icons */}
              {behavior.trackingType === "duration" && (
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-neutral-400">
                  <Play className={`size-3 ${isCurrentTimer ? "text-red-500 fill-red-500" : ""}`} />
                  <span>{isCurrentTimer ? "Parmak Ekrandayken Kaydediliyor..." : "Başlatmak İçin Basılı Tut"}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Safety warning bar */}
      <footer className="bg-neutral-950 border-t border-white/10 px-4 py-2.5 flex items-center justify-center gap-2 text-[10px] text-neutral-500 uppercase tracking-wider shrink-0 select-none">
        <Shield className="size-3 text-emerald-500/50" />
        <span>Veri Girişi: Cihaza bakmadan dokunabilirsiniz.</span>
      </footer>
    </div>
  );
}
