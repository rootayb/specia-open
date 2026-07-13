import { enforceRateLimit } from "@/lib/api/permissions";
import { handleApiError } from "@/lib/api/errors";
import { NextResponse } from "next/server";

import { buildIssuedPdfVerificationCode, issuePdfDocument } from "@/lib/issued-pdf-documents";
import { getCorporatePdfSigningMeta } from "@/lib/corporate-pdf-signatures";
import { buildSafePdfFilename } from "@/lib/pdf-filename";
import { generateInstitutionInvoicePdf } from "@/lib/pdf";
import { canManageInstitutionRecords } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";
import { userSupportsSessionAndFinanceModules } from "@/lib/institution-features";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await enforceRateLimit("pdf_generation", 10, 60 * 1000);
  } catch (error) {
    return handleApiError(error);
  }
  const user = await requireApiUser();
  if (!user) {
    return NextResponse.json({ error: "Yetkisiz istek." }, { status: 401 });
  }

  if (!canManageInstitutionRecords(user.role)) {
    return NextResponse.json({ error: "Bu faturaya erişim yetkiniz yok." }, { status: 403 });
  }
  if (!userSupportsSessionAndFinanceModules(user)) {
    return NextResponse.json({ error: "Bu modül kurum tipiniz için kullanılamaz." }, { status: 403 });
  }

  const { id } = await context.params;
  const invoice = await prisma.institutionInvoice.findFirst({
    where:
      user.role === "admin"
        ? { id }
        : {
            id,
            institutionId: user.institutionId ?? "__no_institution__",
          },
    include: {
      institution: {
        include: {
          settings: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Fatura bulunamadı." }, { status: 404 });
  }

  if (invoice.billingSource === "entitlement" && invoice.status === "draft") {
    return NextResponse.json({ error: "Taslak hak edis faturasi onaylanmadan disa aktarilamaz." }, { status: 409 });
  }

  const settings = invoice.institution.settings[0] ?? null;
  const signingMeta = await getCorporatePdfSigningMeta(user, invoice.institutionId);
  const generatedAt = new Date();
  const verificationCode = buildIssuedPdfVerificationCode("institution_invoice", generatedAt);
  const title = `${invoice.invoiceNumber} Nolu Kurumsal Fatura`;
  const fileName = buildSafePdfFilename(invoice.invoiceNumber, "fatura");
  const bytes = await generateInstitutionInvoicePdf({
    title,
    generatedAt,
    generatedByName: signingMeta.generatedByName,
    generatedByRole: signingMeta.generatedByRole,
    institutionId: signingMeta.institutionId,
    institutionManagerName: signingMeta.institutionManagerName,
    institutionManagerTitle: signingMeta.institutionManagerTitle,
    referenceCode: verificationCode,
    institutionName: invoice.institution.name,
    institutionLegalName: settings?.legalName ?? invoice.institution.name,
    institutionAddress: settings?.address,
    institutionPhone: settings?.phone,
    institutionEmail: settings?.email,
    institutionTaxOffice: settings?.taxOffice,
    institutionTaxNumber: settings?.taxNumber,
    institutionMersisNumber: settings?.mersisNumber,
    institutionIban: settings?.iban,
    principalName: settings?.principalName,
    principalTitle: settings?.principalTitle,
    coordinatorName: settings?.defaultManagerName,
    coordinatorTitle: settings?.defaultManagerTitle,
    invoice: {
      invoiceNumber: invoice.invoiceNumber,
      customerType: invoice.customerType,
      status: invoice.status,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      customerName: invoice.customerName,
      customerTitle: invoice.customerTitle,
      customerIdentityNo: invoice.customerIdentityNo,
      customerTaxOffice: invoice.customerTaxOffice,
      customerTaxNumber: invoice.customerTaxNumber,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      billingAddress: invoice.billingAddress,
      serviceTitle: invoice.serviceTitle,
      serviceDescription: invoice.serviceDescription,
      servicePeriod: invoice.servicePeriod,
      quantity: Number(invoice.quantity),
      unitPrice: Number(invoice.unitPrice),
      taxRate: Number(invoice.taxRate),
      notes: invoice.notes,
    },
  });

  await issuePdfDocument({
    documentType: "institution_invoice",
    verificationCode,
    title,
    fileName,
    bytes,
    institutionId: invoice.institutionId,
    sourceId: invoice.id,
    issuedById: user.id,
    issuedAt: generatedAt,
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${fileName}"`,
    },
  });
}
