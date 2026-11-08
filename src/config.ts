import type { MailTransport } from "./sending";

export interface MailConfig {
  root?: string;
  path?: string;
  port?: number;
  previewSend?: {
    from: string;
    transport: MailTransport;
  };
}

export function defineConfig(config: MailConfig): MailConfig {
  return config;
}
