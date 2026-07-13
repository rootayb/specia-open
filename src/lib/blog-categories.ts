// Blog kategorileri ve etiket yardımcıları. Bu modül bilerek Prisma/sunucu
// bağımlılığı içermez; böylece "use client" bileşenleri de güvenle import
// edebilir (aksi halde PrismaClient tarayıcıya bundle edilir ve sayfa çöker).

export const BLOG_CATEGORIES = [
  { value: "genel", label: "Genel" },
  { value: "özel-eğitim", label: "Özel Eğitim" },
  { value: "rehberlik-psikoloji", label: "Rehberlik & Psikoloji" },
  { value: "bep-yonetmelik", label: "BEP & Yönetmelik" },
  { value: "teknoloji-inovasyon", label: "Teknoloji & İnovasyon" },
  { value: "duyurular-guncellemeler", label: "Duyurular & Güncellemeler" },
] as const;

export type BlogCategoryValue = (typeof BLOG_CATEGORIES)[number]["value"];

export function getCategoryLabel(value?: string | null): string {
  if (!value) return "Genel";
  const category = BLOG_CATEGORIES.find((item) => item.value === value);
  return category ? category.label : "Genel";
}
