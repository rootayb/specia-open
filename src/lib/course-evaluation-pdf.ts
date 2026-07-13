import type { CourseEvaluationDocument, CourseEvaluationRow, Student } from "@/lib/prisma-shim";
import { PDFDocument, type PDFFont, type PDFImage, rgb } from "pdf-lib";

import { loadPdfFonts as loadFonts, type PdfFonts as Fonts } from "@/lib/pdf-assets";
import { loadInstitutionOrSpeciaLogo } from "@/lib/pdf-brand";
import { restoreTurkishText } from "@/lib/turkish";

type FullCourseEvaluationDocument = CourseEvaluationDocument & {
  student: Pick<Student, "firstName" | "lastName" | "schoolName" | "schoolNumber">;
  rows: CourseEvaluationRow[];
};

const PAGE = { width: 841.92, height: 595.44 };
const MARGIN_X = 28;
const TABLE_WIDTH = PAGE.width - MARGIN_X * 2;
const COLUMN_WIDTHS = [120, 96, 210, 261, 47, 47];
const BORDER = rgb(0.63, 0.7, 0.77);
const HEADER_BG = rgb(0.82, 0.86, 0.9);
const BAND_BG = rgb(0.92, 0.94, 0.96);
const TEXT = rgb(0.07, 0.07, 0.07);

async function loadLogo(pdfDoc: PDFDocument, institutionId?: string | null) {
  return loadInstitutionOrSpeciaLogo(pdfDoc, institutionId, "black");
}

function sanitize(value?: string | null) {
  return restoreTurkishText(value?.trim() || "-");
}

function buildCourseNamesLabel(document: FullCourseEvaluationDocument) {
  const uniqueNames = Array.from(
    new Set(
      document.rows
        .map((row) => restoreTurkishText(row.courseName?.trim() || ""))
        .filter(Boolean),
    ),
  );

  if (uniqueNames.length === 0) {
    return restoreTurkishText(document.courseName?.trim() || "-");
  }

  return uniqueNames.join(", ");
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const normalized = restoreTurkishText(text).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [""];
  }

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

function measureHeight(
  text: string,
  font: PDFFont,
  fontSize: number,
  width: number,
  lineHeight: number,
) {
  return wrapText(text, font, fontSize, width).length * lineHeight;
}

function drawCell(
  page: ReturnType<PDFDocument["addPage"]>,
  fonts: Fonts,
  x: number,
  y: number,
  width: number,
  height: number,
  text: string,
  options?: {
    fill?: ReturnType<typeof rgb>;
    font?: PDFFont;
    fontSize?: number;
    center?: boolean;
  },
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    borderColor: BORDER,
    borderWidth: 1,
    color: options?.fill,
  });

  const font = options?.font ?? fonts.regular;
  const fontSize = options?.fontSize ?? 8.4;
  const lines = wrapText(text, font, fontSize, width - 8);
  const totalHeight = lines.length * 10;
  let currentY = y + height - (height - totalHeight) / 2 - fontSize;

  lines.forEach((line) => {
    const lineWidth = font.widthOfTextAtSize(line, fontSize);
    page.drawText(line, {
      x: options?.center ? x + (width - lineWidth) / 2 : x + 4,
      y: currentY,
      size: fontSize,
      font,
      color: TEXT,
    });
    currentY -= 10;
  });
}

function drawHeader(
  page: ReturnType<PDFDocument["addPage"]>,
  fonts: Fonts,
  document: FullCourseEvaluationDocument,
  logo: PDFImage | null,
  pageIndex: number,
  totalRows: number,
  showDetails: boolean,
): number {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: rgb(1, 1, 1),
  });

  if (showDetails) {
    if (logo) {
      const logoHeight = 74;
      const logoWidth = (logoHeight * logo.width) / logo.height;
      page.drawImage(logo, {
        x: MARGIN_X,
        y: PAGE.height - 78,
        width: logoWidth,
        height: logoHeight,
      });
    }

    page.drawText(document.student.schoolName || document.title, {
      x: MARGIN_X + (logo ? (74 * logo.width) / logo.height + 14 : 0),
      y: PAGE.height - 42,
      size: 12,
      font: fonts.bold,
      color: TEXT,
    });

    page.drawText("\u00d6\u011eRENC\u0130 PERFORMANS DE\u011eERLEND\u0130RME FORMU", {
      x: MARGIN_X + (logo ? (74 * logo.width) / logo.height + 14 : 0),
      y: PAGE.height - 60,
      size: 10.8,
      font: fonts.bold,
      color: TEXT,
    });
  }

  page.drawText(`Sayfa ${pageIndex}`, {
    x: PAGE.width - 92,
    y: PAGE.height - 42,
    size: 9,
    font: fonts.regular,
    color: TEXT,
  });

  if (showDetails) {
    const infoTop = PAGE.height - 118;
    const infoWidth = (TABLE_WIDTH - 12) / 3;
    const infoHeight = 46;
    const infoRowGap = 52;
    const courseNamesLabel = buildCourseNamesLabel(document);
    const infoItems = [
      { label: "\u00d6\u011frenci", value: `${document.student.firstName} ${document.student.lastName}` },
      { label: "Dersler", value: courseNamesLabel },
      { label: "Okul no", value: document.student.schoolNumber || "-" },
      { label: "De\u011ferlendiren", value: document.evaluatorName || "-" },
      {
        label: "Tarih",
        value: document.evaluationDate
          ? new Intl.DateTimeFormat("tr-TR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            }).format(document.evaluationDate)
          : "-",
      },
    ];

    infoItems.forEach((item, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = MARGIN_X + column * (infoWidth + 6);
      const y = infoTop - row * infoRowGap;

      page.drawRectangle({
        x,
        y,
        width: infoWidth,
        height: infoHeight,
        borderColor: BORDER,
        borderWidth: 1,
        color: BAND_BG,
      });

      page.drawText(item.label.toUpperCase(), {
        x: x + 8,
        y: y + infoHeight - 12,
        size: 7.4,
        font: fonts.bold,
        color: TEXT,
      });

      const valueLines = wrapText(item.value, fonts.regular, 8.2, infoWidth - 16).slice(0, 2);
      let valueY = y + infoHeight - 24;

      valueLines.forEach((line) => {
        page.drawText(line, {
          x: x + 8,
          y: valueY,
          size: 8.2,
          font: fonts.regular,
          color: TEXT,
        });
        valueY -= 9;
      });
    });
  }

  const tableTop = showDetails ? PAGE.height - 210 : PAGE.height - 52;
  const labels = ["\u00dcnite / Tema", "\u00d6\u011frenme Alan\u0131", "\u00d6\u011frenme \u00c7\u0131kt\u0131s\u0131", "S\u00fcre\u00e7 Bile\u015feni", "+", "-"];

  let currentX = MARGIN_X;
  labels.forEach((label, index) => {
    drawCell(page, fonts, currentX, tableTop, COLUMN_WIDTHS[index], 28, label, {
      fill: HEADER_BG,
      font: fonts.bold,
      fontSize: 8.2,
      center: index >= 4,
    });
    currentX += COLUMN_WIDTHS[index];
  });

  return tableTop;
}

