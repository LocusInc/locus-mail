import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import ts from "typescript";
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
    await mkdir(join(temporary, "node_modules/@locus-ui"), { recursive: true });
    await symlink(root, join(temporary, "node_modules/@locus-ui/mail"));
    await copyFile(join(root, "example/locus-mail.config.mjs"), join(temporary, "locus-mail.config.mjs"));
    await mkdir(join(temporary, "build/emails"), { recursive: true });
    const source = await readFile(join(root, "example/emails/mailer.ts"), "utf8");
    await writeFile(join(temporary, "build/emails/mailer.js"), ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText);

    function inspect(overrides: Partial<NodeJS.ProcessEnv> = {}) {
      return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "-e", 'import assert from "node:assert/strict"; import config from "./locus-mail.config.mjs"; const {previewSend, mailer, getMailer} = await import("./build/emails/mailer.js"); assert.equal(config.previewSend, previewSend); if (previewSend) { assert.equal(getMailer(), mailer); } else { assert.throws(getMailer, /RESEND_API_KEY and MAIL_FROM/); } console.log(JSON.stringify({ configured: Boolean(config.previewSend), provider: config.previewSend?.transport.name, from: config.previewSend?.from }));'], { cwd: temporary, env: { ...env, ...overrides }, encoding: "utf8" }));
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
