import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { POST } from "../app/api/templates/route";
import { TestSend } from "../app/preview/test-send";
import type { DeliveryMessage } from "../src";

const { startRegistry } = createRequire(import.meta.url)(
  "../bin/template-registry.cjs",
);

test("test email section explains setup and disables sending without a transport", () => {
  const html = renderToStaticMarkup(
    <TestSend
      templateId="test"
      draft="{}"
      configured={false}
      disabled={false}
    />,
  );
  assert.match(html, /Recipient email/);
  assert.match(html, /type="email"/);
  assert.match(html, /<button[^>]*disabled[^>]*><span>Send/);
  assert.match(html, /Set previewSend.from and previewSend.transport/);
});

test("preview test sends use current props, authenticate requests, and keep configuration private", async () => {
  const root = await mkdtemp(join(tmpdir(), "locus-test-send-"));
  const messages: DeliveryMessage[] = [];
  await writeFile(
    join(root, "register.email.tsx"),
    'export const previewData = {firstName:"Fixture"}; export default function View({firstName}) { return <h1>{firstName}</h1>; }',
  );
  await writeFile(
    join(root, "production.notification.ts"),
    'throw new Error("Never load production notifications");',
  );
  const registry = await startRegistry({
    root,
    previewSend: {
      from: "Sender <sender@example.com>",
      transport: {
        name: "mock",
        secret: "provider-secret",
        send: async (message: DeliveryMessage) => {
          if (message.to[0] === "fail@example.com") {
            throw new Error("provider-secret");
          }

          messages.push(message);
          return { id: "test-message" };
        },
      },
    },
  });
  const previousUrl = process.env.LOCUS_MAIL_REGISTRY_URL;
  const previousToken = process.env.LOCUS_MAIL_REGISTRY_TOKEN;
  process.env.LOCUS_MAIL_REGISTRY_URL = registry.url;
  process.env.LOCUS_MAIL_REGISTRY_TOKEN = registry.token;

  try {
    const snapshot = await (await fetch(registry.url)).json();
    assert.equal(snapshot.testSendConfigured, true);
    assert.doesNotMatch(
      JSON.stringify(snapshot),
      /provider-secret|sender@example.com/,
    );
    assert.ok(!JSON.stringify(snapshot).includes(registry.token));
    const body = {
      action: "send-test",
      id: snapshot.templates[0].id,
      props: { firstName: "Edited <name>" },
      to: "test@example.com",
    };
    const request = (value: object, origin = "http://localhost:4110") =>
      new Request("http://localhost:4110/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin },
        body: JSON.stringify(value),
      });

    assert.equal(
      (
        await fetch(registry.url, {
          method: "POST",
          body: JSON.stringify(body),
        })
      ).status,
      403,
    );
    assert.equal(
      (await POST(request(body, "https://other.example"))).status,
      403,
    );
    assert.equal((await POST(request(body, ""))).status, 403);
    assert.equal((await POST(request({ ...body, to: "invalid" }))).status, 400);
    assert.equal((await POST(request({ ...body, props: null }))).status, 400);
    assert.equal(messages.length, 0);

    const response = await POST(request(body));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).id, "test-message");
    assert.equal(messages.length, 1);
    assert.equal(messages[0].html, "<h1>Edited &lt;name&gt;</h1>");
    assert.equal(messages[0].subject, "[Preview] register");
    assert.deepEqual(messages[0].to, ["test@example.com"]);
    assert.equal(messages[0].from, "Sender <sender@example.com>");
    assert.match(messages[0].text, /Edited <name>/);
    const failed = await POST(request({ ...body, to: "fail@example.com" }));
    assert.equal(failed.status, 400);
    assert.doesNotMatch(await failed.text(), /provider-secret/);
  } finally {
    if (previousUrl === undefined) {
      delete process.env.LOCUS_MAIL_REGISTRY_URL;
    } else {
      process.env.LOCUS_MAIL_REGISTRY_URL = previousUrl;
    }

    if (previousToken === undefined) {
      delete process.env.LOCUS_MAIL_REGISTRY_TOKEN;
    } else {
      process.env.LOCUS_MAIL_REGISTRY_TOKEN = previousToken;
    }

    registry.close();
    await rm(root, { recursive: true, force: true });
  }
});

test("unconfigured registry rejects authenticated test sends", async () => {
  const root = await mkdtemp(join(tmpdir(), "locus-no-mailer-"));
  const registry = await startRegistry({ root });

  try {
    assert.equal(
      (await (await fetch(registry.url)).json()).testSendConfigured,
      false,
    );
    const response = await fetch(registry.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${registry.token}` },
      body: JSON.stringify({
        action: "send-test",
        props: {},
        to: "test@example.com",
      }),
    });
    assert.equal(response.status, 400);
  } finally {
    registry.close();
    await rm(root, { recursive: true, force: true });
  }
});
