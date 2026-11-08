import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";

const { createRegistry } = createRequire(import.meta.url)("../bin/template-registry.cjs");

test("example templates resolve Locus UI styles and render through discovery", async () => {
  const root = new URL("..", import.meta.url).pathname;
  const registry = createRegistry({ root, paths: ["examples/consumer/emails/*.email.tsx"] });
  const result = await registry.refresh();

  assert.equal(result.templates.length, 5);

  for (const entry of result.templates) {
    assert.equal(entry.status, "ready", entry.error);
    const { html } = registry.render(entry.id);
    assert.match(html, /Wally/);
    assert.match(html, /<style>/);
  }
});

test("discovery isolates errors, ignores artifacts, and reports missing fixtures and duplicates", async () => {
  const root = await mkdtemp(join(tmpdir(), "locus-discovery-"));

  try {
    await mkdir(join(root, "node_modules"));
    await writeFile(join(root, "node_modules/hidden.email.tsx"), "throw Error('must not load')");
    await writeFile(join(root, "welcome.email.ts"), "export default function Welcome() { return 'Welcome' }");
    await writeFile(join(root, "invalid.email.tsx"), "export default 42;");
    await writeFile(join(root, "broken.email.tsx"), "export default ???");
    await writeFile(join(root, "unused.notification.ts"), "throw Error('must not load')");

    const registry = createRegistry({ root, paths: ["**/*"] });
    const first = await registry.refresh();

    assert.equal(first.templates.length, 3);
    assert.throws(() => registry.render("template:welcome.email"), /Add export const previewData/);
    assert.equal(registry.render("template:welcome.email", {}).html, "Welcome");
    assert.equal(first.templates.filter((entry: { status: string }) => entry.status === "error").length, 2);

    await writeFile(join(root, "welcome.email.tsx"), "export default function Other() { return 'Other' }");
    const duplicate = await registry.refresh();

    assert.equal(duplicate.templates.filter((entry: { error?: string }) => entry.error?.includes("Duplicate template identity")).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("refresh observes additions, imported fixture edits, removals and recovery", async () => {
  const root = await mkdtemp(join(tmpdir(), "locus-refresh-"));

  try {
    const registry = createRegistry({ root });
    assert.equal((await registry.refresh()).templates.length, 0);

    await writeFile(join(root, "fixture.ts"), "export const data = { name: 'Wally' };");
    await writeFile(join(root, "welcome.email.tsx"), "export { data as previewData } from './fixture'; export default function Welcome(props: {name: string}) { return props.name; }");
    const first = await registry.refresh();

    assert.equal(registry.render("template:welcome.email").html, "Wally");
    assert.equal(registry.render("template:welcome.email", { name: "Ada" }).html, "Ada");

    await writeFile(join(root, "fixture.ts"), "export const data = { name: 'Changed' };");

    assert.notEqual((await registry.refresh()).revision, first.revision);
    assert.equal(registry.render("template:welcome.email").html, "Changed");

    await writeFile(join(root, "fixture.ts"), "export const data = null;");

    assert.equal((await registry.refresh()).templates[0].status, "error");

    await writeFile(join(root, "fixture.ts"), "export const data = { name: 'Recovered' };");

    assert.equal((await registry.refresh()).templates[0].status, "ready");

    await rm(join(root, "welcome.email.tsx"));

    assert.equal((await registry.refresh()).templates.length, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
