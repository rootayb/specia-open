export type ParentMessageAttachmentMeta = {
  fileId: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
};

const ATTACHMENT_MARKER = "\n\n__SPECIA_ATTACHMENT__";

export function appendParentMessageAttachment(
  body: string,
  attachment?: ParentMessageAttachmentMeta | null,
) {
  const normalizedBody = body.trim();

  if (!attachment) {
    return normalizedBody;
  }

  return `${normalizedBody}${ATTACHMENT_MARKER}${JSON.stringify(attachment)}`;
}

export function parseParentMessageAttachment(rawBody: string) {
  const markerIndex = rawBody.lastIndexOf(ATTACHMENT_MARKER);
  if (markerIndex === -1) {
    return {
      body: rawBody.trim(),
      attachment: null as ParentMessageAttachmentMeta | null,
    };
  }

  const body = rawBody.slice(0, markerIndex).trim();
  const metadataText = rawBody.slice(markerIndex + ATTACHMENT_MARKER.length).trim();

  try {
    const attachment = JSON.parse(metadataText) as ParentMessageAttachmentMeta;
    if (!attachment?.fileId || !attachment?.fileName) {
      return { body: rawBody.trim(), attachment: null as ParentMessageAttachmentMeta | null };
    }

    return {
      body,
      attachment: {
        fileId: attachment.fileId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType ?? null,
        fileSize: attachment.fileSize ?? null,
      },
    };
  } catch {
    return {
      body: rawBody.trim(),
      attachment: null as ParentMessageAttachmentMeta | null,
    };
  }
}
