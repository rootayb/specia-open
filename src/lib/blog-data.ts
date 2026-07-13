import type { Prisma } from "@/lib/prisma-shim";

import { prisma } from "@/lib/prisma";

// Kategori sabitleri Prisma'sız ayrı modülde tutulur; buradan yeniden ihraç
// edilir ki mevcut sunucu tarafı importları ("@/lib/blog-data") bozulmasın.
import {
  BLOG_CATEGORIES,
  getCategoryLabel,
  type BlogCategoryValue,
} from "@/lib/blog-categories";

export { BLOG_CATEGORIES, getCategoryLabel, type BlogCategoryValue };

export async function getBlogPosts() {
  return prisma.blogPost.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
}

export async function getPublishedBlogPosts(category?: string, limit = 20, skip = 0) {
  const where: Prisma.BlogPostWhereInput = { published: true };
  if (category && BLOG_CATEGORIES.some((c) => c.value === category)) {
    where.category = category;
  }

  return prisma.blogPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    skip,
    include: {
      author: {
        select: {
          id: true,
          name: true,
          // M11: Email field removed to prevent PII exposure
        },
      },
    },
  });
}

export async function getBlogPostBySlug(slug: string) {
  return prisma.blogPost.findFirst({
    where: { slug, published: true },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          // M11: Email field removed to prevent PII exposure
        },
      },
    },
  });
}

export async function getBlogPostById(id: string) {
  return prisma.blogPost.findUnique({
    where: { id },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          // M11: Email field removed to prevent PII exposure
        },
      },
    },
  });
}
