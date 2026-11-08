import { createMailer, createResendTransport } from "@locus-ui/mail";

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.MAIL_FROM?.trim();

export const previewSend = apiKey && from
  ? {
      from,
      transport: createResendTransport({
        apiKey,
      }),
    }
  : undefined;

export const mailer = previewSend ? createMailer(previewSend) : undefined;

export function getMailer() {
  if (!mailer) {
    throw new Error("Set RESEND_API_KEY and MAIL_FROM before sending email.");
  }

  return mailer;
}
