"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, X, FileText, ListChecks, BarChart2, BookOpen } from "lucide-react";

type EvaluationEntry = {
  id: string;
  title: string;
  type: string;
  evaluationDate: string | null;
  updatedAt: string;
  owner: {
    name: string | null;
    email: string;
  };
};

type Props = {
  evaluations: EvaluationEntry[];
};

function getTypeName(type: string) {
  if (type === "obt") return "ÖBT";
  if (type === "kontrol") return "Kontrol Listesi";
  if (type === "beceri") return "Beceri Analizi";
  if (type === "kaba") return "Kaba Değerlendirme";
  return "Değerlendirme";
}

function getTypeColor(type: string) {
  if (type === "obt") return "text-indigo-500 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/20";
  if (type === "kontrol") return "text-emerald-600 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20";
  if (type === "beceri") return "text-sky-600 bg-sky-50 dark:text-sky-300 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20";
  if (type === "kaba") return "text-amber-600 bg-amber-50 dark:text-amber-300 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20";
  return "text-neutral-500 bg-neutral-50 dark:bg-white/5 border-neutral-200 dark:border-white/10";
}

function getTypeIcon(type: string) {
  if (type === "obt") return FileText;
  if (type === "kontrol") return ListChecks;
  if (type === "beceri") return BarChart2;
  if (type === "kaba") return BookOpen;
  return FileText;
}

function getHref(type: string, id: string) {
  if (type === "kontrol") return `/panel/degerlendirmeler/kontrol-listesi/${id}`;
  if (type === "beceri") return `/panel/degerlendirmeler/beceri-analizi/${id}`;
  if (type === "kaba") return `/panel/degerlendirmeler/kaba/${id}`;
  return `/panel/degerlendirmeler/ogretim-sonu/${id}`;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(new Date(value));
}

export function ParentEvaluationsList({ evaluations }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const filtered = useMemo(() => {
    return evaluations.filter((ev) => {
      const matchesSearch =
        searchTerm === "" ||
        ev.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (ev.owner.name ?? ev.owner.email).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = selectedType === "all" || ev.type === selectedType;
      return matchesSearch && matchesType;
    });
  }, [evaluations, searchTerm, selectedType]);

  const hasFilters = searchTerm !== "" || selectedType !== "all";

  return (
    <div className="grid gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[color:var(--panel-text-muted)]" />
          <input
            type="text"
            placeholder="Başlık veya ekleyen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] pl-8 pr-3 text-xs text-[color:var(--panel-text)] placeholder-[color:var(--panel-text-muted)] outline-none focus:border-[color:var(--panel-border-strong)] transition"
          />
        </div>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="h-9 cursor-pointer rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)] px-3 text-xs text-[color:var(--panel-text)] outline-none focus:border-[color:var(--panel-border-strong)] transition"
        >
          <option value="all">Tüm Türler</option>
          <option value="obt">ÖBT</option>
          <option value="kontrol">Kontrol Listesi</option>
          <option value="beceri">Beceri Analizi</option>
          <option value="kaba">Kaba Değerlendirme</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setSearchTerm(""); setSelectedType("all"); }}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-3 text-xs text-[color:var(--panel-text-soft)] hover:bg-[color:var(--panel-bg-hover)] transition"
          >
            <X className="h-3.5 w-3.5" />
            Temizle
          </button>
        )}
        <span className="ml-auto text-xs text-[color:var(--panel-text-muted)]">
          {filtered.length} sonuç
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--panel-border)] px-4 py-8 text-center">
          <BookOpen className="mx-auto mb-2 h-8 w-8 text-[color:var(--panel-text-muted)]" />
          <div className="text-sm text-[color:var(--panel-text-soft)]">
            {hasFilters ? "Filtreyle eşleşen değerlendirme bulunamadı." : "Kayıtlı değerlendirme bulunmuyor."}
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {filtered.map((ev) => {
            const Icon = getTypeIcon(ev.type);
            return (
              <Link
                key={ev.id}
                href={getHref(ev.type, ev.id)}
                className="flex items-center gap-3 rounded-2xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-base)]/55 px-4 py-3 transition hover:bg-[color:var(--panel-bg-hover)]"
              >
                <Icon className="h-4 w-4 shrink-0 text-[color:var(--panel-text-soft)]" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[color:var(--panel-text)]">
                    {ev.title}
                  </div>
                  <div className="mt-0.5 text-xs text-[color:var(--panel-text-muted)]">
                    {ev.owner.name ?? ev.owner.email} · {formatDate(ev.evaluationDate ?? ev.updatedAt)}
                  </div>
                </div>
                <span className={`shrink-0 rounded-lg border px-2 py-0.5 text-xs font-semibold ${getTypeColor(ev.type)}`}>
                  {getTypeName(ev.type)}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
