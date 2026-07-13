import { PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import {
  Document,
  Packer,
  Table,
  TableRow,
  TableCell,
  Paragraph,
  TextRun,
  BorderStyle,
  WidthType,
  AlignmentType,
  PageOrientation,
} from "docx";
import { loadPdfFonts as loadFonts, type PdfFonts as Fonts } from "@/lib/pdf-assets";
import { restoreTurkishText } from "@/lib/turkish";
import {
  computeSkillSummary,
  formatSkillSessionDate,
  parseSkillAnalysisData,
  SKILL_MARK_LABELS,
} from "@/lib/skill-analysis";

type ObtLesson = {
  tarih?: string | null;
  b?: boolean;
  i?: boolean;
  m?: boolean;
  f?: boolean;
};

type ObtRow = {
  bildirim?: string | null;
  olcut?: string | null;
  yonerge?: string | null;
  bd1?: string | null;
  bd2?: string | null;
  bd3?: string | null;
  dersler?: ObtLesson[];
  isHeader?: boolean;
};

type ObtExportDocument = {
  title?: string | null;
  type?: string | null;
  kazanim?: string | null;
  evaluationType?: string | null;
  evaluationDate?: string | Date | null;
  evaluatorName?: string | null;
  data?: unknown;
  student: {
    firstName?: string | null;
    lastName?: string | null;
  };
  owner?: {
    name: string;
    branch?: string | null;
  } | null;
};

// A4 Landscape
const PAGE = { width: 841.92, height: 595.44 };
const MARGIN_X = 20;
const TABLE_WIDTH = PAGE.width - MARGIN_X * 2; // ~801.92 pt
const BORDER = rgb(0.3, 0.3, 0.3);
const TEXT = rgb(0.05, 0.05, 0.05);
const BEP_TABLE_BORDER = rgb(0.48, 0.60, 0.68);
const BEP_TABLE_HEADER_BG = rgb(0.16, 0.38, 0.45);
const BEP_TABLE_HEADER_TEXT = rgb(1, 1, 1);

// A4 Portrait for Checklist
const PORTRAIT_PAGE = { width: 595.28, height: 841.89 };
const PORTRAIT_MARGIN_X = 30;
const PORTRAIT_TABLE_WIDTH = PORTRAIT_PAGE.width - PORTRAIT_MARGIN_X * 2; // ~535.28 pt

// Checklist columns
const COL_EVET_WIDTH = 50;
const COL_HAYIR_WIDTH = 50;
const COL_ACIKLAMA_WIDTH = 140;
const COL_OLCUT_WIDTH = PORTRAIT_TABLE_WIDTH - COL_EVET_WIDTH - COL_HAYIR_WIDTH - COL_ACIKLAMA_WIDTH;

const PORTRAIT_DOCX_PRINT_WIDTH = 11906 - 720 * 2; // 10466 dxa

// ─── PDF column width calculator ─────────────────────────────────────────────
// Guarantees all columns sum to exactly TABLE_WIDTH
function calculatePdfColumnWidths(L: number) {
  const olcut = 24;
  const bd = 20;

  // Scale subcol based on lesson count so everything fits
  let subcol: number;
  if (L <= 2) subcol = 28;
  else if (L === 3) subcol = 25;
  else if (L === 4) subcol = 23;
  else if (L === 5) subcol = 21;
  else if (L === 6) subcol = 18;
  else if (L === 7) subcol = 16;
  else if (L === 8) subcol = 14;
  else if (L === 9) subcol = 13;
  else subcol = 11.5;

  const fixedWidth = olcut + bd * 3 + L * 4 * subcol;
  const remaining = TABLE_WIDTH - fixedWidth;

  // Split remaining between bildirim (56%) and yonerge (44%)
  const bildirim = Math.floor(remaining * 0.56 * 100) / 100;
  const yonerge = remaining - bildirim; // absorbs rounding remainder

  return { bildirim, olcut, yonerge, bd, subcol };
}

// ─── DOCX column width calculator ────────────────────────────────────────────
// Page: 16838 dxa, margins: 720 each side → print area = 15398 dxa
const DOCX_PRINT_WIDTH = 16838 - 720 * 2; // 15398 dxa

function calculateDocxColumnWidths(L: number): number[] {
  const olcut = 500;
  const bd = 420;

  let subcol: number;
  if (L <= 2) subcol = 560;
  else if (L === 3) subcol = 500;
  else if (L === 4) subcol = 460;
  else if (L === 5) subcol = 420;
  else if (L === 6) subcol = 370;
  else if (L === 7) subcol = 330;
  else if (L === 8) subcol = 290;
  else if (L === 9) subcol = 260;
  else subcol = 240;

  const fixedWidth = olcut + bd * 3 + L * 4 * subcol;
  const remaining = DOCX_PRINT_WIDTH - fixedWidth;

  const bildirim = Math.floor(remaining * 0.56);
  const yonerge = remaining - bildirim; // absorbs remainder

  const widths: number[] = [bildirim, olcut, yonerge, bd, bd, bd];
  for (let i = 0; i < L * 4; i++) {
    widths.push(subcol);
  }
  return widths;
}

// ─── Text helpers ────────────────────────────────────────────────────────────

function sanitize(value?: string | null) {
  return restoreTurkishText(value?.trim() || "");
}

function turkishUpper(value?: string | null) {
  return sanitize(value).toLocaleUpperCase("tr-TR");
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const normalized = restoreTurkishText(text).replace(/\s+/g, " ").trim();
  if (!normalized) return [""];

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = words[0] ?? "";

  for (const word of words.slice(1)) {
    const next = `${current} ${word}`;
    if (font.widthOfTextAtSize(next, fontSize) <= maxWidth) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
  }
  lines.push(current);
  return lines;
}

function measureHeight(text: string, font: PDFFont, fontSize: number, width: number, lineHeight: number) {
  return wrapText(text, font, fontSize, width).length * lineHeight;
}

// ─── PDF cell drawing ────────────────────────────────────────────────────────

function drawCell(
  page: PDFPage,
  fonts: Fonts,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  options?: {
    fill?: ReturnType<typeof rgb>;
    color?: ReturnType<typeof rgb>;
    borderColor?: ReturnType<typeof rgb>;
    borderWidth?: number;
    font?: PDFFont;
    fontSize?: number;
    center?: boolean;
    valign?: "center" | "top";
  },
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: options?.borderColor ?? BORDER,
    borderWidth: options?.borderWidth ?? 0.5,
    color: options?.fill,
  });

  const font = options?.font ?? fonts.regular;
  const fontSize = options?.fontSize ?? 8;
  const pad = Math.min(3, width * 0.08); // dynamic padding based on cell width
  const lines = wrapText(text, font, fontSize, width - pad * 2);
  const lineH = fontSize + 2;
  const totalHeight = lines.length * lineH;
  const valign = options?.valign ?? "center";

  let currentY =
    valign === "center"
      ? y + height - (height - totalHeight) / 2 - fontSize
      : y + height - pad - fontSize;

  lines.forEach((line) => {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
    page.drawText(line, {
      x: options?.center ? x + (width - lineWidth) / 2 : x + pad,
      y: currentY,
      size: fontSize,
      font,
      color: options?.color ?? TEXT,
    });
    currentY -= lineH;
  });
}

