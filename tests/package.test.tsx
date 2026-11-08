import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";
import { readFileSync } from "node:fs";
import { defineConfig, email, renderPreview } from "../src";

test("the scoped package keeps the locus-mail CLI and public publishing configuration", () => {
  const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.equal(manifest.name, "@locus-ui/mail");
  assert.deepEqual(manifest.bin, {
    "locus-mail": "./bin/locus-mail.cjs",
  });
  assert.equal(manifest.publishConfig.access, "public");
});

test("the public entry provides configuration, authoring, and rendering", () => {
  assert.deepEqual(defineConfig({ root: ".", port: 3100 }), { root: ".", port: 3100 });
  assert.equal(typeof email, "function");
  assert.match(renderPreview(({ name }: { name: string }) => <html><body>Hello {name}</body></html>, { name: "Wally" }).html, /Hello Wally/);
});

test("CLI documents defaults and optional path customization", () => {
  const help = execFileSync(process.execPath, ["bin/locus-mail.cjs", "--help"], { encoding: "utf8" });
  assert.match(help, /\*\*\/\*\.email\.tsx/);
  assert.doesNotMatch(help, /--paths/);
  assert.match(help, /--path glob/);
  assert.match(help, /port 4000/);
  assert.match(help, /Usage: locus-mail \[/);
  const result = spawnSync(process.execPath, ["bin/locus-mail.cjs", "dev", "--paths", "other/**/*"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid option: --paths/);
});

test("CLI accepts flags directly as well as the dev alias", () => {
  for (const prefix of [[], ["dev"]]) {
    const result = spawnSync(process.execPath, ["bin/locus-mail.cjs", ...prefix, "--port", "invalid"], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /port must be/);
  }
});

test("CLI accepts a path override and validates missing or empty values", () => {
  const accepted = spawnSync(process.execPath, ["bin/locus-mail.cjs", "dev", "--path", "src/**/*.email.tsx", "--port", "invalid"], { encoding: "utf8" });
  assert.match(accepted.stderr, /port must be/);
  assert.doesNotMatch(accepted.stderr, /Invalid option/);
  for (const args of [["--path"], ["--path", "--port", "3100"], ["--path", " "]]) {
    const result = spawnSync(process.execPath, ["bin/locus-mail.cjs", "dev", ...args], { encoding: "utf8" });
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid option: --path|path must be/);
  }
});
