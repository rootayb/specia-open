import type {
  BepDocument,
  BepPlanRow,
  BepSupportServiceEntry,
  CommitteeMember,
  DecisionEntry,
  PerformanceEntry,
  SubjectTeacher,
  Student,
} from "@/lib/prisma-shim";
import { PDFDocument, type PDFFont, type PDFImage, type PDFPage, rgb } from "pdf-lib";
import { loadPdfFonts as loadFonts, readPdfAsset, type PdfFonts as Fonts } from "@/lib/pdf-assets";
import { loadInstitutionOrSpeciaLogo } from "@/lib/pdf-brand";
import {
  derivePlanRowDateSummary,
  formatProcessComponentEvaluationDate,
  getProcessComponentLabels,
  parseProcessComponentSchedules,
} from "@/lib/process-component-schedules";
import { restoreTurkishText } from "@/lib/turkish";

type FullDocument = BepDocument & {
  student: Student;
  performanceEntries: PerformanceEntry[];
  planRows: BepPlanRow[];
  supportServiceEntries: BepSupportServiceEntry[];
  decisionEntries: DecisionEntry[];
  committeeMembers: CommitteeMember[];
  subjectTeachers: SubjectTeacher[];
};

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type TextBoxOptions = {
  font?: PDFFont;
  size?: number;
  color?: ReturnType<typeof rgb>;
  align?: "left" | "center" | "right" | "justify";
  lineHeight?: number;
  paddingX?: number;
  paddingY?: number;
  maxLines?: number;
};

type BoxStyle = {
  fill?: ReturnType<typeof rgb>;
  stroke?: ReturnType<typeof rgb>;
  strokeWidth?: number;
};

const PORTRAIT = { width: 595.44, height: 841.92 };
const LANDSCAPE = { width: 841.92, height: 595.44 };

const COLORS = {
  page: rgb(1, 1, 1),
  text: rgb(0.14, 0.12, 0.13),
  gold: rgb(0.78, 0.70, 0.38),
  teal: rgb(0.16, 0.38, 0.45),
  border: rgb(0.48, 0.60, 0.68),
  softAlt: rgb(0.82, 0.85, 0.88),
  white: rgb(1, 1, 1),
};

const CORPORATE_COLORS = {
  page: rgb(1, 1, 1),
  text: rgb(0.08, 0.08, 0.08),
  black: rgb(0.05, 0.05, 0.05),
  charcoal: rgb(0.16, 0.16, 0.16),
  gray: rgb(0.45, 0.45, 0.45),
  line: rgb(0.25, 0.25, 0.25),
  soft: rgb(0.93, 0.93, 0.93),
  white: rgb(1, 1, 1),
};

function normalizeInlineText(value?: string | null) {
  return restoreTurkishText(value?.replace(/\s+/g, " ").trim() ?? "");
}

function normalizeBlockText(value?: string | null) {
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

function dateText(value?: Date | null) {
  return value ? value.toLocaleDateString("tr-TR") : "";
}

function slashDateText(value?: Date | null) {
  if (!value) {
    return "";
  }

  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const year = String(value.getFullYear());
  return `${day}/${month}/${year}`;
}

function dateRangeText(start?: Date | null, end?: Date | null) {
  const startText = dateText(start);
  const endText = dateText(end);

  if (startText && endText) {
    return `${startText} - ${endText}`;
  }

  return startText || endText;
}

function dottedDateText(value?: string | null) {
  const trimmedValue = value?.trim();
  if (!trimmedValue) {
    return "";
  }

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmedValue);
  if (!isoDateMatch) {
    return trimmedValue;
  }

  const [, year, month, day] = isoDateMatch;
  return `${day}.${month}.${year}`;
}

function getProcessComponentScheduleValues(row?: BepPlanRow) {
  if (!row) {
    return {
      processComponentsText: "",
      processDateText: "",
      evaluationDatesText: "",
    };
  }

  const schedules = parseProcessComponentSchedules(row.processComponents, {
    fallbackStartDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : "",
    fallbackEndDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : "",
    fallbackEvaluationDates: Array.isArray(row.evaluationDates) ? (row.evaluationDates as string[]) : [],
  });

  const labels = schedules
    .map((item) => normalizeInlineText(item.label))
    .filter(Boolean)
    .map((item) => `\u2022 ${item}`)
    .join("\n");

  const processDateText = schedules
    .map((item) => {
      const startDate = dottedDateText(item.startDate);
      const endDate = dottedDateText(item.endDate);
      const label = normalizeInlineText(item.label);

      if (startDate && endDate) {
        return `\u2022 ${label}: ${startDate} - ${endDate}`;
      }

      if (startDate || endDate) {
        return `\u2022 ${label}: ${startDate || endDate}`;
      }

      return label ? `\u2022 ${label}: -` : "";
    })
    .filter(Boolean)
    .join("\n");

  const summaryDates = derivePlanRowDateSummary(schedules);
  const evaluationDates = summaryDates.evaluationDates.length > 0
    ? summaryDates.evaluationDates
    : Array.isArray(row.evaluationDates)
      ? (row.evaluationDates as string[])
      : [];

  const evaluationDatesText = schedules
    .map((item) => {
      const label = normalizeInlineText(item.label);
      const value =
        item.evaluationDate ||
        formatProcessComponentEvaluationDate(item.endDate) ||
        evaluationDates[0] ||
        "";

      return label && value ? `\u2022 ${label}: ${value}` : "";
    })
    .filter(Boolean)
    .join("\n");

  return {
    processComponentsText: labels,
    processDateText,
    evaluationDatesText:
      evaluationDatesText ||
      evaluationDates.map((item) => `\u2022 ${normalizeInlineText(item)}`).join("\n"),
  };
}

function hasInlineContent(value?: string | null) {
  return normalizeInlineText(value).length > 0;
}

function hasArrayContent(values: unknown) {
  return Array.isArray(values)
    ? values.some((value) => normalizeInlineText(String(value)).length > 0)
    : false;
}

function hasProcessComponentContent(
  values: unknown,
  options: { startDate?: Date | null; endDate?: Date | null; evaluationDates?: unknown } = {},
) {
  const labels = getProcessComponentLabels(values, {
    fallbackStartDate: slashDateText(options.startDate),
    fallbackEndDate: slashDateText(options.endDate),
    fallbackEvaluationDates: Array.isArray(options.evaluationDates)
      ? (options.evaluationDates as string[])
      : [],
  });

  return labels.length > 0;
}

function hasPerformanceEntryContent(entry?: PerformanceEntry) {
  return Boolean(
    entry && (hasInlineContent(entry.courseName) || hasInlineContent(entry.performanceLevel)),
  );
}

function hasPlanRowContent(row?: BepPlanRow) {
  return Boolean(
    row &&
      (
        hasInlineContent(row.courseName) ||
        hasInlineContent(row.learningArea) ||
        hasInlineContent(row.learningOutcome) ||
        hasInlineContent(row.methodTechnique) ||
        hasInlineContent(row.materials) ||
        hasInlineContent(row.tendencies) ||
        hasInlineContent(row.evaluationMethods) ||
        hasInlineContent(row.criterion) ||
        hasInlineContent(row.performanceResult) ||
        hasProcessComponentContent(row.processComponents, {
          startDate: row.startDate,
          endDate: row.endDate,
          evaluationDates: row.evaluationDates,
        }) ||
        hasArrayContent(row.evaluationDates) ||
        row.startDate ||
        row.endDate
      )
  );
}

function hasDecisionEntryContent(entry?: DecisionEntry) {
  return Boolean(entry && (hasInlineContent(entry.title) || hasInlineContent(entry.value)));
}

function hasCommitteeMemberContent(member?: CommitteeMember) {
  return Boolean(
    member &&
      (
        hasInlineContent(member.role) ||
        hasInlineContent(member.title) ||
        hasInlineContent(member.fullName) ||
        hasInlineContent(member.branch)
      ),
  );
}

function hasSubjectTeacherContent(teacher?: SubjectTeacher) {
  return Boolean(
    teacher && (hasInlineContent(teacher.courseName) || hasInlineContent(teacher.fullName)),
  );
}

function toPdfY(page: PDFPage, top: number, height = 0) {
  return page.getHeight() - top - height;
}

function drawBox(page: PDFPage, box: Box, style: BoxStyle = {}) {
  page.drawRectangle({
    x: box.x,
    y: toPdfY(page, box.y, box.height),
    width: box.width,
    height: box.height,
    ...(style.fill ? { color: style.fill } : {}),
    ...(style.stroke
      ? {
          borderColor: style.stroke,
          borderWidth: style.strokeWidth ?? 1,
        }
      : {}),
  });
}

