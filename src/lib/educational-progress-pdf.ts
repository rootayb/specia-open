import type {
  BepDocument,
  BepGoalProgressEntry,
  BepPlanRow,
  GoalProgressStatus,
  LearningPhase,
  Student,
  User,
} from "@/lib/prisma-shim";
import { PDFDocument, type PDFFont, type PDFImage, rgb } from "pdf-lib";

import type {
  TeacherEducationalAnalysisSummary,
  TeacherEducationalProgressWorkspace,
} from "@/lib/data";
import { loadPdfFonts as loadFonts, type PdfFonts as Fonts } from "@/lib/pdf-assets";
import { loadInstitutionOrSpeciaLogo } from "@/lib/pdf-brand";
import { restoreTurkishText } from "@/lib/turkish";
import { getProcessComponentLabels } from "@/lib/process-component-schedules";
import {
  GOAL_TARGET_PERFORMANCE,
  buildGoalSummary,
  computePerformanceValue,
  computeTrend,
} from "@/lib/educational-analysis";

type FullEducationalProgressDocument = BepDocument & {
  student: Pick<Student, "firstName" | "lastName" | "schoolName" | "schoolNumber" | "classroom">;
  planRows: Array<
    BepPlanRow & {
      goalProgressEntries: Array<
        BepGoalProgressEntry & {
          createdBy: Pick<User, "id" | "name" | "email">;
        }
      >;
    }
  >;
};

type EducationalProgressPdfOptions = {
  selectedGoalId?: string | null;
};

type GoalChartPoint = {
  date: Date;
  value: number;
  status: string;
  note: string | null;
};

const PAGE = { width: 841.92, height: 595.44 };
const MARGIN_X = 28;
const TABLE_WIDTH = PAGE.width - MARGIN_X * 2;
const COLUMN_WIDTHS = [110, 210, 70, 70, 40, 80, 205];
const BORDER = rgb(0.63, 0.7, 0.77);
const HEADER_BG = rgb(0.82, 0.86, 0.9);
const BAND_BG = rgb(0.92, 0.94, 0.96);
const TEXT = rgb(0.07, 0.07, 0.07);
const MUTED = rgb(0.42, 0.47, 0.53);
const BLUE = rgb(0.23, 0.36, 0.72);
const GREEN = rgb(0.12, 0.5, 0.33);
const ROSE = rgb(0.7, 0.22, 0.28);

const statusLabels: Record<string, string> = {
  not_started: "Başlanmadı",
  in_progress: "Sürüyor",
  completed: "Tamamlandı",
  needs_support: "Destek Gerekli",
};

const phaseLabels: Record<string, string> = {
  acquisition: "Edinim",
  fluency: "Akicilik",
  maintenance: "Kalicilik",
  generalization: "Genelleme",
};

async function loadLogo(pdfDoc: PDFDocument, institutionId?: string | null) {
  return loadInstitutionOrSpeciaLogo(pdfDoc, institutionId, "black");
}

function sanitize(value?: string | null) {
  return restoreTurkishText(value?.replace(/\s+/g, " ").trim() || "-");
}

