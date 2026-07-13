import { PDFDocument, type PDFFont, rgb } from "pdf-lib";

import type {
  TeacherEducationalAnalysisSummary,
  TeacherEducationalProgressWorkspace,
} from "@/lib/data";
import { loadPdfFonts } from "@/lib/pdf-assets";
import { loadInstitutionOrSpeciaLogo } from "@/lib/pdf-brand";
import { restoreTurkishText } from "@/lib/turkish";

type EducationalAnalysisSummaryPdfInput = {
  checkedAt: Date;
  workspace: TeacherEducationalProgressWorkspace;
  analysis: TeacherEducationalAnalysisSummary;
  selectedStudent?: TeacherEducationalProgressWorkspace["students"][number] | null;
  selectedDocument?: TeacherEducationalProgressWorkspace["students"][number]["documents"][number] | null;
  selectedGoal?: TeacherEducationalProgressWorkspace["students"][number]["documents"][number]["goals"][number] | null;
  institutionId?: string | null;
};

const PAGE = { width: 595.28, height: 841.89 };
const MARGIN = 32;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const BORDER = rgb(0.83, 0.87, 0.91);
const PANEL = rgb(0.985, 0.99, 0.995);
const ACCENT = rgb(0.95, 0.96, 0.97);
const TRACK = rgb(0.88, 0.9, 0.93);
const TEXT = rgb(0.09, 0.11, 0.14);
const DARK = rgb(0.13, 0.15, 0.18);
const BLUE = rgb(0.34, 0.47, 0.84);
const ROSE = rgb(0.72, 0.34, 0.4);
const MUTED = rgb(0.63, 0.68, 0.73);

const statusLabels = {
  not_started: "Başlanmadı",
  in_progress: "Sürüyor",
  completed: "Tamamlandı",
  needs_support: "Destek Gerekli",
} as const;

const phaseLabels = {
  acquisition: "Edinim",
  fluency: "Akıcılık",
  maintenance: "Kalıcılık",
  generalization: "Genelleme",
} as const;

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