function drawLine(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = COLORS.border,
  thickness = 1,
) {
  page.drawLine({
    start: { x: x1, y: toPdfY(page, y1) },
    end: { x: x2, y: toPdfY(page, y2) },
    color,
    thickness,
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
  if (!text.trim()) {
    return [];
  }

  const paragraphs = text.split("\n");
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    const normalized = paragraph.trim();
    if (!normalized) {
      if (lines.length > 0) {
        lines.push("");
      }
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

function truncateLine(line: string, font: PDFFont, size: number, maxWidth: number) {
  if (font.widthOfTextAtSize(line, size) <= maxWidth) {
    return line;
  }

  const ellipsis = "...";
  let output = line;

  while (output.length > 0 && font.widthOfTextAtSize(`${output}${ellipsis}`, size) > maxWidth) {
    output = output.slice(0, -1);
  }

  return output ? `${output}${ellipsis}` : ellipsis;
}

function drawJustifiedLine(
  page: PDFPage,
  line: string,
  font: PDFFont,
  size: number,
  color: ReturnType<typeof rgb>,
  x: number,
  y: number,
  targetWidth: number,
) {
  const words = line.split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    page.drawText(line, {
      x,
      y,
      size,
      font,
      color,
    });
    return;
  }

  const naturalWidth = font.widthOfTextAtSize(words.join(" "), size);
  const extraSpacing = (targetWidth - naturalWidth) / (words.length - 1);
  const baseSpaceWidth = font.widthOfTextAtSize(" ", size);
  let currentX = x;

  words.forEach((word, index) => {
    page.drawText(word, {
      x: currentX,
      y,
      size,
      font,
      color,
    });

    currentX += font.widthOfTextAtSize(word, size);

    if (index < words.length - 1) {
      currentX += baseSpaceWidth + Math.max(0, extraSpacing);
    }
  });
}

function drawTextBox(
  page: PDFPage,
  fonts: Fonts,
  text: string,
  box: Box,
  options: TextBoxOptions = {},
) {
  const normalizedText = restoreTurkishText(text);
  const font = options.font ?? fonts.regular;
  const size = options.size ?? 9;
  const color = options.color ?? COLORS.text;
  const lineHeight = options.lineHeight ?? size * 1.22;
  const paddingX = options.paddingX ?? 6;
  const paddingY = options.paddingY ?? 6;
  const usableWidth = Math.max(1, box.width - paddingX * 2);
  const usableHeight = Math.max(1, box.height - paddingY * 2);
  const maxLines =
    options.maxLines ?? Math.max(1, Math.floor((usableHeight + 1) / lineHeight));
  const wrapped = wrapText(normalizedText, font, size, usableWidth).slice(0, maxLines);

  if (wrapped.length === 0) {
    return;
  }

  if (wrapped.length === maxLines) {
    wrapped[maxLines - 1] = truncateLine(wrapped[maxLines - 1], font, size, usableWidth);
  }

  wrapped.forEach((line, index) => {
    const lineWidth = font.widthOfTextAtSize(line, size);
    const y = toPdfY(page, box.y + paddingY + size + index * lineHeight);
    const x =
      options.align === "center"
        ? box.x + (box.width - lineWidth) / 2
        : options.align === "right"
          ? box.x + box.width - paddingX - lineWidth
          : box.x + paddingX;

    if (
      options.align === "justify" &&
      index < wrapped.length - 1 &&
      /\s/.test(line)
    ) {
      drawJustifiedLine(page, line, font, size, color, box.x + paddingX, y, usableWidth);
      return;
    }

    page.drawText(line, {
      x,
      y,
      size,
      font,
      color,
    });
  });
}

function drawPageTitle(page: PDFPage, fonts: Fonts, title: string) {
  drawTextBox(
    page,
    fonts,
    title,
    { x: 26, y: 20, width: page.getWidth() - 52, height: 20 },
    {
      font: fonts.bold,
      size: 18,
      color: COLORS.gold,
      paddingX: 0,
      paddingY: 0,
    },
  );
}

function drawPageNumber(page: PDFPage, fonts: Fonts, pageIndex: number, total: number) {
  drawTextBox(
    page,
    fonts,
    `${pageIndex} / ${total}`,
    { x: page.getWidth() - 70, y: page.getHeight() - 28, width: 44, height: 12 },
    {
      size: 8,
      color: COLORS.text,
      align: "right",
      paddingX: 0,
      paddingY: 0,
    },
  );
}

function drawLabelValueBox(
  page: PDFPage,
  fonts: Fonts,
  box: Box,
  label: string,
  value: string,
  options: {
    valueSize?: number;
    labelFill?: ReturnType<typeof rgb>;
    valueAlign?: "left" | "center" | "right" | "justify";
    valueLineHeight?: number;
  } = {},
) {
  const labelHeight = 18;
  drawBox(page, box, { stroke: COLORS.border, strokeWidth: 1 });
  drawBox(
    page,
    { x: box.x, y: box.y, width: box.width, height: labelHeight },
    { fill: options.labelFill ?? COLORS.softAlt, stroke: COLORS.border, strokeWidth: 1 },
  );
  drawTextBox(
    page,
    fonts,
    label,
    { x: box.x + 2, y: box.y + 1, width: box.width - 4, height: 16 },
    {
      font: fonts.bold,
      size: 8,
      color: COLORS.text,
      paddingX: 4,
      paddingY: 3,
    },
  );
  drawTextBox(
    page,
    fonts,
    value,
    { x: box.x, y: box.y + labelHeight, width: box.width, height: box.height - labelHeight },
    {
      align: options.valueAlign,
      size: options.valueSize ?? 9,
      lineHeight: options.valueLineHeight,
      paddingX: 6,
      paddingY: 6,
    },
  );
}

function drawTableCell(
  page: PDFPage,
  fonts: Fonts,
  box: Box,
  text: string,
  options: {
    fill?: ReturnType<typeof rgb>;
    color?: ReturnType<typeof rgb>;
    font?: PDFFont;
    size?: number;
    align?: "left" | "center" | "right" | "justify";
    paddingX?: number;
    paddingY?: number;
    lineHeight?: number;
    stroke?: ReturnType<typeof rgb>;
  } = {},
) {
  drawBox(page, box, {
    fill: options.fill,
    stroke: options.stroke ?? COLORS.border,
    strokeWidth: 1,
  });

  drawTextBox(page, fonts, text, box, {
    font: options.font,
    size: options.size ?? 8.5,
    color: options.color ?? COLORS.text,
    align: options.align,
    paddingX: options.paddingX ?? 4,
    paddingY: options.paddingY ?? 5,
    lineHeight: options.lineHeight,
  });
}

function buildStudentInfoRows(fonts: Fonts, document: FullDocument): StudentInfoRow[] {
  const labelWidth = 245;
  const valueWidth = 210;
  const labelSize = 8.2;
  const labelLineHeight = 10;
  const labelPaddingX = 5;
  const labelPaddingY = 4;
  const valueSize = 8.4;
  const valueLineHeight = valueSize * 1.22;
  const valuePaddingX = 5;
  const valuePaddingY = 5;
  const rows = [
    { label: "Ad\u0131-Soyad\u0131", value: `${document.student.firstName} ${document.student.lastName}` },
    {
      label: "S\u0131n\u0131f",
      value: [document.student.classroom, document.student.kademe]
        .map((value) => normalizeInlineText(value))
        .filter(Boolean)
        .join(" / "),
    },
    { label: "Okul Numaras\u0131", value: normalizeInlineText(document.student.schoolNumber) },
    { label: "Do\u011fum Tarihi", value: dateText(document.student.birthDate) },
    {
      label: "\u0130l/\u0130l\u00e7e \u00d6zel E\u011fitim Hizmetleri Yerle\u015ftirme Kurul Karar\u0131",
      value: normalizeBlockText(document.student.placementDecision),
    },
    {
      label: "\u00d6zel E\u011fitim \u0130htiyac\u0131na Y\u00f6nelik Ald\u0131\u011f\u0131 E\u011fitsel Tan\u0131",
      value: normalizeBlockText(document.student.diagnosis),
    },
    {
      label: "Varsa Daha \u00d6nce Ald\u0131\u011f\u0131 Okul \u0130\u00e7i ve Okul D\u0131\u015f\u0131 Destek E\u011fitim Hizmetleri ve S\u00fcresi",
      value: normalizeBlockText(document.student.previousSupport),
    },
    {
      label: "Varsa Almakta Oldu\u011fu Okul D\u0131\u015f\u0131 Destek E\u011fitim Hizmetleri ve S\u00fcresi",
      value: normalizeBlockText(document.student.currentSupport),
    },
    {
      label: "Varsa Kulland\u0131\u011f\u0131 Destek Materyalleri/Cihazlar\u0131",
      value: normalizeBlockText(document.student.supportMaterials),
    },
    {
      label: "\u00d6nemli Sa\u011fl\u0131k Bilgileri",
      value: normalizeBlockText(document.student.healthNotes),
    },
    {
      label: "E\u011fitim Ortam\u0131na \u0130li\u015fkin D\u00fczenlemeler",
      value: normalizeBlockText(document.student.educationAdjustments),
    },
    {
      label: "BEP Ba\u015flang\u0131\u00e7 Tarihi",
      value: dateText(document.startDate ?? document.student.bepStartDate),
    },
    {
      label: "BEP Biti\u015f Tarihi",
      value: dateText(document.endDate ?? document.student.bepEndDate),
    },
  ];

  return rows.map((row) => ({
    ...row,
    height: Math.max(
      24,
      Math.ceil(
        Math.max(
          measureWrappedTextHeight(row.label, fonts.regular, labelSize, labelWidth, {
            lineHeight: labelLineHeight,
            paddingX: labelPaddingX,
            paddingY: labelPaddingY,
          }),
          measureWrappedTextHeight(row.value, fonts.regular, valueSize, valueWidth, {
            lineHeight: valueLineHeight,
            paddingX: valuePaddingX,
            paddingY: valuePaddingY,
          }),
        ),
      ),
    ),
  }));
}

function buildFamilyInfoRows(fonts: Fonts, document: FullDocument): FamilyInfoRow[] {
  const labelWidth = 110;
  const columnWidth = 115;
  const labelSize = 8.2;
  const labelLineHeight = 10;
  const labelPaddingX = 4;
  const labelPaddingY = 4;
  const valueSize = 8.2;
  const valueLineHeight = valueSize * 1.22;
  const valuePaddingX = 4;
  const valuePaddingY = 5;
  const rows: Array<{ label: string; values: [string, string, string] }> = [
    {
      label: "Ad\u0131-Soyad\u0131",
      values: [
        normalizeInlineText(document.student.motherName),
        normalizeInlineText(document.student.fatherName),
        normalizeInlineText(document.student.guardianName),
      ],
    },
    {
      label: "Telefon",
      values: [
        normalizeInlineText(document.student.motherPhone),
        normalizeInlineText(document.student.fatherPhone),
        normalizeInlineText(document.student.guardianPhone),
      ],
    },
    {
      label: "Ev Adresi",
      values: [
        normalizeBlockText(document.student.motherHomeAddress),
        normalizeBlockText(document.student.fatherHomeAddress),
        normalizeBlockText(document.student.guardianHomeAddress ?? document.student.homeAddress),
      ],
    },
    {
      label: "\u0130\u015f Adresi",
      values: [
        normalizeBlockText(document.student.motherWorkAddress),
        normalizeBlockText(document.student.fatherWorkAddress),
        normalizeBlockText(document.student.guardianWorkAddress ?? document.student.workAddress),
      ],
    },
  ];

  return rows.map((row) => ({
    ...row,
    height: Math.max(
      28,
      Math.ceil(
        Math.max(
          measureWrappedTextHeight(row.label, fonts.regular, labelSize, labelWidth, {
            lineHeight: labelLineHeight,
            paddingX: labelPaddingX,
            paddingY: labelPaddingY,
          }),
          ...row.values.map((value) =>
            measureWrappedTextHeight(value, fonts.regular, valueSize, columnWidth, {
              lineHeight: valueLineHeight,
              paddingX: valuePaddingX,
              paddingY: valuePaddingY,
            }),
          ),
        ),
      ),
    ),
  }));
}

function paginateStudentInfoSection(
  fonts: Fonts,
  document: FullDocument,
): StudentInfoPageSegment[] {
  return [
    {
      studentRows: buildStudentInfoRows(fonts, document),
      familyRows: buildFamilyInfoRows(fonts, document),
    },
  ];
}

function getStudentInfoPageHeight(segment: StudentInfoPageSegment) {
  const top = 76;
  const bottom = 40;
  const studentHeaderHeight = segment.studentRows.length > 0 ? 28 : 0;
  const studentHeight = segment.studentRows.reduce((sum, row) => sum + row.height, 0);
  const familyGap = segment.studentRows.length > 0 && segment.familyRows.length > 0 ? 22 : 0;
  const familyTitleHeight = segment.familyRows.length > 0 ? 28 : 0;
  const familyHeaderHeight = segment.familyRows.length > 0 ? 26 : 0;
  const familyHeight = segment.familyRows.reduce((sum, row) => sum + row.height, 0);

  return Math.max(
    PORTRAIT.height,
    top +
      studentHeaderHeight +
      studentHeight +
      familyGap +
      familyTitleHeight +
      familyHeaderHeight +
      familyHeight +
      bottom,
  );
}

function drawStudentInfoPage(
  page: PDFPage,
  fonts: Fonts,
  segment: StudentInfoPageSegment,
) {
  drawPageTitle(page, fonts, "I- \u00d6\u011frenciye Ait Bilgiler");

  const studentTableX = 70;
  const studentTableWidth = 455;
  const studentLabelWidth = 245;
  const studentValueWidth = studentTableWidth - studentLabelWidth;
  const studentHeaderHeight = 28;
  const familyTableX = 70;
  const familyTableWidth = 455;
  const familyLabelWidth = 110;
  const familyColumnWidth = 115;
  const familyTitleHeight = 28;
  const familyHeaderHeight = 26;
  const familyColumns = ["Anne", "Baba", "Veli/Vasi"];
  let currentY = 76;

  if (segment.studentRows.length > 0) {
    drawTableCell(
      page,
      fonts,
      { x: studentTableX, y: currentY, width: studentTableWidth, height: studentHeaderHeight },
      "\u00d6\u011frenci ile \u0130lgili Bilgiler",
      {
        fill: COLORS.border,
        color: COLORS.white,
        font: fonts.bold,
        size: 9.2,
        align: "center",
        paddingX: 8,
        paddingY: 7,
      },
    );
    currentY += studentHeaderHeight;

    segment.studentRows.forEach((row) => {
      drawTableCell(
        page,
        fonts,
        { x: studentTableX, y: currentY, width: studentLabelWidth, height: row.height },
        row.label,
        {
          fill: COLORS.softAlt,
          size: 8.2,
          paddingX: 5,
          paddingY: 4,
          lineHeight: 10,
        },
      );
      drawTableCell(
        page,
        fonts,
        { x: studentTableX + studentLabelWidth, y: currentY, width: studentValueWidth, height: row.height },
        row.value,
        {
          align: "justify",
          size: 8.4,
          paddingX: 5,
          paddingY: 5,
          lineHeight: 8.4 * 1.22,
        },
      );
      currentY += row.height;
    });
  }

  if (segment.familyRows.length > 0) {
    currentY += segment.studentRows.length > 0 ? 22 : 0;
    drawTableCell(
      page,
      fonts,
      { x: familyTableX, y: currentY, width: familyTableWidth, height: familyTitleHeight },
      "Aile ile \u0130lgili Bilgiler",
      {
        fill: COLORS.border,
        color: COLORS.white,
        font: fonts.bold,
        size: 9.2,
        align: "center",
        paddingX: 8,
        paddingY: 7,
      },
    );
    currentY += familyTitleHeight;

    drawTableCell(
      page,
      fonts,
      { x: familyTableX, y: currentY, width: familyLabelWidth, height: familyHeaderHeight },
      "",
      {
        fill: COLORS.softAlt,
        paddingY: 6,
      },
    );
    familyColumns.forEach((column, index) => {
      drawTableCell(
        page,
        fonts,
        {
          x: familyTableX + familyLabelWidth + index * familyColumnWidth,
          y: currentY,
          width: familyColumnWidth,
          height: familyHeaderHeight,
        },
        column,
        {
          fill: COLORS.softAlt,
          font: fonts.bold,
          size: 8.4,
          align: "center",
          paddingX: 4,
          paddingY: 6,
        },
      );
    });
    currentY += familyHeaderHeight;

    segment.familyRows.forEach((row) => {
      drawTableCell(
        page,
        fonts,
        { x: familyTableX, y: currentY, width: familyLabelWidth, height: row.height },
        row.label,
        {
          fill: COLORS.softAlt,
          size: 8.2,
          paddingX: 4,
          paddingY: 4,
          lineHeight: 10,
        },
      );
      row.values.forEach((value, index) => {
        drawTableCell(
          page,
          fonts,
          {
            x: familyTableX + familyLabelWidth + index * familyColumnWidth,
            y: currentY,
            width: familyColumnWidth,
            height: row.height,
          },
          value,
          {
            align: "justify",
            size: 8.2,
            paddingX: 4,
            paddingY: 5,
            lineHeight: 8.2 * 1.22,
          },
        );
      });
      currentY += row.height;
    });
  }
}

function drawFrontCoverPage(
  page: PDFPage,
  fonts: Fonts,
  document: FullDocument,
  mebLogo: PDFImage | null,
) {
  const panel = { x: 54, y: 66, width: page.getWidth() - 108, height: page.getHeight() - 128 };
  const shadowOffset = 10;

  drawBox(
    page,
    {
      x: panel.x + shadowOffset,
      y: panel.y + shadowOffset,
      width: panel.width,
      height: panel.height,
    },
    { fill: rgb(0.88, 0.90, 0.93) },
  );
  drawBox(page, panel, { fill: COLORS.page, stroke: COLORS.border, strokeWidth: 1.2 });

  if (mebLogo) {
    const targetWidth = 136;
    const targetHeight = (targetWidth * mebLogo.height) / mebLogo.width;
    page.drawImage(mebLogo, {
      x: panel.x + panel.width / 2 - targetWidth / 2,
      y: toPdfY(page, panel.y + 70, targetHeight),
      width: targetWidth,
      height: targetHeight,
    });
  }

  drawTextBox(
    page,
    fonts,
    "BİREYSELLEŞTİRİLMİŞ EĞİTİM",
    { x: panel.x + 32, y: panel.y + 198, width: panel.width - 64, height: 24 },
    {
      font: fonts.regular,
      size: 18,
      color: COLORS.gold,
      align: "center",
      paddingX: 0,
      paddingY: 0,
    },
  );
  drawTextBox(
    page,
    fonts,
    "PROGRAMI DOSYASI",
    { x: panel.x + 32, y: panel.y + 236, width: panel.width - 64, height: 24 },
    {
      font: fonts.regular,
      size: 18,
      color: COLORS.gold,
      align: "center",
      paddingX: 0,
      paddingY: 0,
    },
  );

  const infoBox = { x: panel.x + 56, y: panel.y + 420, width: panel.width - 112, height: 112 };
  drawBox(page, infoBox, { fill: COLORS.softAlt, stroke: COLORS.border, strokeWidth: 1 });

  drawTextBox(
    page,
    fonts,
    "ÖĞRENCİNİN",
    { x: infoBox.x + 16, y: infoBox.y + 16, width: infoBox.width - 32, height: 14 },
    {
      font: fonts.bold,
      size: 8.5,
      paddingX: 0,
      paddingY: 0,
    },
  );

  const labels = ["ADI SOYADI:", "OKULU:", "NUMARASI:"];
  const values = [
    `${document.student.firstName} ${document.student.lastName}`,
    normalizeInlineText(document.student.schoolName) || "-",
    normalizeInlineText(document.student.schoolNumber) || "-",
  ];

  labels.forEach((label, index) => {
    const top = infoBox.y + 38 + index * 24;
    drawTextBox(page, fonts, label, { x: infoBox.x + 16, y: top, width: 120, height: 14 }, {
      font: fonts.bold,
      size: 8.5,
      paddingX: 0,
      paddingY: 0,
    });
    drawTextBox(
      page,
      fonts,
      values[index] ?? "-",
      { x: infoBox.x + 140, y: top, width: infoBox.width - 156, height: 14 },
      {
        size: 8.8,
        paddingX: 0,
        paddingY: 0,
      },
    );
  });
}

function getPerformanceEntries(document: FullDocument) {
  return document.performanceEntries
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .filter(hasPerformanceEntryContent);
}

function getPerformanceRowHeight(
  fonts: Fonts,
  courseWidth: number,
  performanceWidth: number,
  entry?: PerformanceEntry,
) {
  const courseHeight = measureWrappedTextHeight(
    normalizeInlineText(entry?.courseName),
    fonts.regular,
    9,
    courseWidth,
    { lineHeight: 11, paddingX: 4, paddingY: 6 },
  );
  const performanceHeight = measureWrappedTextHeight(
    normalizeBlockText(entry?.performanceLevel),
    fonts.regular,
    9,
    performanceWidth,
    { lineHeight: 11, paddingX: 4, paddingY: 6 },
  );

  return Math.min(180, Math.max(44, Math.ceil(Math.max(courseHeight, performanceHeight))));
}

function drawPerformancePageSegment(
  page: PDFPage,
  fonts: Fonts,
  entries: PerformanceEntry[],
  startIndex: number,
  introItem?: AdaptiveLabelValuePageItem,
) {
  drawPageTitle(page, fonts, "II- E\u011fitsel Performans D\u00fczeyi");

  const tableX = 22;
  let tableY = 56;
  const tableWidth = 551;
  const courseWidth = 140;
  const performanceWidth = tableWidth - courseWidth;
  const headerHeight = 34;
  const pageBottom = page.getHeight() - 40;

  if (introItem) {
    drawLabelValueBox(
      page,
      fonts,
      { x: tableX, y: tableY, width: tableWidth, height: introItem.height },
      introItem.label,
      introItem.value,
      {
        labelFill: introItem.labelFill,
        valueSize: introItem.valueSize,
        valueAlign: "justify",
        valueLineHeight: introItem.valueSize ? introItem.valueSize * 1.22 : undefined,
      },
    );
    tableY += introItem.height + 16;
  }

  drawTableCell(
    page,
    fonts,
    { x: tableX, y: tableY, width: courseWidth, height: headerHeight },
    "Ders",
    { fill: COLORS.teal, color: COLORS.white, font: fonts.bold, align: "center", size: 10 },
  );
  drawTableCell(
    page,
    fonts,
    {
      x: tableX + courseWidth,
      y: tableY,
      width: performanceWidth,
      height: headerHeight,
    },
    "Performans D\u00fczeyi",
    { fill: COLORS.teal, color: COLORS.white, font: fonts.bold, align: "center", size: 10 },
  );

  let currentTop = tableY + headerHeight;
  let nextIndex = startIndex;

  while (nextIndex < entries.length) {
    const entry = entries[nextIndex];
    const rowHeight = getPerformanceRowHeight(fonts, courseWidth, performanceWidth, entry);

    if (currentTop + rowHeight > pageBottom) {
      break;
    }

    drawTableCell(
      page,
      fonts,
      { x: tableX, y: currentTop, width: courseWidth, height: rowHeight },
      normalizeInlineText(entry?.courseName),
      { size: 9, paddingY: 6 },
    );
    drawTableCell(
      page,
      fonts,
      {
        x: tableX + courseWidth,
        y: currentTop,
        width: performanceWidth,
        height: rowHeight,
      },
      normalizeBlockText(entry?.performanceLevel),
      { size: 9, paddingY: 6, align: "justify", lineHeight: 9 * 1.22 },
    );
    currentTop += rowHeight;
    nextIndex += 1;
  }

  return {
    nextIndex,
    completed: nextIndex >= entries.length,
  };
}

function measureWrappedTextHeight(
  text: string,
  font: PDFFont,
  size: number,
  width: number,
  options: {
    lineHeight?: number;
    paddingX?: number;
    paddingY?: number;
  } = {},
) {
  const lineHeight = options.lineHeight ?? size * 1.22;
  const paddingX = options.paddingX ?? 4;
  const paddingY = options.paddingY ?? 5;
  const usableWidth = Math.max(1, width - paddingX * 2);
  const wrapped = wrapText(text, font, size, usableWidth);
  const lineCount = Math.max(1, wrapped.length);
  return lineCount * lineHeight + paddingY * 2;
}

function getAdaptiveLabelValueBoxHeight(
  fonts: Fonts,
  item: AdaptiveLabelValueItem,
  width: number,
) {
  const valueHeight = measureWrappedTextHeight(
    item.value,
    fonts.regular,
    item.valueSize ?? 9,
    width,
    {
      lineHeight: item.lineHeight,
      paddingX: item.paddingX ?? 6,
      paddingY: item.paddingY ?? 6,
    },
  );

  return Math.max(item.minHeight ?? 56, Math.ceil(18 + valueHeight));
}

function splitAdaptiveLabelValueItem(
  fonts: Fonts,
  item: AdaptiveLabelValueItem,
  width: number,
  maxHeight: number,
) {
  const maxBoxHeight = Math.max(item.minHeight ?? 56, maxHeight);
  const itemHeight = getAdaptiveLabelValueBoxHeight(fonts, item, width);

  if (itemHeight <= maxBoxHeight) {
    return [item];
  }

  const size = item.valueSize ?? 9;
  const lineHeight = item.lineHeight ?? size * 1.22;
  const paddingX = item.paddingX ?? 6;
  const paddingY = item.paddingY ?? 6;
  const usableWidth = Math.max(1, width - paddingX * 2);
  const wrappedLines = wrapText(item.value, fonts.regular, size, usableWidth);
  const maxLines = Math.max(
    1,
    Math.floor((maxBoxHeight - 18 - paddingY * 2 + 1) / lineHeight),
  );

  if (wrappedLines.length <= maxLines) {
    return [{ ...item, minHeight: undefined }];
  }

  const chunks: AdaptiveLabelValueItem[] = [];

  for (let index = 0; index < wrappedLines.length; index += maxLines) {
    chunks.push({
      ...item,
      value: wrappedLines.slice(index, index + maxLines).join("\n"),
      minHeight: undefined,
    });
  }

  return chunks;
}

function buildAdaptiveLabelValuePages(
  fonts: Fonts,
  items: AdaptiveLabelValueItem[],
  width: number,
  pageTop: number,
  pageBottom: number,
  gap: number,
) {
  const maxItemHeight = pageBottom - pageTop;
  const preparedItems = items
    .flatMap((item) => splitAdaptiveLabelValueItem(fonts, item, width, maxItemHeight))
    .map((item) => ({
      ...item,
      height: getAdaptiveLabelValueBoxHeight(fonts, item, width),
    }));

  const pages: AdaptiveLabelValuePageItem[][] = [];
  let currentPage: AdaptiveLabelValuePageItem[] = [];
  let currentTop = pageTop;

  preparedItems.forEach((item) => {
    const nextTop = currentPage.length > 0 ? currentTop + gap : currentTop;
    if (nextTop + item.height > pageBottom && currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [item];
      currentTop = pageTop + item.height;
      return;
    }

    currentPage.push(item);
    currentTop = nextTop + item.height;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

function drawAdaptiveLabelValuePage(
  page: PDFPage,
  fonts: Fonts,
  title: string,
  items: AdaptiveLabelValuePageItem[],
  options: {
    x: number;
    top: number;
    width: number;
    gap: number;
  },
) {
  drawPageTitle(page, fonts, title);

  let currentTop = options.top;
  items.forEach((item, index) => {
    if (index > 0) {
      currentTop += options.gap;
    }

    drawLabelValueBox(
      page,
      fonts,
      { x: options.x, y: currentTop, width: options.width, height: item.height },
      item.label,
      item.value,
      {
        labelFill: item.labelFill,
        valueSize: item.valueSize,
        valueAlign: "justify",
        valueLineHeight: item.lineHeight ?? (item.valueSize ? item.valueSize * 1.22 : undefined),
      },
    );

    currentTop += item.height;
  });
}

function getPerformanceIntroItems(document: FullDocument): AdaptiveLabelValueItem[] {
  return hasInlineContent(document.student.developmentHistory)
    ? [
        {
          label: "Geli\u015fim \u00d6yk\u00fcs\u00fc",
          value: normalizeBlockText(document.student.developmentHistory),
          valueSize: 9.5,
          minHeight: 120,
        },
      ]
    : [];
}

function getProfileItems(document: FullDocument): AdaptiveLabelValueItem[] {
  return [
    {
      label: "G\u00fc\u00e7l\u00fc Y\u00f6nler",
      value: normalizeBlockText(document.student.strengths) || "-",
      valueSize: 9.5,
      minHeight: 110,
    },
    {
      label: "Geli\u015ftirilmesi Gereken Alanlar",
      value: normalizeBlockText(document.student.improvementAreas) || "-",
      valueSize: 9.5,
      minHeight: 110,
    },
    {
      label: "Davran\u0131\u015f ve S\u0131n\u0131f \u0130\u00e7i G\u00f6zlem Notlar\u0131",
      value: normalizeBlockText(document.student.behaviorNotes) || "-",
      valueSize: 9.5,
      minHeight: 110,
    },
  ];
}

type PlanRowGroup = {
  courseName: string;
  rows: BepPlanRow[];
};

type PlanDisplayRow = {
  learningArea: string;
  learningOutcome: string;
  processComponent: string;
  criterion: string;
  methodTechnique: string;
  materials: string;
  tendencies: string;
  dateRange: string;
  evaluationMethods: string;
  evaluationDate: string;
  performanceResult: string;
};

type PreparedPlanSection = {
  courseName: string;
  splitOutcomeAndProcess: boolean;
  titleHeight: number;
  headerHeight: number;
  displayRows: PlanDisplayRow[];
  rowHeights: number[];
};

type PlanPageSection = {
  courseName: string;
  splitOutcomeAndProcess: boolean;
  titleHeight: number;
  headerHeight: number;
  displayRows: PlanDisplayRow[];
  rowHeights: number[];
};

type BepPdfPage = {
  page: PDFPage;
  render: () => void;
};

type PerformancePdfPage = {
  page: PDFPage;
  startIndex: number;
  introItem?: AdaptiveLabelValuePageItem;
};

type AdaptiveLabelValueItem = {
  label: string;
  value: string;
  valueSize?: number;
  labelFill?: ReturnType<typeof rgb>;
  minHeight?: number;
  lineHeight?: number;
  paddingX?: number;
  paddingY?: number;
};

type AdaptiveLabelValuePageItem = AdaptiveLabelValueItem & {
  height: number;
};

type StudentInfoRow = {
  label: string;
  value: string;
  height: number;
};

type FamilyInfoRow = {
  label: string;
  values: [string, string, string];
  height: number;
};

type StudentInfoPageSegment = {
  studentRows: StudentInfoRow[];
  familyRows: FamilyInfoRow[];
};

function buildPlanRowGroups(document: FullDocument) {
  const groups: PlanRowGroup[] = [];

  document.planRows
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .filter(hasPlanRowContent)
    .forEach((row) => {
      const courseName = normalizeInlineText(row.courseName) || "Ders belirtilmedi";
      const lastGroup = groups[groups.length - 1];

      if (lastGroup && lastGroup.courseName === courseName) {
        lastGroup.rows.push(row);
        return;
      }

      groups.push({ courseName, rows: [row] });
    });

  return groups;
}

function shouldSplitOutcomeAndProcess(rows: BepPlanRow[]) {
  return rows.some((row) =>
    hasProcessComponentContent(row.processComponents, {
      startDate: row.startDate,
      endDate: row.endDate,
      evaluationDates: row.evaluationDates,
    }),
  );
}

function getPlanTableLayoutByWidth(pageWidth: number, splitOutcomeAndProcess: boolean) {
  const tableX = 18;
  const widths = splitOutcomeAndProcess
    ? [50, 98, 84, 48, 66, 64, 52, 52, 74, 76, 42]
    : [54, 158, 50, 70, 68, 54, 52, 80, 82, 44];
  const availableWidth = pageWidth - tableX * 2;
  const scale = availableWidth / widths.reduce((total, value) => total + value, 0);
  const columnWidths = widths.map((value) => value * scale);
  const columnXs = columnWidths.reduce<number[]>((positions, width, index) => {
    const previous = index === 0 ? tableX : positions[index - 1] + columnWidths[index - 1];
    positions.push(previous);
    return positions;
  }, []);
  const mergedLeftWidth = columnWidths.slice(0, 7).reduce((total, value) => total + value, 0);
  const mergedRightWidth = columnWidths.slice(7).reduce((total, value) => total + value, 0);
  return {
    tableX,
    columnWidths,
    columnXs,
    mergedLeftWidth,
    mergedRightWidth,
    headerHeight: 48,
  };
}

function getPlanTableLayout(page: PDFPage, splitOutcomeAndProcess: boolean) {
  return getPlanTableLayoutByWidth(page.getWidth(), splitOutcomeAndProcess);
}

function getPlanSectionTitleHeight(fonts: Fonts, mergedLeftWidth: number, courseName: string) {
  const courseNameHeight = Math.max(
    14,
    Math.ceil(
      measureWrappedTextHeight(courseName, fonts.bold, 11.5, mergedLeftWidth - 20, {
        lineHeight: 12.8,
        paddingX: 0,
        paddingY: 0,
      }),
    ),
  );

  return Math.max(34, 12 + courseNameHeight + 10);
}

function buildPlanDisplayRows(row: BepPlanRow | undefined, splitOutcomeAndProcess: boolean) {
  const learningArea = normalizeInlineText(row?.learningArea);
  const learningOutcome = normalizeBlockText(row?.learningOutcome);
  const criterion = normalizeInlineText(row?.criterion);
  const methodTechnique = normalizeBlockText(row?.methodTechnique);
  const materials = normalizeBlockText(row?.materials);
  const tendencies = normalizeBlockText(row?.tendencies);
  const evaluationMethods = normalizeBlockText(row?.evaluationMethods);
  const performanceResult = normalizeInlineText(row?.performanceResult);
  const processComponentValues = getProcessComponentScheduleValues(row);
  const schedules = row
    ? parseProcessComponentSchedules(row.processComponents, {
        fallbackStartDate: row.startDate ? row.startDate.toISOString().slice(0, 10) : "",
        fallbackEndDate: row.endDate ? row.endDate.toISOString().slice(0, 10) : "",
        fallbackEvaluationDates: Array.isArray(row.evaluationDates) ? (row.evaluationDates as string[]) : [],
      })
    : [];

  if (splitOutcomeAndProcess && schedules.length > 0) {
    return schedules.map((schedule) => ({
      learningArea,
      learningOutcome,
      processComponent: normalizeInlineText(schedule.label),
      criterion,
      methodTechnique,
      materials,
      tendencies,
      dateRange:
        dottedDateText(schedule.startDate) && dottedDateText(schedule.endDate)
          ? `${dottedDateText(schedule.startDate)} - ${dottedDateText(schedule.endDate)}`
          : dottedDateText(schedule.startDate) || dottedDateText(schedule.endDate) || "-",
      evaluationMethods,
      evaluationDate:
        schedule.evaluationDate ||
        formatProcessComponentEvaluationDate(schedule.endDate) ||
        "-",
      performanceResult,
    })) satisfies PlanDisplayRow[];
  }

  return [
    {
      learningArea,
      learningOutcome,
      processComponent: processComponentValues.processComponentsText,
      criterion,
      methodTechnique,
      materials,
      tendencies,
      dateRange: processComponentValues.processDateText || (row ? dateRangeText(row.startDate, row.endDate) : ""),
      evaluationMethods,
      evaluationDate: processComponentValues.evaluationDatesText,
      performanceResult,
    },
  ] satisfies PlanDisplayRow[];
}

function getPlanDisplayRowValues(row: PlanDisplayRow, splitOutcomeAndProcess: boolean) {
  if (splitOutcomeAndProcess) {
    return [
      row.learningArea,
      row.learningOutcome,
      row.processComponent,
      row.criterion,
      row.methodTechnique,
      row.materials,
      row.tendencies,
      row.dateRange,
      row.evaluationMethods,
      row.evaluationDate,
      row.performanceResult,
    ];
  }

  return [
    row.learningArea,
    [row.learningOutcome, row.processComponent].filter(Boolean).join("\n"),
    row.criterion,
    row.methodTechnique,
    row.materials,
    row.tendencies,
    row.dateRange,
    row.evaluationMethods,
    row.evaluationDate,
    row.performanceResult,
  ];
}

function getPlanRowHeight(
  fonts: Fonts,
  columnWidths: number[],
  row: PlanDisplayRow,
  splitOutcomeAndProcess: boolean,
) {
  const values = getPlanDisplayRowValues(row, splitOutcomeAndProcess);
  const baseSizes = splitOutcomeAndProcess
    ? [7.1, 7.1, 7.1, 7.1, 7.1, 7.1, 7.1, 7.1, 7.1, 7.1, 10.2]
    : [7.2, 7.2, 7.2, 7.2, 7.2, 7.2, 7.2, 7.2, 7.2, 10.2];
  const performanceColumnIndex = values.length - 1;
  const minRowHeight = 34;

  const preferredHeight = values.reduce((height, value, index) => {
    const textHeight = measureWrappedTextHeight(
      value,
      index === performanceColumnIndex ? fonts.bold : fonts.regular,
      baseSizes[index],
      columnWidths[index],
      {
        lineHeight: index === performanceColumnIndex ? 10.8 : 8.8,
        paddingX: 3,
        paddingY: 3,
      },
    );
    return Math.max(height, textHeight);
  }, minRowHeight);

  return Math.max(minRowHeight, Math.ceil(preferredHeight));
}

function buildPreparedPlanSections(
  fonts: Fonts,
  pageWidth: number,
  groups: PlanRowGroup[],
) {
  return groups.map((group) => {
    const splitOutcomeAndProcess = shouldSplitOutcomeAndProcess(group.rows);
    const { columnWidths, mergedLeftWidth, headerHeight } = getPlanTableLayoutByWidth(
      pageWidth,
      splitOutcomeAndProcess,
    );
    const titleHeight = getPlanSectionTitleHeight(fonts, mergedLeftWidth, group.courseName);
    const displayRows = group.rows.flatMap((row) =>
      buildPlanDisplayRows(row, splitOutcomeAndProcess),
    );
    const rowHeights = displayRows.map((displayRow) =>
      getPlanRowHeight(fonts, columnWidths, displayRow, splitOutcomeAndProcess),
    );

    return {
      courseName: group.courseName,
      splitOutcomeAndProcess,
      titleHeight,
      headerHeight,
      displayRows,
      rowHeights,
    } satisfies PreparedPlanSection;
  });
}

function buildPlanPages(
  fonts: Fonts,
  pageWidth: number,
  pageHeight: number,
  groups: PlanRowGroup[],
) {
  const preparedSections = buildPreparedPlanSections(fonts, pageWidth, groups);
  const pageTop = 48;
  const pageBottom = pageHeight - 32;
  const sectionGap = 10;
  const pages: PlanPageSection[][] = [];
  let currentPage: PlanPageSection[] = [];
  let currentTop = pageTop;

  const pushCurrentPage = () => {
    if (currentPage.length > 0) {
      pages.push(currentPage);
      currentPage = [];
    }
    currentTop = pageTop;
  };

  preparedSections.forEach((section) => {
    let rowIndex = 0;

    while (rowIndex < section.displayRows.length) {
      const sectionIntroHeight = section.titleHeight + section.headerHeight;

      if (currentTop + sectionIntroHeight > pageBottom) {
        pushCurrentPage();
      }

      let consumedHeight = 0;
      let nextRowIndex = rowIndex;

      while (nextRowIndex < section.rowHeights.length) {
        const nextRowHeight = section.rowHeights[nextRowIndex] ?? 0;
        if (currentTop + sectionIntroHeight + consumedHeight + nextRowHeight > pageBottom) {
          break;
        }

        consumedHeight += nextRowHeight;
        nextRowIndex += 1;
      }

      if (nextRowIndex === rowIndex) {
        pushCurrentPage();
        continue;
      }

      currentPage.push({
        courseName: section.courseName,
        splitOutcomeAndProcess: section.splitOutcomeAndProcess,
        titleHeight: section.titleHeight,
        headerHeight: section.headerHeight,
        displayRows: section.displayRows.slice(rowIndex, nextRowIndex),
        rowHeights: section.rowHeights.slice(rowIndex, nextRowIndex),
      });

      currentTop += sectionIntroHeight + consumedHeight;
      rowIndex = nextRowIndex;

      const hasMoreContent =
        rowIndex < section.displayRows.length ||
        preparedSections.indexOf(section) < preparedSections.length - 1;

      if (hasMoreContent) {
        if (currentTop + sectionGap > pageBottom) {
          pushCurrentPage();
        } else {
          currentTop += sectionGap;
        }
      }
    }
  });

  pushCurrentPage();

  return pages;
}

function hasEnvironmentContent(document: FullDocument) {
  return [
    document.learningEnvironmentText,
    document.physicalEnvironmentText,
    document.socialInteractionText,
    document.digitalSupportsText,
  ].some(hasInlineContent);
}

function getSchoolServiceRows(document: FullDocument) {
  if (document.supportServiceEntries.length > 0) {
    return document.supportServiceEntries.filter(
      (entry) =>
        hasInlineContent(entry.serviceType) ||
        hasInlineContent(entry.courseName) ||
        hasInlineContent(entry.weeklyDuration) ||
        hasInlineContent(entry.responsiblePeople),
    );
  }

  return document.decisionEntries
    .filter((entry) => entry.category === "school_service")
    .filter(hasDecisionEntryContent)
    .map((entry) => ({
      id: entry.id,
      documentId: document.id,
      sortOrder: entry.sortOrder,
      serviceType: entry.title,
      courseName: entry.value,
      weeklyDuration: "",
      responsiblePeople: "",
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    }));
}

function getFamilyDecisionText(document: FullDocument) {
  return document.decisionEntries
    .filter((entry) => entry.category === "family_process")
    .map((entry) => `${normalizeInlineText(entry.title)}: ${normalizeInlineText(entry.value)}`)
    .filter(Boolean)
    .join("\n");
}

function hasFamilyContent(document: FullDocument) {
  return (
    hasInlineContent(document.familyFrequency) ||
    hasInlineContent(document.familyMethod) ||
    document.familyTrainingRequired ||
    hasInlineContent(document.familyTrainingMethod) ||
    hasInlineContent(getFamilyDecisionText(document))
  );
}

function getEvaluationDecisions(document: FullDocument) {
  const otherEntries = document.decisionEntries
    .filter((entry) => entry.category === "other")
    .map((entry) => `${normalizeInlineText(entry.title)}: ${normalizeInlineText(entry.value)}`)
    .filter(Boolean);

  return [
    normalizeInlineText(document.otherDecisionOne),
    normalizeInlineText(document.otherDecisionTwo),
    normalizeInlineText(document.otherDecisionThree),
    ...otherEntries,
  ].filter(Boolean);
}

function hasEvaluationContent(document: FullDocument) {
  return (
    getEvaluationDecisions(document).length > 0 ||
    Boolean(document.nextMeetingDate) ||
    hasInlineContent(document.generalEvaluation)
  );
}

function hasProfileContent(document: FullDocument) {
  return [
    document.student.strengths,
    document.student.improvementAreas,
    document.student.behaviorNotes,
  ].some(hasInlineContent);
}

function drawPreparedPlanSection(
  page: PDFPage,
  fonts: Fonts,
  section: PlanPageSection,
  top: number,
) {
  const {
    tableX,
    columnWidths,
    columnXs,
    mergedLeftWidth,
    mergedRightWidth,
  } = getPlanTableLayout(page, section.splitOutcomeAndProcess);

  drawBox(
    page,
    { x: tableX, y: top, width: mergedLeftWidth, height: section.titleHeight },
    { fill: COLORS.teal, stroke: COLORS.border, strokeWidth: 1 },
  );
  drawTextBox(
    page,
    fonts,
    section.courseName.toLocaleUpperCase("tr-TR"),
    { x: tableX + 10, y: top + 5, width: mergedLeftWidth - 20, height: section.titleHeight - 10 },
    {
      font: fonts.bold,
      size: 11.5,
      color: COLORS.white,
      align: "center",
      paddingX: 0,
      paddingY: 0,
      lineHeight: 12.8,
    },
  );
  drawTableCell(
    page,
    fonts,
    { x: tableX + mergedLeftWidth, y: top, width: mergedRightWidth, height: section.titleHeight },
    "\u00d6l\u00e7me - De\u011ferlendirme",
    { fill: COLORS.teal, color: COLORS.white, font: fonts.bold, align: "center", size: 11 },
  );

  const headerY = top + section.titleHeight;
  const headerLabels = section.splitOutcomeAndProcess
    ? [
        "\u00d6\u011frenme\nAlan\u0131",
        "\u00d6\u011frenme\n\u00c7\u0131kt\u0131s\u0131",
        "S\u00fcre\u00e7\nBile\u015fenleri",
        "\u00d6l\u00e7\u00fct",
        "Y\u00f6ntem /\nTeknik",
        "Materyaller",
        "E\u011filimler",
        "Ba\u015flama /\nBiti\u015f",
        "De\u011ferlendirme\nY\u00f6ntemleri",
        "De\u011ferlendirme\nTarihleri",
        "Performans",
      ]
    : [
        "\u00d6\u011frenme\nAlan\u0131",
        "\u00c7\u0131kt\u0131 /\nS\u00fcre\u00e7",
        "\u00d6l\u00e7\u00fct",
        "Y\u00f6ntem /\nTeknik",
        "Materyaller",
        "E\u011filimler",
        "Ba\u015flama /\nBiti\u015f",
        "De\u011ferlendirme\nY\u00f6ntemleri",
        "De\u011ferlendirme\nTarihleri",
        "Performans",
      ];

  headerLabels.forEach((label, index) => {
    const isPerformanceHeader = label === "Performans";
    drawTableCell(
      page,
      fonts,
      {
        x: columnXs[index],
        y: headerY,
        width: columnWidths[index],
        height: section.headerHeight,
      },
      label,
      {
        fill: COLORS.teal,
        color: COLORS.white,
        font: fonts.bold,
        align: "center",
        size: isPerformanceHeader ? 6.8 : 7.3,
        paddingX: isPerformanceHeader ? 2 : 3,
        paddingY: isPerformanceHeader ? 2 : 3,
        lineHeight: isPerformanceHeader ? 7.4 : undefined,
      },
    );
  });

  let currentRowTop = headerY + section.headerHeight;
  const performanceColumnIndex =
    getPlanDisplayRowValues(section.displayRows[0] ?? {
      learningArea: "",
      learningOutcome: "",
      processComponent: "",
      criterion: "",
      methodTechnique: "",
      materials: "",
      tendencies: "",
      dateRange: "",
      evaluationMethods: "",
      evaluationDate: "",
      performanceResult: "",
    }, section.splitOutcomeAndProcess).length - 1;

  section.displayRows.forEach((displayRow, rowIndex) => {
    const values = getPlanDisplayRowValues(displayRow, section.splitOutcomeAndProcess);
    const currentRowHeight =
      section.rowHeights[rowIndex] ??
      getPlanRowHeight(fonts, columnWidths, displayRow, section.splitOutcomeAndProcess);

    values.forEach((value, cellIndex) => {
      drawTableCell(
        page,
        fonts,
        {
          x: columnXs[cellIndex],
          y: currentRowTop,
          width: columnWidths[cellIndex],
          height: currentRowHeight,
        },
        value,
        {
          size: cellIndex === performanceColumnIndex ? 10.2 : 7.1,
          align: cellIndex === performanceColumnIndex ? "center" : "left",
          font: cellIndex === performanceColumnIndex ? fonts.bold : fonts.regular,
          paddingX: 3,
          paddingY: 3,
        },
      );
    });

    currentRowTop += currentRowHeight;
  });
}

function drawPlanPage(
  page: PDFPage,
  fonts: Fonts,
  sections: PlanPageSection[],
) {
  drawPageTitle(page, fonts, "III- Bireyselle\u015ftirilmi\u015f E\u011fitim Plan\u0131");

  const sectionGap = 10;
  let currentTop = 48;

  sections.forEach((section, index) => {
    drawPreparedPlanSection(page, fonts, section, currentTop);
    currentTop +=
      section.titleHeight +
      section.headerHeight +
      section.rowHeights.reduce((sum, value) => sum + value, 0);
    if (index < sections.length - 1) {
      currentTop += sectionGap;
    }
  });
}

function getEnvironmentItems(document: FullDocument): AdaptiveLabelValueItem[] {
  return [
    {
      label: "E\u011fitim Ortam\u0131 D\u00fczenlemeleri",
      value: normalizeBlockText(document.learningEnvironmentText) || "-",
      minHeight: 90,
    },
    {
      label: "Fiziksel Ortam D\u00fczenlemeleri",
      value: normalizeBlockText(document.physicalEnvironmentText) || "-",
      minHeight: 90,
    },
    {
      label: "Sosyal Etkile\u015fim Ortamlar\u0131",
      value: normalizeBlockText(document.socialInteractionText) || "-",
      minHeight: 90,
    },
    {
      label: "Dijital Destekler",
      value: normalizeBlockText(document.digitalSupportsText) || "-",
      minHeight: 90,
    },
  ];
}

function getSchoolServiceRowHeight(
  fonts: Fonts,
  widths: number[],
  row?: BepSupportServiceEntry,
) {
  const values = [
    normalizeInlineText(row?.serviceType),
    normalizeInlineText(row?.courseName),
    normalizeInlineText(row?.weeklyDuration),
    normalizeBlockText(row?.responsiblePeople),
  ];

  return Math.min(
    120,
    Math.max(
      42,
      Math.ceil(
        Math.max(
          ...values.map((value, index) =>
            measureWrappedTextHeight(value, fonts.regular, 9, widths[index], {
              lineHeight: 11,
              paddingX: 4,
              paddingY: 5,
            }),
          ),
        ),
      ),
    ),
  );
}

function drawSchoolServicesPage(
  page: PDFPage,
  fonts: Fonts,
  rows: BepSupportServiceEntry[],
  startIndex: number,
) {
  drawPageTitle(page, fonts, "IV- BEP Geli\u015ftirme Birim Kararlar\u0131");

  const tableX = 24;
  const tableY = 64;
  const baseWidths = [180, 180, 120, 180];
  const availableWidth = page.getWidth() - tableX * 2;
  const scale = availableWidth / baseWidths.reduce((sum, value) => sum + value, 0);
  const widths = baseWidths.map((value) => value * scale);
  const sectionTitleHeight = 48;
  const headers = [
    "Hizmet T\u00fcr\u00fc",
    "Ders",
    "Haftal\u0131k S\u00fcre",
    "Sorumlu Ki\u015fi(ler)",
  ];
  const headerHeight = 34;
  const pageBottom = page.getHeight() - 40;

  drawTableCell(
    page,
    fonts,
    { x: tableX, y: tableY, width: availableWidth, height: sectionTitleHeight },
    "A. \u00d6\u011frencinin Alaca\u011f\u0131 Okul \u0130\u00e7i Di\u011fer E\u011fitim Hizmetleri (Destek e\u011fitim odas\u0131, grup e\u011fitimine haz\u0131rl\u0131k uygulamas\u0131, tamamlay\u0131c\u0131 e\u011fitim faaliyeti vb.)",
    {
      fill: COLORS.teal,
      color: COLORS.white,
      font: fonts.bold,
      align: "left",
      size: 10.2,
      paddingX: 8,
      paddingY: 7,
    },
  );

  let x = tableX;
  headers.forEach((label, index) => {
    drawTableCell(
      page,
      fonts,
      { x, y: tableY + sectionTitleHeight, width: widths[index], height: headerHeight },
      label,
      {
        fill: COLORS.teal,
        color: COLORS.white,
        font: fonts.bold,
        align: "center",
        size: 9.8,
      },
    );
    x += widths[index];
  });

  let currentTop = tableY + sectionTitleHeight + headerHeight;
  let nextIndex = startIndex;
  const rowsToRender =
    rows.length > 0 ? rows.slice(startIndex) : Array.from({ length: 3 }, () => undefined);

  while (nextIndex - startIndex < rowsToRender.length) {
    const row = rowsToRender[nextIndex - startIndex];
    const rowHeight = getSchoolServiceRowHeight(fonts, widths, row);

    if (currentTop + rowHeight > pageBottom) {
      break;
    }

    const values = [
      normalizeInlineText(row?.serviceType),
      normalizeInlineText(row?.courseName),
      normalizeInlineText(row?.weeklyDuration),
      normalizeBlockText(row?.responsiblePeople),
    ];

    let currentX = tableX;
    values.forEach((value, cellIndex) => {
      drawTableCell(
        page,
        fonts,
        { x: currentX, y: currentTop, width: widths[cellIndex], height: rowHeight },
        value,
        {
          size: 9,
          align: cellIndex >= 2 ? "center" : "left",
        },
      );
      currentX += widths[cellIndex];
    });

    currentTop += rowHeight;
    nextIndex += 1;
  }

  return {
    nextIndex: rows.length > 0 ? nextIndex : startIndex + rowsToRender.length,
    completed: rows.length > 0 ? nextIndex >= rows.length : true,
  };
}

function drawFamilyProcessPage(page: PDFPage, fonts: Fonts, document: FullDocument) {
  drawPageTitle(page, fonts, "V- Aile Bilgilendirme S\u00fcreci");

  const tableX = 24;
  const tableY = 64;
  const totalWidth = page.getWidth() - tableX * 2;
  const leftWidth = totalWidth * 0.42;
  const rightWidth = totalWidth - leftWidth;
  const titleHeight = 42;
  const rowHeights = [110, 104, 86, 110];
  const promptTexts = [
    "Aile öğrencinin gelişimi ile ilgili hangi sıklıkla bilgilendirilecek?",
    "Aile öğrencinin gelişimi ile ilgili hangi yolla bilgilendirilecek? (Telefon, çevrimiçi/yüz yüze toplantı, yazılı vb.)",
    "Aile eğitimi yapılacak mı?",
    "Aile eğitimi hangi yolla yapılacak? (Telefon, çevrimiçi/yüz yüze toplantı, yazılı vb.)",
  ];
  const valueTexts = [
    normalizeInlineText(document.familyFrequency) || "-",
    normalizeBlockText(document.familyMethod) || "-",
    document.familyTrainingRequired ? "Evet ( X )          Hayır ( )" : "Evet ( )          Hayır ( X )",
    normalizeBlockText(document.familyTrainingMethod) || "-",
  ];

  drawTableCell(
    page,
    fonts,
    { x: tableX, y: tableY, width: totalWidth, height: titleHeight },
    "B. Aile Bilgilendirme S\u00fcreci",
    {
      fill: COLORS.teal,
      color: COLORS.white,
      font: fonts.bold,
      align: "center",
      size: 11.5,
      paddingX: 8,
      paddingY: 9,
    },
  );

  let currentTop = tableY + titleHeight;
  promptTexts.forEach((promptText, index) => {
    drawTableCell(
      page,
      fonts,
      { x: tableX, y: currentTop, width: leftWidth, height: rowHeights[index] },
      promptText,
      {
        size: 10.2,
        paddingX: 8,
        paddingY: 8,
      },
    );
    drawTableCell(
      page,
      fonts,
      { x: tableX + leftWidth, y: currentTop, width: rightWidth, height: rowHeights[index] },
      valueTexts[index],
      {
        size: index === 2 ? 10.8 : 10,
        align: "left",
        paddingX: 10,
        paddingY: 8,
      },
    );
    currentTop += rowHeights[index];
  });
}

function getEvaluationItems(document: FullDocument): AdaptiveLabelValueItem[] {
  const decisions = getEvaluationDecisions(document);

  return [
    {
      label: "Di\u011fer Kararlar",
      value:
        decisions.length > 0
          ? decisions.map((item, index) => `${index + 1}. ${item}`).join("\n")
          : "Karar girilmedi.",
      valueSize: 9.4,
      minHeight: 100,
    },
    {
      label: "Bir Sonraki BEP Geli\u015ftirme Birimi Toplant\u0131 Tarihi",
      value: dateText(document.nextMeetingDate) || "-",
      minHeight: 52,
    },
    {
      label: "Genel BEP De\u011ferlendirmesi",
      value: normalizeBlockText(document.generalEvaluation) || "-",
      valueSize: 9.2,
      minHeight: 120,
    },
    {
      label: "A\u00e7\u0131klama",
      value:
        "Bu bolumde yil boyunca ogrenci icin belirlenen amaclara ulasilma duzeyi genel olarak degerlendirilir ve bir sonraki BEP icin oneri niteliginde notlar yazilir.",
      valueSize: 8.2,
      minHeight: 52,
    },
  ];
}

export function drawCommitteePage(page: PDFPage, fonts: Fonts, document: FullDocument) {
  drawPageTitle(page, fonts, "VI- BEP Geli\u015ftirme Birim \u00dcyeleri");

  const allMembers = document.committeeMembers.filter(hasCommitteeMemberContent);

  const marginX = 22;
  const tableX = marginX;
  const tableY = 58;
  const baseWidths = [270, 90, 135, 78];
  const availableWidth = page.getWidth() - marginX * 2;
  const widthScale = availableWidth / baseWidths.reduce((sum, value) => sum + value, 0);
  const widths = baseWidths.map((value) => value * widthScale);
  const headers = [
    "BEP Geli\u015ftirme Birimi \u00dcyeleri",
    "Unvan\u0131",
    "Ad\u0131 Soyad\u0131",
    "Bran\u015f\u0131",
  ];
  const headerHeight = 40;
  const signatureTop = 628;
  const signatureHeight = 138;
  const contentBottom = signatureTop - 16;
  const minRowHeight = 28;
  const maxRowHeight = 42;
  const availableHeight = contentBottom - (tableY + headerHeight);
  const maxVisibleRows = Math.max(1, Math.floor(availableHeight / minRowHeight));
  const members = allMembers.slice(0, maxVisibleRows);
  const baseSizes = [8.8, 8.5, 8.5, 8.5];
  const rowHeights = members.map((member) => {
    const values = [
      normalizeInlineText(member.role),
      normalizeInlineText(member.title),
      normalizeInlineText(member.fullName),
      normalizeInlineText(member.branch),
    ];

    const preferredHeight = values.reduce((height, value, index) => {
      const textHeight = measureWrappedTextHeight(
        value,
        fonts.regular,
        baseSizes[index],
        widths[index],
      );
      return Math.max(height, textHeight);
    }, minRowHeight);

    return Math.min(maxRowHeight, Math.max(minRowHeight, Math.ceil(preferredHeight)));
  });

  const totalPreferredHeight = rowHeights.reduce((sum, value) => sum + value, 0);
  const heightScale = totalPreferredHeight > availableHeight ? availableHeight / totalPreferredHeight : 1;
  const scaledRowHeights = rowHeights.map((value) =>
    Math.max(minRowHeight, Math.floor(value * heightScale)),
  );

  let x = tableX;
  headers.forEach((label, index) => {
    drawTableCell(
      page,
      fonts,
      { x, y: tableY, width: widths[index], height: headerHeight },
      label,
      {
        fill: COLORS.teal,
        color: COLORS.white,
        font: fonts.bold,
        align: "center",
        size: 10,
      },
    );
    x += widths[index];
  });

  let currentTop = tableY + headerHeight;

  members.forEach((member, index) => {
    const rowHeight = scaledRowHeights[index];
    const top = currentTop;

    drawTableCell(
      page,
      fonts,
      { x: tableX, y: top, width: widths[0], height: rowHeight },
      normalizeInlineText(member.role),
      { size: 8.8 },
    );
    drawTableCell(
      page,
      fonts,
      { x: tableX + widths[0], y: top, width: widths[1], height: rowHeight },
      normalizeInlineText(member?.title),
      { size: 8.5 },
    );
    drawTableCell(
      page,
      fonts,
      { x: tableX + widths[0] + widths[1], y: top, width: widths[2], height: rowHeight },
      normalizeInlineText(member?.fullName),
      { size: 8.5 },
    );
    drawTableCell(
      page,
      fonts,
      {
        x: tableX + widths[0] + widths[1] + widths[2],
        y: top,
        width: widths[3],
        height: rowHeight,
      },
      normalizeInlineText(member?.branch),
      { size: 8.5 },
    );

    currentTop += rowHeight;
  });

  const hiddenCount = allMembers.length - members.length;

  if (hiddenCount > 0) {
    drawTextBox(
      page,
      fonts,
      `${hiddenCount} ek üye tablo alanına sığmadığı için gösterilmedi.`,
      { x: 24, y: currentTop + 8, width: 547, height: 16 },
      {
        size: 8,
        color: COLORS.text,
        paddingX: 0,
        paddingY: 0,
      },
    );
  }

  drawBox(
    page,
    { x: marginX, y: signatureTop, width: availableWidth, height: signatureHeight },
    { stroke: COLORS.border, strokeWidth: 1 },
  );
  drawBox(
    page,
    { x: marginX, y: signatureTop, width: availableWidth, height: 24 },
    { fill: COLORS.softAlt, stroke: COLORS.border, strokeWidth: 1 },
  );
  drawTextBox(
    page,
    fonts,
    "İmza Bölümü",
    { x: marginX, y: signatureTop + 3, width: availableWidth, height: 18 },
    {
      font: fonts.bold,
      size: 10,
      color: COLORS.text,
      align: "center",
      paddingX: 4,
      paddingY: 2,
    },
  );

  const signMembers = allMembers.slice(0, 6);
  const signColumns = 2;
  const signGapX = 16;
  const signBoxWidth = (availableWidth - signGapX) / signColumns;
  const signBoxHeight = 34;
  const signStartY = signatureTop + 34;

  signMembers.forEach((member, index) => {
    const columnIndex = index % signColumns;
    const rowIndex = Math.floor(index / signColumns);
    const boxX = marginX + columnIndex * (signBoxWidth + signGapX);
    const boxY = signStartY + rowIndex * signBoxHeight;
    const lineY = boxY + 18;
    const label = [normalizeInlineText(member.fullName), normalizeInlineText(member.role)]
      .filter(Boolean)
      .join(" - ");

    drawLine(page, boxX + 14, lineY, boxX + signBoxWidth - 14, lineY, COLORS.border, 0.9);
    drawTextBox(
      page,
      fonts,
      label || "İmza",
      { x: boxX, y: boxY + 18, width: signBoxWidth, height: 14 },
      {
        size: 8.2,
        align: "center",
        paddingX: 4,
        paddingY: 0,
        maxLines: 1,
      },
    );
  });
}

function drawCommitteeTablePage(
  page: PDFPage,
  fonts: Fonts,
  members: CommitteeMember[],
  subjectTeachers: SubjectTeacher[],
  startMemberNumber: number,
  startTeacherNumber: number,
  options?: {
    showApproval?: boolean;
    approvalDate?: Date | null;
  },
) {
  drawPageTitle(page, fonts, "VI- BEP Geli\u015ftirme Birim \u00dcyeleri");

  const marginX = 24;
  const tableY = 60;
  const availableWidth = page.getWidth() - marginX * 2;
  const baseWidths = [34, 260, 173, 80];
  const scale = availableWidth / baseWidths.reduce((sum, value) => sum + value, 0);
  const widths = baseWidths.map((value) => value * scale);
  const titleHeight = 32;
  const headerHeight = 36;
  const minRowHeight = 48;
  const maxRowHeight = 66;

  drawBox(
    page,
    { x: marginX, y: tableY, width: availableWidth, height: titleHeight },
    { fill: COLORS.teal, stroke: COLORS.border, strokeWidth: 1 },
  );
  drawTextBox(
    page,
    fonts,
    "BEP Geli\u015ftirme Birimi \u00dcyeleri",
    { x: marginX, y: tableY + 6, width: availableWidth, height: 18 },
    {
      font: fonts.bold,
      size: 12,
      color: COLORS.white,
      align: "center",
      paddingX: 4,
      paddingY: 0,
    },
  );

  let currentX = marginX;
  ["", "Unvan\u0131", "Ad\u0131 Soyad\u0131", "\u0130mza"].forEach((label, index) => {
    drawTableCell(
      page,
      fonts,
      { x: currentX, y: tableY + titleHeight, width: widths[index], height: headerHeight },
      label,
      {
        fill: COLORS.softAlt,
        color: COLORS.text,
        font: fonts.bold,
        align: index === 0 ? "center" : "left",
        size: 9.5,
      },
    );
    currentX += widths[index];
  });

  let currentTop = tableY + titleHeight + headerHeight;

  members.forEach((member, index) => {
    const roleText = [normalizeInlineText(member.role), normalizeInlineText(member.title)]
      .filter(Boolean)
      .join(" - ");
    const rowHeight = Math.min(
      maxRowHeight,
      Math.max(
        minRowHeight,
        Math.ceil(
          Math.max(
            measureWrappedTextHeight(roleText, fonts.regular, 10, widths[1]),
            measureWrappedTextHeight(
              normalizeInlineText(member.fullName),
              fonts.regular,
              10,
              widths[2],
            ),
          ),
        ),
      ),
    );

    drawTableCell(
      page,
      fonts,
      { x: marginX, y: currentTop, width: widths[0], height: rowHeight },
      String(startMemberNumber + index),
      {
        font: fonts.bold,
        size: 10,
        align: "center",
      },
    );
    drawTableCell(
      page,
      fonts,
      { x: marginX + widths[0], y: currentTop, width: widths[1], height: rowHeight },
      roleText,
      { size: 10 },
    );
    drawTableCell(
      page,
      fonts,
      {
        x: marginX + widths[0] + widths[1],
        y: currentTop,
        width: widths[2],
        height: rowHeight,
      },
      normalizeInlineText(member.fullName),
      { size: 10 },
    );
    drawTableCell(
      page,
      fonts,
      {
        x: marginX + widths[0] + widths[1] + widths[2],
        y: currentTop,
        width: widths[3],
        height: rowHeight,
      },
      "",
      { size: 10 },
    );

    currentTop += rowHeight;
  });

  const subjectSectionTitleHeight = 28;
  const subjectBaseWidths = [34, 230, 203, 80];
  const subjectScale =
    availableWidth / subjectBaseWidths.reduce((sum, value) => sum + value, 0);
  const subjectWidths = subjectBaseWidths.map((value) => value * subjectScale);
  const subjectRows = subjectTeachers.filter(hasSubjectTeacherContent);

  if (subjectRows.length === 0) {
    if (options?.showApproval) {
      const approvalDateText = slashDateText(options.approvalDate);

      drawTextBox(
        page,
        fonts,
        "Uygundur",
        { x: 208, y: 732, width: 180, height: 18 },
        {
          font: fonts.regular,
          size: 11,
          align: "center",
          paddingX: 0,
          paddingY: 0,
        },
      );
      drawTextBox(
        page,
        fonts,
        "Okul Müdürü",
        { x: 208, y: 762, width: 180, height: 18 },
        {
          font: fonts.regular,
          size: 11,
          align: "center",
          paddingX: 0,
          paddingY: 0,
        },
      );
      drawTextBox(
        page,
        fonts,
        approvalDateText,
        { x: marginX, y: 790, width: availableWidth, height: 14 },
        {
          size: 10.5,
          align: "right",
          paddingX: 6,
          paddingY: 0,
        },
      );
    }

    return;
  }

  drawBox(
    page,
    { x: marginX, y: currentTop, width: availableWidth, height: subjectSectionTitleHeight },
    { fill: COLORS.softAlt, stroke: COLORS.border, strokeWidth: 1 },
  );
  drawTextBox(
    page,
    fonts,
    "\u00d6\u011frencinin Dersini Okutan Alan \u00d6\u011fretmenleri",
    { x: marginX + 10, y: currentTop + 6, width: availableWidth - 20, height: 16 },
    {
      font: fonts.bold,
      size: 10.5,
      color: COLORS.text,
      paddingX: 0,
      paddingY: 0,
    },
  );

  currentTop += subjectSectionTitleHeight;

  subjectRows.forEach((teacher, index) => {
    const rowHeight = Math.min(
      58,
      Math.max(
        42,
        Math.ceil(
          Math.max(
            measureWrappedTextHeight(
              normalizeInlineText(teacher?.courseName),
              fonts.regular,
              9,
              subjectWidths[0],
            ),
            measureWrappedTextHeight(
              normalizeInlineText(teacher?.fullName),
              fonts.regular,
              9,
              subjectWidths[2],
            ),
          ),
        ),
      ),
    );

    drawTableCell(
      page,
      fonts,
      { x: marginX, y: currentTop, width: subjectWidths[0], height: rowHeight },
      String(startTeacherNumber + index),
      {
        font: fonts.bold,
        size: 10,
        align: "center",
      },
    );
    drawTableCell(
      page,
      fonts,
      {
        x: marginX + subjectWidths[0],
        y: currentTop,
        width: subjectWidths[1],
        height: rowHeight,
      },
      normalizeInlineText(teacher?.courseName),
      { size: 9 },
    );
    drawTableCell(
      page,
      fonts,
      {
        x: marginX + subjectWidths[0] + subjectWidths[1],
        y: currentTop,
        width: subjectWidths[2],
        height: rowHeight,
      },
      normalizeInlineText(teacher?.fullName),
      { size: 9 },
    );
    drawTableCell(
      page,
      fonts,
      {
        x: marginX + subjectWidths[0] + subjectWidths[1] + subjectWidths[2],
        y: currentTop,
        width: subjectWidths[3],
        height: rowHeight,
      },
      "",
      { size: 9 },
    );

    currentTop += rowHeight;
  });

  if (options?.showApproval) {
    const approvalDateText = slashDateText(options.approvalDate);

    drawTextBox(
      page,
      fonts,
      "Uygundur",
      { x: 208, y: 732, width: 180, height: 18 },
      {
        font: fonts.regular,
        size: 11,
        align: "center",
        paddingX: 0,
        paddingY: 0,
      },
    );
    drawTextBox(
      page,
      fonts,
      "Okul Müdürü",
      { x: 208, y: 762, width: 180, height: 18 },
      {
        font: fonts.regular,
        size: 11,
        align: "center",
        paddingX: 0,
        paddingY: 0,
      },
    );
    drawTextBox(
      page,
      fonts,
      approvalDateText,
      { x: marginX, y: 790, width: availableWidth, height: 14 },
      {
        size: 10.5,
        align: "right",
        paddingX: 6,
        paddingY: 0,
      },
    );
  }
}

async function loadMebLogo(pdfDoc: PDFDocument) {
  try {
    const bytes = await readPdfAsset("meb-logo.png");
    return await pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function generateBepPdf(document: FullDocument) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const mebLogo = await loadMebLogo(pdfDoc);
  const studentInfoPages = paginateStudentInfoSection(fonts, document);
  const performanceEntries = getPerformanceEntries(document);
  const performanceIntroItems = getPerformanceIntroItems(document);
  const performanceIntroPages =
    performanceIntroItems.length > 0
      ? splitAdaptiveLabelValueItem(
          fonts,
          performanceIntroItems[0],
          551,
          performanceEntries.length > 0 ? 650 : PORTRAIT.height - 96,
        ).map((item) => ({
          ...item,
          height: getAdaptiveLabelValueBoxHeight(fonts, item, 551),
        }))
      : [];
  const profilePagesData = hasProfileContent(document)
    ? buildAdaptiveLabelValuePages(fonts, getProfileItems(document), 551, 56, PORTRAIT.height - 40, 16)
    : [];
  const environmentPagesData = hasEnvironmentContent(document)
    ? buildAdaptiveLabelValuePages(
        fonts,
        getEnvironmentItems(document),
        LANDSCAPE.width - 48,
        64,
        LANDSCAPE.height - 40,
        16,
      )
    : [];
  const includeFamilyPage = hasFamilyContent(document);
  const evaluationPagesData = hasEvaluationContent(document)
    ? buildAdaptiveLabelValuePages(
        fonts,
        getEvaluationItems(document),
        LANDSCAPE.width - 48,
        64,
        LANDSCAPE.height - 40,
        16,
      )
    : [];
  const schoolServiceRows = getSchoolServiceRows(document);
  const pages: BepPdfPage[] = [];
  const performancePages: PerformancePdfPage[] = [];
  const schoolServicesPages: Array<{ page: PDFPage; startIndex: number }> = [];
  const addPage = (
    size: [number, number],
    render: (page: PDFPage) => void,
  ) => {
    const page = pdfDoc.addPage(size);
    pages.push({
      page,
      render: () => render(page),
    });
    return page;
  };

  addPage([PORTRAIT.width, PORTRAIT.height], (page) =>
    drawFrontCoverPage(page, fonts, document, mebLogo),
  );
  studentInfoPages.forEach((segment) => {
    addPage([PORTRAIT.width, getStudentInfoPageHeight(segment)], (page) =>
      drawStudentInfoPage(page, fonts, segment),
    );
  });

  if (performanceEntries.length > 0 || performanceIntroPages.length > 0) {
    let nextPerformanceIndex = 0;
    let nextPerformanceIntroIndex = 0;

    while (true) {
      const currentStartIndex = nextPerformanceIndex;
      const introItem = performanceIntroPages[nextPerformanceIntroIndex];
      const performancePage = addPage([PORTRAIT.width, PORTRAIT.height], () => {});
      performancePages.push({
        page: performancePage,
        startIndex: currentStartIndex,
        introItem,
      });
      const result = drawPerformancePageSegment(
        performancePage,
        fonts,
        performanceEntries,
        currentStartIndex,
        introItem,
      );

      nextPerformanceIndex = result.nextIndex;
      if (introItem) {
        nextPerformanceIntroIndex += 1;
      }

      if (result.completed && nextPerformanceIntroIndex >= performanceIntroPages.length) {
        break;
      }
    }
  }

  profilePagesData.forEach((pageItems) => {
    addPage([PORTRAIT.width, PORTRAIT.height], (page) =>
      drawAdaptiveLabelValuePage(page, fonts, "II- E\u011fitsel Performans D\u00fczeyi", pageItems, {
        x: 22,
        top: 56,
        width: 551,
        gap: 16,
      }),
    );
  });

  const planRowGroups = buildPlanRowGroups(document);

  if (planRowGroups.length > 0) {
    const planPages = buildPlanPages(fonts, LANDSCAPE.width, LANDSCAPE.height, planRowGroups);
    planPages.forEach((sections) => {
      addPage([LANDSCAPE.width, LANDSCAPE.height], (page) =>
        drawPlanPage(page, fonts, sections),
      );
    });
  }

  environmentPagesData.forEach((pageItems) => {
    addPage([LANDSCAPE.width, LANDSCAPE.height], (page) =>
      drawAdaptiveLabelValuePage(page, fonts, "III- Ortam D\u00fczenlemeleri", pageItems, {
        x: 24,
        top: 64,
        width: LANDSCAPE.width - 48,
        gap: 16,
      }),
    );
  });

  if (schoolServiceRows.length > 0) {
    let nextSchoolServiceIndex = 0;

    while (true) {
      const currentStartIndex = nextSchoolServiceIndex;
      const schoolServicesPage = addPage([LANDSCAPE.width, LANDSCAPE.height], () => {});
      schoolServicesPages.push({
        page: schoolServicesPage,
        startIndex: currentStartIndex,
      });
      const result = drawSchoolServicesPage(
        schoolServicesPage,
        fonts,
        schoolServiceRows,
        currentStartIndex,
      );

      nextSchoolServiceIndex = result.nextIndex;

      if (result.completed) {
        break;
      }
    }
  }

  if (includeFamilyPage) {
    addPage([LANDSCAPE.width, LANDSCAPE.height], (page) =>
      drawFamilyProcessPage(page, fonts, document),
    );
  }

  evaluationPagesData.forEach((pageItems) => {
    addPage([LANDSCAPE.width, LANDSCAPE.height], (page) =>
      drawAdaptiveLabelValuePage(
        page,
        fonts,
        "V.A- Di\u011fer Kararlar ve Genel De\u011ferlendirme",
        pageItems,
        {
          x: 24,
          top: 64,
          width: LANDSCAPE.width - 48,
          gap: 16,
        },
      ),
    );
  });

  const committeeMembers = document.committeeMembers.filter(hasCommitteeMemberContent);
  const subjectTeachers = document.subjectTeachers.filter(hasSubjectTeacherContent);
  const committeePageCapacity = 5;
  const subjectTeacherPageCapacity = 6;
  const committeeChunks =
    committeeMembers.length > 0
      ? Array.from(
          { length: Math.ceil(committeeMembers.length / committeePageCapacity) },
          (_, index) =>
            committeeMembers.slice(
              index * committeePageCapacity,
              (index + 1) * committeePageCapacity,
            ),
        )
      : [];
  const subjectTeacherChunks =
    subjectTeachers.length > 0
      ? Array.from(
          { length: Math.ceil(subjectTeachers.length / subjectTeacherPageCapacity) },
          (_, index) =>
            subjectTeachers.slice(
              index * subjectTeacherPageCapacity,
              (index + 1) * subjectTeacherPageCapacity,
            ),
        )
      : [];
  const committeePageCount = Math.max(
    committeeChunks.length,
    subjectTeacherChunks.length,
    committeeMembers.length > 0 || subjectTeachers.length > 0 ? 1 : 0,
  );
  const committeePages = Array.from({ length: committeePageCount }, () =>
    addPage([PORTRAIT.width, PORTRAIT.height], () => {}),
  );

  pages.forEach(({ page }) => {
    drawBox(
      page,
      { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() },
      { fill: COLORS.page },
    );
  });

  pages.forEach(({ render }) => render());

  performancePages.forEach(({ page, startIndex, introItem }) => {
    drawPerformancePageSegment(
      page,
      fonts,
      performanceEntries,
      startIndex,
      introItem,
    );
  });

  schoolServicesPages.forEach(({ page, startIndex }) => {
    drawSchoolServicesPage(page, fonts, schoolServiceRows, startIndex);
  });
  committeePages.forEach((page, index) => {
    drawCommitteeTablePage(
      page,
      fonts,
      committeeChunks[index] ?? [],
      subjectTeacherChunks[index] ?? [],
      index * committeePageCapacity + 1,
      index * subjectTeacherPageCapacity + 1,
      {
        showApproval: index === committeePages.length - 1,
        approvalDate: document.startDate ?? document.student.bepStartDate ?? document.createdAt,
      },
    );
  });

  pages.forEach(({ page }, index) => {
    drawPageNumber(page, fonts, index + 1, pages.length);
    drawLine(
      page,
      22,
      page.getHeight() - 34,
      page.getWidth() - 22,
      page.getHeight() - 34,
      COLORS.softAlt,
      0.8,
    );
  });

  return pdfDoc.save();
}

type BepAssessmentRow = {
  courseName: string;
  learningArea: string;
  goalText: string;
  result: string;
};

function getBepAssessmentRows(document: FullDocument): BepAssessmentRow[] {
  return document.planRows
    .slice()
    .sort((first, second) => first.sortOrder - second.sortOrder)
    .map((row) => {
      const learningOutcome = normalizeBlockText(row.learningOutcome);
      const processComponents = getProcessComponentScheduleValues(row).processComponentsText;

      return {
        courseName: normalizeInlineText(row.courseName) || "-",
        learningArea: normalizeInlineText(row.learningArea) || "-",
        goalText: [learningOutcome, processComponents].filter(Boolean).join("\n") || "-",
        result: normalizeInlineText(row.performanceResult),
      };
    })
    .filter(
      (row) =>
        row.courseName !== "-" || row.learningArea !== "-" || (row.goalText && row.goalText !== "-"),
    );
}

function drawAssessmentTableHeader(page: PDFPage, fonts: Fonts, top: number, widths: number[]) {
  const labels = ["Ders", "Öğrenme Alanı", "Amaç / Süreç Bileşenleri", "+", "-"];
  let currentX = 28;

  labels.forEach((label, index) => {
    drawTableCell(
      page,
      fonts,
      { x: currentX, y: top, width: widths[index], height: 30 },
      label,
      {
        fill: CORPORATE_COLORS.black,
        color: CORPORATE_COLORS.white,
        font: fonts.bold,
        align: index >= 3 ? "center" : "left",
        size: 8.6,
      },
    );
    currentX += widths[index];
  });
}

function getBepAssessmentRowHeight(fonts: Fonts, widths: number[], row: BepAssessmentRow) {
  return Math.max(
    30,
    Math.ceil(
      Math.max(
        measureWrappedTextHeight(row.courseName, fonts.regular, 8.6, widths[0], {
          lineHeight: 10,
          paddingX: 3,
          paddingY: 3,
        }),
        measureWrappedTextHeight(row.learningArea, fonts.regular, 8.6, widths[1], {
          lineHeight: 10,
          paddingX: 3,
          paddingY: 3,
        }),
        measureWrappedTextHeight(row.goalText, fonts.regular, 8.6, widths[2], {
          lineHeight: 10,
          paddingX: 3,
          paddingY: 3,
        }),
      ),
    ),
  );
}

function getAdaptiveBepAssessmentPageHeight(
  fonts: Fonts,
  widths: number[],
  rows: BepAssessmentRow[],
) {
  const introBottom = 276;
  const rowsHeight = rows.reduce(
    (sum, row) => sum + getBepAssessmentRowHeight(fonts, widths, row),
    0,
  );

  return Math.max(PORTRAIT.height, introBottom + rowsHeight + 48);
}

export async function generateBepAssessmentPdf(document: FullDocument) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadInstitutionOrSpeciaLogo(pdfDoc, document.institutionId, "white");
  const generatedAt = new Date();
  const meta: CorporatePdfMeta = {
    title: `${document.title} Kaba Değerlendirme`,
    documentType: "Kaba Değerlendirme Formu",
    institutionName: document.student.schoolName ?? null,
    generatedAt,
    subjectName: `${document.student.firstName} ${document.student.lastName}`,
    summary:
      "Bu çıktı, BEP hedef satırları için yapılan kaba değerlendirme sonuçlarını + ve - işaretleriyle özetler.",
    referenceCode: buildReferenceCode("KDG", generatedAt),
  };

  const rows = getBepAssessmentRows(document);
  createCorporateCoverPage(pdfDoc, fonts, meta, logo);
  const widths = [78, 110, 287, 32, 32];
  const page = createCorporatePage(pdfDoc, fonts, meta, logo, [
    PORTRAIT.width,
    getAdaptiveBepAssessmentPageHeight(fonts, widths, rows),
  ]);
  let currentTop = 132;

  const drawPageIntro = () => {
    drawSummaryBand(page, fonts, currentTop, [
      { label: "Öğrenci", value: `${document.student.firstName} ${document.student.lastName}` },
      { label: "Okul", value: normalizeInlineText(document.student.schoolName) || "-" },
      { label: "Amaç sayısı", value: String(rows.length) },
    ]);
    currentTop += 68;
    drawInfoLine(page, fonts, currentTop, "Belge", document.title, 9.2);
    currentTop += 20;
    drawInfoLine(
      page,
      fonts,
      currentTop,
      "Açıklama",
      "Her hedef satırı için uygun kutu seçilerek kaba değerlendirme yapılır.",
      8.8,
    );
    currentTop += 26;
    drawAssessmentTableHeader(page, fonts, currentTop, widths);
    currentTop += 30;
  };

  drawPageIntro();

  rows.forEach((row) => {
    const rowHeight = getBepAssessmentRowHeight(fonts, widths, row);

    let currentX = 28;
    const values = [
      row.courseName,
      row.learningArea,
      row.goalText,
      row.result === "+" ? "X" : "",
      row.result === "-" ? "X" : "",
    ];

    values.forEach((value, index) => {
      drawTableCell(
        page,
        fonts,
        { x: currentX, y: currentTop, width: widths[index], height: rowHeight },
        value,
        {
          size: index >= 3 ? 10 : 8.6,
          font: index >= 3 ? fonts.bold : fonts.regular,
          align: index >= 3 ? "center" : "left",
          paddingX: index >= 3 ? 0 : 4,
          paddingY: 3,
          stroke: CORPORATE_COLORS.line,
        },
      );
      currentX += widths[index];
    });

    currentTop += rowHeight;
  });

  placeCorporateSignatureSection(pdfDoc, fonts, meta, logo, page, currentTop + 12);
  pdfDoc.getPages().forEach((pdfPage, index, pages) => {
    drawCorporateFooter(pdfPage, fonts, meta, index + 1, pages.length);
  });

  return pdfDoc.save();
}

type PdfSection = {
  title: string;
  body: string;
};

type CorporatePdfMeta = {
  title: string;
  documentType: string;
  institutionName?: string | null;
  generatedAt: Date;
  subjectName?: string | null;
  preparedByName?: string | null;
  preparedByRole?: "institution" | "teacher" | "other";
  institutionId?: string | null;
  institutionManagerName?: string | null;
  institutionManagerTitle?: string | null;
  summary?: string;
  referenceCode?: string;
  confidentiality?: string;
};

const APPROVAL_STATUS_LABELS: Record<string, string> = {
  approved: "Onaylandi",
  pending: "Bekliyor",
  rejected: "Reddedildi",
};

const STUDENT_FILE_CATEGORY_LABELS: Record<string, string> = {
  ram_report: "RAM Raporu",
  health_report: "Saglik Raporu",
  parent_consent: "Veli Onayi",
  progress_report: "Gelisim Raporu",
  iep_copy: "BEP Kopyasi",
  other: "Diger",
};

const SESSION_TYPE_LABELS: Record<string, string> = {
  individual: "Bireysel",
  group: "Grup",
  speech: "Dil Konusma",
  occupational: "Ergoterapi",
  psychomotor: "Psikomotor",
  resource_room: "Kaynak Oda",
  makeup: "Telafi",
  parent_meeting: "Veli Gorusmesi",
};

const SESSION_STATUS_LABELS: Record<string, string> = {
  planned: "Planlandi",
  completed: "Tamamlandi",
  cancelled: "Iptal",
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  approved: "Onaylandi",
  issued: "Duzenlendi",
  paid: "Odendi",
  cancelled: "Iptal",
  refunded: "Iade",
};

const CALENDAR_SCOPE_LABELS: Record<string, string> = {
  institution: "Kurum Ortak",
  personal: "Kisisel",
};

type StudentListPdfInput = {
  title: string;
  institutionName?: string | null;
  generatedAt: Date;
  generatedByName?: string | null;
  generatedByRole?: "institution" | "teacher" | "other";
  institutionId?: string | null;
  institutionManagerName?: string | null;
  institutionManagerTitle?: string | null;
  referenceCode?: string;
  students: Array<{
    firstName: string;
    lastName: string;
    schoolName?: string | null;
    classroom?: string | null;
    bepCount: number;
    parentCount: number;
    isActive: boolean;
  }>;
};

type StudentProfilePdfInput = {
  title: string;
  generatedAt: Date;
  generatedByName?: string | null;
  generatedByRole?: "institution" | "teacher" | "other";
  institutionId?: string | null;
  institutionManagerName?: string | null;
  institutionManagerTitle?: string | null;
  referenceCode?: string;
  student: {
    firstName: string;
    lastName: string;
    schoolName?: string | null;
    classroom?: string | null;
    schoolNumber?: string | null;
    kademe?: string | null;
    district?: string | null;
    diagnosis?: string | null;
    guardianName?: string | null;
    guardianPhone?: string | null;
    homeAddress?: string | null;
    developmentHistory?: string | null;
    strengths?: string | null;
    improvementAreas?: string | null;
    behaviorNotes?: string | null;
    documents: Array<{
      title: string;
      status: string;
      approvalStatus?: string | null;
      updatedAt: Date;
    }>;
    parentStudentLinks: Array<{
      parent: {
        name: string;
        email: string;
      };
    }>;
    studentFiles: Array<{
      title: string;
      category: string;
      fileName?: string | null;
      expiresAt?: Date | null;
    }>;
  };
};

type InstitutionReportPdfInput = {
  title: string;
  generatedAt: Date;
  generatedByName?: string | null;
  generatedByRole?: "institution" | "teacher" | "other";
  institutionId?: string | null;
  institutionManagerName?: string | null;
  institutionManagerTitle?: string | null;
  referenceCode?: string;
  institutionName?: string | null;
  periodLabel?: string | null;
  summary: {
    studentCount: number;
    documentCount: number;
    completedDocuments: number;
    approvedDocuments: number;
    pendingApprovals: number;
    studentFileCount: number;
    expiringFiles: number;
    teacherCount: number;
    parentCount: number;
    roomCount: number;
    totalSessionsThisMonth: number;
    plannedSessions: number;
    completedSessions: number;
    cancelledSessions: number;
  };
  staffWorkload: Array<{
    name: string;
    branch?: string | null;
    sessionCount: number;
    completedSessionCount: number;
  }>;
  sessionTypeBreakdown: Array<{
    type: string;
    count: number;
  }>;
  studentSessionLeaderboard: Array<{
    studentName: string;
    sessionCount: number;
  }>;
  recentDocuments: Array<{
    title: string;
    student: {
      firstName: string;
      lastName: string;
    };
    owner: {
      name: string | null;
    };
  }>;
};

type CalendarAgendaPdfInput = {
  title: string;
  generatedAt: Date;
  generatedByName?: string | null;
  generatedByRole?: "institution" | "teacher" | "other";
  institutionId?: string | null;
  institutionManagerName?: string | null;
  institutionManagerTitle?: string | null;
  referenceCode?: string;
  selectedDate: Date;
  events: Array<{
    title: string;
    description?: string | null;
    scope: string;
    startAt: Date;
    endAt: Date;
    ownerName: string;
    assignedUserName?: string | null;
    studentName?: string | null;
  }>;
  sessions: Array<{
    studentName: string;
    teacherName?: string | null;
    roomName?: string | null;
    sessionType: string;
    status: string;
    startAt: Date;
    endAt: Date;
  }>;
};

type SessionSchedulePdfInput = {
  title: string;
  generatedAt: Date;
  generatedByName?: string | null;
  generatedByRole?: "institution" | "teacher" | "other";
  institutionId?: string | null;
  institutionManagerName?: string | null;
  institutionManagerTitle?: string | null;
  referenceCode?: string;
  weekStart: Date;
  weekEnd: Date;
  teacherName?: string | null;
  days: Array<{
    label: string;
    date: Date;
    sessions: Array<{
      studentName: string;
      teacherName?: string | null;
      roomName?: string | null;
      sessionType: string;
      status: string;
      startTime: string;
      durationMinutes: number;
      notes?: string | null;
    }>;
  }>;
};

type InstitutionInvoicePdfInput = {
  title: string;
  generatedAt: Date;
  generatedByName?: string | null;
  generatedByRole?: "institution" | "teacher" | "other";
  institutionId?: string | null;
  institutionManagerName?: string | null;
  institutionManagerTitle?: string | null;
  referenceCode?: string;
  institutionName?: string | null;
  institutionLegalName?: string | null;
  institutionAddress?: string | null;
  institutionPhone?: string | null;
  institutionEmail?: string | null;
  institutionTaxOffice?: string | null;
  institutionTaxNumber?: string | null;
  institutionMersisNumber?: string | null;
  institutionIban?: string | null;
  principalName?: string | null;
  principalTitle?: string | null;
  coordinatorName?: string | null;
  coordinatorTitle?: string | null;
  invoice: {
    invoiceNumber: string;
    customerType: string;
    status: string;
    issueDate: Date;
    dueDate?: Date | null;
    customerName: string;
    customerTitle?: string | null;
    customerIdentityNo?: string | null;
    customerTaxOffice?: string | null;
    customerTaxNumber?: string | null;
    customerEmail?: string | null;
    customerPhone?: string | null;
    billingAddress?: string | null;
    serviceTitle: string;
    serviceDescription?: string | null;
    servicePeriod?: string | null;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    notes?: string | null;
  };
};

function formatDateTime(value: Date) {
  return value.toLocaleString("tr-TR");
}

function formatCurrencyForPdf(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function buildReferenceCode(prefix: string, value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  const hours = `${value.getHours()}`.padStart(2, "0");
  const minutes = `${value.getMinutes()}`.padStart(2, "0");

  return `SPC-${prefix}-${year}${month}${day}-${hours}${minutes}`;
}

function drawCorporateHeader(
  page: PDFPage,
  fonts: Fonts,
  meta: CorporatePdfMeta,
  logo: PDFImage | null,
) {
  drawBox(
    page,
    { x: 0, y: 0, width: page.getWidth(), height: page.getHeight() },
    { fill: CORPORATE_COLORS.page },
  );
  drawBox(
    page,
    { x: 0, y: 0, width: page.getWidth(), height: 54 },
    { fill: CORPORATE_COLORS.black },
  );
  drawBox(
    page,
    { x: 0, y: 54, width: page.getWidth(), height: 4 },
    { fill: CORPORATE_COLORS.gray },
  );
  if (logo) {
    const targetHeight = 50;
    const targetWidth = (targetHeight * logo.width) / logo.height;
    page.drawImage(logo, {
      x: 28,
      y: toPdfY(page, 3, targetHeight),
      width: targetWidth,
      height: targetHeight,
    });
  }
  drawTextBox(
    page,
    fonts,
    meta.documentType.toUpperCase(),
    { x: page.getWidth() - 240, y: 12, width: 212, height: 12 },
    {
      font: fonts.bold,
      size: 8,
      color: CORPORATE_COLORS.white,
      align: "right",
      paddingX: 0,
      paddingY: 0,
    },
  );
  drawTextBox(
    page,
    fonts,
    meta.referenceCode ?? buildReferenceCode("DOC", meta.generatedAt),
    { x: page.getWidth() - 260, y: 28, width: 232, height: 10 },
    {
      font: fonts.bold,
      size: 7.8,
      color: rgb(0.82, 0.82, 0.82),
      align: "right",
      paddingX: 0,
      paddingY: 0,
    },
  );
  drawTextBox(
    page,
    fonts,
    meta.title,
    { x: 28, y: 72, width: page.getWidth() - 56, height: 24 },
    {
      font: fonts.bold,
      size: 18,
      color: CORPORATE_COLORS.text,
      paddingX: 0,
      paddingY: 0,
    },
  );
  drawTextBox(
    page,
    fonts,
    normalizeInlineText(meta.institutionName) || "SPECIA Koordinasyon Platformu",
    { x: 28, y: 96, width: page.getWidth() - 56, height: 12 },
    {
      size: 8.8,
      color: CORPORATE_COLORS.gray,
      paddingX: 0,
      paddingY: 0,
    },
  );
  drawLine(page, 28, 112, page.getWidth() - 28, 112, CORPORATE_COLORS.line, 1);
}

function drawCorporateFooter(
  page: PDFPage,
  fonts: Fonts,
  _meta: CorporatePdfMeta,
  pageIndex: number,
  total: number,
) {
  drawLine(
    page,
    28,
    page.getHeight() - 36,
    page.getWidth() - 28,
    page.getHeight() - 36,
    CORPORATE_COLORS.line,
    0.8,
  );
  drawTextBox(
    page,
    fonts,
    "SPECIA",
    { x: 28, y: page.getHeight() - 28, width: 120, height: 12 },
    {
      font: fonts.bold,
      size: 8,
      color: CORPORATE_COLORS.text,
      paddingX: 0,
      paddingY: 0,
    },
  );
  drawTextBox(
    page,
    fonts,
    `${pageIndex} / ${total}`,
    { x: page.getWidth() - 120, y: page.getHeight() - 28, width: 92, height: 12 },
    {
      size: 8,
      color: CORPORATE_COLORS.text,
      align: "right",
      paddingX: 0,
      paddingY: 0,
    },
  );
}

function createCorporateCoverPage(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  meta: CorporatePdfMeta,
  logo: PDFImage | null,
) {
  const page = pdfDoc.addPage([PORTRAIT.width, PORTRAIT.height]);
  drawCorporateHeader(page, fonts, meta, logo);

  drawBox(
    page,
    { x: 28, y: 146, width: page.getWidth() - 56, height: 154 },
    { fill: CORPORATE_COLORS.soft, stroke: CORPORATE_COLORS.line, strokeWidth: 1 },
  );
  drawTextBox(
    page,
    fonts,
    meta.documentType,
    { x: 42, y: 164, width: page.getWidth() - 84, height: 16 },
    {
      font: fonts.bold,
      size: 10,
      color: CORPORATE_COLORS.gray,
      paddingX: 0,
      paddingY: 0,
    },
  );
  drawTextBox(
    page,
    fonts,
    meta.title,
    { x: 42, y: 188, width: page.getWidth() - 84, height: 42 },
    {
      font: fonts.bold,
      size: 24,
      color: CORPORATE_COLORS.text,
      paddingX: 0,
      paddingY: 0,
    },
  );
  const detailBoxes = [
    {
      label: "Kurum",
      value: normalizeInlineText(meta.institutionName) || "SPECIA Koordinasyon Platformu",
    },
    { label: "Belge tarihi", value: formatDateTime(meta.generatedAt) },
    {
      label: "Kapsam",
      value: normalizeInlineText(meta.subjectName) || "Genel kurumsal çıktı",
    },
    {
      label: "Doğrulama",
      value: meta.referenceCode ?? buildReferenceCode("DOC", meta.generatedAt),
    },
  ];

  detailBoxes.forEach((item, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const boxWidth = (page.getWidth() - 68) / 2;
    const x = 28 + column * (boxWidth + 12);
    const y = 326 + row * 72;

    drawBox(page, { x, y, width: boxWidth, height: 58 }, { stroke: CORPORATE_COLORS.line, strokeWidth: 1 });
    drawTextBox(page, fonts, item.label.toUpperCase(), { x: x + 14, y: y + 12, width: boxWidth - 28, height: 10 }, {
      font: fonts.bold,
      size: 7.8,
      color: CORPORATE_COLORS.gray,
      paddingX: 0,
      paddingY: 0,
    });
    drawTextBox(page, fonts, item.value, { x: x + 14, y: y + 28, width: boxWidth - 28, height: 18 }, {
      size: 10,
      color: CORPORATE_COLORS.text,
      paddingX: 0,
      paddingY: 0,
    });
  });

  return page;
}

function createCorporatePage(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  meta: CorporatePdfMeta,
  logo: PDFImage | null,
  size: [number, number] = [PORTRAIT.width, PORTRAIT.height],
) {
  const page = pdfDoc.addPage(size);
  drawCorporateHeader(page, fonts, meta, logo);
  return page;
}

const CORPORATE_SIGNATURE_SECTION_HEIGHT = 132;
const CORPORATE_SIGNATURE_PAGE_TOP = 146;
const CORPORATE_SIGNATURE_SECTION_GAP = 12;

type CorporateSignatureEntry = {
  title: string;
  name: string;
  role: string;
};

function buildCorporateSignatureEntries(meta: CorporatePdfMeta): CorporateSignatureEntry[] {
  const preparedByName = normalizeInlineText(meta.preparedByName) || "Yetkili personel";
  const institutionManagerName =
    normalizeInlineText(meta.institutionManagerName) || "Kurum yöneticisi";
  const institutionManagerTitle =
    normalizeInlineText(meta.institutionManagerTitle) || "Kurum yöneticisi";
  const institutionBound = Boolean(meta.institutionId);

  if (meta.preparedByRole === "institution") {
    return [{ title: "İmza", name: preparedByName, role: institutionManagerTitle }];
  }

  if (meta.preparedByRole === "teacher") {
    if (institutionBound) {
      return [
        { title: "Hazırlayan", name: preparedByName, role: "Öğretmen" },
        { title: "Onay", name: institutionManagerName, role: institutionManagerTitle },
      ];
    }

    return [{ title: "İmza", name: preparedByName, role: "Öğretmen" }];
  }

  return [{ title: "İmza", name: preparedByName, role: "Belgeyi hazırlayan" }];
}

function drawCorporateSignatureSection(
  page: PDFPage,
  fonts: Fonts,
  meta: CorporatePdfMeta,
  top: number,
) {
  const signatureEntries = buildCorporateSignatureEntries(meta);
  const boxWidth = signatureEntries.length === 1 ? 250 : 220;
  const gap = signatureEntries.length === 1 ? 0 : 20;
  const totalWidth = signatureEntries.length * boxWidth + (signatureEntries.length - 1) * gap;
  const startX = (page.getWidth() - totalWidth) / 2;

  signatureEntries.forEach((item, index) => {
    const boxX = startX + index * (boxWidth + gap);

    drawBox(page, { x: boxX, y: top, width: boxWidth, height: 92 }, {
      fill: CORPORATE_COLORS.white,
      stroke: CORPORATE_COLORS.line,
      strokeWidth: 1,
    });
    drawTextBox(page, fonts, item.title.toUpperCase(), { x: boxX + 14, y: top + 12, width: boxWidth - 28, height: 10 }, {
      font: fonts.bold,
      size: 7.8,
      color: CORPORATE_COLORS.gray,
      paddingX: 0,
      paddingY: 0,
    });
    drawTextBox(page, fonts, item.name, { x: boxX + 14, y: top + 30, width: boxWidth - 28, height: 14 }, {
      font: fonts.bold,
      size: 10,
      paddingX: 0,
      paddingY: 0,
    });
    drawTextBox(page, fonts, item.role, { x: boxX + 14, y: top + 46, width: boxWidth - 28, height: 12 }, {
      size: 8.4,
      color: CORPORATE_COLORS.text,
      paddingX: 0,
      paddingY: 0,
    });
  });
}

function placeCorporateSignatureSection(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  meta: CorporatePdfMeta,
  logo: PDFImage | null,
  currentPage?: PDFPage | null,
  currentTop?: number | null,
) {
  const pageBottom = (page: PDFPage) => page.getHeight() - 54;
  let page = currentPage ?? null;
  let top = currentTop ?? CORPORATE_SIGNATURE_PAGE_TOP;

  if (!page || top + CORPORATE_SIGNATURE_SECTION_HEIGHT > pageBottom(page)) {
    page = createCorporatePage(pdfDoc, fonts, meta, logo, page ? [page.getWidth(), page.getHeight()] : undefined);
    top = CORPORATE_SIGNATURE_PAGE_TOP;
  }

  drawCorporateSignatureSection(page, fonts, meta, top);

  return {
    page,
    currentTop: top + CORPORATE_SIGNATURE_SECTION_HEIGHT + CORPORATE_SIGNATURE_SECTION_GAP,
  };
}

function drawInfoLine(
  page: PDFPage,
  fonts: Fonts,
  top: number,
  label: string,
  value: string,
  size = 10,
) {
  drawTextBox(
    page,
    fonts,
    `${label}: ${value || "-"}`,
    { x: 34, y: top, width: page.getWidth() - 68, height: 18 },
    {
      size,
      color: CORPORATE_COLORS.text,
      paddingX: 0,
      paddingY: 0,
    },
  );
}

function drawSummaryBand(
  page: PDFPage,
  fonts: Fonts,
  top: number,
  items: Array<{ label: string; value: string }>,
) {
  drawBox(page, { x: 28, y: top, width: page.getWidth() - 56, height: 52 }, {
    fill: CORPORATE_COLORS.soft,
    stroke: CORPORATE_COLORS.line,
    strokeWidth: 1,
  });

  items.slice(0, 3).forEach((item, index) => {
    const width = (page.getWidth() - 80) / 3;
    const x = 40 + index * width;
    drawTextBox(page, fonts, item.label.toUpperCase(), { x, y: top + 10, width: width - 8, height: 10 }, {
      font: fonts.bold,
      size: 7.5,
      color: CORPORATE_COLORS.gray,
      paddingX: 0,
      paddingY: 0,
    });
    drawTextBox(page, fonts, item.value, { x, y: top + 24, width: width - 8, height: 14 }, {
      size: 9.4,
      color: CORPORATE_COLORS.text,
      paddingX: 0,
      paddingY: 0,
    });
  });
}

type StyledSectionLine =
  | {
      kind: "blank";
      height: number;
    }
  | {
      kind: "plain";
      lines: string[];
      height: number;
    }
  | {
      kind: "labelValue";
      label: string;
      valueLines: string[];
      indent: number;
      height: number;
    };

function buildStyledSectionLines(
  fonts: Fonts,
  body: string,
  width: number,
  lineHeight: number,
  size = 9.2,
) {
  const usableWidth = Math.max(1, width);
  const sourceLines = body.split("\n");
  const labelIndents = sourceLines
    .map((sourceLine) => sourceLine.trim())
    .filter(Boolean)
    .map((normalized) => {
      const colonIndex = normalized.indexOf(":");
      const hasLabel = colonIndex > 0 && colonIndex < 42;

      if (!hasLabel) {
        return null;
      }

      const label = normalized.slice(0, colonIndex + 1).trim();
      const labelWidth = fonts.bold.widthOfTextAtSize(label, size);
      return labelWidth + 10;
    })
    .filter((value): value is number => typeof value === "number");

  const sharedIndent =
    labelIndents.length > 0
      ? Math.min(Math.max(86, Math.max(...labelIndents)), Math.max(86, usableWidth * 0.36))
      : 86;

  return sourceLines.map<StyledSectionLine>((sourceLine) => {
    const normalized = sourceLine.trim();
    if (!normalized) {
      return {
        kind: "blank",
        height: Math.max(8, lineHeight * 0.7),
      };
    }

    const colonIndex = normalized.indexOf(":");
    const hasLabel = colonIndex > 0 && colonIndex < 42;

    if (!hasLabel) {
      const lines = wrapText(normalized, fonts.regular, size, usableWidth);
      return {
        kind: "plain",
        lines: lines.length > 0 ? lines : ["-"],
        height: Math.max(1, lines.length || 1) * lineHeight,
      };
    }

    const label = normalized.slice(0, colonIndex + 1).trim();
    const value = normalized.slice(colonIndex + 1).trim() || "-";
    const indent = sharedIndent;
    const valueWidth = Math.max(24, usableWidth - indent);
    const valueLines = wrapText(value, fonts.regular, size, valueWidth);

    return {
      kind: "labelValue",
      label,
      valueLines: valueLines.length > 0 ? valueLines : ["-"],
      indent,
      height: Math.max(1, valueLines.length || 1) * lineHeight,
    };
  });
}

function drawStyledSectionBody(
  page: PDFPage,
  fonts: Fonts,
  lines: StyledSectionLine[],
  box: Box,
  lineHeight: number,
  size = 9.2,
) {
  let offsetY = 0;

  for (const item of lines) {
    if (item.kind === "blank") {
      offsetY += item.height;
      continue;
    }

    if (item.kind === "plain") {
      item.lines.forEach((line, index) => {
        const lineY = toPdfY(page, box.y + offsetY + size + index * lineHeight);
        if (index < item.lines.length - 1 && /\s/.test(line)) {
          drawJustifiedLine(page, line, fonts.regular, size, CORPORATE_COLORS.text, box.x, lineY, box.width);
          return;
        }

        page.drawText(line, {
          x: box.x,
          y: lineY,
          size,
          font: fonts.regular,
          color: CORPORATE_COLORS.text,
        });
      });
      offsetY += item.height;
      continue;
    }

    page.drawText(item.label, {
      x: box.x,
      y: toPdfY(page, box.y + offsetY + size),
      size,
      font: fonts.bold,
      color: CORPORATE_COLORS.text,
    });

    item.valueLines.forEach((line, index) => {
      const lineX = box.x + item.indent;
      const lineY = toPdfY(page, box.y + offsetY + size + index * lineHeight);
      const valueWidth = Math.max(24, box.width - item.indent);

      if (index < item.valueLines.length - 1 && /\s/.test(line)) {
        drawJustifiedLine(
          page,
          line,
          fonts.regular,
          size,
          CORPORATE_COLORS.text,
          lineX,
          lineY,
          valueWidth,
        );
        return;
      }

      page.drawText(line, {
        x: lineX,
        y: lineY,
        size,
        font: fonts.regular,
        color: CORPORATE_COLORS.text,
      });
    });

    offsetY += item.height;
  }
}

function splitStyledSectionLine(
  item: StyledSectionLine,
  maxHeight: number,
  lineHeight: number,
) {
  const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));

  if (item.kind === "plain" && item.lines.length > maxLines) {
    const currentLines = item.lines.slice(0, maxLines);
    const remainingLines = item.lines.slice(maxLines);
    return {
      current: {
        ...item,
        lines: currentLines,
        height: currentLines.length * lineHeight,
      } satisfies StyledSectionLine,
      remaining: {
        ...item,
        lines: remainingLines,
        height: remainingLines.length * lineHeight,
      } satisfies StyledSectionLine,
    };
  }

  if (item.kind === "labelValue" && item.valueLines.length > maxLines) {
    const currentLines = item.valueLines.slice(0, maxLines);
    const remainingLines = item.valueLines.slice(maxLines);
    return {
      current: {
        ...item,
        valueLines: currentLines,
        height: currentLines.length * lineHeight,
      } satisfies StyledSectionLine,
      remaining: {
        ...item,
        valueLines: remainingLines,
        height: remainingLines.length * lineHeight,
      } satisfies StyledSectionLine,
    };
  }

  return null;
}

function drawSectionsDocument(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  meta: CorporatePdfMeta,
  sections: PdfSection[],
  logo: PDFImage | null,
) {
  createCorporateCoverPage(pdfDoc, fonts, meta, logo);
  let page = createCorporatePage(pdfDoc, fonts, meta, logo);
  let currentTop = 136;
  const sectionLineHeight = 13.4;
  const sectionBodyWidth = page.getWidth() - 60;
  const minSectionHeight = 44;
  const pageBottom = page.getHeight() - 96;

  drawSummaryBand(page, fonts, 132, [
    {
      label: "Belge türü",
      value: meta.documentType,
    },
    {
      label: "Kurum",
      value: normalizeInlineText(meta.institutionName) || "SPECIA",
    },
    {
      label: "Tarih",
      value: formatDateTime(meta.generatedAt),
    },
  ]);
  currentTop = 198;

  for (const section of sections) {
    const body = normalizeBlockText(section.body) || "-";
    const styledLines = buildStyledSectionLines(
      fonts,
      body,
      sectionBodyWidth,
      sectionLineHeight,
      9.2,
    );
    let cursor = 0;

    while (cursor < styledLines.length) {
      if (currentTop + minSectionHeight > pageBottom) {
        page = createCorporatePage(pdfDoc, fonts, meta, logo);
        currentTop = 132;
        drawSummaryBand(page, fonts, 132, [
          {
            label: "Belge türü",
            value: meta.documentType,
          },
          {
            label: "Kurum",
            value: normalizeInlineText(meta.institutionName) || "SPECIA",
          },
          {
            label: "Tarih",
            value: formatDateTime(meta.generatedAt),
          },
        ]);
        currentTop = 198;
      }

      const availableBodyHeight = Math.max(24, pageBottom - currentTop - 34);
      let chunkHeight = 0;
      const chunk: StyledSectionLine[] = [];

      while (cursor + chunk.length < styledLines.length) {
        const nextLineIndex = cursor + chunk.length;
        const nextLine = styledLines[nextLineIndex];
        if (chunk.length > 0 && chunkHeight + nextLine.height > availableBodyHeight) {
          break;
        }
        if (chunk.length === 0 && nextLine.height > availableBodyHeight) {
          const splitLine = splitStyledSectionLine(nextLine, availableBodyHeight, sectionLineHeight);
          if (splitLine) {
            styledLines.splice(nextLineIndex, 1, splitLine.current, splitLine.remaining);
          }
        }

        const currentLine = styledLines[nextLineIndex];
        if (chunk.length === 0 && currentLine.height > availableBodyHeight) {
          break;
        }

        chunk.push(currentLine);
        chunkHeight += currentLine.height;
      }

      const safeChunk = chunk.length > 0 ? chunk : [styledLines[cursor]];
      const safeChunkHeight =
        chunk.length > 0 ? chunkHeight : Math.max(sectionLineHeight, styledLines[cursor]?.height ?? sectionLineHeight);
      const bodyHeight = Math.max(16, safeChunkHeight);
      const boxHeight = Math.max(minSectionHeight, bodyHeight + 34);

      drawBox(
        page,
        { x: 24, y: currentTop, width: page.getWidth() - 48, height: boxHeight },
        { stroke: CORPORATE_COLORS.line, strokeWidth: 1, fill: CORPORATE_COLORS.white },
      );
      drawBox(
        page,
        { x: 24, y: currentTop, width: page.getWidth() - 48, height: 22 },
        { fill: CORPORATE_COLORS.black, stroke: CORPORATE_COLORS.line, strokeWidth: 1 },
      );
      drawTextBox(
        page,
        fonts,
        section.title,
        { x: 30, y: currentTop + 3, width: page.getWidth() - 60, height: 16 },
        {
          font: fonts.bold,
          size: 10,
          color: CORPORATE_COLORS.white,
          paddingX: 0,
          paddingY: 0,
        },
      );
      drawStyledSectionBody(
        page,
        fonts,
        safeChunk,
        { x: 30, y: currentTop + 28, width: sectionBodyWidth, height: boxHeight - 34 },
        sectionLineHeight,
        9.2,
      );

      currentTop += boxHeight + 12;
      cursor += safeChunk.length;
    }
  }

  return {
    page,
    currentTop,
  };
}

export async function generateStudentListPdf(input: StudentListPdfInput) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "white");
  const meta: CorporatePdfMeta = {
    title: input.title,
    documentType: "Öğrenci Listesi",
    institutionName: input.institutionName,
    generatedAt: input.generatedAt,
    subjectName: `${input.students.length} öğrenci kaydı`,
    referenceCode: input.referenceCode ?? buildReferenceCode("LST", input.generatedAt),
  };

  createCorporateCoverPage(pdfDoc, fonts, meta, logo);
  let page = createCorporatePage(pdfDoc, fonts, meta, logo);
  let currentTop = 132;

  drawSummaryBand(page, fonts, currentTop, [
    {
      label: "Kurum",
      value: normalizeInlineText(input.institutionName) || "Tüm kayıtlar",
    },
    {
      label: "Kayıt sayısı",
      value: String(input.students.length),
    },
    {
      label: "Düzenlenme",
      value: formatDateTime(input.generatedAt),
    },
  ]);
  currentTop += 70;

  const widths = [165, 170, 68, 64, 64];
  const headers = ["Öğrenci", "Okul / Sınıf", "BEP", "Veli", "Durum"];
  const startX = 24;
  const rowHeight = 28;

  const drawHeader = () => {
    let x = startX;
    headers.forEach((label, index) => {
      drawTableCell(
        page,
        fonts,
        { x, y: currentTop, width: widths[index], height: 28 },
        label,
        {
          fill: COLORS.teal,
          color: COLORS.white,
          font: fonts.bold,
          align: "center",
          size: 9,
        },
      );
      x += widths[index];
    });
    currentTop += 28;
  };

  drawHeader();

  for (const student of input.students) {
    const textValues = [
      `${student.firstName} ${student.lastName}`,
      [normalizeInlineText(student.schoolName), normalizeInlineText(student.classroom)]
        .filter(Boolean)
        .join(" / "),
    ];
    const dynamicRowHeight = Math.max(
      rowHeight,
      Math.ceil(
        Math.max(
          measureWrappedTextHeight(textValues[0], fonts.regular, 8.6, widths[0], {
            lineHeight: 10,
          }),
          measureWrappedTextHeight(textValues[1], fonts.regular, 8.6, widths[1], {
            lineHeight: 10,
          }),
        ) + 8,
      ),
    );

    if (currentTop + dynamicRowHeight > page.getHeight() - 48) {
      page = createCorporatePage(pdfDoc, fonts, meta, logo);
      currentTop = 132;
      drawHeader();
    }

    const values = [
      textValues[0],
      textValues[1],
      String(student.bepCount),
      String(student.parentCount),
      student.isActive ? "Aktif" : "Pasif",
    ];

    let x = startX;
    values.forEach((value, index) => {
      drawTableCell(page, fonts, { x, y: currentTop, width: widths[index], height: dynamicRowHeight }, value, {
        size: 8.6,
        align: index >= 2 ? "center" : "left",
      });
      x += widths[index];
    });

    currentTop += dynamicRowHeight;
  }

  placeCorporateSignatureSection(
    pdfDoc,
    fonts,
    {
      ...meta,
      preparedByName: input.generatedByName,
      preparedByRole: input.generatedByRole,
      institutionId: input.institutionId,
      institutionManagerName: input.institutionManagerName,
      institutionManagerTitle: input.institutionManagerTitle,
    },
    logo,
    page,
    currentTop + 12,
  );
  pdfDoc.getPages().forEach((pdfPage, index, pages) => {
    drawCorporateFooter(pdfPage, fonts, meta, index + 1, pages.length);
  });

  return pdfDoc.save();
}

export async function generateStudentProfilePdf(input: StudentProfilePdfInput) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "white");
  const meta: CorporatePdfMeta = {
    title: input.title,
    documentType: "Öğrenci Bilgi Raporu",
    institutionName: input.student.schoolName,
    generatedAt: input.generatedAt,
    subjectName: `${input.student.firstName} ${input.student.lastName}`,
    referenceCode: input.referenceCode ?? buildReferenceCode("STD", input.generatedAt),
  };

  const sections: PdfSection[] = [
    {
      title: "Genel Bilgiler",
      body: [
        `Öğrenci: ${input.student.firstName} ${input.student.lastName}`,
        `Okul: ${normalizeInlineText(input.student.schoolName) || "-"}`,
        `Sınıf: ${normalizeInlineText(input.student.classroom) || "-"}`,
        `Numara: ${normalizeInlineText(input.student.schoolNumber) || "-"}`,
        `Kademe: ${normalizeInlineText(input.student.kademe) || "-"}`,
        `İlçe: ${normalizeInlineText(input.student.district) || "-"}`,
      ].join("\n"),
    },
    {
      title: "Veli ve İletişim",
      body: [
        `Veli: ${normalizeInlineText(input.student.guardianName) || "-"}`,
        `Telefon: ${normalizeInlineText(input.student.guardianPhone) || "-"}`,
        `Adres: ${normalizeInlineText(input.student.homeAddress) || "-"}`,
        input.student.parentStudentLinks.length > 0
          ? `Bağlı hesaplar:\n${input.student.parentStudentLinks
              .map((link) => `${link.parent.name} (${link.parent.email})`)
              .join("\n")}`
          : "Bağlı veli hesabı bulunmuyor.",
      ].join("\n"),
    },
    {
      title: "Tanı ve Gelişim",
      body: [
        `Tanı: ${normalizeBlockText(input.student.diagnosis) || "-"}`,
        `Gelişim öyküsü: ${normalizeBlockText(input.student.developmentHistory) || "-"}`,
        `Güçlü yönler: ${normalizeBlockText(input.student.strengths) || "-"}`,
        `Gelişim alanları: ${normalizeBlockText(input.student.improvementAreas) || "-"}`,
        `Davranış notları: ${normalizeBlockText(input.student.behaviorNotes) || "-"}`,
      ].join("\n\n"),
    },
    {
      title: "BEP Kayıtları",
      body:
        input.student.documents.length > 0
          ? input.student.documents
              .map(
                (document, index) =>
                  `${index + 1}. ${document.title} / ${document.status} / ${APPROVAL_STATUS_LABELS[document.approvalStatus ?? ""] ?? "-"} / ${document.updatedAt.toLocaleDateString("tr-TR")}`,
              )
              .join("\n")
          : "Kayıtlı BEP bulunmuyor.",
    },
    {
      title: "Belge Kayıtları",
      body:
        input.student.studentFiles.length > 0
          ? input.student.studentFiles
              .map(
                (file, index) =>
                  `${index + 1}. ${file.title} / ${STUDENT_FILE_CATEGORY_LABELS[file.category] ?? file.category} / ${normalizeInlineText(file.fileName) || "Dosya adı yok"} / ${file.expiresAt ? file.expiresAt.toLocaleDateString("tr-TR") : "-"}`,
              )
              .join("\n")
          : "Belge kaydı bulunmuyor.",
    },
  ];

  const studentProfileLayout = drawSectionsDocument(pdfDoc, fonts, meta, sections, logo);
  placeCorporateSignatureSection(
    pdfDoc,
    fonts,
    {
      ...meta,
      preparedByName: input.generatedByName,
      preparedByRole: input.generatedByRole,
      institutionId: input.institutionId,
      institutionManagerName: input.institutionManagerName,
      institutionManagerTitle: input.institutionManagerTitle,
    },
    logo,
    studentProfileLayout.page,
    studentProfileLayout.currentTop,
  );
  pdfDoc.getPages().forEach((pdfPage, index, pages) => {
    drawCorporateFooter(pdfPage, fonts, meta, index + 1, pages.length);
  });

  return pdfDoc.save();
}

export async function generateInstitutionReportPdf(input: InstitutionReportPdfInput) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "white");
  const meta: CorporatePdfMeta = {
    title: input.title,
    documentType: "Kurum Değerlendirme Raporu",
    institutionName: input.institutionName,
    generatedAt: input.generatedAt,
    subjectName: `${input.summary.studentCount} öğrenci / ${input.summary.teacherCount} öğretmen`,
    referenceCode: input.referenceCode ?? buildReferenceCode("RPT", input.generatedAt),
  };

  const sections: PdfSection[] = [
    {
      title: "Genel Özet",
      body: [
        `Kurum: ${normalizeInlineText(input.institutionName) || "-"}`,
        `Rapor tarihi: ${formatDateTime(input.generatedAt)}`,
        `Toplam öğrenci: ${input.summary.studentCount}`,
        `Toplam BEP: ${input.summary.documentCount}`,
        `Tamamlanan BEP: ${input.summary.completedDocuments}`,
        `Onaylanan BEP: ${input.summary.approvedDocuments}`,
        `Bekleyen onay: ${input.summary.pendingApprovals}`,
        `Belge kaydı: ${input.summary.studentFileCount}`,
        `Süresi yaklaşan belge: ${input.summary.expiringFiles}`,
      ].join("\n"),
    },
    {
      title: "Seans ve Kadro",
      body: [
        `Öğretmen sayısı: ${input.summary.teacherCount}`,
        `Veli sayisi: ${input.summary.parentCount}`,
        `Oda sayisi: ${input.summary.roomCount}`,
        `${input.periodLabel ?? "Bu ay"} toplam seans: ${input.summary.totalSessionsThisMonth}`,
        `Planlanan: ${input.summary.plannedSessions}`,
        `Tamamlanan: ${input.summary.completedSessions}`,
        `Iptal edilen: ${input.summary.cancelledSessions}`,
      ].join("\n"),
    },
    {
      title: "Personel İş Yükleri",
      body:
        input.staffWorkload.length > 0
          ? input.staffWorkload
              .map(
                (staff, index) =>
                  `${index + 1}. ${staff.name}${normalizeInlineText(staff.branch) ? ` / ${normalizeInlineText(staff.branch)}` : ""} / ${staff.sessionCount} planli / ${staff.completedSessionCount} tamamlanan`,
              )
              .join("\n")
          : "Personel verisi bulunmuyor.",
    },
    {
      title: "Seans Tipi Dağılımı",
      body:
        input.sessionTypeBreakdown.length > 0
          ? input.sessionTypeBreakdown
              .map((item, index) => `${index + 1}. ${SESSION_TYPE_LABELS[item.type] ?? item.type}: ${item.count}`)
              .join("\n")
          : "Seans verisi yok.",
    },
    {
      title: "Yoğun Destek Alan Öğrenciler",
      body:
        input.studentSessionLeaderboard.length > 0
          ? input.studentSessionLeaderboard
              .map(
                (student, index) =>
                  `${index + 1}. ${student.studentName} / ${student.sessionCount} seans`,
              )
              .join("\n")
          : "Öğrenci seans yoğunluğu verisi yok.",
    },
    {
      title: "Son Güncellenen Belgeler",
      body:
        input.recentDocuments.length > 0
          ? input.recentDocuments
              .map(
                (document, index) =>
                  `${index + 1}. ${document.title} / ${document.student.firstName} ${document.student.lastName} / ${document.owner.name ?? "-"}`,
              )
              .join("\n")
          : "Belge kaydı yok.",
    },
  ];

  const institutionReportLayout = drawSectionsDocument(pdfDoc, fonts, meta, sections, logo);
  placeCorporateSignatureSection(
    pdfDoc,
    fonts,
    {
      ...meta,
      preparedByName: input.generatedByName,
      preparedByRole: input.generatedByRole,
      institutionId: input.institutionId,
      institutionManagerName: input.institutionManagerName,
      institutionManagerTitle: input.institutionManagerTitle,
    },
    logo,
    institutionReportLayout.page,
    institutionReportLayout.currentTop,
  );
  pdfDoc.getPages().forEach((pdfPage, index, pages) => {
    drawCorporateFooter(pdfPage, fonts, meta, index + 1, pages.length);
  });

  return pdfDoc.save();
}

