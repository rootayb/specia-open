import { Resend } from "resend";

type EmailTag = {
  name: string;
  value: string;
};

type SendTransactionalEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  replyTo?: string | string[];
  tags?: EmailTag[];
};

type EmailSendResult = {
  success: boolean;
  skipped: boolean;
  id?: string | null;
  message?: string;
};

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendTransactionalEmail(
  input: SendTransactionalEmailInput,
): Promise<EmailSendResult> {
  const resend = getResendClient();
  const from = process.env.RESEND_FROM_EMAIL?.trim() || "Specia <bilgi@specia.com.tr>";
  const configuredReplyTo = process.env.RESEND_REPLY_TO;

  if (!resend) {
    return {
      success: false,
      skipped: true,
      message: "E-posta gonderimi su anda hazir değil.",
    };
  }

  const { data, error } = await resend.emails.send(
    {
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo ?? (configuredReplyTo ? [configuredReplyTo] : undefined),
      tags: input.tags,
    },
    {
      idempotencyKey: input.idempotencyKey,
    },
  );

  if (error) {
    console.error("Resend e-posta gonderimi basarisiz oldu.", {
      name: error.name,
      message: error.message,
      idempotencyKey: input.idempotencyKey,
    });

    return {
      success: false,
      skipped: false,
      message: error.message,
    };
  }

  return {
    success: true,
    skipped: false,
    id: data?.id ?? null,
  };
}
