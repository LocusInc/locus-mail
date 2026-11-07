export interface MailConfig {
  root?: string;
  path?: string;
  port?: number;
}

export function defineConfig(config: MailConfig): MailConfig {
  return config;
}
