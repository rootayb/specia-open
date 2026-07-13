"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Edit2, ArrowLeft, Globe, Bold, Italic, Heading2, Heading3, List, Quote, Link as LinkIcon, Code, ListOrdered, Eraser } from "lucide-react";
import Link from "next/link";

import { saveBlogPostAction } from "@/app/blog-actions";
import { useActionFeedback } from "@/components/ui/action-toast";
import { Button } from "@/components/ui/button";
import { Field, inputClassName } from "@/components/ui/field";
import { BLOG_CATEGORIES, getCategoryLabel } from "@/lib/blog-categories";

type BlogPost = {
  id?: string;
  title: string;
  slug: string;
  summary?: string | null;
  coverImage?: string | null;
  category?: string | null;
  authorName?: string | null;
  published: boolean;
  content: string;
};

// Turkish-friendly slugify function for client-side auto-generation
function slugify(text: string): string {
  const trMap: Record<string, string> = {
    ç: "c", Ç: "c",
    ğ: "g", Ğ: "g",
    ı: "i", İ: "i",
    ö: "o", Ö: "o",
    ş: "s", Ş: "s",
    ü: "u", Ü: "u",
  };

  let slug = text.toLowerCase();
  for (const [key, val] of Object.entries(trMap)) {
    slug = slug.replaceAll(key, val);
  }

  return slug
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid characters
    .trim()
    .replace(/\s+/g, "-")         // Replace spaces with hyphens
    .replace(/-+/g, "-");         // Remove duplicate hyphens
}

