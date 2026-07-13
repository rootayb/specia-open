import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";

import { loadPdfFonts as loadFonts, type PdfFonts as Fonts } from "@/lib/pdf-assets";
import {
  buildZumreComplianceChecklist,
  formatZumreDate,
  getZumreMeetingTypeLabel,
  splitZumreParticipants,
  type ZumreMeetingWithAgenda,
} from "@/lib/zumre-meeting";

const PAGE = { width: 595.44, height: 841.92 };
const COLORS = {
  text: rgb(0.08, 0.08, 0.08),
  muted: rgb(0.36, 0.36, 0.36),
  line: rgb(0.18, 0.18, 0.18),
  soft: rgb(0.94, 0.94, 0.94),
  white: rgb(1, 1, 1),
};

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
  const lines: string[] = [];
  const paragraphs = text.replace(/\r/g, "").split("\n");

  for (const paragraph of paragraphs) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
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
          if (current) lines.push(current);
          current = chunk;
        }
      }
    }

    if (current) {
      lines.push(current);
    }
    if (words.length === 0 && lines.length > 0) {
      lines.push("");
    }
  }

  return lines;
}

class PdfWriter {
  private page: PDFPage;
  private top = 48;
  private readonly left = 48;
  private readonly right = 48;
  private readonly bottom = 54;

  constructor(
    private readonly pdfDoc: PDFDocument,
    private readonly fonts: Fonts,
  ) {
    this.page = pdfDoc.addPage([PAGE.width, PAGE.height]);
  }

  private y(top: number, size = 0) {
    return this.page.getHeight() - top - size;
  }

  private width() {
    return this.page.getWidth() - this.left - this.right;
  }

  private ensure(height: number) {
    if (this.top + height > this.page.getHeight() - this.bottom) {
      this.page = this.pdfDoc.addPage([PAGE.width, PAGE.height]);
      this.top = 48;
    }
  }

  text(
    value: string,
    options: {
      size?: number;
      bold?: boolean;
      align?: "left" | "center" | "right";
      color?: ReturnType<typeof rgb>;
      gapAfter?: number;
      indent?: number;
    } = {},
  ) {
    const size = options.size ?? 10;
    const font = options.bold ? this.fonts.bold : this.fonts.regular;
    const lineHeight = size * 1.38;
    const indent = options.indent ?? 0;
    const maxWidth = this.width() - indent;
    const lines = wrapText(value || "-", font, size, maxWidth);
    this.ensure(lines.length * lineHeight + (options.gapAfter ?? 6));

    for (const line of lines) {
      const lineWidth = font.widthOfTextAtSize(line, size);
      const x =
        options.align === "center"
          ? this.left + (this.width() - lineWidth) / 2
          : options.align === "right"
            ? this.left + this.width() - lineWidth
            : this.left + indent;

      this.page.drawText(line, {
        x,
        y: this.y(this.top, size),
        size,
        font,
        color: options.color ?? COLORS.text,
      });
      this.top += lineHeight;
    }

    this.top += options.gapAfter ?? 6;
  }

  heading(value: string) {
    this.ensure(30);
    this.text(value, { size: 12, bold: true, gapAfter: 8 });
    this.line();
    this.top += 5;
  }

  line() {
    this.page.drawLine({
      start: { x: this.left, y: this.y(this.top) },
      end: { x: this.left + this.width(), y: this.y(this.top) },
      color: COLORS.line,
      thickness: 0.7,
    });
  }

  table(rows: Array<[string, string]>) {
    const labelWidth = 145;
    const valueWidth = this.width() - labelWidth;
    const rowHeight = 24;
    for (const [label, value] of rows) {
      this.ensure(rowHeight);
      this.page.drawRectangle({
        x: this.left,
        y: this.y(this.top, rowHeight),
        width: labelWidth,
        height: rowHeight,
        color: COLORS.soft,
        borderColor: COLORS.line,
        borderWidth: 0.6,
      });
      this.page.drawRectangle({
        x: this.left + labelWidth,
        y: this.y(this.top, rowHeight),
        width: valueWidth,
        height: rowHeight,
        color: COLORS.white,
        borderColor: COLORS.line,
        borderWidth: 0.6,
      });
      this.drawCellText(label, this.left + 8, this.top + 7, labelWidth - 16, true);
      this.drawCellText(value || "-", this.left + labelWidth + 8, this.top + 7, valueWidth - 16);
      this.top += rowHeight;
    }
    this.top += 12;
  }

  private drawCellText(
    value: string,
    x: number,
    top: number,
    width: number,
    bold = false,
  ) {
    const size = 8.5;
    const font = bold ? this.fonts.bold : this.fonts.regular;
    const lines = wrapText(value, font, size, width).slice(0, 2);
    lines.forEach((line, index) => {
      this.page.drawText(line, {
        x,
        y: this.y(top + index * 10, size),
        size,
        font,
        color: COLORS.text,
      });
    });
  }