export async function generateCalendarAgendaPdf(input: CalendarAgendaPdfInput) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "white");
  const meta: CorporatePdfMeta = {
    title: input.title,
    documentType: "Takvim ve Günlük Akış",
    generatedAt: input.generatedAt,
    subjectName: input.selectedDate.toLocaleDateString("tr-TR"),
    summary:
      "Bu belge, seçilen gün için planlanan kurum etkinlikleri ile öğrenci seanslarını resmi ajanda formatında listeler.",
    referenceCode: input.referenceCode ?? buildReferenceCode("CAL", input.generatedAt),
  };

  const sections: PdfSection[] = [
    {
      title: "Takvim Özeti",
      body: [
        `Seçilen tarih: ${input.selectedDate.toLocaleDateString("tr-TR")}`,
        `Oluşturma tarihi: ${formatDateTime(input.generatedAt)}`,
        `Etkinlik sayısı: ${input.events.length}`,
        `Seans sayısı: ${input.sessions.length}`,
      ].join("\n"),
    },
    {
      title: "Etkinlikler",
      body:
        input.events.length > 0
          ? input.events
              .map(
                (event, index) =>
                  `${index + 1}. ${event.title} / ${event.startAt.toLocaleString("tr-TR")} - ${event.endAt.toLocaleString("tr-TR")} / ${CALENDAR_SCOPE_LABELS[event.scope] ?? event.scope} / ${event.assignedUserName ?? event.ownerName}${event.studentName ? ` / ${event.studentName}` : ""}${event.description ? ` / ${event.description}` : ""}`,
              )
              .join("\n")
          : "Takvim etkinliği yok.",
    },
    {
      title: "Seanslar",
      body:
        input.sessions.length > 0
          ? input.sessions
              .map(
                (session, index) =>
                  `${index + 1}. ${session.studentName} / ${session.startAt.toLocaleString("tr-TR")} - ${session.endAt.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} / ${session.teacherName ?? "Öğretmen atanmadı"} / ${session.roomName ?? "Oda yok"} / ${SESSION_TYPE_LABELS[session.sessionType] ?? session.sessionType} / ${SESSION_STATUS_LABELS[session.status] ?? session.status}`,
              )
              .join("\n")
          : "Takvimde seans yok.",
    },
  ];

  const calendarLayout = drawSectionsDocument(pdfDoc, fonts, meta, sections, logo);
  placeCorporateSignatureSection(
    pdfDoc,
    fonts,
    {
      ...meta,
      preparedByName: input.generatedByName,
      preparedByRole: input.generatedByRole,
      institutionId: input.institutionId,
      institutionManagerName: input.institutionManagerName,
      institutionManagerTitle: input.institutionManagerTitle,
    },
    logo,
    calendarLayout.page,
    calendarLayout.currentTop,
  );
  pdfDoc.getPages().forEach((pdfPage, index, pages) => {
    drawCorporateFooter(pdfPage, fonts, meta, index + 1, pages.length);
  });

  return pdfDoc.save();
}