function convertTextToHtml(text: string): string {
  if (!text) return "";
  if (/<[a-z][\s\S]*>/i.test(text)) {
    return text;
  }
  return text
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function BlogPostForm({ initialPost }: { initialPost?: BlogPost }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
  const [isPending, startTransition] = useTransition();
  const { showResult } = useActionFeedback();
  const editorRef = useRef<HTMLDivElement>(null);

  // Form states
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [summary, setSummary] = useState(initialPost?.summary || "");
  const [coverImage, setCoverImage] = useState(initialPost?.coverImage || "");
  const [category, setCategory] = useState(initialPost?.category || "genel");
  const [authorName, setAuthorName] = useState(initialPost?.authorName || "");
  const [published, setPublished] = useState(initialPost?.published || false);
  const [content, setContent] = useState(initialPost?.content || "");
  const [isSlugManual, setIsSlugManual] = useState(!!initialPost?.slug);

  // Sync initial content once when editing
  useEffect(() => {
    if (editorRef.current && initialPost?.content) {
      const htmlContent = convertTextToHtml(initialPost.content);
      if (editorRef.current.innerHTML !== htmlContent) {
        editorRef.current.innerHTML = htmlContent;
      }
    }
  }, [initialPost]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!initialPost?.id && !isSlugManual) {
      setSlug(slugify(value));
    }
  };

  const executeCommand = (command: string, value: string = "") => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleLinkPrompt = () => {
    const url = prompt("Bağlantı URL'sini girin (Örn: https://google.com):");
    if (url) {
      executeCommand("createLink", url);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalContent = editorRef.current?.innerHTML || content;

    if (!title.trim()) {
      alert("Başlık alanı zorunludur.");
      return;
    }
    if (!finalContent.trim() || finalContent === "<p><br></p>" || finalContent === "<br>") {
      alert("İçerik alanı zorunludur.");
      return;
    }

    startTransition(async () => {
      const result = await saveBlogPostAction({
        id: initialPost?.id,
        title,
        slug: slug.trim() || undefined,
        summary: summary.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        category,
        authorName: authorName.trim() || undefined,
        published,
        content: finalContent,
      });

      showResult(result, {
        successTitle: initialPost?.id ? "Yazı güncellendi" : "Yazı oluşturuldu",
        errorTitle: initialPost?.id ? "Yazı güncellenemedi" : "Yazı oluşturulamadı",
      });

      if (result.success) {
        router.push("/panel/admin/blog");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      <style>{`
        .rich-editor p {
          margin-bottom: 1.25rem !important;
          min-height: 1.2em;
        }
        .rich-editor h2 {
          font-size: 1.625rem !important;
          font-weight: 700 !important;
          margin-top: 2rem !important;
          margin-bottom: 1rem !important;
          color: #ffffff !important;
        }
        .rich-editor h3 {
          font-size: 1.375rem !important;
          font-weight: 600 !important;
          margin-top: 1.625rem !important;
          margin-bottom: 0.75rem !important;
          color: #ffffff !important;
        }
        .rich-editor ul {
          list-style-type: disc !important;
          padding-left: 1.625rem !important;
          margin-bottom: 1.25rem !important;
        }
        .rich-editor ol {
          list-style-type: decimal !important;
          padding-left: 1.625rem !important;
          margin-bottom: 1.25rem !important;
        }
        .rich-editor li {
          margin-bottom: 0.5rem !important;
        }
        .rich-editor blockquote {
          border-left: 3px solid rgba(255, 255, 255, 0.4) !important;
          padding-left: 1.125rem !important;
          font-style: italic !important;
          margin-bottom: 1.25rem !important;
          color: #d4d4d4 !important;
        }
        .rich-editor a {
          color: #6fffd2 !important;
          text-decoration: underline !important;
        }
      `}</style>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link href="/panel/admin/blog" className="inline-flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4" />
          Yönetim Listesine Dön
        </Link>

        {/* Tab Switcher */}
        <div className="flex rounded-xl bg-white/[0.03] border border-white/10 p-1">
          <button
            onClick={() => {
              setActiveTab("edit");
              setTimeout(() => {
                if (editorRef.current) {
                  editorRef.current.innerHTML = content;
                }
              }, 50);
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "edit" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Edit2 className="h-4 w-4" />
            Düzenle
          </button>
          <button
            onClick={() => {
              if (editorRef.current) {
                setContent(editorRef.current.innerHTML);
              }
              setActiveTab("preview");
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "preview" ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Eye className="h-4 w-4" />
            Önizleme
          </button>
        </div>
      </div>

      {activeTab === "edit" ? (
        <form onSubmit={handleSubmit} className="grid gap-6">
          {/* Main Layout Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6 lg:p-7">
            <div className="grid gap-5">
              {/* Title & Slug */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Başlık" hint="Blog yazısının ana başlığı.">
                  <input
                    type="text"
                    required
                    className={inputClassName()}
                    placeholder="Örn: Özel Eğitimde BEP Hazırlama Rehberi"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                  />
                </Field>

                <Field
                  label="URL Uzantısı (Slug)"
                  hint="Tarayıcıda görünecek adres. Benzersiz olmalıdır."
                >
                  <div className="relative">
                    <input
                      type="text"
                      className={inputClassName()}
                      placeholder="bep-hazirlama-rehberi"
                      value={slug}
                      onChange={(e) => {
                        setSlug(slugify(e.target.value));
                        setIsSlugManual(true);
                      }}
                    />
                    {!isSlugManual && title && (
                      <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold tracking-wider text-emerald-400/70 select-none bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
                        Otomatik
                      </span>
                    )}
                  </div>
                </Field>
              </div>

              {/* Cover Image & Category */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Kapak Görseli URL'si"
                  hint="Unsplash, Pexels vb. dış kaynaklardan görsel linki ekleyin."
                >
                  <input
                    type="url"
                    className={inputClassName()}
                    placeholder="Örn: https://images.unsplash.com/photo-..."
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                  />
                </Field>

                <Field label="Kategori" hint="Yazının yayınlanacağı kategori.">
                  <select
                    className={inputClassName()}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {BLOG_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value} className="bg-neutral-900 text-white">
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {/* Yazar Adı */}
              <div className="grid gap-5 md:grid-cols-2">
                <Field
                  label="Yazar Adı (İsteğe Bağlı)"
                  hint="Boş bırakılırsa bu yazıyı oluşturan yöneticinin sistem adı gösterilir."
                >
                  <input
                    type="text"
                    className={inputClassName()}
                    placeholder="Örn: Dr. Ayşe Yılmaz veya Specia Ekibi"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                  />
                </Field>
              </div>

              {/* Cover Image Preview (if URL valid) */}
              {coverImage && (
                <div className="relative h-44 w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImage}
                    alt="Kapak Önizleme"
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                </div>
              )}

              {/* Summary */}
              <Field
                label="Kısa Özet"
                hint="Liste sayfasında ve arama motorlarında (Meta Description) görünecek kısa açıklama."
              >
                <textarea
                  className={inputClassName()}
                  rows={2}
                  maxLength={500}
                  placeholder="Yazının içeriğini özetleyen 1-2 cümle yazın..."
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                />
              </Field>

              {/* Content */}
              <Field
                label="İçerik"
                hint="Blog yazısının detaylı gövde metni. Yukarıdaki araçları kullanarak metni doğrudan kalınlaştırabilir, başlık yapabilir veya liste ekleyebilirsiniz."
              >
                {/* Şekillendirme Araç Çubuğu */}
                <div className="flex flex-wrap items-center gap-1 rounded-t-2xl border-x border-t border-white/10 bg-white/[0.02] p-1.5 select-none">
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("bold");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Kalın"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("italic");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="İtalik"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("formatBlock", "h2");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Başlık 2"
                  >
                    <Heading2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("formatBlock", "h3");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Başlık 3"
                  >
                    <Heading3 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("insertUnorderedList");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Maddeli Liste"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("insertOrderedList");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Numaralı Liste"
                  >
                    <ListOrdered className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("formatBlock", "blockquote");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Alıntı"
                  >
                    <Quote className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleLinkPrompt();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Bağlantı"
                  >
                    <LinkIcon className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      executeCommand("removeFormat");
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Biçimlendirmeyi Temizle"
                  >
                    <Eraser className="h-4 w-4" />
                  </button>
                </div>
                {/* Visual Rich Text Editor Area */}
                <div
                  ref={editorRef}
                  contentEditable={true}
                  onInput={(e) => setContent(e.currentTarget.innerHTML)}
                  className="w-full min-h-[380px] max-h-[600px] overflow-y-auto p-4 font-sans leading-relaxed rounded-b-2xl border border-white/10 bg-black/10 text-white focus:outline-none focus:border-white/20 prose prose-invert max-w-none rich-editor"
                />
              </Field>

              {/* Publish Checkbox */}
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5 text-sm text-neutral-200 w-fit cursor-pointer transition hover:bg-black/35 select-none">
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="rounded border-white/10 bg-black/20 text-white focus:ring-0"
                />
                <div className="flex items-center gap-1.5 font-medium">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  Doğrudan yayına al
                </div>
              </label>

              {/* Submit Buttons */}
              <div className="flex flex-wrap gap-3 pt-3 border-t border-white/5">
                <Button disabled={isPending} type="submit">
                  {isPending ? "Kaydediliyor..." : initialPost?.id ? "Yazıyı Güncelle" : "Yazıyı Yayınla"}
                </Button>
                <Link href="/panel/admin/blog">
                  <Button variant="secondary" disabled={isPending} type="button">
                    İptal Et
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </form>
      ) : (
        /* Preview Tab Layout */
        <div className="rounded-3xl border border-white/10 bg-[linear-gradient(180deg,var(--panel-bg-elevated),var(--panel-bg-base))] p-6 sm:p-8 md:p-10 max-w-4xl mx-auto">
          {/* Article Header */}
          <div className="space-y-4 text-center">
            <span className="inline-block rounded-full bg-white/5 border border-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-300">
              {getCategoryLabel(category)}
            </span>

            <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl md:text-5xl tracking-tight font-heading">
              {title || "Blog Başlığı"}
            </h1>

            {summary && (
              <p className="text-base text-neutral-400 max-w-2xl mx-auto leading-relaxed">
                {summary}
              </p>
            )}

            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-neutral-500">
              <span>{authorName.trim() || "Admin (Önizleme)"}</span>
              <span>•</span>
              <span>{new Date().toLocaleDateString("tr-TR", { dateStyle: "long" })}</span>
            </div>
          </div>

          {/* Article Cover Image */}
          {coverImage ? (
            <div className="mt-8 relative h-72 sm:h-96 w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverImage}
                alt={title}
                className="absolute inset-0 h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </div>
          ) : (
            <div className="mt-8 h-px bg-white/10" />
          )}

          {/* Article Content */}
          <div className="mt-8 sm:mt-10">
            <div 
              className="text-neutral-200 leading-8 text-base font-sans prose prose-invert max-w-none rich-editor"
              dangerouslySetInnerHTML={{ __html: content || "<p>İçerik henüz yazılmadı.</p>" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
