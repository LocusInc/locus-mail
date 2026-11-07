export { z } from "zod";
export { defineConfig } from "./config";
export type { MailConfig } from "./config";
export { email } from "./email";
export { renderPreview } from "./preview";
export {
  createMailer,
  createResendTransport,
  MailSendError,
  ResendDeliveryError,
} from "./sending";
export type {
  DeliveryMessage,
  DeliveryOptions,
  DeliveryReceipt,
  MailTransport,
  SendResult,
} from "./sending";
export type {
  EmailComponent,
  EmailData,
  EmailDefinition,
  EmailInput,
  EmailSendOptions,
  EmailTemplate,
  PreparedEmail,
  RenderedEmail,
  RenderedPreview,
} from "./template";