function drawInlineRuns(
  page: PDFPage,
  runs: Array<{ text: string; font: PDFFont }>,
  options: {
    x: number;
    y: number;
    size: number;
    color?: ReturnType<typeof rgb>;
  },
) {
  let currentX = options.x;

  runs.forEach((run) => {
    page.drawText(run.text, {
      x: currentX,
      y: options.y,
      size: options.size,
      font: run.font,
      color: options.color ?? TEXT,
    });
    currentX += run.font.widthOfTextAtSize(run.text, options.size);
  });

  return currentX - options.x;
}

function drawCenteredTitle(
  page: PDFPage,
  font: PDFFont,
  text: string,
  options: {
    pageWidth: number;
    marginX: number;
    y: number;
    preferredSize?: number;
    minSize?: number;
  },
) {
  const preferredSize = options.preferredSize ?? 12;
  const minSize = options.minSize ?? 6.5;
  const maxWidth = options.pageWidth - options.marginX * 2;

  for (let size = preferredSize; size >= minSize; size -= 0.5) {
    const lines = wrapText(text, font, size, maxWidth);
    if (lines.length > 2) {
      continue;
    }

    const lineHeight = size + 2;
    const firstLineY = options.y + ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, index) => {
      const lineWidth = font.widthOfTextAtSize(line, size);
      page.drawText(line, {
        x: (options.pageWidth - lineWidth) / 2,
        y: firstLineY - index * lineHeight,
        size,
        font,
        color: TEXT,
      });
    });
    return;
  }

  const fallbackSize = minSize;
  const lines = wrapText(text, font, fallbackSize, maxWidth);
  const lineHeight = fallbackSize + 2;
  const firstLineY = options.y + ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, fallbackSize);
    page.drawText(line, {
      x: (options.pageWidth - lineWidth) / 2,
      y: firstLineY - index * lineHeight,
      size: fallbackSize,
      font,
      color: TEXT,
    });
  });
}

// ─── Adaptive font sizes based on column width ──────────────────────────────

function headerFontSize(subcol: number): number {
  if (subcol < 13) return 5.5;
  if (subcol < 16) return 6;
  return 7;
}

function lessonTitleFontSize(subcol: number): number {
  if (subcol < 13) return 5.5;
  if (subcol < 16) return 6;
  return 7.5;
}

function lessonDateFontSize(subcol: number): number {
  if (subcol < 13) return 5;
  if (subcol < 16) return 5.5;
  return 6.5;
}

function dataFontSize(subcol: number): number {
  if (subcol < 13) return 6;
  if (subcol < 16) return 6.5;
  return 7.5;
}

// ─── Extract lesson dates from doc data ─────────────────────────────────────

