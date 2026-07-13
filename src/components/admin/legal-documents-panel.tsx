"use client";

import { useMemo, useState, useTransition } from "react";
import { FileText, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import type { LegalDocumentPayload, LegalDocumentSlug } from "@/lib/legal-documents";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: { message: string };
};

const labels: Record<LegalDocumentSlug, string> = {
  privacy: "Gizlilik ve KVKK",
  terms: "Kullanım Koşulları",
  cookies: "Çerez Politikası",
};

function formatSections(sections: LegalDocumentPayload["sections"]) {
  return JSON.stringify(sections, null, 2);
}

export function LegalDocumentsPanel({ documents }: { documents: LegalDocumentPayload[] }) {
  const [items, setItems] = useState(documents);
  const [selectedSlug, setSelectedSlug] = useState<LegalDocumentSlug>(documents[0]?.slug ?? "privacy");
  const selected = useMemo(
    () => items.find((item) => item.slug === selectedSlug) ?? items[0],
    [items, selectedSlug],
  );
  const [title, setTitle] = useState(selected?.title ?? "");
  const [summary, setSummary] = useState(selected?.summary ?? "");
  const [sectionsText, setSectionsText] = useState(formatSections(selected?.sections ?? []));
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function selectDocument(slug: LegalDocumentSlug) {
    const next = items.find((item) => item.slug === slug);
    if (!next) return;
    setSelectedSlug(slug);
    setTitle(next.title);
    setSummary(next.summary);
    setSectionsText(formatSections(next.sections));
    setMessage(null);
  }

  async function save() {
    setMessage(null);
    let parsedSections: LegalDocumentPayload["sections"];
    try {
      parsedSections = JSON.parse(sectionsText) as LegalDocumentPayload["sections"];
    } catch {
      setMessage({ type: "error", text: "Bölüm JSON formatı geçerli değil." });
      return;
    }

    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/legal-documents", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: selectedSlug, title, summary, sections: parsedSections }),
        });
        const payload = (await response.json()) as ApiEnvelope<LegalDocumentPayload[]>;
        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(payload.error?.message ?? payload.message ?? "Metin kaydedilemedi.");
        }
        setItems(payload.data);
        const next = payload.data.find((item) => item.slug === selectedSlug);
        if (next) {
          setTitle(next.title);
          setSummary(next.summary);
          setSectionsText(formatSections(next.sections));
        }
        setMessage({ type: "success", text: payload.message ?? "Legal metin güncellendi." });
      } catch (error) {
        setMessage({ type: "error", text: error instanceof Error ? error.message : "Metin kaydedilemedi." });
      }
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-3">
        <div className="mb-3 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--panel-text-soft)]">
          <FileText className="size-4" />
          Dokümanlar
        </div>
        <div className="grid gap-2">
          {items.map((item) => (
            <button
              key={item.slug}
              type="button"
              onClick={() => selectDocument(item.slug)}
              className={`rounded-2xl px-3 py-3 text-left text-sm transition ${
                item.slug === selectedSlug
                  ? "bg-[color:var(--panel-accent)] text-white"
                  : "text-[color:var(--panel-text-muted)] hover:bg-[color:var(--panel-bg-base)] hover:text-[color:var(--panel-text)]"
              }`}
            >
              <div className="font-semibold">{labels[item.slug]}</div>
              <div className="mt-1 line-clamp-2 text-xs opacity-80">
                {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString("tr-TR") : "Varsayılan metin"}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4 sm:p-5">
        <div className="grid gap-4">
          <Field label="Başlık">
            <input className={inputClassName()} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>

          <Field label="Özet">
            <textarea
              className={`${inputClassName()} min-h-24 resize-y py-3`}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </Field>

          <Field label="Bölümler" hint='JSON formatı: [{"title":"...","paragraphs":["..."],"bullets":["..."]}]'>
            <textarea
              className={`${inputClassName()} min-h-[420px] resize-y py-3 font-mono text-xs leading-5`}
              value={sectionsText}
              onChange={(event) => setSectionsText(event.target.value)}
              spellCheck={false}
            />
          </Field>

          {message ? (
            <div
              className={`rounded-[var(--panel-radius-card)] border p-4 text-sm ${
                message.type === "success"
                  ? "border-[color:var(--panel-success-border)] bg-[color:var(--panel-success-bg)] text-[color:var(--panel-success-text)]"
                  : "border-[color:var(--panel-danger-border)] bg-[color:var(--panel-danger-bg)] text-[color:var(--panel-danger-text)]"
              }`}
            >
              {message.text}
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button type="button" onClick={save} disabled={isPending}>
              <Save className="size-4" />
              {isPending ? "Kaydediliyor..." : "Metni Kaydet"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
