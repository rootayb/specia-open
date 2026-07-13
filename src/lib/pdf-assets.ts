import fs from "node:fs/promises";
import path from "node:path";

import * as fontkitModule from "@pdf-lib/fontkit";
import { PDFDocument, type PDFFont } from "pdf-lib";

type PdfFontkit = Parameters<PDFDocument["registerFontkit"]>[0];

const fontkit =
  ("default" in fontkitModule ? fontkitModule.default : fontkitModule) as unknown as PdfFontkit;

export type PdfFonts = {
  regular: PDFFont;
  bold: PDFFont;
};

type FontBytes = {
  regular: Uint8Array;
  bold: Uint8Array;
};

// Yerel sürüm: webpack dev sunucusunda import.meta.url güvenilir olmadığı için
// varlıklar proje kökündeki public/ klasöründen process.cwd() ile okunur.
const publicDir = path.join(process.cwd(), "public");

const bundledFontPaths = {
  regular: path.join(publicDir, "fonts", "NotoSans-Regular.ttf"),
  bold: path.join(publicDir, "fonts", "NotoSans-Bold.ttf"),
};

const fallbackFontPaths = [
  {
    regular: "C:\\Windows\\Fonts\\arial.ttf",
    bold: "C:\\Windows\\Fonts\\arialbd.ttf",
  },
  {
    regular: "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
    bold: "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
  },
  {
    regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  },
];

const assetPaths = {
  "meb-logo.png": path.join(publicDir, "meb-logo.png"),
  "specia-logo-black.png": path.join(publicDir, "specia-logo-black.png"),
  "specia-logo-white.png": path.join(publicDir, "specia-logo-white.png"),
} as const;

let fontBytesPromise: Promise<FontBytes> | null = null;
const assetBytesPromises = new Map<keyof typeof assetPaths, Promise<Uint8Array>>();

async function readFontBytes() {
  const candidates = [bundledFontPaths, ...fallbackFontPaths];

  for (const candidate of candidates) {
    try {
      const [regular, bold] = await Promise.all([
        fs.readFile(candidate.regular),
        fs.readFile(candidate.bold),
      ]);
      return { regular, bold };
    } catch {
      // Try the next platform-specific pair.
    }
  }

  throw new Error("PDF yazı tipi bulunamadı.");
}

export async function loadPdfFonts(
  pdfDoc: PDFDocument,
  options: { subset?: boolean } = {},
): Promise<PdfFonts> {
  pdfDoc.registerFontkit(fontkit);
  fontBytesPromise ??= readFontBytes();
  const bytes = await fontBytesPromise;
  const subset = options.subset ?? false;

  return {
    regular: await pdfDoc.embedFont(bytes.regular, { subset }),
    bold: await pdfDoc.embedFont(bytes.bold, { subset }),
  };
}

export async function readPdfAsset(
  asset: keyof typeof assetPaths,
): Promise<Uint8Array> {
  const existing = assetBytesPromises.get(asset);
  if (existing) {
    return existing;
  }

  const pending = fs.readFile(assetPaths[asset]);
  assetBytesPromises.set(asset, pending);
  return pending;
}
