import type { PDFDocument, PDFImage } from "pdf-lib";
import { readPdfAsset } from "@/lib/pdf-assets";
import { prisma } from "@/lib/prisma";

export async function loadMebPdfLogo(pdfDoc: PDFDocument): Promise<PDFImage | null> {
  try {
    const bytes = await readPdfAsset("meb-logo.png");
    return pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function loadSpeciaPdfLogo(
  pdfDoc: PDFDocument,
  variant: "black" | "white" = "black",
): Promise<PDFImage | null> {
  try {
    const bytes = await readPdfAsset(
      variant === "white" ? "specia-logo-white.png" : "specia-logo-black.png",
    );
    return pdfDoc.embedPng(bytes);
  } catch {
    return null;
  }
}

export async function loadInstitutionOrSpeciaLogo(
  pdfDoc: PDFDocument,
  institutionId?: string | null,
  variant: "black" | "white" = "white",
): Promise<PDFImage | null> {
  if (institutionId) {
    try {
      const settings = await prisma.institutionSettings.findFirst({
        where: { institutionId },
        select: { logoData: true, logoMimeType: true },
      });
      if (settings?.logoData) {
        const bytes = settings.logoData;
        if (settings.logoMimeType === "image/jpeg" || settings.logoMimeType === "image/jpg") {
          return await pdfDoc.embedJpg(bytes);
        } else {
          return await pdfDoc.embedPng(bytes);
        }
      }
    } catch (err) {
      console.error("Error embedding custom institution logo:", err);
    }
  }
  return loadSpeciaPdfLogo(pdfDoc, variant);
}
