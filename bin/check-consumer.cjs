const assert = require("node:assert/strict");
const { spawn } = require("node:child_process");
const { once } = require("node:events");
const { cp, mkdtemp, readFile, writeFile, rm } = require("node:fs/promises");
const { createServer } = require("node:net");
const { tmpdir } = require("node:os");
const { basename, join, resolve } = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

const root = resolve(__dirname, "..");

async function run(command, args, cwd) {
  const child = spawn(command, args, { cwd, stdio: "inherit" });
  const [code] = await once(child, "exit");

  if (code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed (${code}).`);
  }
}

async function main() {
  const temporary = await mkdtemp(join(tmpdir(), "locus-consumer-"));
  const consumer = join(temporary, "consumer");
  let preview;
  let previewExit;
  let logs = "";

  try {
    await run("npm", ["pack", "--pack-destination", temporary], root);
    await cp(join(root, "examples/consumer"), consumer, {
      recursive: true,
      filter: (source) => {
        const name = basename(source);
        return !["node_modules", "build"].includes(name) && (!name.startsWith(".env") || name === ".env.example");
      },
    });
    const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    await run("npm", ["install", join(temporary, `locus-mail-${manifest.version}.tgz`), "--omit=dev", "--ignore-scripts", "--no-audit", "--no-fund"], consumer);
    const installed = JSON.parse(await readFile(join(consumer, "node_modules/locus-mail/package.json"), "utf8"));

    for (const dependency of ["tailwindcss", "@tailwindcss/postcss"]) {
      assert.ok(installed.dependencies[dependency], `${dependency} must be a required runtime dependency.`);
    }

    await run("npm", ["run", "check"], consumer);
    const previewConfig = join(consumer, "test-send.config.mjs");
    await writeFile(previewConfig, `export default {
      path: "emails/**/*.email.tsx",
      previewSend: {
        from: "preview@example.com",
        transport: {
          name: "mock",
          send: async (message) => {
            if (message.to[0] !== "test@example.com" || !message.html.includes("Consumer test send") || message.subject !== "[Preview] register") {
              throw new Error("Unexpected test send payload");
            }
            return { id: "mock-preview-send" };
          },
        },
      },
    };`);

    const listener = createServer();
    listener.listen(0, "127.0.0.1");
    await once(listener, "listening");
    const port = listener.address().port;
    await new Promise((resolveClose) => listener.close(resolveClose));

    preview = spawn(process.execPath, ["node_modules/locus-mail/bin/locus-mail.cjs", "--port", String(port), "--config", previewConfig], { cwd: consumer, stdio: ["ignore", "pipe", "pipe"] });
    previewExit = once(preview, "exit");

    for (const stream of [preview.stdout, preview.stderr]) {
      stream.on("data", (chunk) => { logs = (logs + chunk).slice(-16000); });
    }

    const base = `http://localhost:${port}`;
    let snapshot;
    const deadline = Date.now() + 90000;

    while (Date.now() < deadline) {
      if (preview.exitCode !== null) {
        throw new Error(`Preview exited early.\n${logs}`);
      }

      try {
        const response = await fetch(`${base}/api/templates`, { signal: AbortSignal.timeout(5000) });

        if (response.ok) {
          snapshot = await response.json();
          break;
        }
      } catch (error) {
        logs = (logs + error.message + "\n").slice(-16000);
      }

      await delay(500);
    }

    assert.ok(snapshot, `Preview did not start.\n${logs}`);
    assert.deepEqual(snapshot.templates.map((entry) => entry.source).sort(), [
      "emails/invitation.email.tsx", "emails/password-changed.email.tsx", "emails/receipt.email.tsx",
      "emails/register.email.tsx", "emails/reset-password.email.tsx",
    ]);

    for (const entry of snapshot.templates) {
      assert.equal(entry.status, "ready", entry.error);
      const response = await fetch(`${base}/api/templates`, {
        method: "POST", body: JSON.stringify({ id: entry.id, props: entry.previewData }),
      });
      assert.equal(response.status, 200);
      assert.match((await response.json()).html, /Wally/);
    }

    const template = snapshot.templates.find((entry) => entry.source === "emails/register.email.tsx");
    assert.equal(template.source, "emails/register.email.tsx");
    assert.equal(template.status, "ready", template.error);
    assert.equal(template.previewData.firstName, "Wally");
    assert.equal(snapshot.testSendConfigured, true);
    const sendBody = JSON.stringify({ action: "send-test", id: template.id, to: "test@example.com", props: { ...template.previewData, firstName: "Consumer test send" } });
    const rejectedSend = await fetch(`${base}/api/templates`, { method: "POST", headers: { "Content-Type": "application/json" }, body: sendBody });
    assert.equal(rejectedSend.status, 403);
    const testSend = await fetch(`${base}/api/templates`, {
      method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: sendBody,
    });
    assert.equal(testSend.status, 200);
    assert.equal((await testSend.json()).id, "mock-preview-send");

    const render = async (props) => {
      const response = await fetch(`${base}/api/templates`, {
        method: "POST", body: JSON.stringify({ id: template.id, props }), signal: AbortSignal.timeout(10000),
      });
      assert.equal(response.status, 200);
      return response.json();
    };

    assert.match((await render(template.previewData)).html, /Welcome, Wally/);
    assert.match((await render({ ...template.previewData, firstName: "Consumer edit" })).html, /Welcome, Consumer edit/);
    const source = join(consumer, "emails/register.email.tsx");
    await writeFile(source, (await readFile(source, "utf8")).replace('firstName: "Wally"', 'firstName: "Live update"'));
    const refreshed = await (await fetch(`${base}/api/templates`)).json();
    assert.notEqual(refreshed.revision, snapshot.revision);
    const updated = refreshed.templates.find((entry) => entry.id === template.id);
    assert.equal(updated.previewData.firstName, "Live update");
    assert.match((await render(updated.previewData)).html, /Welcome, Live update/);
    const page = await fetch(base);
    assert.equal(page.status, 200, `Preview page failed.\n${logs}`);
    const pageHtml = await page.text();
    assert.match(pageHtml, /Search templates/);
    const stylesheets = [...pageHtml.matchAll(/<link\b[^>]*>/g)]
      .filter(([tag]) => /rel="stylesheet"/.test(tag))
      .map(([tag]) => /href="([^"]+)"/.exec(tag)?.[1]);
    assert.ok(stylesheets.length, "Preview must include its stylesheets.");
    let css = "";

    for (const href of stylesheets) {
      const response = await fetch(new URL(href.replaceAll("&amp;", "&"), base));
      assert.equal(response.status, 200);
      css += await response.text();
    }

    assert.match(css, /grid-template-columns:\s*var\(--nav-width,\s*280px\)/, "Packaged preview must generate its own layout utilities outside the consumer source tree.");
    console.log("Packaged CLI discovery, edited JSON rendering, fixture refresh, and preview page passed.");
    console.log(`Consumer fixture: ${consumer}`);
  } finally {
    if (preview && preview.exitCode === null) {
      preview.kill("SIGTERM");
      await previewExit;
    }

    if (!process.argv.includes("--keep")) {
      await rm(temporary, { recursive: true, force: true });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