function getFormattedTimeRange(startTime: string, durationMinutes: number) {
  const parts = startTime.split(":");
  if (parts.length < 2) return startTime;
  const startHours = parseInt(parts[0], 10);
  const startMinutes = parseInt(parts[1], 10);
  
  if (isNaN(startHours) || isNaN(startMinutes)) return startTime;
  
  const startTotalMinutes = startHours * 60 + startMinutes;
  const endTotalMinutes = startTotalMinutes + durationMinutes;
  
  const endHours = Math.floor(endTotalMinutes / 60) % 24;
  const endMinutes = endTotalMinutes % 60;
  
  const pad = (num: number) => String(num).padStart(2, "0");
  
  return `${pad(startHours)}.${pad(startMinutes)}-${pad(endHours)}.${pad(endMinutes)}`;
}

function drawSessionScheduleSignatureSection(
  page: PDFPage,
  fonts: Fonts,
  meta: CorporatePdfMeta,
  top: number,
) {
  const signatureEntries = buildCorporateSignatureEntries(meta);
  const boxWidth = signatureEntries.length === 1 ? 200 : 180;
  const gap = signatureEntries.length === 1 ? 0 : 20;
  const totalWidth = signatureEntries.length * boxWidth + (signatureEntries.length - 1) * gap;
  const startX = (page.getWidth() - totalWidth) / 2;

  signatureEntries.forEach((item, index) => {
    const boxX = startX + index * (boxWidth + gap);

    drawBox(page, { x: boxX, y: top, width: boxWidth, height: 58 }, {
      fill: CORPORATE_COLORS.white,
      stroke: CORPORATE_COLORS.line,
      strokeWidth: 1,
    });
    drawTextBox(page, fonts, item.title.toUpperCase(), { x: boxX + 10, y: top + 8, width: boxWidth - 20, height: 10 }, {
      font: fonts.bold,
      size: 7,
      color: CORPORATE_COLORS.gray,
      paddingX: 0,
      paddingY: 0,
    });
    drawTextBox(page, fonts, item.name, { x: boxX + 10, y: top + 22, width: boxWidth - 20, height: 12 }, {
      font: fonts.bold,
      size: 8.5,
      paddingX: 0,
      paddingY: 0,
    });
    drawTextBox(page, fonts, item.role, { x: boxX + 10, y: top + 36, width: boxWidth - 20, height: 10 }, {
      size: 7.5,
      color: CORPORATE_COLORS.text,
      paddingX: 0,
      paddingY: 0,
    });
  });
}

