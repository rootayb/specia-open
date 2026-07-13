"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileEdit, Trash2, Search, Eye, BookOpen, Plus } from "lucide-react";

import { deleteBlogPostAction, toggleBlogPostPublishAction } from "@/app/blog-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { BLOG_CATEGORIES, getCategoryLabel } from "@/lib/blog-categories";

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverImage?: string | null;
  category?: string | null;
  published: boolean;
  publishedAt?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  author: {
    id: string;
    name: string | null;
    email: string;
  };
};

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(typeof value === "string" ? new Date(value) : value);
}

export function BlogManagementBoard({ posts }: { posts: BlogPost[] }) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();

  // Metrics
  const totalCount = posts.length;
  const publishedCount = useMemo(() => posts.filter((p) => p.published).length, [posts]);
  const draftCount = totalCount - publishedCount;

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (post.summary && post.summary.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "all" ||
        (selectedStatus === "published" && post.published) ||
        (selectedStatus === "draft" && !post.published);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [posts, searchTerm, selectedCategory, selectedStatus]);

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`"${title}" başlıklı yazıyı silmek istediğinizden emin misiniz?`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteBlogPostAction({ id });
      showResult(result, {
        successTitle: "Yazı silindi",
        errorTitle: "Yazı silinemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  const handleTogglePublish = (id: string, currentPublished: boolean) => {
    startTransition(async () => {
      const result = await toggleBlogPostPublishAction({
        id,
        published: !currentPublished,
      });
      showResult(result, {
        successTitle: !currentPublished ? "Yazı yayınlandı" : "Yazı yayından kaldırıldı",
        errorTitle: "Yayın durumu güncellenemedi",
      });
      if (result.success) {
        router.refresh();
      }
    });
  };

  return (
    <div className="grid gap-6">
      {/* Metrics Cards */}
      <div className="grid gap-3 md:grid-cols-3">
        <StatCard size="sm" label="Toplam Yazı" value={totalCount} />
        <StatCard size="sm" label="Yayınlanan" value={publishedCount} />
        <StatCard size="sm" label="Taslak" value={draftCount} />
      </div>

      {/* Filters & Search Board */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Yazı başlığı veya özetinde ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-10 pr-4 text-sm text-white placeholder-neutral-500 outline-none focus:border-white/20 focus:bg-black/40"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-neutral-300 outline-none focus:border-white/20 focus:bg-black/40 min-w-[160px]"
        >
          <option value="all" className="bg-neutral-900 text-white">Tüm Kategoriler</option>
          {BLOG_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value} className="bg-neutral-900 text-white">
              {c.label}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="h-11 rounded-xl border border-white/10 bg-black/20 px-3 text-sm text-neutral-300 outline-none focus:border-white/20 focus:bg-black/40 min-w-[140px]"
        >
          <option value="all" className="bg-neutral-900 text-white">Tüm Durumlar</option>
          <option value="published" className="bg-neutral-900 text-white">Yayınlanmış</option>
          <option value="draft" className="bg-neutral-900 text-white">Taslak</option>
        </select>

        {/* Create Button */}
        <Link href="/panel/admin/blog/yeni">
          <Button className="h-11 w-full md:w-auto flex items-center justify-center gap-2">
            <Plus className="h-4 w-4" />
            Yeni Yazı Ekle
          </Button>
        </Link>
      </div>

      {/* Posts List */}
      <div className="grid gap-4">
        {filteredPosts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-12 text-center text-sm text-neutral-500">
            Kriterlere uygun blog yazısı bulunamadı.
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div
              key={post.id}
              className="group rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:bg-white/[0.05]"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                {/* Info Area */}
                <div className="flex flex-1 gap-4">
                  {post.coverImage ? (
                    <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-xl border border-white/5 bg-black/40">
                      {/* Yöneticinin girdiği harici URL; next/image yerine sade img
                          kullanılır ki geçersiz/boşluklu URL sayfayı çökertmesin. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={post.coverImage}
                        alt={post.title}
                        loading="lazy"
                        className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/[0.01] text-neutral-600">
                      <BookOpen className="h-8 w-8" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-white group-hover:text-neutral-200">
                        {post.title}
                      </h3>
                      <Badge tone="neutral">{getCategoryLabel(post.category)}</Badge>
                      <Badge tone={post.published ? "success" : "warning"}>
                        {post.published ? "Yayınlandı" : "Taslak"}
                      </Badge>
                    </div>

                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {post.summary || "Özet girilmemiş."}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] text-neutral-500">
                      <span>Yazar: {post.author?.name || post.author?.email || "Bilinmeyen Yazar"}</span>
                      <span>•</span>
                      <span>Kayıt: {formatDateTime(post.createdAt)}</span>
                      {post.publishedAt ? (
                        <>
                          <span>•</span>
                          <span>Yayın: {formatDateTime(post.publishedAt)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Actions Area */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 md:flex-col md:items-end">
                  <div className="flex items-center gap-2 w-full">
                    {post.published && (
                      <Link href={`/blog/${post.slug}`} target="_blank" className="flex-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs h-9 flex items-center justify-center gap-1.5 font-semibold"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Görüntüle
                        </Button>
                      </Link>
                    )}
                    <Link
                      href={`/panel/admin/blog/duzenle/${post.id}`}
                      className={post.published ? "flex-1" : "w-full"}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full text-xs h-9 flex items-center justify-center gap-1.5 font-semibold"
                      >
                        <FileEdit className="h-3.5 w-3.5" />
                        Düzenle
                      </Button>
                    </Link>
                  </div>

                  <div className="flex items-center gap-2 w-full">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={isPending}
                      onClick={() => handleTogglePublish(post.id, post.published)}
                      className={`flex-1 text-xs h-9 font-semibold ${
                        post.published
                          ? "hover:bg-amber-500/10 hover:text-amber-400 text-neutral-300"
                          : "hover:bg-emerald-500/10 hover:text-emerald-400 text-neutral-300"
                      }`}
                    >
                      {post.published ? "Taslağa Al" : "Yayınla"}
                    </Button>

                    <Button
                      variant="danger"
                      size="icon"
                      disabled={isPending}
                      onClick={() => handleDelete(post.id, post.title)}
                      className="!h-9 !w-9 rounded-xl shrink-0 flex items-center justify-center"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
