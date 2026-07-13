import { validateUploadedDocumentFile } from "@/lib/file-upload-security";

export type ReceiptOcrResult = {
  rawText: string;
  amount: number | null;
  date: string | null;
  vendorName: string | null;
};

type ReceiptOcrOutcome =
  | { ok: true; data: ReceiptOcrResult }
  | { ok: false; message: string };

export async function runReceiptOcr(input: {
  base64?: string;
  fileName?: string | null;
  mimeType?: string | null;
}): Promise<ReceiptOcrOutcome> {
  if (!input.base64?.trim()) {
    return { ok: false, message: "Fiş görseli zorunludur." };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.base64, "base64");
  } catch {
    return { ok: false, message: "Dosya okunamadı." };
  }

  const validation = validateUploadedDocumentFile({
    buffer,
    fileName: input.fileName,
    mimeType: input.mimeType,
  });
  if (!validation.allowed) {
    return { ok: false, message: validation.message };
  }

  const serviceUrl = process.env.OCR_SERVICE_URL;
  const apiKey = process.env.OCR_SERVICE_API_KEY;
  if (!serviceUrl || !apiKey) {
    return { ok: false, message: "OCR servisi henüz yapılandırılmadı. Bilgileri elle girebilirsiniz." };
  }

  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(buffer)], { type: validation.mimeType }),
    validation.safeFileName,
  );

  let response: Response;
  try {
    response = await fetch(`${serviceUrl.replace(/\/$/, "")}/ocr/receipt`, {
      method: "POST",
      headers: { "x-api-key": apiKey },
      body: form,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return { ok: false, message: "OCR servisine ulaşılamadı. Bilgileri elle girebilirsiniz." };
  }

  if (!response.ok) {
    return { ok: false, message: "Fiş okunamadı. Bilgileri elle girebilirsiniz." };
  }

  const payload = (await response.json()) as {
    rawText?: string;
    amount?: number | null;
    date?: string | null;
    vendorName?: string | null;
  };

  return {
    ok: true,
    data: {
      rawText: payload.rawText ?? "",
      amount: typeof payload.amount === "number" ? payload.amount : null,
      date: payload.date ?? null,
      vendorName: payload.vendorName ?? null,
    },
  };
}
