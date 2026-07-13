"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileSignature,
  FolderOpen,
  HeartHandshake,
  LineChart,
  MessageSquare,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";

type Feature = {
  id: string;
  /** Tarayıcı çerçevesinde görünen panel rotası. */
  route: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  icon: LucideIcon;
};

type Role = {
  id: "öğretmen" | "kurum" | "veli";
  label: string;
  features: Feature[];
};

/* ── Mock yapı taşları ──────────────────────────────────────────────────── */

/** Aktifken sıralı (staggered) beliren mock satırı. */
function MockRow({
  active,
  index,
  className,
  children,
}: {
  active: boolean;
  index: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
        className,
      )}
      style={{ transitionDelay: active ? `${180 + index * 90}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}

function MockBadge({ children }: { children: ReactNode }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-emerald-200/30 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-200">
      {children}
    </span>
  );
}

function MockHeader({
  active,
  title,
  subtitle,
  badge,
}: {
  active: boolean;
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <MockRow active={active} index={0} className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-white">{title}</div>
        <div className="mt-0.5 truncate text-xs text-white/45">{subtitle}</div>
      </div>
      <MockBadge>{badge}</MockBadge>
    </MockRow>
  );
}

/* ── Öğretmen ön izlemeleri ─────────────────────────────────────────────── */

function BepPreview({ active }: { active: boolean }) {
  const rows = [
    { course: "Türkçe", goal: "Görsellerle desteklenen metni okuyup anlatır" },
    { course: "Matematik", goal: "20'ye kadar ritmik sayma çalışmalarını yapar" },
    { course: "Hayat Bilgisi", goal: "Günlük rutinlerini bağımsız sürdürür" },
  ];
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="BEP Belgesi"
        subtitle="Elif K. · 2025-2026 dönemi"
        badge="PDF / DOCX"
      />
      <MockRow active={active} index={1} className="flex flex-wrap gap-1.5">
        {["Performans", "Hedefler", "Ortam", "Hizmetler", "Kurul"].map((section, i) => (
          <span
            key={section}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium",
              i === 1
                ? "border-emerald-200/40 bg-emerald-300/15 text-emerald-200"
                : "border-white/12 bg-white/[0.05] text-white/55",
            )}
          >
            {section}
          </span>
        ))}
      </MockRow>
      {rows.map((row, i) => (
        <MockRow
          key={row.course}
          active={active}
          index={2 + i}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            {row.course}
          </div>
          <div className="mt-1 text-sm text-white/75">{row.goal}</div>
        </MockRow>
      ))}
    </div>
  );
}

function DegerlendirmePreview({ active }: { active: boolean }) {
  const rows = [
    { label: "Dinlediği metinle ilgili soruları yanıtlar", mark: "+" },
    { label: "Nesneleri renklerine göre eşler", mark: "+" },
    { label: "Yönergeleri iki adımda takip eder", mark: "−" },
    { label: "Kalemi fonksiyonel kavrar", mark: "+" },
  ];
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Kaba Değerlendirme"
        subtitle="Türkçe · 32 satır"
        badge="24/32 işaretlendi"
      />
      <MockRow active={active} index={1}>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-300/80 transition-all duration-1000 ease-out"
            style={{ width: active ? "75%" : "0%", transitionDelay: active ? "400ms" : "0ms" }}
          />
        </div>
      </MockRow>
      {rows.map((row, i) => (
        <MockRow
          key={row.label}
          active={active}
          index={2 + i}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <span className="min-w-0 truncate text-sm text-white/75">{row.label}</span>
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-full border text-sm font-bold",
              row.mark === "+"
                ? "border-emerald-200/40 bg-emerald-300/15 text-emerald-200"
                : "border-white/20 bg-white/[0.05] text-white/50",
            )}
          >
            {row.mark}
          </span>
        </MockRow>
      ))}
    </div>
  );
}

function AnalizPreview({ active }: { active: boolean }) {
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Eğitsel Analiz"
        subtitle="BEP amaçı ilerlemesi · Elif K."
        badge="Ort. ilerleme %64"
      />
      <MockRow active={active} index={1} className="rounded-xl border border-white/12 bg-white/[0.04] p-4">
        <svg viewBox="0 0 320 110" className="h-24 w-full" aria-hidden="true">
          {[0, 1, 2].map((line) => (
            <line
              key={line}
              x1="0"
              x2="320"
              y1={14 + line * 36}
              y2={14 + line * 36}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
          ))}
          <path
            d="M8 96 L62 88 L116 90 L170 62 L224 48 L278 26 L312 18"
            fill="none"
            stroke="#6fffd2"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={active ? 0 : 1}
            style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1) 350ms" }}
          />
          {[
            [8, 96],
            [116, 90],
            [224, 48],
            [312, 18],
          ].map(([x, y], i) => (
            <circle
              key={x}
              cx={x}
              cy={y}
              r="4"
              fill="#0b0f0d"
              stroke="#6fffd2"
              strokeWidth="2"
              opacity={active ? 1 : 0}
              style={{ transition: `opacity 0.5s ease ${500 + i * 220}ms` }}
            />
          ))}
        </svg>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {["Edinim", "Akıcılık", "Kalıcılık", "Genelleme"].map((phase, i) => (
            <span
              key={phase}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                i === 2
                  ? "border-emerald-200/40 bg-emerald-300/15 text-emerald-200"
                  : "border-white/12 bg-white/[0.05] text-white/50",
              )}
            >
              {phase}
            </span>
          ))}
        </div>
      </MockRow>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Aktif hedef", value: "12" },
          { label: "Tamamlanan", value: "5" },
          { label: "Destek gereken", value: "2" },
        ].map((stat, i) => (
          <MockRow
            key={stat.label}
            active={active}
            index={2 + i}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center"
          >
            <div className="text-base font-semibold text-white">{stat.value}</div>
            <div className="text-[11px] text-white/45">{stat.label}</div>
          </MockRow>
        ))}
      </div>
    </div>
  );
}

function TutanakPreview({ active }: { active: boolean }) {
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Zümre Öğretmenler Kurulu"
        subtitle="1. Dönem toplantısı · 2025-2026"
        badge="PDF / DOCX"
      />
      <MockRow active={active} index={1} className="rounded-xl border border-white/12 bg-white/[0.04] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
          Gündem
        </div>
        <div className="mt-2 space-y-1.5">
          {["BEP hedeflerinin dönem değerlendirmesi", "Materyal ve kaynak planlaması"].map(
            (item, i) => (
              <div key={item} className="flex items-start gap-2 text-sm text-white/70">
                <span className="mt-0.5 text-xs font-semibold text-emerald-200">{i + 1}.</span>
                {item}
              </div>
            ),
          )}
        </div>
      </MockRow>
      <MockRow active={active} index={2} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
          Alınan Kararlar
        </div>
        <div className="mt-2 space-y-2">
          {["w-full", "w-4/5"].map((w) => (
            <div key={w} className={cn("h-2 rounded-full bg-white/12", w)} />
          ))}
        </div>
      </MockRow>
      <MockRow
        active={active}
        index={3}
        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
      >
        <span className="text-xs text-white/50">Belge doğrulama kodu</span>
        <span className="font-mono text-xs font-semibold tracking-widest text-emerald-200">SPC-4K7M-92</span>
      </MockRow>
    </div>
  );
}

function AilePreview({ active }: { active: boolean }) {
  const fields = [
    { label: "Haftalık odak", value: "Sofra kurma rutininde bağımsızlık" },
    { label: "Evde uygulanacak etkinlik", value: "Akşam yemeğinde peçete ve çatalları yerleştirme" },
    { label: "Aileye öneriler", value: "Her adımı sözel ipucuyla başlatın, övgüyle bitirin" },
  ];
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Aile Eğitimi Planı"
        subtitle="Elif K. · Haftalık plan"
        badge="Veliyle paylaşıldı"
      />
      {fields.map((field, i) => (
        <MockRow
          key={field.label}
          active={active}
          index={1 + i}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
            {field.label}
          </div>
          <div className="mt-1 text-sm text-white/75">{field.value}</div>
        </MockRow>
      ))}
      <MockRow
        active={active}
        index={4}
        className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/12 bg-white/[0.05] px-3.5 py-2.5"
      >
        <div className="text-xs text-white/70">
          &ldquo;Bu haftaki etkinliği tamamladık, Elif çok keyif aldı!&rdquo;
        </div>
        <div className="mt-1 text-[10px] text-white/35">Veli yanıtı · bugün 09:12</div>
      </MockRow>
    </div>
  );
}

/* ── Kurum ön izlemeleri ────────────────────────────────────────────────── */

function UyelerPreview({ active }: { active: boolean }) {
  const staff = [
    { name: "A. Yılmaz", role: "Özel Eğitim Öğretmeni", modules: "BEP · Değerlendirme" },
    { name: "M. Demir", role: "Fizyoterapist", modules: "Seanslar" },
    { name: "S. Arslan", role: "Dil ve Konuşma Terapisti", modules: "BEP · Analiz" },
  ];
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Personel ve Kullanıcılar"
        subtitle="İş yükleri ve modül yetkileri"
        badge="8 aktif üye"
      />
      {staff.map((person, i) => (
        <MockRow
          key={person.name}
          active={active}
          index={1 + i}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white/85">{person.name}</div>
            <div className="truncate text-xs text-white/45">{person.role}</div>
          </div>
          <span className="whitespace-nowrap rounded-full border border-white/12 bg-white/[0.05] px-2.5 py-1 text-[11px] text-white/60">
            {person.modules}
          </span>
        </MockRow>
      ))}
      <MockRow
        active={active}
        index={4}
        className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
      >
        <span className="text-xs text-white/50">Davet kodu</span>
        <span className="font-mono text-xs font-semibold tracking-widest text-emerald-200">SPC-DVT-2841</span>
      </MockRow>
    </div>
  );
}

function BepOnayPreview({ active }: { active: boolean }) {
  const docs = [
    { student: "Elif K.", doc: "BEP · 2025-2026", status: "Onay bekliyor" },
    { student: "Mert A.", doc: "BEP · 2025-2026", status: "Onaylandı" },
    { student: "Zeynep T.", doc: "BEP revizyonu", status: "Onay bekliyor" },
  ];
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="BEP Onayları"
        subtitle="Kurum onayı bekleyen belgeler"
        badge="2 bekleyen"
      />
      {docs.map((doc, i) => (
        <MockRow
          key={doc.student}
          active={active}
          index={1 + i}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white/85">{doc.student}</div>
            <div className="truncate text-xs text-white/45">{doc.doc}</div>
          </div>
          <span
            className={cn(
              "whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold",
              doc.status === "Onaylandı"
                ? "border-emerald-200/40 bg-emerald-300/15 text-emerald-200"
                : "border-white/15 bg-white/[0.05] text-white/60",
            )}
          >
            {doc.status}
          </span>
        </MockRow>
      ))}
    </div>
  );
}

function SeansPreview({ active }: { active: boolean }) {
  const sessions = [
    { time: "09:00", student: "Elif K.", teacher: "A. Yılmaz" },
    { time: "10:00", student: "Mert A.", teacher: "S. Arslan" },
    { time: "11:00", student: "Zeynep T.", teacher: "A. Yılmaz" },
  ];
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Seans Programı"
        subtitle="Pazartesi · Haftalık plan"
        badge="18 seans"
      />
      {sessions.map((session, i) => (
        <MockRow
          key={session.time}
          active={active}
          index={1 + i}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <span className="w-12 shrink-0 font-mono text-xs font-semibold text-emerald-200">
            {session.time}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-white/80">{session.student}</span>
          <span className="truncate text-xs text-white/45">{session.teacher}</span>
        </MockRow>
      ))}
      <MockRow active={active} index={4}>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-300/80 transition-all duration-1000 ease-out"
            style={{ width: active ? "62%" : "0%", transitionDelay: active ? "450ms" : "0ms" }}
          />
        </div>
        <div className="mt-1.5 text-[11px] text-white/40">Haftalık doluluk %62</div>
      </MockRow>
    </div>
  );
}

function FinansPreview({ active }: { active: boolean }) {
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Finans ve Hak Ediş"
        subtitle="Haziran 2026 dönemi"
        badge="Kapanış hazır"
      />
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Fatura", value: "42" },
          { label: "Hak ediş", value: "₺186K" },
          { label: "Gider kaydı", value: "31" },
        ].map((stat, i) => (
          <MockRow
            key={stat.label}
            active={active}
            index={1 + i}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center"
          >
            <div className="text-base font-semibold text-white">{stat.value}</div>
            <div className="text-[11px] text-white/45">{stat.label}</div>
          </MockRow>
        ))}
      </div>
      {[
        { label: "Personel giderleri işlendi", done: true },
        { label: "Genel giderler işlendi", done: true },
        { label: "Mali rapor oluşturuldu", done: false },
      ].map((item, i) => (
        <MockRow
          key={item.label}
          active={active}
          index={4 + i}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-bold",
              item.done
                ? "border-emerald-200/40 bg-emerald-300/15 text-emerald-200"
                : "border-white/20 text-white/35",
            )}
          >
            {item.done ? "✓" : ""}
          </span>
          <span className="text-sm text-white/75">{item.label}</span>
        </MockRow>
      ))}
    </div>
  );
}

function RaporlarPreview({ active }: { active: boolean }) {
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Kurumsal Raporlar"
        subtitle="PDF merkezi ve evrak arşivi"
        badge="Arşiv güncel"
      />
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Öğrenci", value: "64" },
          { label: "BEP", value: "58" },
          { label: "Veli bağlantısı", value: "71" },
        ].map((stat, i) => (
          <MockRow
            key={stat.label}
            active={active}
            index={1 + i}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center"
          >
            <div className="text-base font-semibold text-white">{stat.value}</div>
            <div className="text-[11px] text-white/45">{stat.label}</div>
          </MockRow>
        ))}
      </div>
      {[
        { name: "BEP · Elif K. · 2025-2026.pdf", date: "bugün" },
        { name: "Kaba Değerlendirme · Mert A.pdf", date: "dün" },
      ].map((doc, i) => (
        <MockRow
          key={doc.name}
          active={active}
          index={4 + i}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <span className="min-w-0 truncate text-sm text-white/75">{doc.name}</span>
          <span className="shrink-0 text-xs text-white/40">{doc.date}</span>
        </MockRow>
      ))}
    </div>
  );
}

/* ── Veli ön izlemeleri ─────────────────────────────────────────────────── */

function CocuklarimPreview({ active }: { active: boolean }) {
  const docs = [
    { name: "BEP · 2025-2026", meta: "Güncellendi · 3 gün önce" },
    { name: "Kaba Değerlendirme", meta: "PDF · geçen hafta" },
    { name: "Gelişim Raporu", meta: "PDF · geçen ay" },
  ];
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Çocuğum"
        subtitle="Elif K. · Tüm belgeler"
        badge="3 belge"
      />
      {docs.map((doc, i) => (
        <MockRow
          key={doc.name}
          active={active}
          index={1 + i}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <span className="min-w-0 truncate text-sm text-white/80">{doc.name}</span>
          <span className="shrink-0 text-xs text-white/40">{doc.meta}</span>
        </MockRow>
      ))}
    </div>
  );
}

function VeliDegerlendirmePreview({ active }: { active: boolean }) {
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Değerlendirmeler"
        subtitle="Öğretmenin paylaştığı sonuçlar"
        badge="Güncel"
      />
      <MockRow active={active} index={1} className="rounded-xl border border-white/12 bg-white/[0.04] p-4">
        <svg viewBox="0 0 320 90" className="h-20 w-full" aria-hidden="true">
          <path
            d="M8 78 L70 70 L132 72 L194 48 L256 38 L312 20"
            fill="none"
            stroke="#6fffd2"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={active ? 0 : 1}
            style={{ transition: "stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1) 350ms" }}
          />
        </svg>
        <div className="mt-1 text-[11px] text-white/40">Dönem içi gelişim</div>
      </MockRow>
      {[
        { name: "Kaba Değerlendirme · Türkçe", date: "12 Haziran" },
        { name: "Öğretim Sonu Değerlendirme", date: "28 Mayıs" },
      ].map((item, i) => (
        <MockRow
          key={item.name}
          active={active}
          index={2 + i}
          className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <span className="min-w-0 truncate text-sm text-white/75">{item.name}</span>
          <span className="shrink-0 text-xs text-white/40">{item.date}</span>
        </MockRow>
      ))}
    </div>
  );
}

function TakvimPreview({ active }: { active: boolean }) {
  const events = [
    { time: "Salı 10:00", label: "Bireysel seans" },
    { time: "Perşembe 14:00", label: "Grup etkinliği" },
    { time: "Cuma 09:30", label: "Veli görüşmesi" },
  ];
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Takvim"
        subtitle="Bu haftanın planı"
        badge="3 etkinlik"
      />
      {events.map((event, i) => (
        <MockRow
          key={event.time}
          active={active}
          index={1 + i}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
        >
          <span className="w-28 shrink-0 text-xs font-semibold text-emerald-200">{event.time}</span>
          <span className="min-w-0 truncate text-sm text-white/80">{event.label}</span>
        </MockRow>
      ))}
    </div>
  );
}

function VeliAilePreview({ active }: { active: boolean }) {
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="Aile Eğitimi"
        subtitle="Bu haftanın planı · Elif K."
        badge="Yeni plan"
      />
      <MockRow active={active} index={1} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
          Evde uygulanacak etkinlik
        </div>
        <div className="mt-1 text-sm text-white/75">
          Akşam yemeğinde peçete ve çatalları yerleştirme
        </div>
      </MockRow>
      <MockRow active={active} index={2} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/40">
          Aileye öneriler
        </div>
        <div className="mt-1 text-sm text-white/75">
          Her adımı sözel ipucuyla başlatın, övgüyle bitirin
        </div>
      </MockRow>
      <MockRow
        active={active}
        index={3}
        className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-emerald-200/25 bg-emerald-300/10 px-3.5 py-2.5"
      >
        <div className="text-xs text-white/80">Etkinliği tamamladık, video da ekledim. 📎</div>
        <div className="mt-1 text-right text-[10px] text-white/35">Siz · 19:45</div>
      </MockRow>
    </div>
  );
}

function IletisimPreview({ active }: { active: boolean }) {
  return (
    <div className="grid gap-3">
      <MockHeader
        active={active}
        title="İletişim"
        subtitle="A. Yılmaz · Özel Eğitim Öğretmeni"
        badge="Yeni mesaj"
      />
      <MockRow
        active={active}
        index={1}
        className="max-w-[85%] rounded-2xl rounded-bl-md border border-white/12 bg-white/[0.05] px-3.5 py-2.5"
      >
        <div className="text-xs text-white/70">
          Elif bugünkü seansta hece birleştirmede çok iyiydi. 👏
        </div>
        <div className="mt-1 text-[10px] text-white/35">Öğretmen · 15:20</div>
      </MockRow>
      <MockRow
        active={active}
        index={2}
        className="ml-auto max-w-[85%] rounded-2xl rounded-br-md border border-emerald-200/25 bg-emerald-300/10 px-3.5 py-2.5"
      >
        <div className="text-xs text-white/80">Harika! Evde de birlikte tekrar ederiz.</div>
        <div className="mt-1 text-right text-[10px] text-white/35">Siz · 15:34</div>
      </MockRow>
      <MockRow
        active={active}
        index={3}
        className="flex items-center justify-between rounded-full border border-white/12 bg-white/[0.04] px-4 py-2.5"
      >
        <span className="text-xs text-white/35">Mesaj yazın…</span>
        <span className="text-xs font-semibold text-emerald-200">Gönder</span>
      </MockRow>
    </div>
  );
}

/* ── Rol tanımları ──────────────────────────────────────────────────────── */

const roles: Role[] = [
  {
    id: "öğretmen",
    label: "Öğretmen",
    features: [
      {
        id: "bep",
        route: "bep",
        eyebrow: "Bireyselleştirilmiş Eğitim Programı",
        title: "BEP belgesi dakikalar içinde hazır.",
        description:
          "Performans, ders hedefleri, ortam ve kurul bölümlerini tek editörde doldurun; belge PDF veya DOCX çıktısına hazır.",
        bullets: [
          "Ders bazlı hedef satırları tek editörde",
          "Hazır müfredat kazanım kataloğu",
          "PDF / DOCX çıktısı tek tıkla",
        ],
        icon: BookOpenCheck,
      },
      {
        id: "degerlendirme",
        route: "degerlendirmeler",
        eyebrow: "Kaba & Öğretim Sonu Değerlendirme",
        title: "İşaretleyin, belge kendiliğinden oluşsun.",
        description:
          "Kaba değerlendirmede satırları artı/eksi ile hızla işaretleyin; öğretim sonu değerlendirmeyle dönem kapanışını tamamlayın.",
        bullets: [
          "Ders bazlı artı / eksi işaretleme",
          "Tek belgede birden fazla ders",
          "Kaba ve öğretim sonu değerlendirme çıktıları",
        ],
        icon: ClipboardCheck,
      },
      {
        id: "egitsel-analiz",
        route: "egitsel-analiz",
        eyebrow: "Eğitsel Analiz",
        title: "Gelişimi grafikle görün.",
        description:
          "BEP hedefleri edinimden genellemeye izlenir; ilerleme eğrisi ve destek gerektiren hedefler tek bakışta görünür.",
        bullets: [
          "BEP hedefi bazlı ilerleme takibi",
          "Edinim → genelleme öğrenme aşamaları",
          "Destek gerektiren hedefleri erken fark edin",
        ],
        icon: LineChart,
      },
      {
        id: "tutanaklar",
        route: "tutanaklar",
        eyebrow: "Kurul Tutanakları",
        title: "Kurul tutanakları kayıt altında.",
        description:
          "Zümre ve şube öğretmenler kurulu tutanaklarını künye, gündem ve kararlarla yapılandırılmış şekilde oluşturun.",
        bullets: [
          "Zümre ve ŞÖK tutanak şablonları",
          "Gündem ve kararlar yapılandırılmış",
          "Doğrulama kodlu PDF / DOCX çıktısı",
        ],
        icon: FileSignature,
      },
      {
        id: "aile-egitimi",
        route: "aile-egitimi",
        eyebrow: "Aile Eğitimi",
        title: "Aile de sürecin içinde.",
        description:
          "Haftalık odak, ev etkinliği ve önerilerden oluşan aile eğitim planları hazırlayın, veliyle paylaşıp yanıtını görün.",
        bullets: [
          "Haftalık odak ve ev etkinliği planı",
          "Aileye öneriler tek kartta",
          "Veliyle paylaşım ve veli geri bildirimi",
        ],
        icon: HeartHandshake,
      },
    ],
  },
  {
    id: "kurum",
    label: "Kurum",
    features: [
      {
        id: "uyeler",
        route: "uyeler",
        eyebrow: "Personel Yönetimi",
        title: "Ekibiniz tek panelde.",
        description:
          "Personel detayları, iş yükleri ve modül yetkilerini yönetin; yeni üyeler davet kodlarıyla saniyeler içinde katılsın.",
        bullets: [
          "İş yükü ve modül bazlı yetkiler",
          "Davet kodlarıyla hızlı katılım",
          "Veli eşleştirme tek merkezden",
        ],
        icon: Users,
      },
      {
        id: "bep-onaylari",
        route: "bep-onaylari",
        eyebrow: "BEP Onayları",
        title: "Belgeler kurum onayından geçer.",
        description:
          "Öğretmenlerin hazırladığı BEP belgeleri onay kuyruğuna düşer; kurum yönetimi inceleyip tek tıkla onaylar.",
        bullets: [
          "Onay bekleyenler tek kuyrukta",
          "Belge bazında inceleme ve onay",
          "Onay durumu şeffaf takip",
        ],
        icon: ShieldCheck,
      },
      {
        id: "seans-programi",
        route: "seans-programi",
        eyebrow: "Seans Programı",
        title: "Seanslar çakışmadan planlanır.",
        description:
          "Öğrenci ve öğretmen bazlı haftalık seans programını tek ekrandan yönetin; doluluk her an görünür.",
        bullets: [
          "Haftalık öğrenci-öğretmen planı",
          "Öğretmen bazlı program görünümü",
          "Doluluk ve yoğunluk takibi",
        ],
        icon: CalendarDays,
      },
      {
        id: "finans",
        route: "finans",
        eyebrow: "Finans & Hak Ediş",
        title: "Mali süreçler tek akışta.",
        description:
          "Faturalar, hak ediş, personel ve genel giderler tek modülde; aylık kapanış kontrol listesiyle dönem kapanır.",
        bullets: [
          "Fatura ve hak ediş yönetimi",
          "Personel ve genel gider kayıtları",
          "Aylık kapanış ve mali raporlar",
        ],
        icon: Wallet,
      },
      {
        id: "raporlar",
        route: "raporlar",
        eyebrow: "Raporlar & Arşiv",
        title: "Kurumun fotoğrafı tek ekranda.",
        description:
          "Öğrenci, BEP ve belge istatistikleri kurumsal PDF merkeziyle birlikte; üretilen her belge arşivde saklanır.",
        bullets: [
          "Öğrenci ve belge istatistikleri",
          "Kurumsal PDF merkezi",
          "Doğrulama kodlu evrak arşivi",
        ],
        icon: BarChart3,
      },
    ],
  },
  {
    id: "veli",
    label: "Veli",
    features: [
      {
        id: "cocuklarim",
        route: "cocuklarim",
        eyebrow: "Çocuğum",
        title: "Çocuğunuza ait her belge elinizde.",
        description:
          "BEP, değerlendirme ve gelişim raporları tek listede; kurumla paylaşılan her belgeye anında ulaşın.",
        bullets: [
          "Tüm belgeler tek listede",
          "Yeni belge geldiğinde bildirim",
          "Mobil uygulamadan da erişim",
        ],
        icon: FolderOpen,
      },
      {
        id: "veli-degerlendirme",
        route: "degerlendirmeler",
        eyebrow: "Değerlendirmeler",
        title: "Gelişimi siz de izleyin.",
        description:
          "Öğretmenin paylaştığı kaba ve öğretim sonu değerlendirme sonuçlarını dönem boyunca takip edin.",
        bullets: [
          "Paylaşılan değerlendirme sonuçları",
          "Dönem içi gelişim görünümü",
          "Belgeleri PDF olarak görüntüleme",
        ],
        icon: LineChart,
      },
      {
        id: "takvim",
        route: "takvim",
        eyebrow: "Takvim",
        title: "Seans ve etkinlikler takviminizde.",
        description:
          "Kurumun planladığı seans ve etkinlikler ortak takvimde; hiçbir randevu gözden kaçmaz.",
        bullets: [
          "Seans ve etkinlik görünümü",
          "Ortak kurum takvimi",
          "Yaklaşan plan hatırlatmaları",
        ],
        icon: CalendarDays,
      },
      {
        id: "veli-aile-egitimi",
        route: "aile-egitimi",
        eyebrow: "Aile Eğitimi",
        title: "Evde ne yapacağınız belli.",
        description:
          "Öğretmenin hazırladığı haftalık plan size ulaşır; etkinliği uygulayıp geri bildiriminizi iletirsiniz.",
        bullets: [
          "Haftalık ev etkinliği planı",
          "Uygulama önerileri adım adım",
          "Yanıt ve dosya ile geri bildirim",
        ],
        icon: HeartHandshake,
      },
      {
        id: "iletisim",
        route: "iletisim",
        eyebrow: "İletişim",
        title: "Öğretmenle aynı kanaldasınız.",
        description:
          "Öğretmenle güvenli mesajlaşma kurum bağlantısı üzerinden yürür; gelişmelerden anında haberdar olursunuz.",
        bullets: [
          "Öğretmen-veli güvenli mesajlaşma",
          "Dosya ve görsel paylaşımı",
          "Anlık bildirimler",
        ],
        icon: MessageSquare,
      },
    ],
  },
];

const previewComponents: Record<string, (props: { active: boolean }) => ReactNode> = {
  bep: BepPreview,
  degerlendirme: DegerlendirmePreview,
  "egitsel-analiz": AnalizPreview,
  tutanaklar: TutanakPreview,
  "aile-egitimi": AilePreview,
  uyeler: UyelerPreview,
  "bep-onaylari": BepOnayPreview,
  "seans-programi": SeansPreview,
  finans: FinansPreview,
  raporlar: RaporlarPreview,
  cocuklarim: CocuklarimPreview,
  "veli-degerlendirme": VeliDegerlendirmePreview,
  takvim: TakvimPreview,
  "veli-aile-egitimi": VeliAilePreview,
  iletisim: IletisimPreview,
};

/* ── Ortak parçalar ─────────────────────────────────────────────────────── */

/** Tarayıcı çerçevesi görünümlü mock kabı. */
function PreviewFrame({ feature, active }: { feature: Feature; active: boolean }) {
  const Preview = previewComponents[feature.id];
  return (
    <div
      aria-hidden={!active}
      className={cn(
        "absolute inset-0 flex flex-col overflow-hidden rounded-2xl border bg-[#0a0d0c]/90 shadow-[0_40px_120px_rgba(0,0,0,0.6)] backdrop-blur-xl transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
        active
          ? "pointer-events-auto translate-y-0 scale-100 border-white/16 opacity-100"
          : "pointer-events-none translate-y-10 scale-[0.97] border-white/8 opacity-0",
      )}
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <div className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-white/15" />
          <span className="size-2.5 rounded-full bg-emerald-300/60" />
        </div>
        <span className="ml-2 truncate text-xs font-medium text-white/40">
          specia.com.tr / panel / {feature.route}
        </span>
      </div>
      <div className="flex-1 overflow-hidden p-4 sm:p-5">
        <Preview active={active} />
      </div>
    </div>
  );
}

/** Sol metin bloğu — hem sticky akışta hem mobil dikey listede kullanılır. */
function FeatureText({
  feature,
  step,
  active,
}: {
  feature: Feature;
  step: string;
  active: boolean;
}) {
  const Icon = feature.icon;
  return (
    <div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-10 items-center justify-center rounded-xl border transition-colors duration-500",
            active
              ? "border-emerald-200/35 bg-emerald-300/10 text-emerald-200"
              : "border-white/12 bg-white/[0.04] text-white/50",
          )}
        >
          <Icon className="size-5" />
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
          {step} — {feature.eyebrow}
        </span>
      </div>
      <h3 className="mt-5 max-w-md text-3xl font-semibold leading-[1.02] tracking-[-0.04em] text-white sm:text-4xl lg:text-5xl">
        {feature.title}
      </h3>
      <p className="mt-4 max-w-md text-sm leading-7 text-white/58 sm:text-base">
        {feature.description}
      </p>
      <ul className="mt-6 space-y-2.5">
        {feature.bullets.map((bullet) => (
          <li key={bullet} className="flex items-start gap-2.5 text-sm text-white/70">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-emerald-300/70" />
            {bullet}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Öğretmen / Kurum / Veli rol seçici. */
function RoleTabs({
  activeRole,
  onSelect,
}: {
  activeRole: Role["id"];
  onSelect: (id: Role["id"]) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.04] p-1 backdrop-blur-xl">
      {roles.map((role) => (
        <button
          key={role.id}
          type="button"
          onClick={() => onSelect(role.id)}
          className={cn(
            "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all duration-300 sm:px-5",
            role.id === activeRole
              ? "bg-white text-black shadow-[0_8px_24px_rgba(255,255,255,0.15)]"
              : "text-white/55 hover:text-white",
          )}
        >
          {role.id === "öğretmen" ? (
            <BookOpenCheck className="size-4" />
          ) : role.id === "kurum" ? (
            <Building2 className="size-4" />
          ) : (
            <HeartHandshake className="size-4" />
          )}
          {role.label}
        </button>
      ))}
    </div>
  );
}

/* ── Ana bileşen ────────────────────────────────────────────────────────── */

/**
 * Rol bazlı, scroll ile ilerleyen özellik akışı: solda metin, sağda ürün ön
 * izlemesi. Kapsayıcı her özellik için ~1 ekran yüksekliği ayırır; içerideki
 * sahne sticky kalır ve scroll konumuna göre aktif özellik değişir.
 */
export function FeatureFlow() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [roleId, setRoleId] = useState<Role["id"]>("öğretmen");
  const [active, setActive] = useState(0);
  const rafRef = useRef<number | null>(null);

  const role = roles.find((r) => r.id === roleId) ?? roles[0];
  const features = role.features;

  const handleScroll = useCallback(() => {
    if (rafRef.current !== null) {
      return;
    }
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      const el = containerRef.current;
      if (!el) {
        return;
      }
      const total = el.offsetHeight - window.innerHeight;
      if (total <= 0) {
        return;
      }
      const progress = Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
      setActive(Math.min(features.length - 1, Math.floor(progress * features.length)));
    });
  }, [features.length]);

  useEffect(() => {
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [handleScroll]);

  const scrollToFeature = useCallback(
    (index: number, behavior: ScrollBehavior = "smooth") => {
      const el = containerRef.current;
      if (!el) {
        return;
      }
      const total = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top + window.scrollY;
      // Segment ortasına konumlan: aktif özellik net şekilde seçilsin.
      window.scrollTo({
        top: top + (total * (index + 0.5)) / features.length,
        behavior,
      });
    },
    [features.length],
  );

  const selectRole = useCallback(
    (id: Role["id"]) => {
      setRoleId(id);
      setActive(0);
      // Yeni rolün akışı baştan başlasın; sahne sticky olduğundan kullanıcı
      // yalnızca içerik değişimini görür.
      scrollToFeature(0, "auto");
    },
    [scrollToFeature],
  );

  return (
    <section id="ozellikler" className="relative z-10">
      {/* Masaüstü: sticky scroll sahnesi */}
      <div
        ref={containerRef}
        className="relative hidden lg:block"
        style={{ height: `${features.length * 100}vh` }}
      >
        <div className="sticky top-0 flex h-screen flex-col items-center justify-center gap-10 overflow-hidden px-4 pt-16 sm:px-6 lg:px-8">
          <RoleTabs activeRole={roleId} onSelect={selectRole} />

          <div className="grid w-full max-w-[1400px] items-center gap-16 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            {/* Sol: metin + adım göstergesi */}
            <div className="flex items-start gap-8">
              {/* Dikey ilerleme çizgisi */}
              <div className="mt-1 flex flex-col items-center gap-2" aria-hidden="true">
                {features.map((feature, index) => (
                  <button
                    key={feature.id}
                    type="button"
                    tabIndex={-1}
                    onClick={() => scrollToFeature(index)}
                    className={cn(
                      "w-1 cursor-pointer rounded-full transition-all duration-500",
                      index === active
                        ? "h-12 bg-emerald-300"
                        : "h-5 bg-white/15 hover:bg-white/35",
                    )}
                  />
                ))}
              </div>

              <div className="relative min-h-[420px] flex-1">
                {features.map((feature, index) => (
                  <div
                    key={feature.id}
                    aria-hidden={index !== active}
                    className={cn(
                      "absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]",
                      index === active
                        ? "translate-y-0 opacity-100"
                        : index < active
                          ? "pointer-events-none -translate-y-8 opacity-0"
                          : "pointer-events-none translate-y-8 opacity-0",
                    )}
                  >
                    <FeatureText
                      feature={feature}
                      step={`0${index + 1}`}
                      active={index === active}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Sağ: ürün ön izleme çerçeveleri */}
            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-12 rounded-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(111,255,210,0.1),transparent_65%)]"
              />
              <div className="relative aspect-[10/9] max-h-[540px] w-full">
                {features.map((feature, index) => (
                  <PreviewFrame key={feature.id} feature={feature} active={index === active} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobil / tablet: rol seçici + dikey akış */}
      <div className="px-4 py-16 sm:px-6 lg:hidden">
        <div className="flex justify-center">
          <RoleTabs activeRole={roleId} onSelect={(id) => setRoleId(id)} />
        </div>
        <div className="mt-14 grid gap-16">
          {features.map((feature, index) => (
            <MobileFeature key={feature.id} feature={feature} step={`0${index + 1}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** Mobilde her özellik kendi bloğunda; görünüme girince mock animasyonları tetiklenir. */
function MobileFeature({ feature, step }: { feature: Feature; step: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || visible) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -15% 0px", threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <div ref={ref} className="mx-auto w-full max-w-xl">
      <FeatureText feature={feature} step={step} active={visible} />
      <div className="relative mt-8 aspect-[10/11] w-full sm:aspect-[10/9]">
        <PreviewFrame feature={feature} active={visible} />
      </div>
    </div>
  );
}