function placeSessionScheduleSignatureSection(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  meta: CorporatePdfMeta,
  logo: PDFImage | null,
  currentPage: PDFPage,
  currentTop: number,
) {
  const sigHeight = 58;
  const bottomLimit = currentPage.getHeight() - 44 - sigHeight; // 595.44 - 44 - 58 = 493.44
  
  let page = currentPage;
  let top = Math.max(currentTop + 15, bottomLimit);
  
  if (currentTop + 15 > bottomLimit) {
    page = createCorporatePage(pdfDoc, fonts, meta, logo, [page.getWidth(), page.getHeight()]);
    top = page.getHeight() - 44 - sigHeight;
  }

  drawSessionScheduleSignatureSection(page, fonts, meta, top);
  return page;
}

export async function generateSessionSchedulePdf(input: SessionSchedulePdfInput) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "white");
  const meta: CorporatePdfMeta = {
    title: input.title,
    documentType: "Günlük Seans Programı",
    generatedAt: input.generatedAt,
    subjectName: input.teacherName || "Tüm Öğretmenler",
    summary: "Bu belge, seçilen gün içindeki öğrenci seanslarını listeleyen resmi seans programıdır.",
    referenceCode: input.referenceCode ?? buildReferenceCode("SCH", input.generatedAt),
  };

  const startX = 24;
  const hourWidth = 72;
  const tableHeaderHeight = 28;
  const rowHeight = 26;

  let isFirstPage = true;
  let page = createCorporatePage(pdfDoc, fonts, meta, logo, [LANDSCAPE.width, LANDSCAPE.height]);

  // Filter out days that have sessions
  const activeDays = input.days.filter((d) => d.sessions.length > 0);

  if (activeDays.length === 0) {
    drawTextBox(
      page,
      fonts,
      "Bu hafta için planlanmış seans bulunmamaktadır.",
      { x: startX, y: 200, width: LANDSCAPE.width - startX * 2, height: 40 },
      {
        font: fonts.bold,
        size: 14,
        color: CORPORATE_COLORS.gray,
        align: "center",
      }
    );
  } else {
    for (let dayIndex = 0; dayIndex < activeDays.length; dayIndex++) {
      const day = activeDays[dayIndex];
      const activeSessions = day.sessions;

      if (!isFirstPage) {
        page = createCorporatePage(pdfDoc, fonts, meta, logo, [LANDSCAPE.width, LANDSCAPE.height]);
      }
      isFirstPage = false;

      // Draw day-specific details in header next to the title (title is drawn by drawCorporateHeader at y: 72)
      // Column 1: Date/Day
      drawTextBox(page, fonts, "TARİH / GÜN", { x: 440, y: 72, width: 220, height: 10 }, {
        font: fonts.bold,
        size: 7.5,
        color: CORPORATE_COLORS.gray,
        paddingX: 0,
        paddingY: 0,
      });
      drawTextBox(page, fonts, `${day.date.toLocaleDateString("tr-TR")} - ${day.label}`, { x: 440, y: 86, width: 220, height: 14 }, {
        font: fonts.bold,
        size: 9.5,
        color: CORPORATE_COLORS.text,
        paddingX: 0,
        paddingY: 0,
      });

      // Column 2: Session Count
      drawTextBox(page, fonts, "GÜNLÜK SEANS", { x: 680, y: 72, width: 130, height: 10 }, {
        font: fonts.bold,
        size: 7.5,
        color: CORPORATE_COLORS.gray,
        paddingX: 0,
        paddingY: 0,
      });
      drawTextBox(page, fonts, String(activeSessions.length), { x: 680, y: 86, width: 130, height: 14 }, {
        font: fonts.bold,
        size: 9.5,
        color: CORPORATE_COLORS.text,
        paddingX: 0,
        paddingY: 0,
      });

      let currentTop = 124;

      // 1. Unique sorted teacher names on this day
      const teacherMap = new Map<string, string>();
      activeSessions.forEach((s) => {
        const name = s.teacherName?.trim() || "Atanmadı";
        teacherMap.set(name, name);
      });
      const uniqueTeachers = Array.from(teacherMap.values()).sort();

      // 2. Unique sorted start times on this day
      const uniqueStartTimes = Array.from(new Set(activeSessions.map((s) => s.startTime))).sort();

      // Column widths for this day (ALL teachers in one table)
      const colsCount = uniqueTeachers.length;
      const usableWidth = page.getWidth() - startX * 2;
      const teacherColWidth = (usableWidth - hourWidth) / colsCount;
      const columnWidths = [hourWidth, ...Array(colsCount).fill(teacherColWidth)];
      const headers = ["Saat", ...uniqueTeachers];

      // Draw table headers
      let x = startX;
      headers.forEach((headerText, index) => {
        drawTableCell(
          page,
          fonts,
          { x, y: currentTop, width: columnWidths[index], height: tableHeaderHeight },
          headerText,
          {
            fill: CORPORATE_COLORS.black,
            color: CORPORATE_COLORS.white,
            font: fonts.bold,
            align: "center",
            size: 9,
            stroke: CORPORATE_COLORS.line,
          }
        );
        x += columnWidths[index];
      });
      currentTop += tableHeaderHeight;

      // Draw rows
      for (const time of uniqueStartTimes) {
        let rx = startX;

        // Calculate time range (e.g. 09.00-09.40)
        const matchingSession = activeSessions.find((s) => s.startTime === time);
        const duration = matchingSession?.durationMinutes ?? 40;
        const timeRangeStr = getFormattedTimeRange(time, duration);

        // Draw Hour cell
        drawTableCell(
          page,
          fonts,
          { x: rx, y: currentTop, width: columnWidths[0], height: rowHeight },
          timeRangeStr,
          {
            size: 8.5,
            align: "center",
            stroke: CORPORATE_COLORS.line,
          }
        );
        rx += columnWidths[0];

        // Draw Teacher cells (Student names)
        uniqueTeachers.forEach((teacherName, index) => {
          const sessionsMatching = activeSessions.filter(
            (s) => s.startTime === time && (s.teacherName?.trim() || "Atanmadı") === teacherName
          );

          const cellText = sessionsMatching.map((s) => s.studentName).join(", ") || "-";

          drawTableCell(
            page,
            fonts,
            { x: rx, y: currentTop, width: columnWidths[index + 1], height: rowHeight },
            cellText,
            {
              size: 8,
              align: cellText === "-" ? "center" : "left",
              stroke: CORPORATE_COLORS.line,
            }
          );
          rx += columnWidths[index + 1];
        });

        currentTop += rowHeight;
      }

      // Draw signature block at the bottom of the last active day's page if space permits
      if (dayIndex === activeDays.length - 1) {
        page = placeSessionScheduleSignatureSection(
          pdfDoc,
          fonts,
          meta,
          logo,
          page,
          currentTop
        );
      }
    }
  }

  // Draw corporate footers for all pages
  pdfDoc.getPages().forEach((pdfPage, index, pages) => {
    drawCorporateFooter(pdfPage, fonts, meta, index + 1, pages.length);
  });

  return pdfDoc.save();
}

