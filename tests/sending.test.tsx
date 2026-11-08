import assert from "node:assert/strict";
import test from "node:test";
import { createMailer, createResendTransport, email, MailSendError, ResendDeliveryError, type DeliveryMessage } from "../src";
import { z } from "zod";

function notification(mode: "ready" | "skip" | "invalid" | "render-error" = "ready") {
  return email({
    id: "send-test",
    name: "Send test",
    template: ({ name }: { name: string }) => {
      if (mode === "render-error") {
        throw new Error("Broken view");
      }

      return <html><body>Hello {name}</body></html>;
    },
    mapToSend: (input: { name: string }) => {
      if (mode === "skip") {
        return null;
      }

      return {
        data: z.object({ name: z.string().min(1) }).parse(input),
        sendOptions: { subject: "Welcome", to: mode === "invalid" ? "bad" : "wally@example.com" },
        text: "Hello Wally",
      };
    },
  });
}

test("sending prepares once, renders shared HTML, and applies documented address precedence", async () => {
  const messages: DeliveryMessage[] = [];
  const mailer = createMailer({ from: "Locus <mail@example.com>", transport: {
    name: "mock",
    send: async (message) => { messages.push(message); return { id: "mock-123" }; },
  } });
  const definition = notification();
  let calls = 0;
  const prepare = definition.prepare;
  definition.prepare = (input) => { calls += 1; return prepare(input); };

  assert.deepEqual(await mailer.send(definition, { name: "<Wally>" }, {
    to: ["override@example.com"], cc: "cc@example.com", bcc: "bcc@example.com", replyTo: "reply@example.com",
  }), { status: "sent", templateId: "send-test", provider: "mock", id: "mock-123" });
  assert.equal(calls, 1);
  assert.equal(messages.length, 1);
  assert.match(messages[0].html, /&lt;Wally&gt;/);
  assert.equal(messages[0].html, definition.renderPreview({ name: "<Wally>" }).html);
  assert.equal(messages[0].text, "Hello Wally");
  assert.equal(messages[0].subject, "Welcome");
  assert.equal(messages[0].from, "Locus <mail@example.com>");
  assert.deepEqual(messages[0].to, ["override@example.com"]);
  assert.deepEqual(messages[0].replyTo, ["reply@example.com"]);
});

test("skip, mapper validation, rendering failure, and invalid delivery never reach transport", async () => {
  let calls = 0;
  const mailer = createMailer({ from: "mail@example.com", transport: {
    name: "mock", send: async () => { calls += 1; return { id: "unused" }; },
  } });
  assert.deepEqual(await mailer.send(notification("skip"), { name: "Wally" }), { status: "skipped", templateId: "send-test" });

  for (const [definition, input, overrides, stage] of [
    [notification(), { name: "" }, {}, "preparation"],
    [notification("render-error"), { name: "Wally" }, {}, "rendering"],
    [notification("invalid"), { name: "Wally" }, {}, "validation"],
    [notification(), { name: "Wally" }, { from: "x@example.com\r\nBcc: victim@example.com" }, "validation"],
    [notification(), { name: "Wally" }, { to: [] as string[] }, "validation"],
  ] as const) {
    await assert.rejects(mailer.send(definition, input, overrides), (error: unknown) => {
      assert.ok(error instanceof MailSendError);
      assert.equal(error.stage, stage);
      assert.ok(error.cause);
      return true;
    });
  }

  assert.equal(calls, 0);
});

test("missing addresses fail and provider failures retain their cause", async () => {
  const failure = new Error("Provider unavailable");
  const mailer = createMailer({ transport: { name: "mock", send: async () => { throw failure; } } });
  await assert.rejects(mailer.send(notification(), { name: "Wally" }), { stage: "validation" });
  await assert.rejects(mailer.send(notification(), { name: "Wally" }, { from: "mail@example.com" }), (error: unknown) => {
    assert.ok(error instanceof MailSendError);
    assert.equal(error.stage, "provider");
    assert.equal(error.cause, failure);
    return true;
  });
});

