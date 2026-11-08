import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@locus-ui/mail";

const envFile = fileURLToPath(new URL(".env.local", import.meta.url));

if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const { previewSend } = await import("./build/emails/mailer.js");

export default defineConfig({
  path: "emails/**/*.email.tsx",
  port: 4110,
  previewSend,
});