  bullets(values: string[]) {
    values.forEach((value) => this.text(`• ${value}`, { size: 9.2, indent: 12, gapAfter: 2 }));
    this.top += 6;
  }

  signatureGrid(items: Array<{ name: string; title: string }>) {
    const boxWidth = (this.width() - 24) / 2;
    const boxHeight = 66;
    items.forEach((item, index) => {
      if (index % 2 === 0) {
        this.ensure(boxHeight + 12);
      }
      const x = this.left + (index % 2) * (boxWidth + 24);
      const top = this.top;
      this.page.drawRectangle({
        x,
        y: this.y(top, boxHeight),
        width: boxWidth,
        height: boxHeight,
        borderColor: COLORS.line,
        borderWidth: 0.6,
      });
      this.drawCellText(item.name, x + 10, top + 12, boxWidth - 20, true);
      this.drawCellText(item.title, x + 10, top + 28, boxWidth - 20);
      if (index % 2 === 1 || index === items.length - 1) {
        this.top += boxHeight + 12;
      }
    });
  }

  pageNumbers() {
    const pages = this.pdfDoc.getPages();
    pages.forEach((page, index) => {
      const label = `${index + 1} / ${pages.length}`;
      const size = 8;
      const width = this.fonts.regular.widthOfTextAtSize(label, size);
      page.drawText(label, {
        x: page.getWidth() - 48 - width,
        y: 28,
        size,
        font: this.fonts.regular,
        color: COLORS.muted,
      });
    });
  }

  pageBreak() {
    this.page = this.pdfDoc.addPage([PAGE.width, PAGE.height]);
    this.top = 48;
  }
}

function buildMetaRows(document: ZumreMeetingWithAgenda): Array<[string, string]> {
  const isSok = document.documentType === "sok";
  return [
    ["Eğitim öğretim yılı", document.educationYear],
    ["Dönem", document.termLabel],
    ["Toplantı no", document.meetingNo],
    ["Toplantı tarihi", formatZumreDate(document.meetingDate)],
    ["Toplantı saati", document.meetingTime],
    ["Toplantı yeri", document.location],
    ["İl / İlçe", [document.city, document.district].filter(Boolean).join(" / ") || "-"],
    [isSok ? "Şube" : "Zümre", document.zumreName],
    ["Kademe / Tür", document.gradeLevel || "-"],
    ["Toplantı türü", getZumreMeetingTypeLabel(document.meetingType)],
    [isSok ? "Kurul başkanı" : "Zümre başkanı", document.chairpersonName],
    ["Yazman", document.recorderName || "-"],
  ];
}

function buildSignatureEntries(document: ZumreMeetingWithAgenda) {
  const isSok = document.documentType === "sok";
  const participantEntries = splitZumreParticipants(document.participants).map((name) => ({
    name,
    title: isSok ? "Kurul üyesi" : "Zümre öğretmeni",
  }));

  return [
    ...participantEntries,
    {
      name: document.principalName,
      title: document.principalTitle || "Okul Müdürü",
    },
  ];
}

export async function generateZumreMeetingPdf(document: ZumreMeetingWithAgenda) {
  const pdfDoc = await PDFDocument.create();
  const fonts = await loadFonts(pdfDoc);
  const writer = new PdfWriter(pdfDoc, fonts);

  writer.text(document.schoolName.toLocaleUpperCase("tr-TR"), {
    size: 12,
    bold: true,
    align: "center",
    gapAfter: 4,
  });
  const isSok = document.documentType === "sok";
  writer.text(`${document.zumreName} ${isSok ? "Şube" : "Zümre"} Öğretmenler Kurulu Toplantı Tutanağı`, {
    size: 15,
    bold: true,
    align: "center",
    gapAfter: 14,
  });
  writer.table(buildMetaRows(document));

  writer.heading("Katılımcılar");
  writer.bullets(splitZumreParticipants(document.participants));

  writer.pageBreak();

  writer.heading("Gündem Maddeleri");
  document.agendaItems.forEach((item, index) => {
    writer.text(`${index + 1}. ${item.title}`, { size: 10, bold: true, gapAfter: 2 });
  });

  writer.heading("Gündem Maddelerinin Görüşülmesi");
  document.agendaItems.forEach((item, index) => {
    writer.text(`${index + 1}. ${item.title}`, { size: 10.5, bold: true, gapAfter: 3 });
    writer.text(item.discussionText || "Görüşme metni girilmedi.", { size: 9.4, gapAfter: 5 });
  });

  writer.pageBreak();

  writer.heading("Alınan Kararlar");
  document.agendaItems.forEach((item, index) => {
    const detail = [
      item.decisionText || "Karar metni girilmedi.",
    ]
      .filter(Boolean)
      .join("\n");
    writer.text(`${index + 1}. ${item.title}`, { size: 10.2, bold: true, gapAfter: 2 });
    writer.text(detail, { size: 9.4, gapAfter: 6 });
  });

  writer.heading("İmzalar");
  writer.signatureGrid(buildSignatureEntries(document));
  writer.text("UYGUNDUR", { size: 11, bold: true, align: "center", gapAfter: 2 });
  writer.text(document.principalName, { size: 10, bold: true, align: "center", gapAfter: 1 });
  writer.text(document.principalTitle || "Okul Müdürü", {
    size: 9,
    align: "center",
    gapAfter: 1,
  });

  writer.pageNumbers();
  return pdfDoc.save();
}

