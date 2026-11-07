import { z } from "zod";
import { renderPreview } from "./preview";
import type { EmailSendOptions, EmailTemplate } from "./template";

export interface DeliveryOptions {
  from?: string;
  to?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string | string[];
}

export interface DeliveryMessage {
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string[];
  subject: string;
  html: string;
  text: string;
  sendOptions: EmailSendOptions;
}

export interface DeliveryReceipt {
  id: string;
}

export interface MailTransport {
  name: string;
  send: (message: DeliveryMessage) => Promise<DeliveryReceipt>;
}

export type SendResult =
  | { status: "sent"; templateId: string; provider: string; id: string }
  | { status: "skipped"; templateId: string };

export class MailSendError extends Error {
  constructor(
    public readonly stage:
      "preparation" | "validation" | "rendering" | "provider",
    public readonly templateId: string,
    options: ErrorOptions,
  ) {
    super(
      `Email "${templateId}" failed during ${stage}. See cause for details.`,
      options,
    );
    this.name = "MailSendError";
  }
}

function assertServer() {
  if (typeof window !== "undefined") {
    throw new Error("Email sending is available only on the server.");
  }
}

const mailbox = z
  .string()
  .trim()
  .min(1)
  .refine((value) => {
    if (/[\r\n]/.test(value)) {
      return false;
    }

    const named = /^[^<>]+<([^<>]+)>$/.exec(value);
    return z.email().safeParse(named ? named[1] : value).success;
  }, "Expected an email address or Name <address@example.com> without line breaks.");

const addresses = z
  .union([mailbox, z.array(mailbox).min(1)])
  .transform((value) => (typeof value === "string" ? [value] : value));

const deliverySchema = z.object({
  from: mailbox,
  to: addresses,
  cc: addresses.optional(),
  bcc: addresses.optional(),
  replyTo: addresses.optional(),
});

export function createMailer({
  transport,
  from,
}: {
  transport: MailTransport;
  from?: string;
}) {
  assertServer();

  return {
    async send<Input, Props extends object, Options extends EmailSendOptions>(
      definition: EmailTemplate<Input, Props, Options>,
      input: NoInfer<Input>,
      overrides: DeliveryOptions = {},
    ): Promise<SendResult> {
      assertServer();

      let prepared;
      try {
        prepared = await definition.prepare(input);
      } catch (cause) {
        throw new MailSendError("preparation", definition.id, { cause });
      }

      if (prepared === null) {
        return { status: "skipped", templateId: definition.id };
      }

      let delivery;
      try {
        delivery = deliverySchema.parse({
          from,
          ...prepared.sendOptions,
          ...overrides,
        });
      } catch (cause) {
        throw new MailSendError("validation", definition.id, { cause });
      }

      let html;
      try {
        html = renderPreview(definition.template, prepared.data).html;
      } catch (cause) {
        throw new MailSendError("rendering", definition.id, { cause });
      }

      try {
        const receipt = await transport.send({
          ...delivery,
          subject: prepared.sendOptions.subject,
          html,
          text: prepared.text,
          sendOptions: prepared.sendOptions,
        });

        if (typeof receipt?.id !== "string" || !receipt.id.trim()) {
          throw new Error("Transport must return a nonempty message id.");
        }

        return {
          status: "sent",
          templateId: definition.id,
          provider: transport.name,
          id: receipt.id,
        };
      } catch (cause) {
        throw new MailSendError("provider", definition.id, { cause });
      }
    },
  };
}

export class ResendDeliveryError extends Error {
  constructor(public readonly status?: number) {
    super(
      status === undefined
        ? "Resend request failed or returned an invalid response. Check connectivity and provider logs before retrying."
        : `Resend rejected the request (HTTP ${status}). Check API key, verified sender, recipients, and provider limits.`,
    );
    this.name = "ResendDeliveryError";
  }
}

export function createResendTransport({
  apiKey,
  fetch: request = globalThis.fetch,
}: {
  apiKey: string;
  fetch?: typeof globalThis.fetch;
}): MailTransport {
  assertServer();

  if (typeof apiKey !== "string" || !apiKey.trim() || /\s/.test(apiKey)) {
    throw new TypeError(
      "Resend requires a nonempty API key without whitespace.",
    );
  }

  return {
    name: "resend",
    async send(message) {
      assertServer();

      let response;
      try {
        response = await request("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(30_000),
          body: JSON.stringify({
            from: message.from,
            to: message.to,
            cc: message.cc,
            bcc: message.bcc,
            reply_to: message.replyTo,
            subject: message.subject,
            html: message.html,
            text: message.text,
          }),
        });
      } catch {
        throw new ResendDeliveryError();
      }

      if (!response.ok) {
        throw new ResendDeliveryError(response.status);
      }

      try {
        const result: unknown = await response.json();
        const { id } = z.object({ id: z.string().trim().min(1) }).parse(result);
        return { id };
      } catch {
        throw new ResendDeliveryError();
      }
    },
  };
}
