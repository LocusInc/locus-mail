import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

test("consumer loads private local Resend setup and stays disabled until both values exist", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const temporary = await mkdtemp(join(tmpdir(), "locus-resend-config-"));
  const env = { ...process.env };
  delete env.RESEND_API_KEY;
  delete env.MAIL_FROM;

  try {
    await mkdir(join(temporary, "node_modules"));
    await symlink(root, join(temporary, "node_modules/locus-mail"));
    await copyFile(join(root, "examples/consumer/locus-mail.config.mjs"), join(temporary, "locus-mail.config.mjs"));

    function inspect(overrides: Partial<NodeJS.ProcessEnv> = {}) {
      return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", 'import config from "./locus-mail.config.mjs"; console.log(JSON.stringify({ configured: Boolean(config.previewSend), provider: config.previewSend?.transport.name, from: config.previewSend?.from }));'], { cwd: temporary, env: { ...env, ...overrides }, encoding: "utf8" }));
    }

    assert.deepEqual(inspect(), { configured: false });
    await writeFile(join(temporary, ".env.local"), "RESEND_API_KEY=re_mock_only\nMAIL_FROM=\n");
    assert.deepEqual(inspect(), { configured: false });
    await writeFile(join(temporary, ".env.local"), "RESEND_API_KEY=re_mock_only\nMAIL_FROM=mock@example.com\n");
    assert.deepEqual(inspect(), { configured: true, provider: "resend", from: "mock@example.com" });
    assert.deepEqual(inspect({ MAIL_FROM: "override@example.com" }), { configured: true, provider: "resend", from: "override@example.com" });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
