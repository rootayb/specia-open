"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { saveSkillTemplateAction } from "@/app/skill-template-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, inputClassName } from "@/components/ui/field";

type SkillTemplate = {
  id?: string;
  name: string;
  category?: string | null;
  description?: string | null;
  steps: string[];
  order: number;
  isActive: boolean;
};

type StepRow = { id: string; text: string };

function createStepRow(text = ""): StepRow {
  return { id: `row-${Math.random().toString(36).slice(2, 10)}`, text };
}

export function SkillTemplateForm({ initialTemplate }: { initialTemplate?: SkillTemplate }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const [name, setName] = useState(initialTemplate?.name || "");
  const [category, setCategory] = useState(initialTemplate?.category || "");
  const [description, setDescription] = useState(initialTemplate?.description || "");
  const [order, setOrder] = useState(initialTemplate?.order ?? 0);
  const [isActive, setIsActive] = useState(initialTemplate?.isActive ?? true);
  const [steps, setSteps] = useState<StepRow[]>(
    initialTemplate?.steps.length ? initialTemplate.steps.map((text) => createStepRow(text)) : [createStepRow()],
  );
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const addStep = () => setSteps((prev) => [...prev, createStepRow()]);
  const updateStep = (id: string, text: string) =>
    setSteps((prev) => prev.map((row) => (row.id === id ? { ...row, text } : row)));
  const removeStep = (id: string) =>
    setSteps((prev) => (prev.length > 1 ? prev.filter((row) => row.id !== id) : prev));

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

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const trimmedSteps = steps.map((row) => row.text.trim()).filter((text) => text.length > 0);
    if (!name.trim()) {
      showResult({ success: false, message: "Beceri adı zorunludur." }, { errorTitle: "Eksik bilgi" });
      return;
    }
    if (trimmedSteps.length === 0) {
      showResult({ success: false, message: "En az 1 basamak girilmelidir." }, { errorTitle: "Eksik bilgi" });
      return;
    }

    startTransition(async () => {
      const result = await saveSkillTemplateAction({
        id: initialTemplate?.id,
        name,
        category: category.trim() || undefined,
        description: description.trim() || undefined,
        steps: trimmedSteps,
        order,
        isActive,
      });

      showResult(result, {
        successTitle: initialTemplate?.id ? "Şablon güncellendi" : "Şablon oluşturuldu",
        errorTitle: initialTemplate?.id ? "Şablon güncellenemedi" : "Şablon oluşturulamadı",
      });

      if (result.success) {
        router.push("/panel/admin/beceri-sablonlari");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-6">
      <Card>
        <div className="grid gap-5">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Beceri Adı" hint="Örn: El Yıkama">
              <input
                type="text"
                required
                className={inputClassName()}
                placeholder="Örn: El Yıkama"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field label="Kategori" hint="Opsiyonel, örn: Öz Bakım">
              <input
                type="text"
                className={inputClassName()}
                placeholder="Örn: Öz Bakım"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Açıklama" hint="Opsiyonel kullanım notu (en fazla 500 karakter).">
            <textarea
              className={inputClassName()}
              rows={2}
              maxLength={500}
              placeholder="Bu şablonun kullanım amaçını kısaca açıklayın..."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>

          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Sıralama" hint="Liste içindeki gösterim sırası (küçük önce gelir).">
              <input
                type="number"
                className={inputClassName()}
                value={order}
                onChange={(event) => setOrder(Number(event.target.value) || 0)}
              />
            </Field>
            <label className="flex items-center gap-3 self-end rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-4 py-3 text-sm text-[color:var(--panel-text)] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="rounded border-[color:var(--panel-border)]"
              />
              <span className="font-medium">Aktif (öğretmenlere şablon listesinde gösterilsin)</span>
            </label>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-[color:var(--panel-text)]">Basamaklar</span>
          <Button type="button" variant="secondary" size="sm" onClick={addStep}>
            <Plus className="h-3.5 w-3.5" />
            Basamak Ekle
          </Button>
        </div>
        <div className="mt-4 grid gap-2">
          {steps.map((row, index) => (
            <div
              key={row.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(event) => {
                event.preventDefault();
                handleDragOver(index);
              }}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-2 rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] px-2 py-1.5"
            >
              <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-[color:var(--panel-text-soft)]" />
              <span className="w-6 shrink-0 text-center text-xs text-[color:var(--panel-text-soft)]">
                {index + 1}
              </span>
              <input
                type="text"
                className={inputClassName()}
                placeholder={`Basamak ${index + 1}`}
                value={row.text}
                onChange={(event) => updateStep(row.id, event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={steps.length <= 1}
                onClick={() => removeStep(row.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button disabled={isPending} type="submit">
          {isPending ? "Kaydediliyor..." : initialTemplate?.id ? "Şablonu Güncelle" : "Şablonu Oluştur"}
        </Button>
        <Link href="/panel/admin/beceri-sablonlari">
          <Button variant="secondary" disabled={isPending} type="button">
            İptal Et
          </Button>
        </Link>
      </div>
    </form>
  );
}
