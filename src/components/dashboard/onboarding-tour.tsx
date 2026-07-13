"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FilePenLine,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SpeciaLogoBadge } from "@/components/brand/specia-logo-badge";

interface OnboardingTourProps {
  userId: string;
  role: string;
  userName: string;
}

interface Step {
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  type: "welcome" | "students" | "bep" | "analysis" | "calendar" | "done";
}

export function OnboardingTour({ userId, role, userName }: OnboardingTourProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  const isParent = role === "parent";

  // Define steps based on role
  const parentSteps: Step[] = [
    {
      title: "Specia Dünyasına Hoş Geldiniz!",
      description: `Merhaba ${userName}! Çocuğunuzun özel eğitim sürecini çok daha yakından, şeffaf ve düzenli bir şekilde takip edebilmeniz için hazırladığımız panelinize hoş geldiniz. Bu kısa turda platformumuzun önemli özelliklerini tanıyacaksınız.`,
      icon: Sparkles,
      color: "from-purple-500/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30",
      type: "welcome",
    },
    {
      title: "Çocuğunuzun Belgeleri & Arşivi",
      description: "Çocuğunuza ait tüm eğitim planlarını (BEP), değerlendirme formlarını, RAM raporlarını ve sisteme yüklenen dosyaları tek bir güvenli panelden görebilirsiniz.",
      icon: Users,
      color: "from-blue-500/20 to-cyan-500/20 text-cyan-400 border-cyan-500/30",
      type: "students",
    },
    {
      title: "Günlük Aile Eğitimleri",
      description: "Öğretmenlerinizin sizinle paylaştığı günlük, haftalık ve aylık yönlendirmeleri, evde yapabileceğiniz etkinlikleri 'Aile Eğitimi' bölümünden takip edip kolayca uygulayabilirsiniz.",
      icon: FilePenLine,
      color: "from-amber-500/20 to-orange-500/20 text-orange-400 border-orange-500/30",
      type: "bep",
    },
    {
      title: "Seans Takvimi & İletişim",
      description: "Gelecek ders seanslarını takvimden izleyin ve çocuğunuzun öğretmenleriyle doğrudan, güvenli mesajlaşma alanı üzerinden dosya paylaşarak iletişim kurun.",
      icon: CalendarDays,
      color: "from-rose-500/20 to-pink-500/20 text-pink-400 border-pink-500/30",
      type: "calendar",
    },
    {
      title: "Keşfetmeye Hazırsınız!",
      description: "Artık Specia'yı keşfetmeye hazırsınız. Çocuğunuzun gelişim yolculuğunda size rehberlik etmek için buradayız. İyi çalışmalar dileriz!",
      icon: CheckCircle2,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      type: "done",
    },
  ];

  const educatorSteps: Step[] = [
    {
      title: "Specia Dünyasına Hoş Geldiniz!",
      description: `Merhaba ${userName}! Özel eğitimde dijital dönüşümü başlatan Specia'ya hoş geldiniz. Eğitimciler ve kurumlar için tasarlanan bu panelde tüm BEP süreçlerini kolayca yönetebilirsiniz.`,
      icon: Sparkles,
      color: "from-purple-500/20 to-indigo-500/20 text-indigo-400 border-indigo-500/30",
      type: "welcome",
    },
    {
      title: "Hızlı & Akıllı BEP Hazırlama",
      description: "Zengin hedef kütüphanemiz ve kullanışlı şablonlarımız ile saniyeler içinde Bireyselleştirilmiş Eğitim Programı (BEP) hazırlayın ve resmi PDF çıktıları alın.",
      icon: FilePenLine,
      color: "from-blue-500/20 to-indigo-500/20 text-blue-400 border-blue-500/30",
      type: "bep",
    },
    {
      title: "Öğrenci Kayıtları & Veli Bağlantısı",
      description: "Öğrencilerinizin tüm eğitsel geçmişini, RAM raporlarını ve gelişim basamaklarını arşivleyin. Veli hesaplarını eşleştirerek iletişimi tek bir noktadan koordine edin.",
      icon: Users,
      color: "from-cyan-500/20 to-teal-500/20 text-cyan-400 border-cyan-500/30",
      type: "students",
    },
    {
      title: "Eğitsel Değerlendirme & Analiz",
      description: "Hazır kaba değerlendirme şablonlarını kullanarak öğrencilerin seviyelerini tespit edin. Performans ve kazanım grafiklerini otomatik oluşturarak raporlayın.",
      icon: BarChart3,
      color: "from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30",
      type: "analysis",
    },
    {
      title: "Seans Programı & Takvim",
      description: "Kurum içi seans dağılımlarını, öğretmen takvimlerini, sınıf ve oda atamalarını çakışma olmadan organize edin. Velilerle doğrudan mesajlaşın.",
      icon: CalendarDays,
      color: "from-rose-500/20 to-pink-500/20 text-pink-400 border-pink-500/30",
      type: "calendar",
    },
    {
      title: "Başlamaya Hazırsınız!",
      description: "Specia'nın gücünü keşfetmeye hazırsınız. Yeni bir öğrenci ekleyerek veya ilk BEP kaydınızı oluşturarak hemen başlayabilirsiniz. Keyifli çalışmalar!",
      icon: CheckCircle2,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30",
      type: "done",
    },
  ];

  const steps = isParent ? parentSteps : educatorSteps;

  useEffect(() => {
    setMounted(true);
    const isCompleted = localStorage.getItem(`specia_onboarding_completed_${userId}`);
    if (isCompleted !== "true") {
      setIsOpen(true);
    }
  }, [userId]);

  const handleClose = () => {
    localStorage.setItem(`specia_onboarding_completed_${userId}`, "true");
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  if (!mounted || !isOpen) return null;

  const step = steps[currentStep];

  // Helper to render the interactive animated preview on the right
  const renderVisual = (type: Step["type"]) => {
    switch (type) {
      case "welcome":
        return (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-purple-950/20 to-indigo-950/20">
            {/* Spinning ambient circles */}
            <div className="absolute size-44 animate-[spin_10s_linear_infinite] rounded-full border border-dashed border-indigo-500/20" />
            <div className="absolute size-32 animate-[spin_6s_linear_infinite_reverse] rounded-full border border-dashed border-purple-500/30" />
            <div className="absolute size-20 rounded-full bg-indigo-500/10 blur-xl" />
            
            {/* Main logo / emblem */}
            <div className="relative z-10 scale-110 animate-[float_4s_ease-in-out_infinite]">
              <SpeciaLogoBadge size="md" variant="auto" frameTone="none" />
            </div>

            {/* Glowing stars */}
            <div className="absolute left-1/4 top-1/4 size-1 animate-ping rounded-full bg-white" />
            <div className="absolute bottom-1/4 right-1/3 size-1.5 animate-ping rounded-full bg-indigo-400" />
            <div className="absolute right-1/4 top-1/3 size-1 animate-pulse rounded-full bg-purple-400" />
          </div>
        );

      case "students":
        return (
          <div className="relative flex h-full w-full flex-col justify-center p-6 bg-gradient-to-br from-blue-950/20 to-cyan-950/20">
            {/* Floating student records card */}
            <div className="mx-auto w-full max-w-[240px] rounded-xl border border-white/5 bg-[#0f0f12]/80 p-4 shadow-xl backdrop-blur-sm animate-[float_4s_ease-in-out_infinite]">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-[10px] font-bold">ÖG</div>
                <div className="flex-1 space-y-1">
                  <div className="h-2 w-16 rounded bg-white/20" />
                  <div className="h-1.5 w-24 rounded bg-white/10" />
                </div>
              </div>
              
              {/* Document details container */}
              <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-white/40">BEP Planı</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-400">Aktif</span>
                </div>
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-white/40">RAM Raporu</span>
                  <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-blue-400">Yüklendi</span>
                </div>
              </div>
            </div>
            
            {/* Small floating files card */}
            <div className="absolute right-6 bottom-8 w-[140px] rounded-lg border border-white/5 bg-[#161619]/90 p-3 shadow-lg animate-[float_3s_ease-in-out_infinite_reverse]">
              <div className="flex items-center gap-2">
                <div className="size-2 rounded-full bg-cyan-400" />
                <div className="h-2 w-12 rounded bg-white/20" />
              </div>
              <div className="mt-2 h-1.5 w-full rounded bg-white/15" />
            </div>
          </div>
        );

      case "bep":
        return (
          <div className="relative flex h-full w-full flex-col justify-center p-6 bg-gradient-to-br from-amber-950/20 to-orange-950/20">
            {/* BEP Editor simulator */}
            <div className="mx-auto w-full max-w-[260px] rounded-xl border border-white/5 bg-[#0f0f12]/95 p-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] text-white/40">
                <span>BEP Hazırlama Sihirbazı</span>
                <span className="animate-pulse text-amber-400">Kütüphane Aktif</span>
              </div>
              
              {/* Simulated writing text */}
              <div className="mt-3 space-y-2">
                <div className="h-2.5 w-3/4 rounded bg-white/20 animate-[pulse_2s_infinite]" />
                <div className="h-2 w-full rounded bg-white/10" />
                <div className="h-2 w-5/6 rounded bg-white/10" />
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
                  <div className="size-3.5 rounded bg-emerald-500/20 flex items-center justify-center text-[8px] text-emerald-400 font-bold">✓</div>
                  <div className="h-2 w-28 rounded bg-emerald-500/20" />
                </div>
              </div>

              {/* Pulsing PDF export badge */}
              <div className="mt-4 flex justify-end">
                <div className="rounded-lg bg-amber-500/10 px-2 py-1 text-[9px] font-bold text-amber-400 border border-amber-500/20 animate-pulse">
                  PDF Çıktısı Al
                </div>
              </div>
            </div>
          </div>
        );

      case "analysis":
        return (
          <div className="relative flex h-full w-full flex-col justify-center p-6 bg-gradient-to-br from-amber-950/10 to-orange-950/25">
            {/* Charts mockup */}
            <div className="mx-auto w-full max-w-[260px] rounded-xl border border-white/5 bg-[#0f0f12]/90 p-4 shadow-xl">
              <div className="text-[10px] text-white/40 mb-3 uppercase tracking-wider">Eğitsel Gelişim Analizi</div>
              
              {/* Graphic container */}
              <div className="relative h-20 w-full border-b border-l border-white/10 flex items-end justify-between px-2">
                {/* Visualizing growth bars with drawing animations */}
                <div className="w-4 bg-amber-500/20 hover:bg-amber-500/40 transition rounded-t h-[30%] duration-1000 animate-[grow_1.5s_ease-out]" />
                <div className="w-4 bg-amber-500/30 hover:bg-amber-500/50 transition rounded-t h-[45%] duration-1000 animate-[grow_1.8s_ease-out]" />
                <div className="w-4 bg-amber-500/50 hover:bg-amber-500/70 transition rounded-t h-[60%] duration-1000 animate-[grow_2.1s_ease-out]" />
                <div className="w-4 bg-amber-500 hover:bg-amber-500 transition rounded-t h-[80%] duration-1000 animate-[grow_2.4s_ease-out]" />
                
                {/* SVG glowing line graph */}
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                  <path
                    d="M 10 90 Q 30 70, 50 60 T 90 20"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeDasharray="200"
                    strokeDashoffset="200"
                    className="animate-[draw_3s_ease-in-out_infinite_alternate]"
                  />
                  <circle cx="90" cy="20" r="3" fill="#f59e0b" className="animate-ping" />
                </svg>
              </div>
              <div className="flex justify-between text-[8px] text-white/30 mt-1">
                <span>Eylül</span>
                <span>Kasım</span>
                <span>Ocak</span>
                <span>Mart</span>
              </div>
            </div>
          </div>
        );

      case "calendar":
        return (
          <div className="relative flex h-full w-full flex-col justify-center p-6 bg-gradient-to-br from-rose-950/20 to-pink-950/20">
            {/* Calendar widget mock */}
            <div className="mx-auto w-full max-w-[240px] rounded-xl border border-white/5 bg-[#0f0f12]/90 p-4 shadow-xl">
              <div className="flex items-center justify-between text-[10px] text-white/40 mb-3">
                <span className="font-semibold">Haftalık Takvim</span>
                <span>Haziran 2026</span>
              </div>
              
              {/* Daily slots grid */}
              <div className="grid grid-cols-4 gap-2">
                <div className="rounded bg-white/5 p-1.5 text-center">
                  <div className="text-[8px] text-white/30">Pzt</div>
                  <div className="text-[10px] font-bold mt-0.5">22</div>
                </div>
                <div className="rounded bg-rose-500/25 p-1.5 text-center ring-1 ring-rose-500/30 animate-pulse">
                  <div className="text-[8px] text-rose-300">Sal</div>
                  <div className="text-[10px] font-bold text-rose-200 mt-0.5">23</div>
                  <div className="mt-1 h-1 w-full rounded bg-rose-400" />
                </div>
                <div className="rounded bg-white/5 p-1.5 text-center">
                  <div className="text-[8px] text-white/30">Çar</div>
                  <div className="text-[10px] font-bold mt-0.5">24</div>
                </div>
                <div className="rounded bg-white/5 p-1.5 text-center">
                  <div className="text-[8px] text-white/30">Per</div>
                  <div className="text-[10px] font-bold mt-0.5">25</div>
                </div>
              </div>

              {/* Message bubbles coming in */}
              <div className="mt-4 space-y-2 border-t border-white/5 pt-3">
                <div className="flex items-start gap-2 animate-[slideIn_3s_ease-out_infinite]">
                  <div className="size-4 rounded-full bg-rose-500/20 flex-shrink-0" />
                  <div className="rounded bg-white/5 px-2 py-1 text-[8px] text-white/70 max-w-[80%]">
                    Yeni seans notu paylaşıldı.
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "done":
        return (
          <div className="relative flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-950/20 to-teal-950/20">
            {/* Floating success element */}
            <div className="flex flex-col items-center">
              <div className="relative flex size-20 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 animate-bounce">
                <CheckCircle2 className="size-10 text-emerald-400" />
                <div className="absolute -inset-2 rounded-full border border-dashed border-emerald-500/20 animate-[spin_8s_linear_infinite]" />
              </div>
              <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-400 animate-pulse">
                Süreç Başarılı
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090b]/85 p-4 backdrop-blur-md transition-all duration-300">
      
      {/* CSS Styles injection for custom animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        @keyframes draw {
          from { stroke-dashoffset: 200; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes grow {
          from { height: 0%; opacity: 0; }
        }
        @keyframes slideIn {
          0% { transform: translateX(-10px); opacity: 0; }
          15%, 85% { transform: translateX(0px); opacity: 1; }
          100% { transform: translateX(10px); opacity: 0; }
        }
      `}</style>

      {/* Main Split Tour Modal Container */}
      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-2xl border border-[color:var(--panel-border)] bg-gradient-to-b from-[#161619] to-[#0f0f12] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.9)] md:grid-cols-[1.1fr_0.9fr] lg:grid-cols-[1.2fr_0.8fr]">
        
        {/* Top-right close overlay */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-lg border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] text-[color:var(--panel-text-muted)] transition hover:bg-[color:var(--panel-bg-hover)] hover:text-[color:var(--panel-text)]"
          title="Kapat"
        >
          <X className="size-4" />
        </button>

        {/* LEFT COLUMN: Content & Navigation Controls */}
        <div className="flex flex-col justify-between p-6 md:p-10">
          
          {/* Welcome User / Step Header */}
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-[color:var(--panel-bg-soft)] px-3 py-1 text-[11px] font-medium text-[color:var(--panel-text-soft)]">
              <span>Specia Rehberi • Adım {currentStep + 1} / {steps.length}</span>
            </div>

            <div className="mt-6 flex flex-col gap-4">
              <h3 className="font-heading text-2xl font-bold tracking-tight text-[color:var(--panel-text)] md:text-3xl leading-snug">
                {step.title}
              </h3>
              
              <p className="text-[14px] leading-relaxed text-[color:var(--panel-text-muted)]">
                {step.description}
              </p>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="mt-10 border-t border-[color:var(--panel-border)] pt-6">
            
            {/* Step selection dots & Skip text */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex gap-1.5">
                {steps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? "w-6 bg-[color:var(--panel-text)]"
                        : "w-2 bg-[color:var(--panel-text-soft)]/40 hover:bg-[color:var(--panel-text-soft)]"
                    }`}
                    title={`Adım ${index + 1}`}
                  />
                ))}
              </div>

              {currentStep < steps.length - 1 && (
                <button
                  onClick={handleClose}
                  className="text-[12px] font-semibold text-[color:var(--panel-text-soft)] transition hover:text-[color:var(--panel-text)]"
                >
                  Tanıtımı Atla
                </button>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center gap-3">
              <div>
                {currentStep > 0 ? (
                  <Button variant="secondary" size="md" onClick={handlePrev}>
                    <ChevronLeft className="mr-1 size-4" />
                    Geri
                  </Button>
                ) : (
                  <div /> // Spacer
                )}
              </div>

              <Button size="md" onClick={handleNext} className="min-w-[120px]">
                {currentStep === steps.length - 1 ? (
                  "Hemen Başla!"
                ) : (
                  <>
                    İleri
                    <ChevronRight className="ml-1.5 size-4" />
                  </>
                )}
              </Button>
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Animated Mock Visual (Hidden on mobile) */}
        <div className="hidden md:flex border-l border-[color:var(--panel-border)] bg-[#0c0c0e] items-center justify-center">
          {renderVisual(step.type)}
        </div>

      </div>

    </div>
  );
}