export async function generateInstitutionInvoicePdf(input: InstitutionInvoicePdfInput) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "white");

  const subtotal = input.invoice.quantity * input.invoice.unitPrice;
  const taxAmount = subtotal * (input.invoice.taxRate / 100);
  const total = subtotal + taxAmount;
  const meta: CorporatePdfMeta = {
    title: input.title,
    documentType: "Kurumsal Fatura",
    institutionName: input.institutionLegalName || input.institutionName,
    generatedAt: input.generatedAt,
    subjectName: input.invoice.customerName,
    summary:
      "Bu belge, kurum tarafından düzenlenen hizmet faturasının resmi çıktı formatıdır.",
    referenceCode: input.referenceCode ?? input.invoice.invoiceNumber,
  };

  createCorporateCoverPage(pdfDoc, fonts, meta, logo);
  const page = createCorporatePage(pdfDoc, fonts, meta, logo);

  drawSummaryBand(page, fonts, 132, [
    { label: "Fatura no", value: input.invoice.invoiceNumber },
    { label: "Fatura tipi", value: input.invoice.customerType === "individual" ? "Bireysel" : "Kurumsal" },
    { label: "Durum", value: INVOICE_STATUS_LABELS[input.invoice.status] ?? input.invoice.status },
  ]);

  drawBox(page, { x: 28, y: 198, width: 260, height: 150 }, {
    stroke: CORPORATE_COLORS.line,
    strokeWidth: 1,
  });
  drawTextBox(page, fonts, "DÜZENLEYEN KURUM", { x: 42, y: 212, width: 200, height: 10 }, {
    font: fonts.bold,
    size: 8,
    color: CORPORATE_COLORS.gray,
    paddingX: 0,
    paddingY: 0,
  });
  drawTextBox(
    page,
    fonts,
    [
      input.institutionLegalName || input.institutionName || "SPECIA Koordinasyon Platformu",
      input.institutionAddress || "-",
      `Telefon: ${normalizeInlineText(input.institutionPhone) || "-"}`,
      `E-posta: ${normalizeInlineText(input.institutionEmail) || "-"}`,
      `Vergi Dairesi: ${normalizeInlineText(input.institutionTaxOffice) || "-"}`,
      `Vergi No: ${normalizeInlineText(input.institutionTaxNumber) || "-"}`,
      `MERSİS: ${normalizeInlineText(input.institutionMersisNumber) || "-"}`,
      `IBAN: ${normalizeInlineText(input.institutionIban) || "-"}`,
    ].join("\n"),
    { x: 42, y: 232, width: 232, height: 104 },
    {
      size: 9,
      lineHeight: 12,
      paddingX: 0,
      paddingY: 0,
    },
  );

  drawBox(page, { x: 304, y: 198, width: page.getWidth() - 332, height: 150 }, {
    stroke: CORPORATE_COLORS.line,
    strokeWidth: 1,
  });
  drawTextBox(page, fonts, "ALICI BİLGİLERİ", { x: 318, y: 212, width: 200, height: 10 }, {
    font: fonts.bold,
    size: 8,
    color: CORPORATE_COLORS.gray,
    paddingX: 0,
    paddingY: 0,
  });
  drawTextBox(
    page,
    fonts,
    [
      input.invoice.customerName,
      normalizeInlineText(input.invoice.customerTitle) || "-",
      `Adres: ${normalizeInlineText(input.invoice.billingAddress) || "-"}`,
      `Telefon: ${normalizeInlineText(input.invoice.customerPhone) || "-"}`,
      `E-posta: ${normalizeInlineText(input.invoice.customerEmail) || "-"}`,
      input.invoice.customerType === "individual"
        ? `T.C. Kimlik No: ${normalizeInlineText(input.invoice.customerIdentityNo) || "-"}`
        : `Vergi No: ${normalizeInlineText(input.invoice.customerTaxNumber) || "-"}`,
      `Vergi Dairesi: ${normalizeInlineText(input.invoice.customerTaxOffice) || "-"}`,
    ].join("\n"),
    { x: 318, y: 232, width: page.getWidth() - 360, height: 104 },
    {
      size: 9,
      lineHeight: 12,
      paddingX: 0,
      paddingY: 0,
    },
  );

  const tableTop = 368;
  const widths = [180, 82, 82, 76, 104];
  const headers = ["Hizmet", "Miktar", "Birim", "KDV", "Tutar"];
  let x = 28;
  headers.forEach((label, index) => {
    drawTableCell(page, fonts, { x, y: tableTop, width: widths[index], height: 28 }, label, {
      fill: CORPORATE_COLORS.black,
      color: CORPORATE_COLORS.white,
      font: fonts.bold,
      align: "center",
      size: 8.6,
      stroke: CORPORATE_COLORS.line,
    });
    x += widths[index];
  });

  const serviceRowHeight = 48;
  x = 28;
  [
    input.invoice.serviceTitle,
    `${input.invoice.quantity}`,
    formatCurrencyForPdf(input.invoice.unitPrice),
    `%${input.invoice.taxRate}`,
    formatCurrencyForPdf(total),
  ].forEach((value, index) => {
    drawTableCell(page, fonts, { x, y: tableTop + 28, width: widths[index], height: serviceRowHeight }, value, {
      size: 8.8,
      align: index === 0 ? "left" : "center",
      stroke: CORPORATE_COLORS.line,
    });
    x += widths[index];
  });

  const detailTop = tableTop + 28 + serviceRowHeight + 18;
  drawBox(page, { x: 28, y: detailTop, width: 332, height: 120 }, {
    fill: CORPORATE_COLORS.soft,
    stroke: CORPORATE_COLORS.line,
    strokeWidth: 1,
  });
  drawTextBox(page, fonts, "HİZMET DETAYI", { x: 42, y: detailTop + 12, width: 160, height: 10 }, {
    font: fonts.bold,
    size: 8,
    color: CORPORATE_COLORS.gray,
    paddingX: 0,
    paddingY: 0,
  });
  drawTextBox(
    page,
    fonts,
    [
      `Hizmet açıklaması: ${normalizeBlockText(input.invoice.serviceDescription) || "-"}`,
      `Hizmet dönemi: ${normalizeInlineText(input.invoice.servicePeriod) || "-"}`,
      `Fatura tarihi: ${input.invoice.issueDate.toLocaleDateString("tr-TR")}`,
      `Vade tarihi: ${input.invoice.dueDate ? input.invoice.dueDate.toLocaleDateString("tr-TR") : "-"}`,
      `Notlar: ${normalizeBlockText(input.invoice.notes) || "-"}`,
    ].join("\n"),
    { x: 42, y: detailTop + 30, width: 304, height: 76 },
    {
      size: 8.8,
      lineHeight: 13,
      paddingX: 0,
      paddingY: 0,
    },
  );

  const totalsTop = detailTop;
  const totalsBoxX = 388;
  const totalsBoxWidth = page.getWidth() - 416;
  const totalsContentX = totalsBoxX + 14;
  const totalsContentWidth = totalsBoxWidth - 28;
  const totalsLabelWidth = 66;
  const totalsGap = 8;
  const totalsValueX = totalsContentX + totalsLabelWidth + totalsGap;
  const totalsValueWidth = totalsContentWidth - totalsLabelWidth - totalsGap;

  drawBox(page, { x: totalsBoxX, y: totalsTop, width: totalsBoxWidth, height: 120 }, {
    fill: CORPORATE_COLORS.white,
    stroke: CORPORATE_COLORS.line,
    strokeWidth: 1,
  });
  drawTextBox(page, fonts, "TUTAR ÖZETİ", { x: totalsContentX, y: totalsTop + 12, width: totalsContentWidth, height: 10 }, {
    font: fonts.bold,
    size: 8,
    color: CORPORATE_COLORS.gray,
    paddingX: 0,
    paddingY: 0,
  });
  [
    { label: "Ara toplam", value: subtotal },
    { label: "KDV", value: taxAmount },
    { label: "Genel toplam", value: total },
  ].forEach((item, index) => {
    const top = totalsTop + 34 + index * 24;
    drawTextBox(page, fonts, item.label, { x: totalsContentX, y: top, width: totalsLabelWidth, height: 12 }, {
      font: index === 2 ? fonts.bold : fonts.regular,
      size: 9,
      paddingX: 0,
      paddingY: 0,
    });
    drawTextBox(page, fonts, formatCurrencyForPdf(item.value), { x: totalsValueX, y: top, width: totalsValueWidth, height: 12 }, {
      font: index === 2 ? fonts.bold : fonts.regular,
      size: 9,
      align: "right",
      paddingX: 0,
      paddingY: 0,
    });
  });

  placeCorporateSignatureSection(
    pdfDoc,
    fonts,
    {
      ...meta,
      preparedByName: input.generatedByName,
      preparedByRole: input.generatedByRole,
      institutionId: input.institutionId,
      institutionManagerName: input.institutionManagerName,
      institutionManagerTitle: input.institutionManagerTitle,
      subjectName: input.principalName || input.coordinatorName || input.invoice.customerName,
    },
    logo,
    page,
    detailTop + 138,
  );

  pdfDoc.getPages().forEach((pdfPage, index, pages) => {
    drawCorporateFooter(pdfPage, fonts, meta, index + 1, pages.length);
  });

  return pdfDoc.save();
}
