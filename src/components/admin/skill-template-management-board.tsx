"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileEdit, ListChecks, Plus, Search, Trash2 } from "lucide-react";

import { deleteSkillTemplateAction } from "@/app/skill-template-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/field";
import { StatCard } from "@/components/dashboard/stat-card";

type SkillTemplate = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  steps: string[];
  order: number;
  isActive: boolean;
};

export function SkillTemplateManagementBoard({ templates }: { templates: SkillTemplate[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  const totalCount = templates.length;
  const activeCount = useMemo(() => templates.filter((t) => t.isActive).length, [templates]);
  const inactiveCount = totalCount - activeCount;

  const categories = useMemo(() => {
    const unique = new Set(
      templates.map((template) => template.category).filter((category): category is string => Boolean(category)),
    );
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "tr"));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(term) ||
        (template.category ?? "").toLowerCase().includes(term);
      const matchesCategory =
        selectedCategory === "all" || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [templates, searchTerm, selectedCategory]);

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`"${name}" şablonunu silmek istediğinizden emin misiniz?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteSkillTemplateAction({ id });
      showResult(result, {
        successTitle: "Şablon silindi",
        errorTitle: "Şablon silinemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard size="sm" label="Toplam Şablon" value={totalCount} />
        <StatCard size="sm" label="Aktif" value={activeCount} />
        <StatCard size="sm" label="Pasif" value={inactiveCount} />
      </div>

      <div className="flex flex-col gap-4 rounded-[var(--panel-radius-lg)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--panel-text-soft)]" />
          <input
            type="text"
            placeholder="Beceri adı veya kategoride ara..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className={`${inputClassName()} pl-10`}
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className={`${inputClassName()} md:w-56`}
        >
          <option value="all">Tüm Kategoriler</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <Link href="/panel/admin/beceri-sablonlari/yeni">
          <Button className="w-full md:w-auto">
            <Plus className="h-4 w-4" />
            Yeni Şablon Ekle
          </Button>
        </Link>
      </div>

      <div className="grid gap-3">
        {filteredTemplates.length === 0 ? (
          <div className="rounded-[var(--panel-radius-lg)] border border-dashed border-[color:var(--panel-border)] px-4 py-12 text-center text-sm text-[color:var(--panel-text-soft)]">
            Kriterlere uygun beceri şablonu bulunamadı.
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="rounded-[var(--panel-radius-card)] border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-soft)] p-4"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-1 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[color:var(--panel-border)] bg-[color:var(--panel-bg-elevated)] text-[color:var(--panel-text-soft)]">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-[color:var(--panel-text)]">
                        {template.name}
                      </h3>
                      {template.category ? <Badge tone="neutral">{template.category}</Badge> : null}
                      <Badge tone={template.isActive ? "success" : "warning"}>
                        {template.isActive ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                    <p className="text-xs text-[color:var(--panel-text-muted)]">
                      {template.steps.length} basamak
                      {template.description ? ` · ${template.description}` : ""}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link href={`/panel/admin/beceri-sablonlari/duzenle/${template.id}`}>
                    <Button variant="secondary" size="sm">
                      <FileEdit className="h-3.5 w-3.5" />
                      Düzenle
                    </Button>
                  </Link>
                  <Button
                    variant="danger"
                    size="icon"
                    disabled={isPending}
                    onClick={() => handleDelete(template.id, template.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