export async function generateCourseEvaluationPdf(document: FullCourseEvaluationDocument) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadLogo(pdfDoc, document.institutionId);
  const rows = document.rows.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const groupedRows = rows.reduce<
    Array<{
      courseName: string;
      units: Array<{ unitName: string; rows: CourseEvaluationRow[] }>;
    }>
  >((groups, row) => {
    const rowCourseName = row.courseName?.trim() || document.courseName;
    const lastCourse = groups[groups.length - 1];
    const currentCourse =
      lastCourse && lastCourse.courseName === rowCourseName
        ? lastCourse
        : (() => {
            const nextCourse = { courseName: rowCourseName, units: [] as Array<{ unitName: string; rows: CourseEvaluationRow[] }> };
            groups.push(nextCourse);
            return nextCourse;
          })();

    const lastUnit = currentCourse.units[currentCourse.units.length - 1];
    if (lastUnit && lastUnit.unitName === row.unitName) {
      lastUnit.rows.push(row);
      return groups;
    }

    currentCourse.units.push({ unitName: row.unitName, rows: [row] });
    return groups;
  }, []);

  let pageIndex = 1;
  let page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  let cursorY = drawHeader(page, fonts, document, logo, pageIndex, rows.length, true);

  const ensureSpace = (height: number) => {
    if (cursorY - height < 30) {
      pageIndex += 1;
      page = pdfDoc.addPage([PAGE.width, PAGE.height]);
      cursorY = drawHeader(page, fonts, document, logo, pageIndex, rows.length, false);
    }
  };

  groupedRows.forEach((courseGroup) => {
    ensureSpace(28);

    page.drawRectangle({
      x: MARGIN_X,
      y: cursorY - 24,
      width: TABLE_WIDTH,
      height: 24,
      borderColor: BORDER,
      borderWidth: 1,
      color: HEADER_BG,
    });

    page.drawText(restoreTurkishText(courseGroup.courseName), {
      x: MARGIN_X + 6,
      y: cursorY - 16,
      size: 9.4,
      font: fonts.bold,
      color: TEXT,
    });

    cursorY -= 24;

    courseGroup.units.forEach((group) => {
      ensureSpace(24);

      page.drawRectangle({
        x: MARGIN_X,
        y: cursorY - 22,
        width: TABLE_WIDTH,
        height: 22,
        borderColor: BORDER,
        borderWidth: 1,
        color: BAND_BG,
      });

      page.drawText(group.unitName, {
        x: MARGIN_X + 6,
        y: cursorY - 15,
        size: 8.8,
        font: fonts.bold,
        color: TEXT,
      });

      cursorY -= 22;

      group.rows.forEach((row) => {
        const outcomeText = sanitize(row.learningOutcome);
        const processText = row.processComponent?.trim() || outcomeText;
        const rowHeight = Math.max(
          28,
          Math.min(
            72,
            Math.ceil(
              Math.max(
                measureHeight(sanitize(row.unitName), fonts.regular, 8.2, COLUMN_WIDTHS[0] - 8, 10),
                measureHeight(
                  sanitize(row.learningArea),
                  fonts.regular,
                  8.2,
                  COLUMN_WIDTHS[1] - 8,
                  10,
                ),
                measureHeight(outcomeText, fonts.regular, 8.2, COLUMN_WIDTHS[2] - 8, 10),
                measureHeight(processText, fonts.regular, 8.2, COLUMN_WIDTHS[3] - 8, 10),
              ) + 8,
            ),
          ),
        );

        ensureSpace(rowHeight + 2);

        let x = MARGIN_X;
        const values = [
          sanitize(row.unitName),
          sanitize(row.learningArea),
          outcomeText,
          processText,
          row.result === "+" ? "X" : "",
          row.result === "-" ? "X" : "",
        ];

        values.forEach((value, index) => {
          drawCell(page, fonts, x, cursorY - rowHeight, COLUMN_WIDTHS[index], rowHeight, value, {
            center: index >= 4,
            font: index >= 4 ? fonts.bold : fonts.regular,
            fontSize: index >= 4 ? 10 : 8.2,
          });
          x += COLUMN_WIDTHS[index];
        });

        cursorY -= rowHeight;
      });
    });
  });

  return pdfDoc.save();
}