function formatDate(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(value);
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
  const fontSize = options?.fontSize ?? 8.2;
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
  document: FullEducationalProgressDocument,
  logo: PDFImage | null,
  pageIndex: number,
  showDetails: boolean,
) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: rgb(1, 1, 1),
  });

  if (showDetails) {
    if (logo) {
      const logoHeight = 72;
      const logoWidth = (logoHeight * logo.width) / logo.height;
      page.drawImage(logo, {
        x: MARGIN_X,
        y: PAGE.height - 76,
        width: logoWidth,
        height: logoHeight,
      });
    }

  page.drawText("Eğitsel Analiz ve Amaç İlerleme Raporu", {
      x: MARGIN_X + (logo ? (72 * logo.width) / logo.height + 14 : 0),
      y: PAGE.height - 42,
      size: 16,
      font: fonts.bold,
      color: TEXT,
    });

    page.drawText(document.title, {
      x: MARGIN_X + (logo ? (72 * logo.width) / logo.height + 14 : 0),
      y: PAGE.height - 62,
      size: 10.5,
      font: fonts.regular,
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
    const infoTop = PAGE.height - 116;
    const infoWidth = (TABLE_WIDTH - 12) / 3;
    const goals = document.planRows.length;
    const completed = document.planRows.filter(
      (row) => row.goalProgressEntries[0]?.status === "completed",
    ).length;
    const average =
      goals > 0
        ? Math.round(
            document.planRows.reduce(
              (total, row) => total + (row.goalProgressEntries[0]?.progressPercent ?? 0),
              0,
            ) / goals,
          )
        : 0;

    const infoItems = [
      { label: "Öğrenci", value: `${document.student.firstName} ${document.student.lastName}` },
      { label: "Okul", value: document.student.schoolName || "-" },
      { label: "Sınıf", value: document.student.classroom || "-" },
      { label: "BEP", value: document.title },
      { label: "Toplam amaç", value: String(goals) },
      { label: "Ortalama", value: `%${average} / ${completed} tamamlandi` },
    ];

    infoItems.forEach((item, index) => {
      const column = index % 3;
      const row = Math.floor(index / 3);
      const x = MARGIN_X + column * (infoWidth + 6);
      const y = infoTop - row * 42;

      page.drawRectangle({
        x,
        y,
        width: infoWidth,
        height: 34,
        borderColor: BORDER,
        borderWidth: 1,
        color: BAND_BG,
      });

      page.drawText(item.label.toUpperCase(), {
        x: x + 8,
        y: y + 22,
        size: 7.4,
        font: fonts.bold,
        color: TEXT,
      });

      page.drawText(item.value, {
        x: x + 8,
        y: y + 10,
        size: 8.8,
        font: fonts.regular,
        color: TEXT,
      });
    });
  }

  const tableTop = showDetails ? PAGE.height - 208 : PAGE.height - 52;
  const labels = ["Ders / Alan", "Amaç", "Asama", "Durum", "%", "Son olcum", "Not / Sonraki adim"];

  let currentX = MARGIN_X;
  labels.forEach((label, index) => {
    drawCell(page, fonts, currentX, tableTop, COLUMN_WIDTHS[index], 28, label, {
      fill: HEADER_BG,
      font: fonts.bold,
      fontSize: 8.1,
      center: index >= 2 && index <= 5,
    });
    currentX += COLUMN_WIDTHS[index];
  });

  return tableTop;
}

function buildGoalChartPoints(goal: FullEducationalProgressDocument["planRows"][number]) {
  return goal.goalProgressEntries
    .slice()
    .sort((a, b) => a.measuredAt.getTime() - b.measuredAt.getTime())
    .map((entry) => {
      const value = computePerformanceValue(entry);
      if (value === null) {
        return null;
      }
      return {
        date: entry.measuredAt,
        value,
        status: entry.status,
        note: entry.note,
      } satisfies GoalChartPoint;
    })
    .filter((point): point is GoalChartPoint => point !== null);
}

function drawGoalFocusPage(
  pdfDoc: PDFDocument,
  fonts: Fonts,
  document: FullEducationalProgressDocument,
  logo: PDFImage | null,
  goal: FullEducationalProgressDocument["planRows"][number],
  pageIndex: number,
) {
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  const points = buildGoalChartPoints(goal);
  const values = points.map((point) => point.value);
  const trend = computeTrend(values);
  const latestEntry = goal.goalProgressEntries[0] ?? null;
  const summary = buildGoalSummary(values, trend);
  const titleX = MARGIN_X + (logo ? 96 : 0);

  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(1, 1, 1) });

  if (logo) {
    const logoHeight = 54;
    const logoWidth = (logoHeight * logo.width) / logo.height;
    page.drawImage(logo, {
      x: MARGIN_X,
      y: PAGE.height - 70,
      width: logoWidth,
      height: logoHeight,
    });
  }

  page.drawText("Seçili Amaç Veri Grafiği", {
    x: titleX,
    y: PAGE.height - 36,
    size: 16,
    font: fonts.bold,
    color: TEXT,
  });
  page.drawText(`${document.student.firstName} ${document.student.lastName} · ${document.title}`, {
    x: titleX,
    y: PAGE.height - 56,
    size: 9,
    font: fonts.regular,
    color: TEXT,
  });
  page.drawText(`Sayfa ${pageIndex}`, {
    x: PAGE.width - 92,
    y: PAGE.height - 42,
    size: 9,
    font: fonts.regular,
    color: TEXT,
  });

  const goalPanelY = PAGE.height - 148;
  page.drawRectangle({
    x: MARGIN_X,
    y: goalPanelY,
    width: TABLE_WIDTH,
    height: 62,
    color: BAND_BG,
    borderColor: BORDER,
    borderWidth: 1,
  });

  const goalLines = [
    `${sanitize(goal.courseName)} / ${sanitize(goal.learningArea)}`,
    sanitize(goal.learningOutcome),
    goal.criterion ? `Ölçüt: ${sanitize(goal.criterion)}` : "",
  ]
    .filter(Boolean)
    .flatMap((line) => wrapText(line, fonts.regular, 9, TABLE_WIDTH - 260));

  const goalTextY = goalPanelY + 44;
  goalLines.slice(0, 3).forEach((line, index) => {
    page.drawText(line, {
      x: MARGIN_X + 12,
      y: goalTextY - index * 13,
      size: index === 0 ? 9.5 : 8.4,
      font: index === 0 ? fonts.bold : fonts.regular,
      color: TEXT,
    });
  });

  const latestValue = latestEntry?.progressPercent ?? points[points.length - 1]?.value ?? 0;
  const status = latestEntry?.status ?? "not_started";
  const summaryItems = [
    { label: "Son durum", value: statusLabels[status] },
    { label: "İlerleme", value: `%${latestValue}` },
    { label: "Kayıt", value: String(points.length) },
  ];

  summaryItems.forEach((item, index) => {
    const x = MARGIN_X + TABLE_WIDTH - 238 + index * 78;
    page.drawText(item.label.toUpperCase(), {
      x,
      y: goalPanelY + 42,
      size: 7,
      font: fonts.bold,
      color: MUTED,
    });
    page.drawText(item.value, {
      x,
      y: goalPanelY + 21,
      size: 13,
      font: fonts.bold,
      color: TEXT,
    });
  });

  const chartX = MARGIN_X;
  const chartY = 206;
  const chartW = TABLE_WIDTH;
  const chartH = 200;
  page.drawRectangle({
    x: chartX,
    y: chartY,
    width: chartW,
    height: chartH,
    color: rgb(0.985, 0.99, 0.995),
    borderColor: BORDER,
    borderWidth: 1,
  });
  page.drawText("Veri grafiği", {
    x: chartX + 14,
    y: chartY + chartH - 22,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  const plotX = chartX + 44;
  const plotY = chartY + 34;
  const plotW = chartW - 76;
  const plotH = chartH - 72;
  const yTicks = [0, 20, 40, 60, 80, 100];
  const valueY = (value: number) => plotY + (plotH * value) / 100;
  const pointX = (index: number) =>
    points.length <= 1 ? plotX + plotW / 2 : plotX + (plotW * index) / (points.length - 1);

  yTicks.forEach((tick) => {
    const y = valueY(tick);
    page.drawLine({
      start: { x: plotX, y },
      end: { x: plotX + plotW, y },
      thickness: tick === 0 ? 0.8 : 0.5,
      color: tick === GOAL_TARGET_PERFORMANCE ? BLUE : BORDER,
      opacity: tick === GOAL_TARGET_PERFORMANCE ? 0.7 : 0.45,
    });
    page.drawText(String(tick), {
      x: plotX - 26,
      y: y - 3,
      size: 7.5,
      font: fonts.regular,
      color: MUTED,
    });
  });

  page.drawText(`Hedef %${GOAL_TARGET_PERFORMANCE}`, {
    x: plotX + plotW - 58,
    y: valueY(GOAL_TARGET_PERFORMANCE) + 5,
    size: 7.5,
    font: fonts.bold,
    color: BLUE,
  });

  if (points.length === 0) {
    page.drawText("Bu amaç için henüz grafik oluşturacak ilerleme kaydı bulunmuyor.", {
      x: plotX + 12,
      y: plotY + plotH / 2,
      size: 9,
      font: fonts.regular,
      color: MUTED,
    });
  } else {
    points.forEach((point, index) => {
      const x = pointX(index);
      const y = valueY(point.value);
      if (index > 0) {
        const previous = points[index - 1];
        page.drawLine({
          start: { x: pointX(index - 1), y: valueY(previous.value) },
          end: { x, y },
          thickness: 2,
          color: BLUE,
        });
      }
      page.drawCircle({ x, y, size: 4, color: BLUE, borderColor: rgb(1, 1, 1), borderWidth: 1 });
      page.drawText(`%${point.value}`, {
        x: x - 9,
        y: y + 9,
        size: 7,
        font: fonts.bold,
        color: TEXT,
      });
    });

    const labelStep = Math.max(1, Math.ceil(points.length / 5));
    points.forEach((point, index) => {
      if (index % labelStep !== 0 && index !== points.length - 1) {
        return;
      }
      page.drawText(formatDate(point.date), {
        x: pointX(index) - 22,
        y: plotY - 18,
        size: 7,
        font: fonts.regular,
        color: MUTED,
      });
    });
  }

  const summaryY = chartY - 38;
  page.drawRectangle({
    x: MARGIN_X,
    y: summaryY,
    width: TABLE_WIDTH,
    height: 28,
    color: rgb(1, 1, 1),
    borderColor: BORDER,
    borderWidth: 1,
  });
  page.drawText(restoreTurkishText(summary), {
    x: MARGIN_X + 12,
    y: summaryY + 10,
    size: 8.5,
    font: fonts.regular,
    color: TEXT,
  });

  const historyY = 42;
  const historyH = 112;
  page.drawRectangle({
    x: MARGIN_X,
    y: historyY,
    width: TABLE_WIDTH,
    height: historyH,
    color: BAND_BG,
    borderColor: BORDER,
    borderWidth: 1,
  });
  page.drawText("Son ilerleme kayıtları", {
    x: MARGIN_X + 12,
    y: historyY + historyH - 20,
    size: 11,
    font: fonts.bold,
    color: TEXT,
  });

  const history = goal.goalProgressEntries.slice(0, 4);
  if (history.length === 0) {
    page.drawText("Henüz ilerleme kaydı girilmedi.", {
      x: MARGIN_X + 12,
      y: historyY + historyH - 46,
      size: 8.5,
      font: fonts.regular,
      color: MUTED,
    });
  } else {
    history.forEach((entry, index) => {
      const rowY = historyY + historyH - 46 - index * 20;
      const color = entry.status === "completed" ? GREEN : entry.status === "needs_support" ? ROSE : BLUE;
      page.drawText(formatDate(entry.measuredAt), {
        x: MARGIN_X + 12,
        y: rowY,
        size: 8,
        font: fonts.bold,
        color: TEXT,
      });
      page.drawText(statusLabels[entry.status], {
        x: MARGIN_X + 120,
        y: rowY,
        size: 8,
        font: fonts.regular,
        color,
      });
      page.drawText(`%${entry.progressPercent}`, {
        x: MARGIN_X + 230,
        y: rowY,
        size: 8,
        font: fonts.bold,
        color: TEXT,
      });
      page.drawText(sanitize(entry.note || entry.nextStep || "-").slice(0, 120), {
        x: MARGIN_X + 286,
        y: rowY,
        size: 8,
        font: fonts.regular,
        color: MUTED,
      });
    });
  }
}

export async function generateEducationalProgressPdf(
  document: FullEducationalProgressDocument,
  options: EducationalProgressPdfOptions = {},
) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadLogo(pdfDoc, document.institutionId);
  const allGoals = document.planRows.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const selectedGoal = options.selectedGoalId
    ? allGoals.find((goal) => goal.id === options.selectedGoalId) ?? null
    : null;
  const goals = selectedGoal ? [selectedGoal] : allGoals;

  let pageIndex = 1;
  if (selectedGoal) {
    drawGoalFocusPage(pdfDoc, fonts, document, logo, selectedGoal, pageIndex);
    pageIndex += 1;
  }

  let page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  let cursorY = drawHeader(page, fonts, document, logo, pageIndex, true);

  const ensureSpace = (height: number) => {
    if (cursorY - height < 30) {
      pageIndex += 1;
      page = pdfDoc.addPage([PAGE.width, PAGE.height]);
      cursorY = drawHeader(page, fonts, document, logo, pageIndex, false);
    }
  };

  goals.forEach((goal) => {
    const latestEntry = goal.goalProgressEntries[0] ?? null;
    const goalLabel = `${sanitize(goal.courseName)} / ${sanitize(goal.learningArea)}`;
    const outcomeLabel = sanitize(goal.learningOutcome);
    const labels = getProcessComponentLabels(goal.processComponents);
    const processLabel = labels.filter(Boolean).join(" / ");
    const detailLabel = latestEntry
      ? [sanitize(latestEntry.note), sanitize(latestEntry.nextStep)]
          .filter((value) => value !== "-")
          .join("\n")
      : "Henüz ilerleme kaydı girilmedi.";

    const phaseLabel = phaseLabels[latestEntry?.phase ?? "acquisition"];

    const cellHeights = [
      measureHeight(goalLabel, fonts.regular, 8.2, COLUMN_WIDTHS[0] - 8, 10),
      measureHeight(
        [outcomeLabel, processLabel ? `Surec: ${processLabel}` : ""].filter(Boolean).join("\n"),
        fonts.regular,
        8.2,
        COLUMN_WIDTHS[1] - 8,
        10,
      ),
      measureHeight(phaseLabel, fonts.regular, 8.2, COLUMN_WIDTHS[2] - 8, 10),
      measureHeight(statusLabels[latestEntry?.status ?? "not_started"], fonts.regular, 8.2, COLUMN_WIDTHS[3] - 8, 10),
      measureHeight(String(latestEntry?.progressPercent ?? 0), fonts.regular, 8.2, COLUMN_WIDTHS[4] - 8, 10),
      measureHeight(formatDate(latestEntry?.measuredAt), fonts.regular, 8.2, COLUMN_WIDTHS[5] - 8, 10),
      measureHeight(detailLabel, fonts.regular, 8.2, COLUMN_WIDTHS[6] - 8, 10),
    ];

    const rowHeight = Math.max(30, Math.min(90, Math.ceil(Math.max(...cellHeights) + 10)));
    ensureSpace(rowHeight + 2);

    let x = MARGIN_X;
    const values = [
      goalLabel,
      [outcomeLabel, processLabel ? `Surec: ${processLabel}` : ""].filter(Boolean).join("\n"),
      phaseLabel,
      statusLabels[latestEntry?.status ?? "not_started"],
      `${latestEntry?.progressPercent ?? 0}`,
      formatDate(latestEntry?.measuredAt),
      detailLabel,
    ];

    values.forEach((value, index) => {
      drawCell(page, fonts, x, cursorY - rowHeight, COLUMN_WIDTHS[index], rowHeight, value, {
        center: index >= 2 && index <= 5,
        font: index === 3 ? fonts.bold : fonts.regular,
      });
      x += COLUMN_WIDTHS[index];
    });

    cursorY -= rowHeight;
  });

  return pdfDoc.save();
}

