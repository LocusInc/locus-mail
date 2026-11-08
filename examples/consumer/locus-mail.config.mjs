import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { createResendTransport, defineConfig } from "locus-mail";

const envFile = fileURLToPath(new URL(".env.local", import.meta.url));

if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.MAIL_FROM?.trim();

export default defineConfig({
  path: "emails/**/*.email.tsx",
  port: 4110,
  previewSend: apiKey && from
    ? { from, transport: createResendTransport({ apiKey }) }
    : undefined,
});
