const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "txt",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
]);

const BLOCKED_EXTENSIONS = new Set([
  "7z",
  "apk",
  "app",
  "asp",
  "aspx",
  "bat",
  "bin",
  "cmd",
  "com",
  "dll",
  "dmg",
  "exe",
  "hta",
  "html",
  "jar",
  "js",
  "jsp",
  "lnk",
  "mjs",
  "msi",
  "php",
  "ps1",
  "rar",
  "scr",
  "sh",
  "svg",
  "vbs",
  "wsf",
  "zip",
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  txt: "text/plain",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};

const MIME_ALIASES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  png: ["image/png"],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  webp: ["image/webp"],
  gif: ["image/gif"],
  txt: ["text/plain"],
  doc: ["application/msword", "application/octet-stream"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream",
  ],
  xls: ["application/vnd.ms-excel", "application/octet-stream"],
  xlsx: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip",
    "application/octet-stream",
  ],
  ppt: ["application/vnd.ms-powerpoint", "application/octet-stream"],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/zip",
    "application/octet-stream",
  ],
};

type UploadedDocumentValidationInput = {
  buffer: Buffer;
  fileName?: string | null;
  mimeType?: string | null;
  maxSizeBytes?: number;
};

type UploadedDocumentValidationResult =
  | {
      allowed: true;
      safeFileName: string;
      extension: string;
      mimeType: string;
    }
  | {
      allowed: false;
      message: string;
    };

function normalizeFileName(value?: string | null) {
  const trimmed = value?.trim() || "belge";
  return trimmed.replace(/[^\p{L}\p{N}._ -]+/gu, "-").replace(/\s+/g, " ").slice(0, 140);
}

function getExtension(fileName: string) {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1) || "" : "";
}

function hasSignature(buffer: Buffer, bytes: number[]) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function isOfficeBinary(buffer: Buffer) {
  return hasSignature(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
}

function isZipBasedOffice(buffer: Buffer) {
  return hasSignature(buffer, [0x50, 0x4b, 0x03, 0x04]);
}

function isProbablyText(buffer: Buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  return !sample.includes(0);
}

function hasExpectedMagic(buffer: Buffer, extension: string) {
  switch (extension) {
    case "pdf":
      return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
    case "png":
      return hasSignature(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "jpg":
    case "jpeg":
      return hasSignature(buffer, [0xff, 0xd8, 0xff]);
    case "gif":
      return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
    case "webp":
      return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "txt":
      return isProbablyText(buffer);
    case "doc":
    case "xls":
    case "ppt":
      return isOfficeBinary(buffer);
    case "docx":
    case "xlsx":
    case "pptx":
      return isZipBasedOffice(buffer);
    default:
      return false;
  }
}

function hasSuspiciousContent(buffer: Buffer, extension: string) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 1024 * 512)).toString("latin1").toLowerCase();

  if (extension === "pdf") {
    return ["/javascript", "/js", "/launch", "/embeddedfile", "/xfa"].some((marker) =>
      sample.includes(marker),
    );
  }

  if (["docx", "xlsx", "pptx"].includes(extension)) {
    return ["vbaproject.bin", "activex", ".exe", ".js", ".vbs"].some((marker) =>
      sample.includes(marker),
    );
  }

  if (extension === "txt") {
    return ["<script", "<?php", "powershell", "cmd.exe", "wscript.shell"].some((marker) =>
      sample.includes(marker),
    );
  }

  return false;
}

export function validateUploadedDocumentFile(
  input: UploadedDocumentValidationInput,
): UploadedDocumentValidationResult {
  const maxSizeBytes = input.maxSizeBytes ?? MAX_DOCUMENT_UPLOAD_SIZE_BYTES;
  if (!input.buffer.byteLength) {
    return { allowed: false, message: "Boş dosya yüklenemez." };
  }

  if (input.buffer.byteLength > maxSizeBytes) {
    return { allowed: false, message: "Dosya boyutu 10 MB sınırını aşıyor." };
  }

  const safeFileName = normalizeFileName(input.fileName);
  const extension = getExtension(safeFileName);
  if (!extension || BLOCKED_EXTENSIONS.has(extension) || !ALLOWED_EXTENSIONS.has(extension)) {
    return {
      allowed: false,
      message: "Bu dosya türü güvenlik nedeniyle yüklenemez.",
    };
  }

  const providedMime = input.mimeType?.trim().toLowerCase() || "";
  const allowedMimes = MIME_ALIASES[extension] ?? [];
  if (providedMime && allowedMimes.length > 0 && !allowedMimes.includes(providedMime)) {
    return {
      allowed: false,
      message: "Dosya türü ile dosya içeriği uyumlu görünmüyor.",
    };
  }

  if (!hasExpectedMagic(input.buffer, extension)) {
    return {
      allowed: false,
      message: "Dosya içeriği beklenen formatla eşleşmiyor.",
    };
  }

  if (hasSuspiciousContent(input.buffer, extension)) {
    return {
      allowed: false,
      message: "Dosya güvenlik kontrolünden geçemedi.",
    };
  }

  return {
    allowed: true,
    safeFileName,
    extension,
    mimeType: EXTENSION_TO_MIME[extension] ?? "application/octet-stream",
  };
}