function docxText(value: string, options: { bold?: boolean; size?: number } = {}) {
  return new TextRun({
    text: value,
    bold: options.bold,
    size: options.size ?? 22,
    font: "Arial",
  });
}

function docxParagraph(
  value: string,
  options: {
    bold?: boolean;
    size?: number;
    heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel];
    align?: (typeof AlignmentType)[keyof typeof AlignmentType];
    spacingAfter?: number;
  } = {},
) {
  return new Paragraph({
    heading: options.heading,
    alignment: options.align,
    spacing: { after: options.spacingAfter ?? 160 },
    children: [docxText(value, { bold: options.bold, size: options.size })],
  });
}

function docxCell(value: string, bold = false) {
  return new TableCell({
    margins: { top: 110, bottom: 110, left: 120, right: 120 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "333333" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "333333" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "333333" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "333333" },
    },
    children: [docxParagraph(value || "-", { bold, spacingAfter: 0 })],
  });
}

function docxMetaTable(document: ZumreMeetingWithAgenda) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: buildMetaRows(document).map(
      ([label, value]) =>
        new TableRow({
          children: [docxCell(label, true), docxCell(value)],
        }),
    ),
  });
}

export async function generateZumreMeetingDocx(document: ZumreMeetingWithAgenda) {
  const isSok = document.documentType === "sok";
  const children = [
    docxParagraph(document.schoolName.toLocaleUpperCase("tr-TR"), {
      bold: true,
      size: 24,
      align: AlignmentType.CENTER,
      spacingAfter: 80,
    }),
    docxParagraph(`${document.zumreName} ${isSok ? "Şube" : "Zümre"} Öğretmenler Kurulu Toplantı Tutanağı`, {
      bold: true,
      size: 30,
      align: AlignmentType.CENTER,
      spacingAfter: 240,
    }),
    docxMetaTable(document),
    docxParagraph("Katılımcılar", { heading: HeadingLevel.HEADING_1, bold: true }),
    ...splitZumreParticipants(document.participants).map((participant) =>
      docxParagraph(`• ${participant}`),
    ),
    docxParagraph("Yönetmelik Uyumluluk Kontrolü", {
      heading: HeadingLevel.HEADING_1,
      bold: true,
    }),
    ...buildZumreComplianceChecklist(document).map((item) => docxParagraph(`• ${item}`)),
    ...(document.complianceNotes ? [docxParagraph(document.complianceNotes)] : []),
    docxParagraph("Gündem Maddeleri", { heading: HeadingLevel.HEADING_1, bold: true }),
    ...document.agendaItems.map((item, index) => docxParagraph(`${index + 1}. ${item.title}`)),
    docxParagraph("Gündem Maddelerinin Görüşülmesi", {
      heading: HeadingLevel.HEADING_1,
      bold: true,
    }),
    ...document.agendaItems.flatMap((item, index) => [
      docxParagraph(`${index + 1}. ${item.title}`, { bold: true }),
      docxParagraph(item.discussionText || "Görüşme metni girilmedi."),
    ]),
    docxParagraph("Alınan Kararlar", { heading: HeadingLevel.HEADING_1, bold: true }),
    ...document.agendaItems.flatMap((item, index) => [
      docxParagraph(`${index + 1}. ${item.title}`, { bold: true }),
      docxParagraph(
        [
          item.decisionText || "Karar metni girilmedi.",
        ]
          .filter(Boolean)
          .join("\n"),
      ),
    ]),
    docxParagraph("İmzalar", { heading: HeadingLevel.HEADING_1, bold: true }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: buildSignatureEntries(document).map(
        (item) =>
          new TableRow({
            children: [docxCell(item.name, true), docxCell(item.title)],
          }),
      ),
    }),
    docxParagraph("UYGUNDUR", { bold: true, align: AlignmentType.CENTER, spacingAfter: 80 }),
    docxParagraph(document.principalName, {
      bold: true,
      align: AlignmentType.CENTER,
      spacingAfter: 40,
    }),
    docxParagraph(document.principalTitle || "Okul Müdürü", {
      align: AlignmentType.CENTER,
      spacingAfter: 0,
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1134,
              right: 1134,
              bottom: 1134,
              left: 1134,
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
