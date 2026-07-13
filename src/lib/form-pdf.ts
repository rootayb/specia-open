import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";

import type { FormFieldDefinition, FormTemplateDefinition } from "@/lib/forms";
import { loadPdfFonts as loadFonts, type PdfFonts as Fonts } from "@/lib/pdf-assets";
import { loadInstitutionOrSpeciaLogo } from "@/lib/pdf-brand";
import { restoreTurkishText } from "@/lib/turkish";

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PageState = {
  page: PDFPage;
  bodyTop: number;
};

export type CustomFormPdfInput = {
  template: FormTemplateDefinition;
  values: Record<string, string>;
  institutionName?: string | null;
  generatedByName: string;
  generatedAt: Date;
  institutionId?: string | null;
};

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN_X = 28;
const BODY_BOTTOM = 34;
const CARD_GAP = 8;

const COLORS = {
  page: rgb(0.988, 0.989, 0.992),
  white: rgb(1, 1, 1),
  text: rgb(0.12, 0.14, 0.18),
  muted: rgb(0.44, 0.49, 0.56),
  border: rgb(0.88, 0.90, 0.93),
  soft: rgb(0.95, 0.965, 0.98),
  softAlt: rgb(0.97, 0.975, 0.985),
  accent: rgb(0.12, 0.23, 0.35),
  accentSoft: rgb(0.89, 0.93, 0.97),
};

function normalizeText(value?: string | null) {
  if (!value) {
    return "";
  }

  return restoreTurkishText(
    value
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n"),
  );
}

