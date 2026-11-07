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
      filter: (source) => !["node_modules", "build"].includes(basename(source)),
    });
    const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
    await run("npm", ["install", join(temporary, `locus-mail-${manifest.version}.tgz`), "--ignore-scripts", "--no-audit", "--no-fund"], consumer);
    await run("npm", ["run", "check"], consumer);

    const listener = createServer();
    listener.listen(0, "127.0.0.1");
    await once(listener, "listening");
    const port = listener.address().port;
    await new Promise((resolveClose) => listener.close(resolveClose));

    preview = spawn(process.execPath, ["node_modules/locus-mail/bin/locus-mail.cjs", "--port", String(port)], { cwd: consumer, stdio: ["ignore", "pipe", "pipe"] });
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
    assert.equal(snapshot.templates.length, 1);
    const template = snapshot.templates[0];
    assert.equal(template.source, "emails/register.email.tsx");
    assert.equal(template.status, "ready", template.error);
    assert.equal(template.previewData.firstName, "Wally");

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
    assert.equal(refreshed.templates[0].previewData.firstName, "Live update");
    assert.match((await render(refreshed.templates[0].previewData)).html, /Welcome, Live update/);
    const page = await fetch(base);
    assert.equal(page.status, 200, `Preview page failed.\n${logs}`);
    assert.match(await page.text(), /Search templates/);
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
