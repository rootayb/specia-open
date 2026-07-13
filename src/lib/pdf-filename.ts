function buildSafeFilenameBase(value: string, fallback = "document") {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return normalized || fallback;
}

export function buildSafePdfFilename(value: string, fallback = "document") {
  return `${buildSafeFilenameBase(value, fallback)}.pdf`;
}


