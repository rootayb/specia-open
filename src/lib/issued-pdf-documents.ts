import { randomBytes } from "node:crypto";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import { prisma } from "@/lib/prisma";

export type IssuedPdfDocumentType =
  | "student_list"
  | "student_profile"
  | "institution_report"
  | "calendar_agenda"
  | "session_schedule"
  | "institution_invoice"
  | "custom_form"
  | "course_evaluation"
  | "bep_document"
  | "educational_progress"
  | "educational_analysis_summary"
  | "special_education_daily_data"
  | "zumre_meeting"
  | "sok_meeting";

const DOCUMENT_PREFIXES: Record<IssuedPdfDocumentType, string> = {
  student_list: "LST",
  student_profile: "STD",
  institution_report: "RPT",
  calendar_agenda: "CAL",
  session_schedule: "SCH",
  institution_invoice: "INV",
  custom_form: "FRM",
  course_evaluation: "KDG",
  bep_document: "BEP",
  educational_progress: "EGA",
  educational_analysis_summary: "EAS",
  special_education_daily_data: "DLY",
  zumre_meeting: "ZMR",
  sok_meeting: "SOK",
};

const DOCUMENT_LABELS: Record<IssuedPdfDocumentType, string> = {
  student_list: "Öğrenci Listesi",
  student_profile: "Öğrenci Bilgi Raporu",
  institution_report: "Kurum Değerlendirme Raporu",
  calendar_agenda: "Günlük Takvim Ajandasi",
  session_schedule: "Haftalık Seans Programi",
  institution_invoice: "Kurumsal Fatura",
  custom_form: "Form Çıktısı",
  course_evaluation: "Kaba Değerlendirme Formu",
  bep_document: "BEP Belgesi",
  educational_progress: "Egitsel Analiz Raporu",
  educational_analysis_summary: "Egitsel Analiz Özeti",
  special_education_daily_data: "Özel Eğitim Günlük Veri Raporu",
  zumre_meeting: "Zumre Toplantı Tutanağı",
  sok_meeting: "Sube Öğretmenler Kurulu Tutanağı",
};

type IssuePdfDocumentInput = {
  documentType: IssuedPdfDocumentType;
  title: string;
  fileName: string;
  bytes: Uint8Array | Buffer;
  institutionId?: string | null;
  studentId?: string | null;
  sourceId?: string | null;
  issuedById?: string | null;
  issuedAt?: Date;
  verificationCode?: string;
};

type IssuedPdfDocumentSecurityRecord = {
  id: string;
  documentType: string;
  sourceId?: string | null;
  studentId?: string | null;
  institutionId?: string | null;
  issuedById?: string | null;
};

export function normalizeVerificationCode(value?: string | null) {
  return value?.replace(/\s+/g, "").trim().toUpperCase() ?? "";
}

export function getIssuedPdfDocumentLabel(type: string) {
  return DOCUMENT_LABELS[type as IssuedPdfDocumentType] ?? "Resmi Evrak";
}

export function buildIssuedPdfVerificationCode(
  documentType: IssuedPdfDocumentType,
  issuedAt = new Date(),
) {
  const year = String(issuedAt.getFullYear()).slice(-2);
  const month = String(issuedAt.getMonth() + 1).padStart(2, "0");
  const day = String(issuedAt.getDate()).padStart(2, "0");
  const suffix = randomBytes(12).toString("hex").toUpperCase();
  return `SPC-${DOCUMENT_PREFIXES[documentType]}-${year}${month}${day}-${suffix}`;
}

export async function stampIssuedPdfVerificationCode(
  bytes: Uint8Array | Buffer,
  verificationCode: string,
) {
  const pdfDoc = await PDFDocument.load(Buffer.from(bytes));
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  pages.forEach((page) => {
    const { width } = page.getSize();
    const textWidth = font.widthOfTextAtSize(verificationCode, 6.5);
    const x = width - textWidth - 28;
    const y = 14;

    page.drawText(verificationCode, {
      x,
      y,
      size: 6.5,
      font,
      color: rgb(0.44, 0.49, 0.56),
    });
  });

  return pdfDoc.save();
}

export async function issuePdfDocument(input: IssuePdfDocumentInput) {
  const issuedAt = input.issuedAt ?? new Date();
  const verificationCode =
    normalizeVerificationCode(input.verificationCode) ||
    buildIssuedPdfVerificationCode(input.documentType, issuedAt);

  await prisma.issuedPdfDocument.create({
    data: {
      verificationCode,
      documentType: input.documentType,
      title: input.title.trim(),
      fileName: input.fileName.trim(),
      mimeType: "application/pdf",
      pdfData: Buffer.from(input.bytes),
      institutionId: input.institutionId ?? null,
      studentId: input.studentId ?? null,
      sourceId: input.sourceId ?? null,
      issuedById: input.issuedById ?? null,
      issuedAt,
    },
  });

  return verificationCode;
}

