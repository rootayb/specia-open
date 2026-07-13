import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDateInput(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export function parseDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") + part.slice(1))
    .join(" ");
}

export function sanitizeHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "").trim();
}
