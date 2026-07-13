"use client";

import { useState } from "react";
import { Search, ArrowRight, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { DisclosureCard } from "@/components/ui/disclosure-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { faqData } from "@/lib/faq-data";

export function FAQAccordion() {
  const [activeCategory, setActiveCategory] = useState("genel");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Filter FAQs based on search term
  const searchResults = searchTerm.trim()
    ? faqData.flatMap((cat) =>
        cat.items
          .filter(
            (item) =>
              item.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
              item.a.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((item) => ({ ...item, categoryTitle: cat.title }))
      )
    : [];

  const currentCategory = faqData.find((cat) => cat.id === activeCategory);

  return (
    <div className="space-y-6">
      {/* Search FAQ */}
      <Card padding="sm" className="relative flex items-center bg-white/[0.02]">
        <Search className="absolute left-4 h-5 w-5 text-[color:var(--panel-text-soft)]" />
        <input
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Sorularda veya cevaplarda arayın... (Örn: BEP, seans, şifre)"
          className="w-full bg-transparent py-3 pl-12 pr-4 text-sm text-[color:var(--panel-text)] placeholder-[color:var(--panel-text-muted)] focus:outline-none"
        />
      </Card>

      {searchTerm.trim() ? (
        // Search Results View
        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--panel-text-soft)] px-1">
            Arama Sonuçları ({searchResults.length} eşleşme)
          </div>

          {searchResults.length === 0 ? (
            <Card padding="md" className="text-center py-10">
              <p className="text-sm text-[color:var(--panel-text-muted)]">
                &ldquo;{searchTerm}&rdquo; ile eşleşen bir soru bulunamadı.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {searchResults.map((item, idx) => (
                <DisclosureCard
                  key={idx}
                  title={item.q}
                  eyebrow={item.categoryTitle}
                >
                  <p className="text-sm leading-7 text-[color:var(--panel-text-soft)] whitespace-pre-wrap">
                    {item.a}
                  </p>
                </DisclosureCard>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Category Switcher View
        <div className="grid gap-6 md:grid-cols-4">
          {/* Categories Sidebar */}
          <div className="md:col-span-1 space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-[color:var(--panel-text-muted)] mb-3 px-3">
              YARDIM KATEGORİLERİ
            </div>
            {faqData.map((cat) => {
              const isActive = cat.id === activeCategory;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between group ${
                    isActive
                      ? "bg-white/[0.05] text-white font-medium shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]"
                      : "text-[color:var(--panel-text-soft)] hover:text-white hover:bg-white/[0.02]"
                  }`}
                >
                  {cat.title}
                  <ArrowRight
                    className={`h-4 w-4 transition-transform ${
                      isActive
                        ? "translate-x-0 opacity-100 text-sky-400"
                        : "-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 text-neutral-500"
                    }`}
                  />
                </button>
              );
            })}
          </div>

          {/* FAQ Accordion List */}
          <div className="md:col-span-3 space-y-4">
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--panel-text-soft)] px-1 mb-2">
              {currentCategory?.title}
            </div>

            {currentCategory?.items.map((item, idx) => (
              <DisclosureCard key={idx} title={item.q}>
                <p className="text-sm leading-7 text-[color:var(--panel-text-soft)] whitespace-pre-wrap">
                  {item.a}
                </p>
              </DisclosureCard>
            ))}
          </div>
        </div>
      )}

      {/* Footer support prompt */}
      <Card padding="md" className="flex flex-wrap items-center justify-between gap-4 bg-[linear-gradient(90deg,rgba(56,189,248,0.03),rgba(99,102,241,0.03))] border-sky-500/10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-400">
            <LifeBuoy className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Aradığınız cevabı bulamadınız mı?</h4>
            <p className="text-xs text-[color:var(--panel-text-muted)] mt-0.5">
              Destek ekibimizle iletişime geçerek doğrudan yardım alabilirsiniz.
            </p>
          </div>
        </div>
        <Link href="/panel/destek">
          <Button variant="primary" className="!bg-sky-500 hover:!bg-sky-600 !text-white text-xs">
            Destek Talebi Oluştur
          </Button>
        </Link>
      </Card>
    </div>
  );
}