function parseChecklistValue(value?: string | null) {
  return normalizeText(value)
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function checklistOptionsWithCustomValues(field: FormFieldDefinition, value: string) {
  const baseOptions = field.options ?? [];
  const baseValues = new Set(baseOptions.map((option) => option.value));
  const customOptions = parseChecklistValue(value)
    .filter((item) => !baseValues.has(item))
    .map((item) => ({ label: item, value: item }));

  return [...baseOptions, ...customOptions];
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(value);
}

function toPdfY(page: PDFPage, top: number, height = 0) {
  return page.getHeight() - top - height;
}

function drawBox(
  page: PDFPage,
  box: Box,
  options?: {
    fill?: ReturnType<typeof rgb>;
    stroke?: ReturnType<typeof rgb>;
    strokeWidth?: number;
  },
) {
  page.drawRectangle({
    x: box.x,
    y: toPdfY(page, box.y, box.height),
    width: box.width,
    height: box.height,
    ...(options?.fill ? { color: options.fill } : {}),
    ...(options?.stroke
      ? {
          borderColor: options.stroke,
          borderWidth: options.strokeWidth ?? 1,
        }
      : {}),
  });
}

function splitLongToken(token: string, font: PDFFont, size: number, maxWidth: number) {
  const parts: string[] = [];
  let current = "";

  for (const char of token) {
    const next = `${current}${char}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth || !current) {
      current = next;
    } else {
      parts.push(current);
      current = char;
    }
  }

  if (current) {
    parts.push(current);
  }

  return parts;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const normalizedText = restoreTurkishText(text);

  if (!normalizedText.trim()) {
    return [];
  }

  const paragraphs = normalizedText.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const normalized = paragraph.trim();
    if (!normalized) {
      lines.push("");
      continue;
    }

    const words = normalized.split(" ");
    let current = "";

    for (const word of words) {
      const chunks =
        font.widthOfTextAtSize(word, size) > maxWidth
          ? splitLongToken(word, font, size, maxWidth)
          : [word];

      for (const chunk of chunks) {
        const candidate = current ? `${current} ${chunk}` : chunk;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
          current = candidate;
        } else {
          if (current) {
            lines.push(current);
          }
          current = chunk;
        }
      }
    }

    if (current) {
      lines.push(current);
    }
  }

  return lines;
}

function drawTextBox(
  page: PDFPage,
  fonts: Fonts,
  text: string,
  box: Box,
  options?: {
    font?: PDFFont;
    size?: number;
    color?: ReturnType<typeof rgb>;
    align?: "left" | "center" | "right";
    paddingX?: number;
    paddingY?: number;
    lineHeight?: number;
    maxLines?: number;
  },
) {
  const normalizedText = restoreTurkishText(text);
  const font = options?.font ?? fonts.regular;
  const size = options?.size ?? 9;
  const color = options?.color ?? COLORS.text;
  const paddingX = options?.paddingX ?? 6;
  const paddingY = options?.paddingY ?? 6;
  const lineHeight = options?.lineHeight ?? size * 1.3;
  const usableWidth = Math.max(1, box.width - paddingX * 2);
  const usableHeight = Math.max(1, box.height - paddingY * 2);
  const maxLines =
    options?.maxLines ?? Math.max(1, Math.floor((usableHeight + 1) / lineHeight));
  const wrapped = wrapText(normalizedText, font, size, usableWidth).slice(0, maxLines);

  wrapped.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, size);
    const x =
      options?.align === "center"
        ? box.x + (box.width - lineWidth) / 2
        : options?.align === "right"
          ? box.x + box.width - paddingX - lineWidth
          : box.x + paddingX;

    page.drawText(line, {
      x,
      y: toPdfY(page, box.y + paddingY + size + index * lineHeight),
      size,
      font,
      color,
    });
  });
}

function measureTextHeight(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
  lineHeight: number,
) {
  const lines = wrapText(text, font, size, width);
  return Math.max(lineHeight, lines.length * lineHeight);
}

function measureFieldHeight(field: FormFieldDefinition, value: string, width: number, fonts: Fonts) {
  if (field.type === "checklist") {
    const options = checklistOptionsWithCustomValues(field, value);
    const columns = Math.max(1, Math.min(field.columns ?? 3, 4));
    const rows = Math.max(1, Math.ceil(options.length / columns));
    const optionHeight = 18;
    const labelHeight = 10;
    const paddingTop = 8;
    const paddingBottom = 10;
    return Math.max(92, labelHeight + paddingTop + rows * optionHeight + paddingBottom + 6);
  }

  const isMultiLine = field.type === "textarea" || field.type === "list";
  const labelHeight = 10;
  const paddingTop = 8;
  const paddingBottom = 10;
  const textSize = isMultiLine ? 8.4 : 8.8;
  const textLineHeight = isMultiLine ? 10.8 : 11.4;
  const baseHeight =
    field.type === "textarea" || field.type === "list"
      ? Math.max(72, (field.rows ?? 4) * 13)
      : field.type === "select"
        ? 50
        : 46;
  const contentHeight = measureTextHeight(
    value || "-",
    fonts.regular,
    textSize,
    width - 28,
    textLineHeight,
  );

  return Math.max(baseHeight, labelHeight + paddingTop + contentHeight + paddingBottom);
}

function drawFieldCard(
  page: PDFPage,
  fonts: Fonts,
  field: FormFieldDefinition,
  value: string,
  box: Box,
) {
  if (field.type === "checklist") {
    drawChecklistCard(page, fonts, field, value, box);
    return;
  }

  drawBox(page, box, {
    fill: COLORS.white,
    stroke: COLORS.border,
    strokeWidth: 1,
  });

  drawBox(page, { x: box.x, y: box.y, width: 4, height: box.height }, {
    fill: field.type === "textarea" || field.type === "list" ? COLORS.accentSoft : COLORS.soft,
  });

  drawTextBox(page, fonts, field.label.toUpperCase(), {
    x: box.x + 12,
    y: box.y + 8,
    width: box.width - 24,
    height: 10,
  }, {
    font: fonts.bold,
    size: 6.8,
    color: COLORS.muted,
    paddingX: 0,
    paddingY: 0,
  });

  drawTextBox(page, fonts, value || "-", {
    x: box.x + 12,
    y: box.y + 22,
    width: box.width - 24,
    height: box.height - 28,
  }, {
    size: field.type === "textarea" || field.type === "list" ? 8.4 : 8.8,
    lineHeight: field.type === "textarea" || field.type === "list" ? 10.8 : 11.4,
    paddingX: 0,
    paddingY: 0,
    color: COLORS.text,
    maxLines: Math.max(
      1,
      Math.floor((box.height - 30) / (field.type === "textarea" || field.type === "list" ? 10.8 : 11.4)),
    ),
  });
}

function drawChecklistCard(
  page: PDFPage,
  fonts: Fonts,
  field: FormFieldDefinition,
  value: string,
  box: Box,
) {
  const selectedItems = new Set(parseChecklistValue(value));
  const options = checklistOptionsWithCustomValues(field, value);
  const columns = Math.max(1, Math.min(field.columns ?? 3, 4));
  const contentX = box.x + 12;
  const contentY = box.y + 24;
  const contentWidth = box.width - 24;
  const columnGap = 8;
  const rowGap = 6;
  const itemHeight = 14;
  const columnWidth = (contentWidth - columnGap * (columns - 1)) / columns;

  drawBox(page, box, {
    fill: COLORS.white,
    stroke: COLORS.border,
    strokeWidth: 1,
  });

  drawBox(page, { x: box.x, y: box.y, width: 4, height: box.height }, {
    fill: COLORS.accentSoft,
  });

  drawTextBox(page, fonts, field.label.toUpperCase(), {
    x: contentX,
    y: box.y + 8,
    width: contentWidth,
    height: 10,
  }, {
    font: fonts.bold,
    size: 6.8,
    color: COLORS.muted,
    paddingX: 0,
    paddingY: 0,
  });

  options.forEach((option, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = contentX + column * (columnWidth + columnGap);
    const y = contentY + row * (itemHeight + rowGap);
    const isChecked = selectedItems.has(option.value);

    drawBox(page, { x, y, width: 10, height: 10 }, {
      fill: isChecked ? COLORS.accent : COLORS.white,
      stroke: isChecked ? COLORS.accent : COLORS.border,
      strokeWidth: 1,
    });

    if (isChecked) {
      drawTextBox(page, fonts, "x", {
        x: x + 1.3,
        y: y - 1,
        width: 8,
        height: 10,
      }, {
        font: fonts.bold,
        size: 9,
        color: COLORS.white,
        paddingX: 0,
        paddingY: 0,
        align: "center",
      });
    }

    drawTextBox(page, fonts, option.label, {
      x: x + 14,
      y: y - 1,
      width: columnWidth - 14,
      height: itemHeight + 3,
    }, {
      size: 7.8,
      color: COLORS.text,
      lineHeight: 9.6,
      paddingX: 0,
      paddingY: 0,
      maxLines: 2,
    });
  });
}

function drawHero(page: PDFPage, fonts: Fonts, input: CustomFormPdfInput, logo: PDFImage | null) {
  drawBox(page, { x: 0, y: 0, width: PAGE.width, height: PAGE.height }, {
    fill: COLORS.page,
  });

  drawBox(page, { x: MARGIN_X, y: 24, width: PAGE.width - MARGIN_X * 2, height: 88 }, {
    fill: COLORS.white,
    stroke: COLORS.border,
    strokeWidth: 1,
  });

  let textLeft = MARGIN_X + 18;
  let logoWidth = 0;

  if (logo) {
    const ratio = logo.width / logo.height;
    const height = 44;
    logoWidth = height * ratio;
    page.drawImage(logo, {
      x: MARGIN_X + 18,
      y: toPdfY(page, 46, height),
      width: logoWidth,
      height,
    });
    textLeft = MARGIN_X + 18 + logoWidth + 14;
  }

  drawTextBox(page, fonts, input.template.title, {
    x: textLeft,
    y: 42,
    width: PAGE.width - MARGIN_X - textLeft - 18,
    height: 24,
  }, {
    font: fonts.bold,
    size: 17,
    color: COLORS.text,
    paddingX: 0,
    paddingY: 0,
  });

  drawTextBox(page, fonts, input.institutionName || "Specia", {
    x: textLeft,
    y: 72,
    width: PAGE.width - MARGIN_X - textLeft - 18,
    height: 10,
  }, {
    size: 8,
    color: COLORS.muted,
    paddingX: 0,
    paddingY: 0,
  });

  const datePillWidth = 150;
  drawTextBox(page, fonts, "Rapor tarihi", {
    x: PAGE.width - MARGIN_X - datePillWidth,
    y: 126,
    width: datePillWidth - 20,
    height: 8,
  }, {
    font: fonts.bold,
    size: 6.6,
    color: COLORS.muted,
    paddingX: 0,
    paddingY: 0,
  });
  drawTextBox(page, fonts, formatDate(input.generatedAt), {
    x: PAGE.width - MARGIN_X - datePillWidth,
    y: 138,
    width: datePillWidth - 20,
    height: 10,
  }, {
    font: fonts.bold,
    size: 8.6,
    color: COLORS.text,
    paddingX: 0,
    paddingY: 0,
  });

  drawBox(page, { x: MARGIN_X, y: 166, width: PAGE.width - MARGIN_X * 2, height: 1 }, {
    fill: COLORS.border,
  });

  return 182;
}

function createPage(pdfDoc: PDFDocument, fonts: Fonts, input: CustomFormPdfInput, logo: PDFImage | null) {
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  const bodyTop = drawHero(page, fonts, input, logo);
  return {
    page,
    bodyTop,
  } satisfies PageState;
}

function drawContinuationHeader(
  page: PDFPage,
  fonts: Fonts,
  input: CustomFormPdfInput,
  logo: PDFImage | null,
  sectionTitle?: string,
) {
  drawBox(page, { x: 0, y: 0, width: PAGE.width, height: PAGE.height }, {
    fill: COLORS.page,
  });

  let textLeft = MARGIN_X;
  let logoWidth = 0;

  if (logo) {
    const ratio = logo.width / logo.height;
    const height = 36;
    logoWidth = height * ratio;
    page.drawImage(logo, {
      x: MARGIN_X,
      y: toPdfY(page, 10, height),
      width: logoWidth,
      height,
    });
    textLeft = MARGIN_X + logoWidth + 12;
  }

  drawTextBox(page, fonts, input.template.title, {
    x: textLeft,
    y: 18,
    width: PAGE.width - MARGIN_X - textLeft,
    height: 12,
  }, {
    font: fonts.bold,
    size: 10.2,
    color: COLORS.accent,
    paddingX: 0,
    paddingY: 0,
  });

  drawTextBox(page, fonts, sectionTitle ?? "Form", {
    x: textLeft,
    y: 32,
    width: PAGE.width - MARGIN_X - textLeft,
    height: 8,
  }, {
    size: 7.4,
    color: COLORS.muted,
    paddingX: 0,
    paddingY: 0,
  });

  drawBox(page, { x: MARGIN_X, y: 50, width: PAGE.width - MARGIN_X * 2, height: 1 }, {
    fill: COLORS.border,
  });

  return 62;
}

function buildFieldRows(fields: FormFieldDefinition[]) {
  const rows: FormFieldDefinition[][] = [];

  for (let index = 0; index < fields.length; index += 1) {
    const field = fields[index];
    const next = fields[index + 1];

    if (field.layout === "half" && next?.layout === "half") {
      rows.push([field, next]);
      index += 1;
      continue;
    }

    rows.push([field]);
  }

  return rows;
}

export async function generateCustomFormPdf(input: CustomFormPdfInput) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const coverLogo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "black");
  const continuationLogo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "black");
  const pages: PDFPage[] = [];

  let state = createPage(pdfDoc, fonts, input, coverLogo);
  pages.push(state.page);
  let currentY = state.bodyTop;
  const maxBodyY = PAGE.height - BODY_BOTTOM;

  const startNewPage = (sectionTitle?: string) => {
    const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
    const bodyTop = drawContinuationHeader(page, fonts, input, continuationLogo, sectionTitle);
    pages.push(page);
    state = { page, bodyTop };
    currentY = bodyTop;
  };

  const ensureSpace = (requiredHeight: number, sectionTitle?: string) => {
    if (currentY + requiredHeight > maxBodyY) {
      startNewPage(sectionTitle);
    }
  };

  for (const section of input.template.sections) {
    const rows = buildFieldRows(section.fields);
    ensureSpace(40, section.title);

    drawTextBox(state.page, fonts, section.title, {
      x: MARGIN_X,
      y: currentY,
      width: PAGE.width - MARGIN_X * 2,
      height: 14,
    }, {
      font: fonts.bold,
      size: 12.2,
      color: COLORS.text,
      paddingX: 0,
      paddingY: 0,
    });

    drawBox(state.page, {
      x: MARGIN_X,
      y: currentY + 22,
      width: PAGE.width - MARGIN_X * 2,
      height: 1,
    }, {
      fill: COLORS.border,
    });

    currentY += 30;

    for (const row of rows) {
      const rowWidth = PAGE.width - MARGIN_X * 2;
      const gap = CARD_GAP;
      const isTwoColumn = row.length === 2;
      const columnWidth = isTwoColumn ? (rowWidth - gap) / 2 : rowWidth;

      const rowHeight = Math.max(
        ...row.map((field) =>
          measureFieldHeight(field, normalizeText(input.values[field.id]), columnWidth, fonts),
        ),
      );

      ensureSpace(rowHeight + CARD_GAP, section.title);

      row.forEach((field, index) => {
        const x = MARGIN_X + index * (columnWidth + gap);
        drawFieldCard(state.page, fonts, field, normalizeText(input.values[field.id]), {
          x,
          y: currentY,
          width: columnWidth,
          height: rowHeight,
        });
      });

      currentY += rowHeight + CARD_GAP;
    }

    currentY += 4;
  }

  pages.forEach((page, index) => {
    drawTextBox(page, fonts, `Sayfa ${index + 1} / ${pages.length}`, {
      x: MARGIN_X,
      y: PAGE.height - 24,
      width: PAGE.width - MARGIN_X * 2,
      height: 8,
    }, {
      size: 7.6,
      align: "center",
      color: COLORS.muted,
      paddingX: 0,
      paddingY: 0,
    });
  });

  return pdfDoc.save();
}