function drawWrappedText(
  page: ReturnType<PDFDocument["addPage"]>,
  font: PDFFont,
  x: number,
  y: number,
  fontSize: number,
  lines: string[],
) {
  let currentY = y;
  lines.forEach((line) => {
    page.drawText(restoreTurkishText(line), {
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

function drawPanel(
  page: ReturnType<PDFDocument["addPage"]>,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = PANEL,
) {
  page.drawRectangle({
    x,
    y,
    width,
    height,
    color: fill,
    borderColor: BORDER,
    borderWidth: 1,
  });
}

function formatDate(value?: Date | string | null) {
  if (!value) {
    return "-";
  }
  const resolved = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium" }).format(resolved);
}

export async function generateEducationalAnalysisSummaryPdf(
  input: EducationalAnalysisSummaryPdfInput,
) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadPdfFonts(pdfDoc);
  const logo = await loadInstitutionOrSpeciaLogo(pdfDoc, input.institutionId, "black");
  const page = pdfDoc.addPage([PAGE.width, PAGE.height]);

  page.drawRectangle({ x: 0, y: 0, width: PAGE.width, height: PAGE.height, color: rgb(1, 1, 1) });

  if (logo) {
    const logoHeight = 58;
    const logoWidth = (logoHeight * logo.width) / logo.height;
    page.drawImage(logo, {
      x: MARGIN,
      y: PAGE.height - 88,
      width: logoWidth,
      height: logoHeight,
    });
  }

  const titleX = MARGIN + (logo ? 118 : 0);
  page.drawText("Eğitsel Analiz Özeti", {
    x: titleX,
    y: PAGE.height - 50,
    size: 20,
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
      y: PAGE.height - 72,
      size: 9.5,
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
  ].flatMap((line) => wrapText(line, fonts.regular, 10, CONTENT_WIDTH - 28));
  const scopeHeight = Math.max(72, scopeLines.length * 13 + 24);
  const scopeY = PAGE.height - 118 - scopeHeight;

  drawPanel(page, MARGIN, scopeY, CONTENT_WIDTH, scopeHeight, ACCENT);
  drawWrappedText(page, fonts.regular, MARGIN + 14, scopeY + scopeHeight - 20, 10, scopeLines);

  const metricWidth = (CONTENT_WIDTH - 10) / 2;
  const metricHeight = 74;
  const metricTopY = scopeY - 18 - metricHeight;
  const metrics = [
    ["Ortalama ilerleme", `%${input.workspace.averageProgressPercent}`, `${input.workspace.goalCount} aktif hedef`],
    ["Bu ay seans", String(input.analysis.totalSessionsThisMonth), `${input.analysis.completedSessionsThisMonth} tamamlandı`],
    ["Tamamlanan hedef", String(input.workspace.completedGoalCount), `${input.workspace.inProgressGoalCount} hedef sürüyor`],
    ["Yakın takip", String(input.analysis.studentsNeedingAttention.length), `${input.workspace.needsSupportGoalCount} hedef destek gerektiriyor`],
  ] as const;

  metrics.forEach(([label, value, detail], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + column * (metricWidth + 10);
    const y = metricTopY - row * (metricHeight + 10);
    const detailLines = wrapText(detail, fonts.regular, 8.5, metricWidth - 24).slice(0, 2);

    drawPanel(page, x, y, metricWidth, metricHeight, ACCENT);
    page.drawText(label.toUpperCase(), {
      x: x + 12,
      y: y + metricHeight - 18,
      size: 8,
      font: fonts.bold,
      color: TEXT,
    });
    page.drawText(value, {
      x: x + 12,
      y: y + metricHeight - 42,
      size: 18,
      font: fonts.bold,
      color: TEXT,
    });
    drawWrappedText(page, fonts.regular, x + 12, y + 16, 8.5, detailLines);
  });

  const metricBottomY = metricTopY - (metricHeight + 10);
  const statusItems =
    input.workspace.statusBreakdown.filter((item) => item.count > 0).slice(0, 4) ||
    input.workspace.statusBreakdown.slice(0, 4);
  const distributionCardHeight = 26 + Math.max(1, statusItems.length) * 24 + 18;
  const distributionY = metricBottomY - 14 - distributionCardHeight;

  drawPanel(page, MARGIN, distributionY, CONTENT_WIDTH, distributionCardHeight, ACCENT);
  page.drawText("İlerleme dağılımı", {
    x: MARGIN + 14,
    y: distributionY + distributionCardHeight - 20,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  statusItems.forEach((item, index) => {
    const rowY = distributionY + distributionCardHeight - 46 - index * 24;
    const barX = MARGIN + 160;
    const barWidth = CONTENT_WIDTH - 220;
    const color =
      item.key === "completed"
        ? DARK
        : item.key === "in_progress"
          ? BLUE
          : item.key === "needs_support"
            ? ROSE
            : MUTED;

    page.drawText(item.label, {
      x: MARGIN + 14,
      y: rowY + 2,
      size: 9,
      font: fonts.regular,
      color: TEXT,
    });
    page.drawRectangle({
      x: barX,
      y: rowY,
      width: barWidth,
      height: 10,
      color: TRACK,
      borderColor: BORDER,
      borderWidth: 0.5,
    });
    page.drawRectangle({
      x: barX,
      y: rowY,
      width: Math.max(0, barWidth * ((item.percent || 0) / 100)),
      height: 10,
      color,
    });
    page.drawText(`${item.count} · %${item.percent}`, {
      x: barX + barWidth + 10,
      y: rowY + 1,
      size: 8.5,
      font: fonts.bold,
      color: TEXT,
    });
  });

  const studentBars = input.workspace.studentProgressAverages.slice(0, 6);
  const studentCardHeight = 26 + Math.max(1, studentBars.length) * 24 + 18;
  const studentY = distributionY - 14 - studentCardHeight;

  drawPanel(page, MARGIN, studentY, CONTENT_WIDTH, studentCardHeight, ACCENT);
  page.drawText("Öğrenci bazlı ortalama", {
    x: MARGIN + 14,
    y: studentY + studentCardHeight - 20,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });

  if (studentBars.length === 0) {
    page.drawText("Henüz ilerleme verisi bulunmuyor.", {
      x: MARGIN + 14,
      y: studentY + studentCardHeight - 48,
      size: 9,
      font: fonts.regular,
      color: TEXT,
    });
  } else {
    studentBars.forEach((item, index) => {
      const rowY = studentY + studentCardHeight - 46 - index * 24;
      const barX = MARGIN + 190;
      const barWidth = CONTENT_WIDTH - 250;

      page.drawText(item.studentName, {
        x: MARGIN + 14,
        y: rowY + 2,
        size: 9,
        font: fonts.regular,
        color: TEXT,
      });
      page.drawRectangle({
        x: barX,
        y: rowY,
        width: barWidth,
        height: 10,
        color: TRACK,
        borderColor: BORDER,
        borderWidth: 0.5,
      });
      page.drawRectangle({
        x: barX,
        y: rowY,
        width: Math.max(0, barWidth * (item.averageProgressPercent / 100)),
        height: 10,
        color: DARK,
      });
      page.drawText(`%${item.averageProgressPercent}`, {
        x: barX + barWidth + 10,
        y: rowY + 1,
        size: 8.5,
        font: fonts.bold,
        color: TEXT,
      });
    });
  }

  const goalHistory = input.selectedGoal?.history.slice().reverse().slice(0, 4) ?? [];
  const goalLines = input.selectedGoal
    ? [
        `${input.selectedGoal.courseName} / ${input.selectedGoal.learningArea}`,
        input.selectedGoal.learningOutcome,
        input.selectedGoal.latestEntry
          ? `Son durum: ${statusLabels[input.selectedGoal.latestEntry.status]} · ${phaseLabels[input.selectedGoal.latestEntry.phase]} · %${input.selectedGoal.latestEntry.progressPercent} · ${formatDate(input.selectedGoal.latestEntry.measuredAt)}`
          : "Henüz kayıt girilmedi.",
      ].flatMap((line) => wrapText(line, fonts.regular, 9, CONTENT_WIDTH - 28))
    : ["Bu özet tüm hedeflerin genel durumunu gösterir."];
  const goalHeight = Math.max(112, 34 + goalLines.length * 12 + (goalHistory.length > 0 ? goalHistory.length * 22 + 10 : 0) + 18);
  const goalY = studentY - 14 - goalHeight;

  drawPanel(page, MARGIN, goalY, CONTENT_WIDTH, goalHeight, ACCENT);
  page.drawText("Seçili hedef odağı", {
    x: MARGIN + 14,
    y: goalY + goalHeight - 20,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });
  const goalBottomY = drawWrappedText(
    page,
    fonts.regular,
    MARGIN + 14,
    goalY + goalHeight - 44,
    9,
    goalLines,
  );

  if (goalHistory.length > 0) {
    goalHistory.forEach((entry, index) => {
      const rowY = goalBottomY - 16 - index * 22;
      drawPanel(page, MARGIN + 14, rowY - 8, CONTENT_WIDTH - 28, 18, rgb(1, 1, 1));
      page.drawText(formatDate(entry.measuredAt), {
        x: MARGIN + 24,
        y: rowY - 1,
        size: 8.5,
        font: fonts.bold,
        color: TEXT,
      });
      page.drawText(statusLabels[entry.status], {
        x: MARGIN + 168,
        y: rowY - 1,
        size: 8.5,
        font: fonts.regular,
        color: TEXT,
      });
      page.drawText(phaseLabels[entry.phase], {
        x: MARGIN + 280,
        y: rowY - 1,
        size: 8.5,
        font: fonts.regular,
        color: TEXT,
      });
      page.drawText(`%${entry.progressPercent}`, {
        x: MARGIN + CONTENT_WIDTH - 58,
        y: rowY - 1,
        size: 8.5,
        font: fonts.bold,
        color: TEXT,
      });
    });
  }

  const footerLines =
    input.analysis.studentsNeedingAttention.length > 0
      ? input.analysis.studentsNeedingAttention.slice(0, 4).flatMap((item) =>
          wrapText(
            `${item.studentName}: ${item.reasons.slice(0, 2).join(", ") || "Yakın takip önerisi"}`,
            fonts.regular,
            9,
            CONTENT_WIDTH - 28,
          ),
        )
      : ["Şu anda ek dikkat gerektiren açık bir öğrenci sinyali görünmüyor."];
  const footerHeight = Math.max(84, 32 + footerLines.length * 12 + 18);
  const footerY = Math.max(36, goalY - 14 - footerHeight);

  drawPanel(page, MARGIN, footerY, CONTENT_WIDTH, footerHeight, ACCENT);
  page.drawText("Dikkat gerektiren öğrenciler", {
    x: MARGIN + 14,
    y: footerY + footerHeight - 20,
    size: 12,
    font: fonts.bold,
    color: TEXT,
  });
  drawWrappedText(
    page,
    fonts.regular,
    MARGIN + 14,
    footerY + footerHeight - 44,
    9,
    footerLines,
  );

  page.drawText("Sayfa 1", {
    x: PAGE.width - 78,
    y: 22,
    size: 9,
    font: fonts.regular,
    color: TEXT,
  });

  return pdfDoc.save();
}