function extractLessonDates(rows: ObtRow[], L: number): string[] {
  return Array.from({ length: L }, (_, i) => {
    const rowWithDate = rows.find((r) => r.dersler?.[i]?.tarih);
    const rawDate = rowWithDate?.dersler?.[i]?.tarih;
    if (!rawDate) return "Tarih";
    try {
      const parts = rawDate.split("-");
      if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]?.slice(-2)}`;
    } catch {}
    return "Tarih";
  });
}

// ─── PDF header drawing ─────────────────────────────────────────────────────

type ColWidths = ReturnType<typeof calculatePdfColumnWidths>;

function drawPdfHeader(
  page: PDFPage,
  fonts: Fonts,
  doc: ObtExportDocument,
  cw: ColWidths,
  L: number,
) {
  // Title
  const title = turkishUpper(doc.title);
  drawCenteredTitle(page, fonts.bold, title, {
    pageWidth: PAGE.width,
    marginX: MARGIN_X,
    y: PAGE.height - 40,
    preferredSize: 12,
  });

  // Metadata
  const metaY = PAGE.height - 85;
  page.drawText(`Öğrencinin Adı: ${sanitize(doc.student.firstName)} ${sanitize(doc.student.lastName)}`, {
    x: MARGIN_X, y: metaY, size: 9, font: fonts.bold, color: TEXT,
  });
  const evaluatorName = doc.evaluatorName?.trim()
    ? sanitize(doc.evaluatorName)
    : doc.owner?.name
      ? `${sanitize(doc.owner.name)}${doc.owner.branch ? ` (${sanitize(doc.owner.branch)})` : ""}`
      : "-";
  drawInlineRuns(
    page,
    [
      { text: "Değerlendirmeyi Yapan: ", font: fonts.bold },
      { text: evaluatorName, font: fonts.regular },
    ],
    {
      x: MARGIN_X,
      y: metaY - 12,
      size: 8,
      color: TEXT,
    },
  );
  if (doc.kazanim) {
    page.drawText(`Kazanım: ${sanitize(doc.kazanim)}`, {
      x: MARGIN_X, y: metaY - 24, size: 8, font: fonts.regular, color: TEXT,
    });
  }
  const formattedDate = doc.evaluationDate
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(doc.evaluationDate))
    : "";
  const dateLabel = "Tarih: ";
  const dateWidth =
    fonts.bold.widthOfTextAtSize(dateLabel, 9) +
    fonts.regular.widthOfTextAtSize(formattedDate, 9);
  drawInlineRuns(
    page,
    [
      { text: dateLabel, font: fonts.bold },
      { text: formattedDate, font: fonts.regular },
    ],
    {
      x: PAGE.width - MARGIN_X - dateWidth,
      y: metaY,
      size: 9,
      color: TEXT,
    },
  );

  const evaluationTypeLabel = "Değerlendirme Türü: ";
  const evaluationType = sanitize(doc.evaluationType);
  const evaluationTypeWidth =
    fonts.bold.widthOfTextAtSize(evaluationTypeLabel, 8) +
    fonts.regular.widthOfTextAtSize(evaluationType, 8);
  drawInlineRuns(
    page,
    [
      { text: evaluationTypeLabel, font: fonts.bold },
      { text: evaluationType, font: fonts.regular },
    ],
    {
      x: PAGE.width - MARGIN_X - evaluationTypeWidth,
      y: metaY - 12,
      size: 8,
      color: TEXT,
    },
  );

  // Table header geometry
  const tableTop = PAGE.height - 125;
  const headerH = 52; // total header height
  const topRowH = 13; // "Öğretim Öncesi/Sürecini" row
  const lessonRowH = 13; // "1. Ders" row
  const dateRowH = 12; // date row
  const subRowH = headerH - topRowH - lessonRowH - dateRowH; // B İ M F row

  let x = MARGIN_X;

  // Fixed columns spanning full header height
  drawCell(page, fonts, x, tableTop - headerH, cw.bildirim, headerH, "Bildirimler", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 7.5,
  });
  x += cw.bildirim;

  drawCell(page, fonts, x, tableTop - headerH, cw.olcut, headerH, "Ölçüt", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 7,
  });
  x += cw.olcut;

  drawCell(page, fonts, x, tableTop - headerH, cw.yonerge, headerH, "Sorular/\nYönergeler", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 7,
  });
  x += cw.yonerge;

  // BD section
  const bdW = cw.bd * 3;
  drawCell(page, fonts, x, tableTop - topRowH, bdW, topRowH, "Öğretim Öncesi Değ.", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 5.2,
  });
  for (let i = 0; i < 3; i++) {
    drawCell(page, fonts, x + i * cw.bd, tableTop - headerH, cw.bd, headerH - topRowH, `BD${i + 1}\n(+-)`, {
      fill: BEP_TABLE_HEADER_BG,
      color: BEP_TABLE_HEADER_TEXT,
      borderColor: BEP_TABLE_BORDER,
      borderWidth: 1,
      font: fonts.bold,
      center: true,
      fontSize: 6.5,
    });
  }
  x += bdW;

  // Lesson section
  const processW = L * 4 * cw.subcol;
  drawCell(page, fonts, x, tableTop - topRowH, processW, topRowH, "Öğretim Sürecini Değerlendirme", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 7,
  });

  const rows = Array.isArray(doc.data) ? (doc.data as ObtRow[]) : [];
  const lessonDates = extractLessonDates(rows, L);

  for (let l = 0; l < L; l++) {
    const lx = x + l * cw.subcol * 4;
    const lessonW = cw.subcol * 4;

    // Lesson title
    drawCell(page, fonts, lx, tableTop - topRowH - lessonRowH, lessonW, lessonRowH, `${l + 1}.Ders`, {
      fill: BEP_TABLE_HEADER_BG,
      color: BEP_TABLE_HEADER_TEXT,
      borderColor: BEP_TABLE_BORDER,
      borderWidth: 1,
      font: fonts.bold,
      center: true,
      fontSize: lessonTitleFontSize(cw.subcol),
    });

    // Lesson date
    drawCell(page, fonts, lx, tableTop - topRowH - lessonRowH - dateRowH, lessonW, dateRowH, lessonDates[l] || "Tarih", {
      fill: BEP_TABLE_HEADER_BG,
      color: BEP_TABLE_HEADER_TEXT,
      borderColor: BEP_TABLE_BORDER,
      borderWidth: 1,
      font: fonts.bold,
      center: true,
      fontSize: lessonDateFontSize(cw.subcol),
    });

    // B İ M F sub-headers
    const subLabels = ["B", "İ", "M", "F"];
    for (let s = 0; s < 4; s++) {
      drawCell(page, fonts, lx + s * cw.subcol, tableTop - headerH, cw.subcol, subRowH, subLabels[s]!, {
        fill: BEP_TABLE_HEADER_BG,
        color: BEP_TABLE_HEADER_TEXT,
        borderColor: BEP_TABLE_BORDER,
        borderWidth: 1,
        font: fonts.bold,
        center: true,
        fontSize: headerFontSize(cw.subcol),
      });
    }
  }

  return tableTop - headerH;
}

function drawPdfFooter(page: PDFPage, fonts: Fonts) {
  page.drawText(
    "Kısaltmalar: B= Bağımsız,  İ= İşaret İpucu,  M= Model Olma,  F= Fiziksel Yardım,  BD= Başlama Düzeyi",
    { x: MARGIN_X, y: 20, size: 7, font: fonts.regular, color: rgb(0.4, 0.4, 0.4) },
  );
}

// ─── PDF generation ─────────────────────────────────────────────────────────

type ChecklistRow = {
  id: string;
  olcut: string;
  evet: boolean;
  hayir: boolean;
  aciklama: string;
  isHeader?: boolean;
};

function parseChecklistRows(data: unknown): ChecklistRow[] {
  if (!Array.isArray(data)) return [];
  return data.map((value, idx) => {
    const row = value && typeof value === "object" ? (value as Partial<ChecklistRow>) : {};
    return {
      id: typeof row.id === "string" && row.id ? row.id : `row-${idx}`,
      olcut: typeof row.olcut === "string" ? row.olcut : "",
      evet: Boolean(row.evet),
      hayir: Boolean(row.hayir),
      aciklama: typeof row.aciklama === "string" ? row.aciklama : "",
      isHeader: Boolean(row.isHeader),
    };
  });
}

function drawChecklistPdfHeader(
  page: PDFPage,
  fonts: Fonts,
  doc: ObtExportDocument,
) {
  // Title
  const title = turkishUpper(doc.title);
  drawCenteredTitle(page, fonts.bold, title, {
    pageWidth: PORTRAIT_PAGE.width,
    marginX: PORTRAIT_MARGIN_X,
    y: PORTRAIT_PAGE.height - 40,
    preferredSize: 12,
  });

  // Date aligned opposite the student name, away from long titles.
  const formattedDate = doc.evaluationDate
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(doc.evaluationDate))
    : "";
  const dateLabel = "Tarih: ";
  const dateWidth =
    fonts.bold.widthOfTextAtSize(dateLabel, 9) +
    fonts.regular.widthOfTextAtSize(formattedDate, 9);
  drawInlineRuns(
    page,
    [
      { text: dateLabel, font: fonts.bold },
      { text: formattedDate, font: fonts.regular },
    ],
    {
      x: PORTRAIT_PAGE.width - PORTRAIT_MARGIN_X - dateWidth,
      y: PORTRAIT_PAGE.height - 68,
      size: 9,
      color: TEXT,
    },
  );

  const evaluationTypeLabel = "Değerlendirme Türü: ";
  const evaluationType = sanitize(doc.evaluationType || "Kontrol Listesi");
  const evaluationTypeWidth =
    fonts.bold.widthOfTextAtSize(evaluationTypeLabel, 8.5) +
    fonts.regular.widthOfTextAtSize(evaluationType, 8.5);
  drawInlineRuns(
    page,
    [
      { text: evaluationTypeLabel, font: fonts.bold },
      { text: evaluationType, font: fonts.regular },
    ],
    {
      x: PORTRAIT_PAGE.width - PORTRAIT_MARGIN_X - evaluationTypeWidth,
      y: PORTRAIT_PAGE.height - 80,
      size: 8.5,
      color: TEXT,
    },
  );

  // Student Name on the left below title (or next line)
  const studentName = `${sanitize(doc.student.firstName)} ${sanitize(doc.student.lastName)}`.trim();
  drawInlineRuns(
    page,
    [
      { text: "Öğrencinin Adı Soyadı: ", font: fonts.bold },
      { text: studentName, font: fonts.regular },
    ],
    {
      x: PORTRAIT_MARGIN_X,
      y: PORTRAIT_PAGE.height - 68,
      size: 9.5,
      color: TEXT,
    },
  );

  // Evaluator Name (Değerlendirmeyi Yapan)
  const evaluatorName = doc.evaluatorName?.trim()
    ? sanitize(doc.evaluatorName)
    : doc.owner?.name
      ? `${sanitize(doc.owner.name)}${doc.owner.branch ? ` (${sanitize(doc.owner.branch)})` : ""}`
      : "-";
  drawInlineRuns(
    page,
    [
      { text: "Değerlendirmeyi Yapan: ", font: fonts.bold },
      { text: evaluatorName, font: fonts.regular },
    ],
    {
      x: PORTRAIT_MARGIN_X,
      y: PORTRAIT_PAGE.height - 80,
      size: 8.5,
      color: TEXT,
    },
  );

  // Kazanım (Aim) if present
  if (doc.kazanim) {
    const kazanimStr = `Kazanım: ${sanitize(doc.kazanim)}`;
    page.drawText(kazanimStr, {
      x: PORTRAIT_MARGIN_X,
      y: PORTRAIT_PAGE.height - 92,
      size: 8.5,
      font: fonts.regular,
      color: TEXT,
    });
  }

  // Draw Table Header Row
  const tableTop = PORTRAIT_PAGE.height - 115;
  const headerH = 24;

  let x = PORTRAIT_MARGIN_X;
  drawCell(page, fonts, x, tableTop - headerH, COL_OLCUT_WIDTH, headerH, "Ölçütler", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 9,
  });
  x += COL_OLCUT_WIDTH;

  drawCell(page, fonts, x, tableTop - headerH, COL_EVET_WIDTH, headerH, "Evet", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 9,
  });
  x += COL_EVET_WIDTH;

  drawCell(page, fonts, x, tableTop - headerH, COL_HAYIR_WIDTH, headerH, "Hayır", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 9,
  });
  x += COL_HAYIR_WIDTH;

  drawCell(page, fonts, x, tableTop - headerH, COL_ACIKLAMA_WIDTH, headerH, "Açıklama", {
    fill: BEP_TABLE_HEADER_BG,
    color: BEP_TABLE_HEADER_TEXT,
    borderColor: BEP_TABLE_BORDER,
    borderWidth: 1,
    font: fonts.bold,
    center: true,
    fontSize: 9,
  });

  return tableTop - headerH;
}

export async function generateChecklistPdf(doc: ObtExportDocument) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const rows = parseChecklistRows(doc.data);

  let page = pdfDoc.addPage([PORTRAIT_PAGE.width, PORTRAIT_PAGE.height]);
  let cursorY = drawChecklistPdfHeader(page, fonts, doc);

  const ensureSpace = (height: number) => {
    if (cursorY - height < 40) {
      page = pdfDoc.addPage([PORTRAIT_PAGE.width, PORTRAIT_PAGE.height]);
      cursorY = drawChecklistPdfHeader(page, fonts, doc);
    }
  };

  const bodyFontSize = 9;

  rows.forEach((row) => {
    if (row.isHeader) {
      const text = sanitize(row.olcut);
      const textHeight = measureHeight(text, fonts.bold, bodyFontSize, PORTRAIT_TABLE_WIDTH - 10, 12);
      const rowHeight = Math.ceil(textHeight + 10);
      ensureSpace(rowHeight);
      drawCell(page, fonts, PORTRAIT_MARGIN_X, cursorY - rowHeight, PORTRAIT_TABLE_WIDTH, rowHeight, text, {
        fontSize: bodyFontSize,
        valign: "center",
        font: fonts.bold,
        fill: rgb(0.9, 0.9, 0.9),
      });
      cursorY -= rowHeight;
      return;
    }

    const olcut = sanitize(row.olcut);
    const aciklama = sanitize(row.aciklama);
    // Measure text height for both olcut and aciklama columns
    const olcutHeight = measureHeight(olcut, fonts.regular, bodyFontSize, COL_OLCUT_WIDTH - 10, 12);
    const aciklamaHeight = measureHeight(aciklama, fonts.regular, bodyFontSize, COL_ACIKLAMA_WIDTH - 10, 12);
    const rowHeight = Math.ceil(Math.max(olcutHeight + 10, aciklamaHeight + 10, 24));

    ensureSpace(rowHeight);

    let x = PORTRAIT_MARGIN_X;

    // Ölçütler column
    drawCell(page, fonts, x, cursorY - rowHeight, COL_OLCUT_WIDTH, rowHeight, olcut, {
      borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: bodyFontSize, valign: "center",
    });
    x += COL_OLCUT_WIDTH;

    // Evet column
    drawCell(page, fonts, x, cursorY - rowHeight, COL_EVET_WIDTH, rowHeight, row.evet ? "+" : "", {
      borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: bodyFontSize + 2, center: true, font: fonts.bold,
    });
    x += COL_EVET_WIDTH;

    // Hayır column
    drawCell(page, fonts, x, cursorY - rowHeight, COL_HAYIR_WIDTH, rowHeight, row.hayir ? "+" : "", {
      borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: bodyFontSize + 2, center: true, font: fonts.bold,
    });
    x += COL_HAYIR_WIDTH;

    // Açıklama column
    drawCell(page, fonts, x, cursorY - rowHeight, COL_ACIKLAMA_WIDTH, rowHeight, aciklama, {
      borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: bodyFontSize, valign: "center",
    });

    cursorY -= rowHeight;
  });

  return pdfDoc.save();
}

// ─── Beceri Analizi (task analysis) PDF ──────────────────────────────────────

function resolveSkillObserver(doc: ObtExportDocument, observer: string) {
  if (observer.trim()) {
    return sanitize(observer);
  }
  if (doc.evaluatorName?.trim()) {
    return sanitize(doc.evaluatorName);
  }
  return doc.owner?.name
    ? `${sanitize(doc.owner.name)}${doc.owner.branch ? ` (${sanitize(doc.owner.branch)})` : ""}`
    : "-";
}

export async function generateSkillAnalysisPdf(doc: ObtExportDocument) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const parsed = parseSkillAnalysisData(doc.data);
  const summary = computeSkillSummary(parsed);
  const summaryMap = new Map(summary.map((item) => [item.sessionId, item]));

  const sessions = parsed.sessions;
  const sessionCount = Math.max(sessions.length, 1);
  // Beceri basamağı sütunu, oturum sayısına göre uyarlanır; oturum sütunları kalanı paylaşır.
  const stepCol = Math.min(300, Math.max(170, TABLE_WIDTH - sessionCount * 70));
  const sessionW = (TABLE_WIDTH - stepCol) / sessionCount;

  const headerFontSize = 7;
  const bodyFontSize = 8.5;
  const observer = resolveSkillObserver(doc, parsed.observer);
  const studentName = `${sanitize(doc.student.firstName)} ${sanitize(doc.student.lastName)}`.trim();
  const rightX = MARGIN_X + TABLE_WIDTH * 0.55;

  const drawHeader = (page: PDFPage) => {
    drawCenteredTitle(page, fonts.bold, turkishUpper(doc.title || "Beceri Analizi Veri Kayıt Formu"), {
      pageWidth: PAGE.width,
      marginX: MARGIN_X,
      y: PAGE.height - 32,
      preferredSize: 13,
    });

    drawInlineRuns(
      page,
      [{ text: "Öğrencinin Adı Soyadı: ", font: fonts.bold }, { text: studentName || "-", font: fonts.regular }],
      { x: MARGIN_X, y: PAGE.height - 56, size: 9 },
    );
    drawInlineRuns(
      page,
      [{ text: "Gözlemcinin Adı Soyadı: ", font: fonts.bold }, { text: observer, font: fonts.regular }],
      { x: rightX, y: PAGE.height - 56, size: 9 },
    );
    drawInlineRuns(
      page,
      [{ text: "Hedef Uyaran: ", font: fonts.bold }, { text: sanitize(parsed.targetSkill) || "-", font: fonts.regular }],
      { x: MARGIN_X, y: PAGE.height - 70, size: 9 },
    );
    drawInlineRuns(
      page,
      [{ text: "Evre: ", font: fonts.bold }, { text: sanitize(parsed.phase) || "-", font: fonts.regular }],
      { x: rightX, y: PAGE.height - 70, size: 9 },
    );

    const tableTop = PAGE.height - 84;

    const headerH = 30;
    let x = MARGIN_X;
    drawCell(page, fonts, x, tableTop - headerH, stepCol, headerH, "Beceri Basamakları", {
      fill: BEP_TABLE_HEADER_BG,
      color: BEP_TABLE_HEADER_TEXT,
      borderColor: BEP_TABLE_BORDER,
      borderWidth: 1,
      font: fonts.bold,
      center: true,
      fontSize: 8.5,
    });
    x += stepCol;
    sessions.forEach((session) => {
      drawCell(page, fonts, x, tableTop - headerH, sessionW, headerH, formatSkillSessionDate(session.date), {
        fill: BEP_TABLE_HEADER_BG,
        color: BEP_TABLE_HEADER_TEXT,
        borderColor: BEP_TABLE_BORDER,
        borderWidth: 1,
        font: fonts.bold,
        center: true,
        fontSize: headerFontSize,
      });
      x += sessionW;
    });

    return tableTop - headerH;
  };

  let page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  let cursorY = drawHeader(page);

  const ensureSpace = (height: number) => {
    if (cursorY - height < 40) {
      page = pdfDoc.addPage([PAGE.width, PAGE.height]);
      cursorY = drawHeader(page);
    }
  };

  parsed.steps.forEach((step, index) => {
    const text = `${index + 1}. ${sanitize(step.text)}`;
    const textHeight = measureHeight(text, fonts.regular, bodyFontSize, stepCol - 8, 11);
    const rowHeight = Math.ceil(Math.max(textHeight + 8, 20));
    ensureSpace(rowHeight);

    let x = MARGIN_X;
    drawCell(page, fonts, x, cursorY - rowHeight, stepCol, rowHeight, text, {
      borderColor: BEP_TABLE_BORDER,
      borderWidth: 1,
      fontSize: bodyFontSize,
      valign: "center",
    });
    x += stepCol;

    sessions.forEach((session) => {
      const mark = parsed.marks[step.id]?.[session.id] ?? "";
      drawCell(page, fonts, x, cursorY - rowHeight, sessionW, rowHeight, SKILL_MARK_LABELS[mark], {
        borderColor: BEP_TABLE_BORDER,
        borderWidth: 1,
        fontSize: bodyFontSize + 1,
        center: true,
        font: fonts.bold,
      });
      x += sessionW;
    });

    cursorY -= rowHeight;
  });

  const summaryRows: Array<{ label: string; value: (sessionId: string) => string }> = [
    {
      label: "Bağımsız gerçekleşen basamak sayısı",
      value: (sessionId) => String(summaryMap.get(sessionId)?.count ?? 0),
    },
    {
      label: "Bağımsız gerçekleşen basamak yüzdesi",
      value: (sessionId) => `%${summaryMap.get(sessionId)?.percent ?? 0}`,
    },
  ];

  summaryRows.forEach((row) => {
    const rowHeight = 22;
    ensureSpace(rowHeight);

    let x = MARGIN_X;
    drawCell(page, fonts, x, cursorY - rowHeight, stepCol, rowHeight, row.label, {
      borderColor: BEP_TABLE_BORDER,
      borderWidth: 1,
      fontSize: 8,
      font: fonts.bold,
      valign: "center",
      fill: rgb(0.92, 0.92, 0.92),
    });
    x += stepCol;

    sessions.forEach((session) => {
      drawCell(page, fonts, x, cursorY - rowHeight, sessionW, rowHeight, row.value(session.id), {
        borderColor: BEP_TABLE_BORDER,
        borderWidth: 1,
        fontSize: 8.5,
        center: true,
        font: fonts.bold,
        fill: rgb(0.92, 0.92, 0.92),
      });
      x += sessionW;
    });

    cursorY -= rowHeight;
  });

  const legendHeight = 16;
  ensureSpace(legendHeight);
  drawInlineRuns(
    page,
    [
      { text: "B", font: fonts.bold },
      { text: " = Bağımsız     ", font: fonts.regular },
      { text: "İ", font: fonts.bold },
      { text: " = İpuçlu     ", font: fonts.regular },
      { text: "H", font: fonts.bold },
      { text: " = Hatalı / Yapamadı     ", font: fonts.regular },
      { text: "Boş", font: fonts.bold },
      { text: " = Gözlenmedi", font: fonts.regular },
    ],
    { x: MARGIN_X, y: cursorY - 12, size: 8 },
  );
  cursorY -= legendHeight;

  if (parsed.analysis.trim()) {
    let analysisPage = pdfDoc.addPage([PAGE.width, PAGE.height]);
    drawCenteredTitle(analysisPage, fonts.bold, "BECERİ ANALİZİ DEĞERLENDİRMESİ", {
      pageWidth: PAGE.width,
      marginX: MARGIN_X,
      y: PAGE.height - 32,
      preferredSize: 13,
    });
    drawInlineRuns(
      analysisPage,
      [{ text: "Öğrencinin Adı Soyadı: ", font: fonts.bold }, { text: studentName || "-", font: fonts.regular }],
      { x: MARGIN_X, y: PAGE.height - 56, size: 9 },
    );
    drawInlineRuns(
      analysisPage,
      [{ text: "Hedef Uyaran: ", font: fonts.bold }, { text: sanitize(parsed.targetSkill) || "-", font: fonts.regular }],
      { x: MARGIN_X, y: PAGE.height - 70, size: 9 },
    );

    const bodySize = 10;
    const lineHeight = 15;
    const lines = wrapText(parsed.analysis, fonts.regular, bodySize, TABLE_WIDTH);
    let analysisY = PAGE.height - 100;

    lines.forEach((line) => {
      if (analysisY < 50) {
        analysisPage = pdfDoc.addPage([PAGE.width, PAGE.height]);
        analysisY = PAGE.height - 40;
      }
      analysisPage.drawText(line, {
        x: MARGIN_X,
        y: analysisY,
        size: bodySize,
        font: fonts.regular,
        color: TEXT,
      });
      analysisY -= lineHeight;
    });
  }

  return pdfDoc.save();
}

export async function generateObtPdf(doc: ObtExportDocument) {
  if (doc.type === "kontrol") {
    return generateChecklistPdf(doc);
  }
  if (doc.type === "beceri") {
    return generateSkillAnalysisPdf(doc);
  }
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const rows = Array.isArray(doc.data) ? (doc.data as ObtRow[]) : [];
  const L = rows[0]?.dersler?.length || 5;
  const cw = calculatePdfColumnWidths(L);

  let page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  let cursorY = drawPdfHeader(page, fonts, doc, cw, L);
  drawPdfFooter(page, fonts);

  const ensureSpace = (height: number) => {
    if (cursorY - height < 40) {
      page = pdfDoc.addPage([PAGE.width, PAGE.height]);
      cursorY = drawPdfHeader(page, fonts, doc, cw, L);
      drawPdfFooter(page, fonts);
    }
  };

  const bodyFontSize = 7;
  const subFs = dataFontSize(cw.subcol);

  rows.forEach((row) => {
    if (row.isHeader) {
      const text = sanitize(row.bildirim);
      const textHeight = measureHeight(text, fonts.bold, bodyFontSize + 1, TABLE_WIDTH - 10, 11);
      const rowHeight = Math.ceil(textHeight + 8);
      ensureSpace(rowHeight);
      drawCell(page, fonts, MARGIN_X, cursorY - rowHeight, TABLE_WIDTH, rowHeight, text, {
        fontSize: bodyFontSize + 1,
        valign: "center",
        font: fonts.bold,
        fill: rgb(0.82, 0.85, 0.88),
        borderColor: BEP_TABLE_BORDER,
        borderWidth: 1,
      });
      cursorY -= rowHeight;
      return;
    }

    const bildirim = sanitize(row.bildirim);
    const olcut = sanitize(row.olcut);
    const yonerge = sanitize(row.yonerge);

    const textHeight = Math.max(
      measureHeight(bildirim, fonts.regular, bodyFontSize, cw.bildirim - 6, 9),
      measureHeight(yonerge, fonts.regular, bodyFontSize, cw.yonerge - 6, 9),
      18,
    );
    const rowHeight = Math.ceil(textHeight + 4);

    ensureSpace(rowHeight);

    let x = MARGIN_X;

    drawCell(page, fonts, x, cursorY - rowHeight, cw.bildirim, rowHeight, bildirim, {
      borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: bodyFontSize, valign: "top",
    });
    x += cw.bildirim;

    drawCell(page, fonts, x, cursorY - rowHeight, cw.olcut, rowHeight, olcut, {
      borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: bodyFontSize, center: true,
    });
    x += cw.olcut;

    drawCell(page, fonts, x, cursorY - rowHeight, cw.yonerge, rowHeight, yonerge, {
      borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: bodyFontSize, valign: "top",
    });
    x += cw.yonerge;

    // BD columns
    const bdVals = [sanitize(row.bd1), sanitize(row.bd2), sanitize(row.bd3)];
    bdVals.forEach((val) => {
      drawCell(page, fonts, x, cursorY - rowHeight, cw.bd, rowHeight, val, {
        borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: 7, center: true, font: fonts.bold,
      });
      x += cw.bd;
    });

    // Lesson columns
    for (let l = 0; l < L; l++) {
      const ders = row.dersler?.[l] || {};
      const subVals = [ders.b ? "X" : "", ders.i ? "X" : "", ders.m ? "X" : "", ders.f ? "X" : ""];
      for (let s = 0; s < 4; s++) {
        drawCell(page, fonts, x, cursorY - rowHeight, cw.subcol, rowHeight, subVals[s]!, {
          borderColor: BEP_TABLE_BORDER, borderWidth: 1, fontSize: subFs, center: true, font: fonts.bold,
        });
        x += cw.subcol;
      }
    }

    cursorY -= rowHeight;
  });

  return pdfDoc.save();
}

// ─── DOCX helpers ───────────────────────────────────────────────────────────

function docxCell(
  value: string,
  options: {
    bold?: boolean;
    size?: number;
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    columnSpan?: number;
    fill?: string;
  } = {},
) {
  const bold = options.bold ?? false;
  const size = options.size ?? 14;
  const align = options.align ?? AlignmentType.LEFT;
  const fill = options.fill ?? undefined;

  return new TableCell({
    shading: fill ? { fill } : undefined,
    columnSpan: options.columnSpan,
    margins: { top: 30, bottom: 30, left: 40, right: 40 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 3, color: "555555" },
      bottom: { style: BorderStyle.SINGLE, size: 3, color: "555555" },
      left: { style: BorderStyle.SINGLE, size: 3, color: "555555" },
      right: { style: BorderStyle.SINGLE, size: 3, color: "555555" },
    },
    children: [
      new Paragraph({
        alignment: align,
        spacing: { after: 0, before: 0, line: 240 },
        children: [new TextRun({ text: value, bold, size })],
      }),
    ],
  });
}

// ─── DOCX generation ────────────────────────────────────────────────────────

export async function generateChecklistDocx(doc: ObtExportDocument) {
  const rows = parseChecklistRows(doc.data);
  const colWidthsDxa = [5066, 1200, 1200, 3000]; // sum = 10466 dxa

  const formattedDate = doc.evaluationDate
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(doc.evaluationDate))
    : "";

  const evaluatorName = doc.evaluatorName?.trim()
    ? sanitize(doc.evaluatorName)
    : doc.owner?.name
      ? `${sanitize(doc.owner.name)}${doc.owner.branch ? ` (${sanitize(doc.owner.branch)})` : ""}`
      : "-";

  const metaRows = [
    [
      "Öğrencinin Adı Soyadı:",
      `${sanitize(doc.student.firstName)} ${sanitize(doc.student.lastName)}`,
      "Değerlendirme Tarihi:",
      formattedDate
    ],
    [
      "Değerlendirmeyi Yapan:",
      evaluatorName,
      "Değerlendirme Türü:",
      sanitize(doc.evaluationType || "Kontrol Listesi")
    ]
  ];

  if (doc.kazanim) {
    metaRows.push([
      "Kazanım:",
      sanitize(doc.kazanim),
      "",
      ""
    ]);
  }

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metaRows.map(
      (cols) =>
        new TableRow({
          children: [
            docxCell(cols[0]!, { bold: true, size: 16 }),
            docxCell(cols[1]!, { size: 16 }),
            docxCell(cols[2]!, { bold: true, size: 16 }),
            docxCell(cols[3]!, { size: 16 }),
          ],
        }),
    ),
  });

  // Table header row
  const headerRow = new TableRow({
    children: [
      docxCell("Ölçütler", { bold: true, align: AlignmentType.CENTER, fill: "E8E8E8", size: 18 }),
      docxCell("Evet", { bold: true, align: AlignmentType.CENTER, fill: "E8E8E8", size: 18 }),
      docxCell("Hayır", { bold: true, align: AlignmentType.CENTER, fill: "E8E8E8", size: 18 }),
      docxCell("Açıklama", { bold: true, align: AlignmentType.CENTER, fill: "E8E8E8", size: 18 }),
    ],
  });

  // Data rows
  const dataRows = rows.map((row) => {
    if (row.isHeader) {
      return new TableRow({
        children: [
          docxCell(sanitize(row.olcut), {
            bold: true,
            fill: "F2F2F2",
            size: 16,
            columnSpan: 4,
          }),
        ],
      });
    }
    return new TableRow({
      children: [
        docxCell(sanitize(row.olcut), { size: 16 }),
        docxCell(row.evet ? "+" : "", { align: AlignmentType.CENTER, bold: true, size: 18 }),
        docxCell(row.hayir ? "+" : "", { align: AlignmentType.CENTER, bold: true, size: 18 }),
        docxCell(sanitize(row.aciklama), { size: 16 }),
      ],
    });
  });

  const mainTable = new Table({
    width: { size: PORTRAIT_DOCX_PRINT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidthsDxa,
    rows: [headerRow, ...dataRows],
  });

  const bodyChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: turkishUpper(doc.title), bold: true, size: 24 }),
      ],
    }),
    metaTable,
    new Paragraph({ spacing: { after: 120 } }),
    mainTable,
  ];

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 11906,
              height: 16838,
              orientation: PageOrientation.PORTRAIT,
            },
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: bodyChildren,
      },
    ],
  });

  return Packer.toBuffer(wordDoc);
}

export async function generateSkillAnalysisDocx(doc: ObtExportDocument) {
  const parsed = parseSkillAnalysisData(doc.data);
  const summary = computeSkillSummary(parsed);
  const summaryMap = new Map(summary.map((item) => [item.sessionId, item]));
  const sessions = parsed.sessions;
  const sessionCount = Math.max(sessions.length, 1);

  const stepColDxa = Math.min(5200, Math.max(3200, DOCX_PRINT_WIDTH - sessionCount * 900));
  const sessionColDxa = Math.floor((DOCX_PRINT_WIDTH - stepColDxa) / sessionCount);
  const columnWidths = [stepColDxa, ...Array.from({ length: sessions.length }, () => sessionColDxa)];
  const cellSize = sessionCount > 9 ? 14 : 16;

  const observer = resolveSkillObserver(doc, parsed.observer);
  const studentName = `${sanitize(doc.student.firstName)} ${sanitize(doc.student.lastName)}`.trim();

  const metaRows = [
    ["Öğrencinin Adı Soyadı:", studentName || "-", "Gözlemcinin Adı Soyadı:", observer],
    ["Hedef Uyaran:", sanitize(parsed.targetSkill) || "-", "Evre:", sanitize(parsed.phase) || "-"],
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metaRows.map(
      (cols) =>
        new TableRow({
          children: [
            docxCell(cols[0]!, { bold: true, size: 15 }),
            docxCell(cols[1]!, { size: 15 }),
            docxCell(cols[2]!, { bold: true, size: 15 }),
            docxCell(cols[3]!, { size: 15 }),
          ],
        }),
    ),
  });

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      docxCell("Beceri Basamakları", { bold: true, align: AlignmentType.CENTER, fill: "E8E8E8", size: cellSize }),
      ...sessions.map((session) =>
        docxCell(formatSkillSessionDate(session.date), {
          bold: true,
          align: AlignmentType.CENTER,
          fill: "E8E8E8",
          size: cellSize,
        }),
      ),
    ],
  });

  const stepRows = parsed.steps.map((step, index) =>
    new TableRow({
      children: [
        docxCell(`${index + 1}. ${sanitize(step.text)}`, { size: cellSize }),
        ...sessions.map((session) =>
          docxCell(SKILL_MARK_LABELS[parsed.marks[step.id]?.[session.id] ?? ""], {
            align: AlignmentType.CENTER,
            bold: true,
            size: cellSize,
          }),
        ),
      ],
    }),
  );

  const summaryRows = [
    {
      label: "Bağımsız gerçekleşen basamak sayısı",
      value: (sessionId: string) => String(summaryMap.get(sessionId)?.count ?? 0),
    },
    {
      label: "Bağımsız gerçekleşen basamak yüzdesi",
      value: (sessionId: string) => `%${summaryMap.get(sessionId)?.percent ?? 0}`,
    },
  ].map(
    (row) =>
      new TableRow({
        children: [
          docxCell(row.label, { bold: true, fill: "F2F2F2", size: cellSize }),
          ...sessions.map((session) =>
            docxCell(row.value(session.id), {
              align: AlignmentType.CENTER,
              bold: true,
              fill: "F2F2F2",
              size: cellSize,
            }),
          ),
        ],
      }),
  );

  const mainTable = new Table({
    width: { size: DOCX_PRINT_WIDTH, type: WidthType.DXA },
    columnWidths,
    rows: [headerRow, ...stepRows, ...summaryRows],
  });

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { width: 16838, height: 11906, orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [new TextRun({ text: turkishUpper(doc.title || "Beceri Analizi Veri Kayıt Formu"), bold: true, size: 24 })],
          }),
          metaTable,
          new Paragraph({ spacing: { after: 120 } }),
          mainTable,
        ],
      },
    ],
  });

  return Packer.toBuffer(wordDoc);
}

export async function generateObtDocx(doc: ObtExportDocument) {
  if (doc.type === "kontrol") {
    return generateChecklistDocx(doc);
  }
  if (doc.type === "beceri") {
    return generateSkillAnalysisDocx(doc);
  }
  const rows = Array.isArray(doc.data) ? (doc.data as ObtRow[]) : [];
  const L = rows[0]?.dersler?.length || 5;
  const colWidthsDxa = calculateDocxColumnWidths(L);

  const cellSize = L > 7 ? 11 : L > 5 ? 12 : 14;

  const evaluatorBranch = doc.owner?.branch ? ` (${sanitize(doc.owner.branch)})` : "";
  const evaluatorName = doc.owner?.name ? `${sanitize(doc.owner.name)}${evaluatorBranch}` : "-";
  const formattedDate = doc.evaluationDate
    ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(new Date(doc.evaluationDate))
    : "";

  const metaRows = [
    ["Öğrencinin Adı:", `${sanitize(doc.student.firstName)} ${sanitize(doc.student.lastName)}`, "Değerlendirme Tarihi:", formattedDate],
    ["Değerlendirmeyi Yapan:", evaluatorName, "Değerlendirme Türü:", sanitize(doc.evaluationType)],
  ];
  if (doc.kazanim) {
    metaRows.push(["Kazanım:", sanitize(doc.kazanim), "", ""]);
  }

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: metaRows.map(
      (cols) =>
        new TableRow({
          children: [
            docxCell(cols[0]!, { bold: true, size: 15 }),
            docxCell(cols[1]!, { size: 15 }),
            docxCell(cols[2]!, { bold: true, size: 15 }),
            docxCell(cols[3]!, { size: 15 }),
          ],
        }),
    ),
  });

  const lessonDates = extractLessonDates(rows, L);

  // Header Row 1: main sections
  const headerRow1 = new TableRow({
    children: [
      docxCell("Bildirimler", { bold: true, align: AlignmentType.CENTER, fill: "E8E8E8", size: cellSize }),
      docxCell("Ölçüt", { bold: true, align: AlignmentType.CENTER, fill: "E8E8E8", size: cellSize }),
      docxCell("Sorular/Yönergeler", { bold: true, align: AlignmentType.CENTER, fill: "E8E8E8", size: cellSize }),
      docxCell("Öğr. Öncesi Değ.", { bold: true, align: AlignmentType.CENTER, columnSpan: 3, fill: "E8E8E8", size: cellSize }),
      docxCell("Öğretim Sürecini Değerlendirme", { bold: true, align: AlignmentType.CENTER, columnSpan: L * 4, fill: "E8E8E8", size: cellSize }),
    ],
  });

  // Header Row 2: BD labels + lesson names
  const headerRow2 = new TableRow({
    children: [
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("BD1(+-)", { bold: true, align: AlignmentType.CENTER, fill: "ECECEC", size: cellSize }),
      docxCell("BD2(+-)", { bold: true, align: AlignmentType.CENTER, fill: "ECECEC", size: cellSize }),
      docxCell("BD3(+-)", { bold: true, align: AlignmentType.CENTER, fill: "ECECEC", size: cellSize }),
      ...Array.from({ length: L }, (_, i) =>
        docxCell(`${i + 1}.Ders`, { bold: true, align: AlignmentType.CENTER, columnSpan: 4, fill: "ECECEC", size: cellSize }),
      ),
    ],
  });

  // Header Row 3: lesson dates
  const headerRow3 = new TableRow({
    children: [
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      ...Array.from({ length: L }, (_, i) =>
        docxCell(lessonDates[i]!, { bold: true, align: AlignmentType.CENTER, columnSpan: 4, fill: "ECECEC", size: cellSize }),
      ),
    ],
  });

  // Header Row 4: B İ M F labels
  const headerRow4 = new TableRow({
    children: [
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      docxCell("", { fill: "F5F5F5" }),
      ...Array.from({ length: L }, () => [
        docxCell("B", { bold: true, align: AlignmentType.CENTER, fill: "ECECEC", size: cellSize }),
        docxCell("İ", { bold: true, align: AlignmentType.CENTER, fill: "ECECEC", size: cellSize }),
        docxCell("M", { bold: true, align: AlignmentType.CENTER, fill: "ECECEC", size: cellSize }),
        docxCell("F", { bold: true, align: AlignmentType.CENTER, fill: "ECECEC", size: cellSize }),
      ]).flat(),
    ],
  });

  // Data rows
  const dataRows = rows.map((row) => {
    if (row.isHeader) {
      return new TableRow({
        children: [
          docxCell(sanitize(row.bildirim), {
            bold: true,
            fill: "F2F2F2",
            size: cellSize,
            columnSpan: 6 + L * 4,
          }),
        ],
      });
    }
    const derslerCells = Array.from({ length: L }, (_, l) => {
      const ders = row.dersler?.[l] || {};
      return [
        docxCell(ders.b ? "X" : "", { align: AlignmentType.CENTER, bold: true, size: cellSize }),
        docxCell(ders.i ? "X" : "", { align: AlignmentType.CENTER, bold: true, size: cellSize }),
        docxCell(ders.m ? "X" : "", { align: AlignmentType.CENTER, bold: true, size: cellSize }),
        docxCell(ders.f ? "X" : "", { align: AlignmentType.CENTER, bold: true, size: cellSize }),
      ];
    }).flat();

    return new TableRow({
      children: [
        docxCell(sanitize(row.bildirim), { size: cellSize }),
        docxCell(sanitize(row.olcut), { align: AlignmentType.CENTER, size: cellSize }),
        docxCell(sanitize(row.yonerge), { size: cellSize }),
        docxCell(sanitize(row.bd1), { align: AlignmentType.CENTER, bold: true, size: cellSize }),
        docxCell(sanitize(row.bd2), { align: AlignmentType.CENTER, bold: true, size: cellSize }),
        docxCell(sanitize(row.bd3), { align: AlignmentType.CENTER, bold: true, size: cellSize }),
        ...derslerCells,
      ],
    });
  });

  const mainTable = new Table({
    width: { size: DOCX_PRINT_WIDTH, type: WidthType.DXA },
    columnWidths: colWidthsDxa,
    rows: [headerRow1, headerRow2, headerRow3, headerRow4, ...dataRows],
  });

  const bodyChildren = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({ text: turkishUpper(doc.title), bold: true, size: 24 }),
      ],
    }),
    metaTable,
    new Paragraph({ spacing: { after: 120 } }),
    mainTable,
    new Paragraph({ spacing: { after: 200 } }),
    new Paragraph({
      children: [
        new TextRun({
          text: "Kısaltmalar: B= Bağımsız,  İ= İşaret İpucu,  M= Model Olma,  F= Fiziksel Yardım,  BD= Başlama Düzeyi",
          size: 14,
          color: "666666",
        }),
      ],
    }),
  ];

  const wordDoc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: 16838,
              height: 11906,
              orientation: PageOrientation.LANDSCAPE,
            },
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: bodyChildren,
      },
    ],
  });

  return Packer.toBuffer(wordDoc);
}