export async function getOrCreateDocumentVerificationCode(
  sourceId: string,
  documentType: "bep_document" | "course_evaluation",
  metadata: {
    studentId: string;
    institutionId?: string | null;
    title: string;
    fileName: string;
    issuedById?: string | null;
  },
) {
  // First look up if there is an existing IssuedPdfDocument for this sourceId and documentType
  const existing = await prisma.issuedPdfDocument.findFirst({
    where: {
      sourceId,
      documentType,
    },
    select: {
      id: true,
      verificationCode: true,
      institutionId: true,
      studentId: true,
      issuedById: true,
      title: true,
      fileName: true,
    },
  });

  if (existing) {
    const title = metadata.title.trim();
    const fileName = metadata.fileName.trim();
    const shouldUpdate =
      existing.studentId !== metadata.studentId ||
      existing.institutionId !== (metadata.institutionId ?? null) ||
      existing.issuedById !== (metadata.issuedById ?? null) ||
      existing.title !== title ||
      existing.fileName !== fileName;

    if (shouldUpdate) {
      await prisma.issuedPdfDocument.update({
        where: { id: existing.id },
        data: {
          studentId: metadata.studentId,
          institutionId: metadata.institutionId ?? null,
          issuedById: metadata.issuedById ?? null,
          title,
          fileName,
        },
      });
    }

    return existing.verificationCode;
  }

  // Otherwise, create a new verification code
  const verificationCode = buildIssuedPdfVerificationCode(documentType);
  await prisma.issuedPdfDocument.create({
    data: {
      verificationCode,
      documentType,
      title: metadata.title.trim(),
      fileName: metadata.fileName.trim(),
      mimeType: "application/pdf",
      pdfData: Buffer.alloc(0), // empty bytes placeholder
      institutionId: metadata.institutionId ?? null,
      studentId: metadata.studentId,
      sourceId,
      issuedById: metadata.issuedById ?? null,
      issuedAt: new Date(),
    },
  });

  return verificationCode;
}

export async function backfillIssuedPdfDocumentSecurityMetadata<
  T extends IssuedPdfDocumentSecurityRecord,
>(record: T): Promise<T> {
  if (!record.sourceId) {
    return record;
  }

  let metadata: Pick<T, "studentId" | "institutionId" | "issuedById"> | null = null;

  if (record.documentType === "bep_document") {
    const document = await prisma.bepDocument.findUnique({
      where: { id: record.sourceId },
      select: { studentId: true, institutionId: true, ownerId: true },
    });
    if (document) {
      metadata = {
        studentId: document.studentId,
        institutionId: document.institutionId,
        issuedById: document.ownerId,
      } as Pick<T, "studentId" | "institutionId" | "issuedById">;
    }
  } else if (record.documentType === "course_evaluation") {
    const document = await prisma.courseEvaluationDocument.findUnique({
      where: { id: record.sourceId },
      select: { studentId: true, institutionId: true, ownerId: true },
    });
    if (document) {
      metadata = {
        studentId: document.studentId,
        institutionId: document.institutionId,
        issuedById: document.ownerId,
      } as Pick<T, "studentId" | "institutionId" | "issuedById">;
    }
  } else if (record.documentType === "zumre_meeting" || record.documentType === "sok_meeting") {
    const document = await prisma.zumreMeetingDocument.findUnique({
      where: { id: record.sourceId },
      select: { institutionId: true, createdById: true },
    });
    if (document) {
      metadata = {
        studentId: null,
        institutionId: document.institutionId,
        issuedById: document.createdById,
      } as Pick<T, "studentId" | "institutionId" | "issuedById">;
    }
  }

  if (!metadata) {
    return record;
  }

  const nextRecord = { ...record, ...metadata };
  const shouldUpdate =
    record.studentId !== nextRecord.studentId ||
    record.institutionId !== nextRecord.institutionId ||
    record.issuedById !== nextRecord.issuedById;

  if (shouldUpdate) {
    await prisma.issuedPdfDocument.update({
      where: { id: record.id },
      data: metadata,
    });
  }

  return nextRecord;
}

export async function resolveIssuedPdfBytes(record: {
  documentType: string;
  pdfData: Uint8Array | Buffer;
}): Promise<Buffer> {
  if (record.documentType === "institution_report") {
    try {
      const jsonStr = Buffer.from(record.pdfData).toString("utf-8");
      if (jsonStr.trim().startsWith("{")) {
        const reportInput = JSON.parse(jsonStr);
        reportInput.generatedAt = new Date(reportInput.generatedAt);
        const { generateInstitutionReportPdf } = await import("@/lib/pdf");
        const bytes = await generateInstitutionReportPdf(reportInput);
        return Buffer.from(bytes);
      }
    } catch {
      // Fallback
    }
  }
  return Buffer.from(record.pdfData);
}