test("Resend maps only supported fields and uses injected HTTP with server credentials", async () => {
  let calls = 0;
  const transport = createResendTransport({ apiKey: "test-secret", fetch: async (url, options) => {
    calls += 1;
    assert.equal(url, "https://api.resend.com/emails");
    assert.equal(options?.method, "POST");
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-secret");
    assert.ok(options?.signal);
    assert.deepEqual(JSON.parse(String(options?.body)), {
      from: "mail@example.com", to: ["wally@example.com"], subject: "Welcome",
      html: "<html><head></head><body>Hello Wally</body></html>", text: "Hello Wally", reply_to: ["reply@example.com"],
    });
    return Response.json({ id: "resend-123" });
  } });
  const result = await createMailer({ transport, from: "mail@example.com" }).send(notification(), { name: "Wally" }, { replyTo: "reply@example.com" });
  assert.equal(result.status, "sent");
  assert.equal(calls, 1);
  assert.doesNotMatch(JSON.stringify(transport), /test-secret/);
});

test("Resend errors redact response contents and do not retry ambiguous sends", async () => {
  assert.throws(() => createResendTransport({ apiKey: "" }), /API key/);

  for (const response of [Response.json({ message: "test-secret" }, { status: 429 }), Response.json({}), new Response("invalid json")]) {
    let calls = 0;
    const transport = createResendTransport({ apiKey: "test-secret", fetch: async () => { calls += 1; return response; } });
    await assert.rejects(createMailer({ transport, from: "mail@example.com" }).send(notification(), { name: "Wally" }), (error: unknown) => {
      assert.ok(error instanceof MailSendError);
      assert.ok(error.cause instanceof ResendDeliveryError);
      assert.doesNotMatch(error.cause.message, /test-secret/);
      assert.equal(error.cause.status, response.ok ? undefined : 429);
      return true;
    });
    assert.equal(calls, 1);
  }

  const transport = createResendTransport({ apiKey: "test-secret", fetch: async () => { throw new Error("test-secret"); } });
  await assert.rejects(createMailer({ transport, from: "mail@example.com" }).send(notification(), { name: "Wally" }), (error: unknown) => {
    assert.ok(error instanceof MailSendError);
    assert.ok(error.cause instanceof ResendDeliveryError);
    assert.doesNotMatch(error.cause.message, /test-secret/);
    return true;
  });
});

test("notification addresses override defaults and caller addresses override notification", async () => {
  const messages: DeliveryMessage[] = [];
  const definition = email({
    id: "addresses", name: "Addresses", template: () => <p>Hello</p>,
    mapToSend: () => ({ data: {}, text: "Hello", sendOptions: { subject: "Hello", from: "definition@example.com", to: "recipient@example.com" } }),
  });
  const mailer = createMailer({ from: "default@example.com", transport: {
    name: "mock", send: async (message) => { messages.push(message); return { id: "mock" }; },
  } });
  await mailer.send(definition, undefined);
  await mailer.send(definition, undefined, { from: "caller@example.com" });
  assert.equal(messages[0].from, "definition@example.com");
  assert.equal(messages[1].from, "caller@example.com");
  assert.deepEqual(messages[0].to, ["recipient@example.com"]);
});

test("missing recipient and malformed transport receipts produce staged errors", async () => {
  const mailer = createMailer({ from: "from@example.com", transport: { name: "mock", send: async () => ({ id: "" }) } });
  const definition = email({
    id: "missing-recipient", name: "Missing recipient", template: () => <p>Hello</p>,
    mapToSend: () => ({ data: {}, text: "Hello", sendOptions: { subject: "Hello" } }),
  });
  await assert.rejects(mailer.send(definition, undefined), { stage: "validation" });
  await assert.rejects(mailer.send(notification(), { name: "Wally" }), { stage: "provider" });
});

test("sending factories and existing transports reject browser execution", async () => {
  const transport = createResendTransport({ apiKey: "test-secret", fetch: async () => { throw new Error("Must not fetch"); } });
  const mailer = createMailer({ transport, from: "mail@example.com" });
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} });

  try {
    assert.throws(() => createResendTransport({ apiKey: "test-secret" }), /only on the server/);
    assert.throws(() => createMailer({ transport }), /only on the server/);
    await assert.rejects(mailer.send(notification(), { name: "Wally" }), /only on the server/);
  } finally {
    Reflect.deleteProperty(globalThis, "window");
  }
});
