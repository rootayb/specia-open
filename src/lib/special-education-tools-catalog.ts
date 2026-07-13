export const specialEducationToolCatalog = [
  {
    slug: "support-profile",
    title: "Destek Profili",
    description:
      "Öğrencinin güçlü yanlarını, önceliklerini ve hedef odağını tek ekranda toplayın; özetin PDF çıktısını alın.",
  },
  {
    slug: "reinforcer-pool",
    title: "Pekiştireç Havuzu",
    description:
      "Öğrenciye özel pekiştireçleri kaydedin, düzenleyin ve yazdırılabilir liste olarak çıktı alın.",
  },
  {
    slug: "sensory-menu",
    title: "Duyusal Menü",
    description:
      "Duyusal düzenleme stratejilerini öğrenci bazlı kartlarla yönetin; sınıfa asılabilir PDF üretin.",
  },
  {
    slug: "story-builder",
    title: "Sosyal Öykü",
    description:
      "Sosyal öykü ve görev analizi metinlerini hızlıca oluşturun, öğrenciyle kullanılacak PDF çıktısını alın.",
  },
  {
    slug: "abc-analysis",
    title: "ABC Analizi",
    description:
      "Öncül, davranış ve sonuç örüntülerini kaydedin; özet ve kayıtları PDF olarak belgeleyin.",
  },
] as const;

export type SpecialEducationToolSlug = (typeof specialEducationToolCatalog)[number]["slug"];

export function isSpecialEducationToolSlug(value: string): value is SpecialEducationToolSlug {
  return specialEducationToolCatalog.some((tool) => tool.slug === value);
}

export function getSpecialEducationToolMeta(slug: SpecialEducationToolSlug) {
  return specialEducationToolCatalog.find((tool) => tool.slug === slug)!;
}