type EducationalAnalysisSummaryPdfInput = {
  checkedAt: Date;
  workspace: TeacherEducationalProgressWorkspace;
  analysis: TeacherEducationalAnalysisSummary;
  selectedStudent?: TeacherEducationalProgressWorkspace["students"][number] | null;
  selectedDocument?: TeacherEducationalProgressWorkspace["students"][number]["documents"][number] | null;
  selectedGoal?: TeacherEducationalProgressWorkspace["students"][number]["documents"][number]["goals"][number] | null;
};

function drawWrappedBlock(
  page: ReturnType<PDFDocument["addPage"]>,
  font: PDFFont,
  x: number,
  y: number,
  fontSize: number,
  lines: string[],
) {
  let currentY = y;

  lines.forEach((line) => {
    page.drawText(line, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color: TEXT,
    });
    currentY -= fontSize + 3;
  });

  return currentY;
}

function drawSummaryCard(
  page: ReturnType<PDFDocument["addPage"]>,
  fonts: Fonts,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    value: string;
    detail: string;
  },
) {
  const detailLines = wrapText(options.detail, fonts.regular, 8.5, options.width - 24).slice(0, 2);
  const detailStartY = options.y + 16 + (detailLines.length - 1) * 11;

  page.drawRectangle({
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    color: BAND_BG,
    borderColor: BORDER,
    borderWidth: 1,
  });

  page.drawText(options.label.toUpperCase(), {
    x: options.x + 12,
    y: options.y + options.height - 18,
    size: 8,
    font: fonts.bold,
    color: TEXT,
  });

  page.drawText(options.value, {
    x: options.x + 12,
    y: options.y + options.height - 48,
    size: 16,
    font: fonts.bold,
    color: TEXT,
  });

  drawWrappedBlock(
    page,
    fonts.regular,
    options.x + 12,
    detailStartY,
    8.5,
    detailLines,
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function generateEducationalAnalysisSummaryPdfLegacy(
  input: EducationalAnalysisSummaryPdfInput,
) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadLogo(pdfDoc);
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: rgb(1, 1, 1),
  });

  if (logo) {
    const logoHeight = 62;
    const logoWidth = (logoHeight * logo.width) / logo.height;
    page.drawImage(logo, {
      x: MARGIN_X,
      y: PAGE.height - 72,
      width: logoWidth,
      height: logoHeight,
    });
  }

  const titleX = MARGIN_X + (logo ? 110 : 0);
  page.drawText("Eğitsel Analiz Özeti", {
    x: titleX,
    y: PAGE.height - 40,
    size: 18,
    font: fonts.bold,
    color: TEXT,
  });
  page.drawText(
    `Rapor tarihi: ${new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(input.checkedAt)}`,
    {
      x: titleX,
      y: PAGE.height - 58,
      size: 9,
      font: fonts.regular,
      color: TEXT,
    },
  );

  const scopeLines = [
    input.selectedStudent
      ? `Öğrenci: ${input.selectedStudent.firstName} ${input.selectedStudent.lastName}`
      : `Öğrenci kapsamı: ${input.workspace.studentCount} kayıt`,
    input.selectedDocument ? `BEP: ${input.selectedDocument.title}` : "BEP kapsamı: Tüm belgeler",
    input.selectedGoal
      ? `Hedef: ${input.selectedGoal.courseName} / ${input.selectedGoal.learningArea}`
      : "Hedef kapsamı: Tüm hedefler",
  ];

  page.drawRectangle({
    x: MARGIN_X,
    y: PAGE.height - 142,
    width: TABLE_WIDTH,
    height: 54,
    color: BAND_BG,
    borderColor: BORDER,
    borderWidth: 1,
  });
  drawWrappedBlock(page, fonts.regular, MARGIN_X + 12, PAGE.height - 110, 10, scopeLines);

  const metricY = PAGE.height - 220;
  const metricWidth = (TABLE_WIDTH - 18) / 4;
  const metricHeight = 64;

  drawSummaryCard(page, fonts, {
    x: MARGIN_X,
    y: metricY,
    width: metricWidth,
    height: metricHeight,
    label: "Ortalama ilerleme",
    value: `%${input.workspace.averageProgressPercent}`,
    detail: `${input.workspace.goalCount} aktif hedef`,
  });
  drawSummaryCard(page, fonts, {
    x: MARGIN_X + metricWidth + 6,
    y: metricY,
    width: metricWidth,
    height: metricHeight,
    label: "Bu ay seans",
    value: String(input.analysis.totalSessionsThisMonth),
    detail: `${input.analysis.completedSessionsThisMonth} tamamlandı`,
  });
  drawSummaryCard(page, fonts, {
    x: MARGIN_X + (metricWidth + 6) * 2,
    y: metricY,
    width: metricWidth,
    height: metricHeight,
    label: "Tamamlanan hedef",
    value: String(input.workspace.completedGoalCount),
    detail: `${input.workspace.inProgressGoalCount} hedef sürüyor`,
  });
  drawSummaryCard(page, fonts, {
    x: MARGIN_X + (metricWidth + 6) * 3,
    y: metricY,
    width: metricWidth,
    height: metricHeight,
    label: "Yakın takip",
    value: String(input.analysis.studentsNeedingAttention.length),
    detail: `${input.workspace.needsSupportGoalCount} hedef destek gerektiriyor`,
  });

  const leftX = MARGIN_X;
  const topY = metricY - 22;
  const leftWidth = 276;
  const rightX = leftX + leftWidth + 12;

  page.drawText("İlerleme dağılımı", {
    x: leftX,
    y: topY,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  let distributionBarX = leftX;
  const distributionBarY = topY - 22;
  const distributionBarWidth = leftWidth;
  input.workspace.statusBreakdown.forEach((item) => {
    const width = distributionBarWidth * ((item.percent || 0) / 100);
    if (width <= 0) {
      return;
    }
    page.drawRectangle({
      x: distributionBarX,
      y: distributionBarY,
      width,
      height: 12,
      color:
        item.key === "completed"
          ? rgb(0.16, 0.16, 0.16)
          : item.key === "in_progress"
            ? rgb(0.33, 0.49, 0.9)
            : item.key === "needs_support"
              ? rgb(0.78, 0.34, 0.4)
              : rgb(0.74, 0.76, 0.79),
    });
    distributionBarX += width;
  });

  input.workspace.statusBreakdown.forEach((item, index) => {
    const itemY = distributionBarY - 22 - index * 20;
    page.drawCircle({
      x: leftX + 6,
      y: itemY + 6,
      size: 3.5,
      color:
        item.key === "completed"
          ? rgb(0.16, 0.16, 0.16)
          : item.key === "in_progress"
            ? rgb(0.33, 0.49, 0.9)
            : item.key === "needs_support"
              ? rgb(0.78, 0.34, 0.4)
              : rgb(0.74, 0.76, 0.79),
    });
    page.drawText(`${item.label}: ${item.count} (%${item.percent})`, {
      x: leftX + 16,
      y: itemY,
      size: 9,
      font: fonts.regular,
      color: TEXT,
    });
  });

  page.drawText("Öğrenci bazlı ortalama", {
    x: rightX,
    y: topY,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  input.workspace.studentProgressAverages.slice(0, 7).forEach((item, index) => {
    const y = topY - 30 - index * 28;
    page.drawText(item.studentName, {
      x: rightX,
      y,
      size: 9,
      font: fonts.regular,
      color: TEXT,
    });
    page.drawRectangle({
      x: rightX + 150,
      y: y - 2,
      width: 120,
      height: 9,
      color: rgb(0.9, 0.92, 0.94),
      borderColor: BORDER,
      borderWidth: 0.5,
    });
    page.drawRectangle({
      x: rightX + 150,
      y: y - 2,
      width: 120 * (item.averageProgressPercent / 100),
      height: 9,
      color: rgb(0.16, 0.16, 0.16),
    });
    page.drawText(`%${item.averageProgressPercent}`, {
      x: rightX + 278,
      y,
      size: 9,
      font: fonts.bold,
      color: TEXT,
    });
  });

  const goalBlockY = 170;
  page.drawRectangle({
    x: MARGIN_X,
    y: goalBlockY,
    width: TABLE_WIDTH,
    height: 114,
    color: BAND_BG,
    borderColor: BORDER,
    borderWidth: 1,
  });

  page.drawText("Seçili hedef odağı", {
    x: MARGIN_X + 12,
    y: goalBlockY + 94,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  if (input.selectedGoal) {
    const history = input.selectedGoal.history.slice().reverse();
    const scopeText = [
      `${input.selectedGoal.courseName} / ${input.selectedGoal.learningArea}`,
      input.selectedGoal.learningOutcome,
      input.selectedGoal.latestEntry
        ? `Son durum: ${statusLabels[input.selectedGoal.latestEntry.status]} · %${input.selectedGoal.latestEntry.progressPercent} · ${formatDate(new Date(input.selectedGoal.latestEntry.measuredAt))}`
        : "Henüz kayıt girilmedi.",
    ];
    drawWrappedBlock(
      page,
      fonts.regular,
      MARGIN_X + 12,
      goalBlockY + 74,
      9,
      scopeText.flatMap((line) => wrapText(line, fonts.regular, 9, TABLE_WIDTH - 24)),
    );

    history.slice(-4).forEach((entry, index) => {
      const x = MARGIN_X + 12 + index * 196;
      page.drawRectangle({
        x,
        y: goalBlockY + 10,
        width: 180,
        height: 30,
        color: rgb(1, 1, 1),
        borderColor: BORDER,
        borderWidth: 1,
      });
      page.drawText(`${formatDate(new Date(entry.measuredAt))} · %${entry.progressPercent}`, {
        x: x + 8,
        y: goalBlockY + 24,
        size: 8.5,
        font: fonts.bold,
        color: TEXT,
      });
      page.drawText(statusLabels[entry.status], {
        x: x + 8,
        y: goalBlockY + 12,
        size: 8,
        font: fonts.regular,
        color: TEXT,
      });
    });
  } else {
    page.drawText("Bu özet tüm hedeflerin genel durumunu gösterir.", {
      x: MARGIN_X + 12,
      y: goalBlockY + 68,
      size: 10,
      font: fonts.regular,
      color: TEXT,
    });
  }

  const footerLines =
    input.analysis.studentsNeedingAttention.length > 0
      ? input.analysis.studentsNeedingAttention
          .slice(0, 3)
          .map(
            (item) =>
              `${item.studentName}: ${item.reasons.slice(0, 2).join(", ") || "Yakın takip önerisi"}`,
          )
      : ["Şu anda ek dikkat gerektiren açık bir öğrenci sinyali görünmüyor."];

  page.drawText("Dikkat gerektiren öğrenciler", {
    x: MARGIN_X,
    y: 138,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });
  drawWrappedBlock(
    page,
    fonts.regular,
    MARGIN_X,
    118,
    9,
    footerLines.flatMap((line) => wrapText(line, fonts.regular, 9, TABLE_WIDTH)),
  );

  return pdfDoc.save();
}

export async function generateEducationalAnalysisSummaryPdf(
  input: EducationalAnalysisSummaryPdfInput,
) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const logo = await loadLogo(pdfDoc);
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE.width,
    height: PAGE.height,
    color: rgb(1, 1, 1),
  });

  const accent = rgb(0.92, 0.94, 0.96);
  const panel = rgb(0.97, 0.98, 0.99);
  const chartTrack = rgb(0.84, 0.87, 0.9);
  const chartDark = rgb(0.13, 0.15, 0.18);
  const chartBlue = rgb(0.34, 0.47, 0.84);
  const chartRose = rgb(0.72, 0.34, 0.4);

  if (logo) {
    const logoHeight = 62;
    const logoWidth = (logoHeight * logo.width) / logo.height;
    page.drawImage(logo, {
      x: MARGIN_X,
      y: PAGE.height - 72,
      width: logoWidth,
      height: logoHeight,
    });
  }

  const titleX = MARGIN_X + (logo ? 110 : 0);
  page.drawText("Eğitsel Analiz Özeti", {
    x: titleX,
    y: PAGE.height - 40,
    size: 18,
    font: fonts.bold,
    color: TEXT,
  });
  page.drawText(
    `Rapor tarihi: ${new Intl.DateTimeFormat("tr-TR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(input.checkedAt)}`,
    {
      x: titleX,
      y: PAGE.height - 58,
      size: 9,
      font: fonts.regular,
      color: TEXT,
    },
  );

  const scopeLines = [
    input.selectedStudent
      ? `Öğrenci: ${input.selectedStudent.firstName} ${input.selectedStudent.lastName}`
      : `Öğrenci kapsamı: ${input.workspace.studentCount} kayıt`,
    input.selectedDocument ? `BEP: ${input.selectedDocument.title}` : "BEP kapsamı: Tüm belgeler",
    input.selectedGoal
      ? `Hedef: ${input.selectedGoal.courseName} / ${input.selectedGoal.learningArea}`
      : "Hedef kapsamı: Tüm hedefler",
  ].flatMap((line) => wrapText(line, fonts.regular, 10, TABLE_WIDTH - 24));
  const scopeHeight = Math.max(64, scopeLines.length * 13 + 20);
  const scopeY = PAGE.height - 98 - scopeHeight;

  page.drawRectangle({
    x: MARGIN_X,
    y: scopeY,
    width: TABLE_WIDTH,
    height: scopeHeight,
    color: accent,
    borderColor: BORDER,
    borderWidth: 1,
  });
  drawWrappedBlock(page, fonts.regular, MARGIN_X + 12, scopeY + scopeHeight - 16, 10, scopeLines);

  const metricWidth = (TABLE_WIDTH - 18) / 4;
  const metricHeight = 76;
  const metricY = scopeY - 18 - metricHeight;
  const metrics = [
    {
      label: "Ortalama ilerleme",
      value: `%${input.workspace.averageProgressPercent}`,
      detail: `${input.workspace.goalCount} aktif hedef`,
    },
    {
      label: "Bu ay seans",
      value: String(input.analysis.totalSessionsThisMonth),
      detail: `${input.analysis.completedSessionsThisMonth} tamamlandı`,
    },
    {
      label: "Tamamlanan hedef",
      value: String(input.workspace.completedGoalCount),
      detail: `${input.workspace.inProgressGoalCount} hedef sürüyor`,
    },
    {
      label: "Yakın takip",
      value: String(input.analysis.studentsNeedingAttention.length),
      detail: `${input.workspace.needsSupportGoalCount} hedef destek gerektiriyor`,
    },
  ];

  metrics.forEach((metric, index) => {
    const x = MARGIN_X + index * (metricWidth + 6);
    const detailLines = wrapText(metric.detail, fonts.regular, 8.5, metricWidth - 24).slice(0, 2);
    page.drawRectangle({
      x,
      y: metricY,
      width: metricWidth,
      height: metricHeight,
      color: accent,
      borderColor: BORDER,
      borderWidth: 1,
    });
    page.drawText(metric.label.toUpperCase(), {
      x: x + 12,
      y: metricY + metricHeight - 18,
      size: 8,
      font: fonts.bold,
      color: TEXT,
    });
    page.drawText(metric.value, {
      x: x + 12,
      y: metricY + metricHeight - 44,
      size: 16,
      font: fonts.bold,
      color: TEXT,
    });
    drawWrappedBlock(page, fonts.regular, x + 12, metricY + 24, 8.5, detailLines);
  });

  const sectionTopY = metricY - 30;
  const leftX = MARGIN_X;
  const leftWidth = 276;
  const rightX = leftX + leftWidth + 12;
  const breakdownItems = input.workspace.statusBreakdown.filter((item) => item.count > 0);
  const distributionItems =
    breakdownItems.length > 0 ? breakdownItems : input.workspace.statusBreakdown.slice(0, 2);

  page.drawText("İlerleme dağılımı", {
    x: leftX,
    y: sectionTopY,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  let progressX = leftX;
  const progressBarY = sectionTopY - 24;
  distributionItems.forEach((item) => {
    const width = leftWidth * ((item.percent || 0) / 100);
    if (width <= 0) {
      return;
    }
    page.drawRectangle({
      x: progressX,
      y: progressBarY,
      width,
      height: 12,
      color:
        item.key === "completed"
          ? chartDark
          : item.key === "in_progress"
            ? chartBlue
            : item.key === "needs_support"
              ? chartRose
              : chartTrack,
    });
    progressX += width;
  });
  if (progressX === leftX) {
    page.drawRectangle({
      x: leftX,
      y: progressBarY,
      width: leftWidth,
      height: 12,
      color: chartTrack,
    });
  }

  distributionItems.forEach((item, index) => {
    const y = progressBarY - 26 - index * 20;
    page.drawCircle({
      x: leftX + 6,
      y: y + 6,
      size: 3.5,
      color:
        item.key === "completed"
          ? chartDark
          : item.key === "in_progress"
            ? chartBlue
            : item.key === "needs_support"
              ? chartRose
              : chartTrack,
    });
    page.drawText(`${item.label}: ${item.count} (%${item.percent})`, {
      x: leftX + 16,
      y,
      size: 9,
      font: fonts.regular,
      color: TEXT,
    });
  });

  page.drawText("Öğrenci bazlı ortalama", {
    x: rightX,
    y: sectionTopY,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  const studentBars = input.workspace.studentProgressAverages.slice(0, 5);
  studentBars.forEach((item, index) => {
    const y = sectionTopY - 34 - index * 30;
    page.drawText(item.studentName, {
      x: rightX,
      y,
      size: 9,
      font: fonts.regular,
      color: TEXT,
    });
    page.drawRectangle({
      x: rightX + 150,
      y: y - 2,
      width: 120,
      height: 10,
      color: panel,
      borderColor: BORDER,
      borderWidth: 0.5,
    });
    page.drawRectangle({
      x: rightX + 150,
      y: y - 2,
      width: 120 * (item.averageProgressPercent / 100),
      height: 10,
      color: chartDark,
    });
    page.drawText(`%${item.averageProgressPercent}`, {
      x: rightX + 278,
      y,
      size: 9,
      font: fonts.bold,
      color: TEXT,
    });
  });

  const leftBottom = progressBarY - 26 - distributionItems.length * 20;
  const rightBottom = sectionTopY - 34 - studentBars.length * 30;
  const goalHeight = 128;
  const goalY = Math.max(150, Math.min(leftBottom, rightBottom) - goalHeight - 6);

  page.drawRectangle({
    x: MARGIN_X,
    y: goalY,
    width: TABLE_WIDTH,
    height: goalHeight,
    color: accent,
    borderColor: BORDER,
    borderWidth: 1,
  });
  page.drawText("Seçili hedef odağı", {
    x: MARGIN_X + 12,
    y: goalY + goalHeight - 20,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  if (input.selectedGoal) {
    const scopeText = [
      `${input.selectedGoal.courseName} / ${input.selectedGoal.learningArea}`,
      input.selectedGoal.learningOutcome,
      input.selectedGoal.latestEntry
        ? `Son durum: ${statusLabels[input.selectedGoal.latestEntry.status]} · %${input.selectedGoal.latestEntry.progressPercent} · ${formatDate(new Date(input.selectedGoal.latestEntry.measuredAt))}`
        : "Henüz kayıt girilmedi.",
    ].flatMap((line) => wrapText(line, fonts.regular, 9, TABLE_WIDTH - 24));
    drawWrappedBlock(page, fonts.regular, MARGIN_X + 12, goalY + goalHeight - 40, 9, scopeText);

    input.selectedGoal.history
      .slice()
      .reverse()
      .slice(-4)
      .forEach((entry, index) => {
        const x = MARGIN_X + 12 + index * 196;
        page.drawRectangle({
          x,
          y: goalY + 12,
          width: 180,
          height: 30,
          color: rgb(1, 1, 1),
          borderColor: BORDER,
          borderWidth: 1,
        });
        page.drawText(`${formatDate(new Date(entry.measuredAt))} · %${entry.progressPercent}`, {
          x: x + 8,
          y: goalY + 26,
          size: 8.5,
          font: fonts.bold,
          color: TEXT,
        });
        page.drawText(statusLabels[entry.status], {
          x: x + 8,
          y: goalY + 14,
          size: 8,
          font: fonts.regular,
          color: TEXT,
        });
      });
  } else {
    page.drawText("Bu özet tüm hedeflerin genel durumunu gösterir.", {
      x: MARGIN_X + 12,
      y: goalY + 64,
      size: 10,
      font: fonts.regular,
      color: TEXT,
    });
  }

  const footerTitleY = goalY - 28;
  const footerLines =
    input.analysis.studentsNeedingAttention.length > 0
      ? input.analysis.studentsNeedingAttention
          .slice(0, 3)
          .map(
            (item) =>
              `${item.studentName}: ${item.reasons.slice(0, 2).join(", ") || "Yakın takip önerisi"}`,
          )
      : ["Şu anda ek dikkat gerektiren açık bir öğrenci sinyali görünmüyor."];

  page.drawText("Dikkat gerektiren öğrenciler", {
    x: MARGIN_X,
    y: footerTitleY,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });
  drawWrappedBlock(
    page,
    fonts.regular,
    MARGIN_X,
    footerTitleY - 18,
    9,
    footerLines.flatMap((line) => wrapText(line, fonts.regular, 9, TABLE_WIDTH)),
  );

  return pdfDoc.save();
}
