export { z } from "zod";
export { defineConfig } from "./config";
export type { MailConfig } from "./config";
export { email } from "./email";
export { renderPreview } from "./preview";
export type {
  EmailComponent,
  EmailData,
  EmailDefinition,
  EmailInput,
  EmailTemplate,
  EmailSendOptions,
  PreparedEmail,
  RenderedEmail,
  RenderedPreview,
} from "./template";
