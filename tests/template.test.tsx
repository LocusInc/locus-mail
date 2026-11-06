import assert from "node:assert/strict";
import test from "node:test";
import { useId } from "react";
import RegistrationEmail, { previewData } from "../examples/emails/register.email";
import {
  createRegistrationEmail,
  type RegistrationData,
} from "../examples/notifications/registration-created.notification";
import { email, renderPreview, z } from "../src";

const input = { registrationId: "registration-123" };
const registration: RegistrationData = {
  firstName: "Ada",
  verificationUrl: "https://example.com/verify?token=test&source=registration",
  recipientEmail: "ada@example.com",
};

function registrationEmail(data: RegistrationData = registration) {
  return createRegistrationEmail({ loadRegistration: async () => data });
}

function Greeting({ name }: { name: string }) {
  const id = useId();
  return <h1 id={id}>Hello, {name}</h1>;
}

function simpleEmail() {
  return email({
    id: "greeting",
    name: "Greeting",
    template: Greeting,
    mapToSend: ({ name }: { name: string }) => ({
      data: { name },
      sendOptions: { subject: `Hello, ${name}`, to: "test@example.com" },
      text: `Hello, ${name}`,
    }),
  });
}

test("registration collects data separately from its React template", async () => {
  let loadedId: string | undefined;
  const definition = createRegistrationEmail({
    loadRegistration: async (id) => { loadedId = id; return registration; },
  });
  assert.equal(definition.template, RegistrationEmail);
  const rendered = await definition.render(input);
  assert.ok(rendered);
  assert.equal(loadedId, input.registrationId);
  assert.equal(rendered.subject, "Welcome, Ada! Confirm your registration");
  assert.match(rendered.html, /Welcome, Ada!/);
  assert.match(rendered.html, /token=test&amp;source=registration/);
  assert.ok(rendered.text.includes(registration.verificationUrl));
  assert.equal(rendered.sendOptions.to, registration.recipientEmail);
  assert.ok(!rendered.html.includes("undefined"));
});

test("prepare resolves props and send metadata without rendering", async () => {
  const definition = email({
    ...simpleEmail(),
    template: () => { throw new Error("must not render"); },
  });
  const prepared = await definition.prepare({ name: "Ada" });
  assert.ok(prepared);
  assert.deepEqual(prepared.data, { name: "Ada" });
  assert.equal(prepared.sendOptions.to, "test@example.com");
});

test("one template reference can be reused by independent definitions", async () => {
  const first = simpleEmail();
  const second = email({
    ...first,
    id: "follow-up",
    mapToSend: ({ name }: { name: string }) => ({
      data: { name },
      sendOptions: { subject: "A different subject", branding: "Locus" },
      text: "A different message",
    }),
  });
  assert.equal(first.template, second.template);
  const rendered = await second.render({ name: "Ada" });
  assert.ok(rendered);
  assert.equal(rendered.subject, "A different subject");
  assert.equal(rendered.sendOptions.branding, "Locus");
  assert.match(rendered.html, /Hello, Ada/);
});

test("template exports supply preview props without a notification", () => {
  const preview = renderPreview(RegistrationEmail, previewData);
  assert.ok(preview.html.includes(`Welcome, ${previewData.firstName}!`));
  assert.match(preview.html, /at Locus/);
  assert.match(preview.html, /token=preview-only/);
  assert.deepEqual(Object.keys(preview), ["html"]);
});

test("definition preview bypasses mapToSend and data loaders", () => {
  let calls = 0;
  const definition = createRegistrationEmail({
    loadRegistration: async () => { calls += 1; throw new Error("must not load preview data"); },
  });
  assert.deepEqual(definition.renderPreview(previewData), renderPreview(RegistrationEmail, previewData));
  assert.equal(calls, 0);
});

test("JSON-editor props replace samples without changing production inputs", async () => {
  const definition = registrationEmail();
  const originalPreviewData = structuredClone(previewData);
  const edited = { ...previewData, firstName: "Grace", organizationName: undefined };
  const preview = definition.renderPreview(edited);
  assert.match(preview.html, /Welcome, Grace!/);
  assert.ok(!preview.html.includes("at Locus"));
  assert.deepEqual(previewData, originalPreviewData);
  const production = await definition.render(input);
  assert.ok(production);
  assert.match(production.html, /Welcome, Ada!/);
  assert.ok(!production.html.includes("token=preview-only"));
});

test("preview requires props and reports component errors without invoking mapper", () => {
  // Simulates a missing fixture in a dynamically discovered email module.
  // @ts-expect-error Preview props are required.
  assert.throws(() => renderPreview(RegistrationEmail), /requires a props object/);
  const failure = new Error("component failed");
  const definition = email({
    id: "broken-preview",
    name: "Broken preview",
    template: () => { throw failure; },
    mapToSend: () => { throw new Error("must not call mapper"); },
  });
  assert.throws(() => definition.renderPreview({}), (error) => error === failure);
});

test("the mapper decides what input is valid before loading", async () => {
  let calls = 0;
  const definition = createRegistrationEmail({
    loadRegistration: async () => { calls += 1; return registration; },
  });
  await assert.rejects(() => definition.render({ registrationId: "" }), /registration ID is required/);
  assert.equal(calls, 0);
});

test("registration validates collected values before rendering", async () => {
  for (const verificationUrl of ["not a URL", "/verify", "javascript:alert(1)", "ftp://example.com"]) {
    await assert.rejects(() => registrationEmail({ ...registration, verificationUrl }).render(input), z.ZodError);
  }
  await assert.rejects(() => registrationEmail({ ...registration, firstName: " " }).render(input), z.ZodError);
  await assert.rejects(() => registrationEmail({ ...registration, recipientEmail: "invalid" }).render(input), z.ZodError);
  await assert.rejects(() => registrationEmail({ ...registration, firstName: "Ada\nBcc: other@example.com" }).render(input), z.ZodError);
});

test("React composes child components and escapes interpolated data", async () => {
  const organizationName = `<script>alert("x")</script> & 'Co'`;
  const rendered = await registrationEmail({ ...registration, organizationName }).render(input);
  assert.ok(rendered);
  assert.ok(!rendered.html.includes("<script>"));
  assert.ok(rendered.html.includes("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#x27;Co&#x27;"));
  assert.ok(rendered.text.includes(organizationName));
  const greeting = await simpleEmail().render({ name: "<Ada>" });
  assert.ok(greeting);
  assert.match(greeting.html, /^<h1 id="[^"]+">Hello, &lt;Ada&gt;<\/h1>$/);
});

test("returning null skips preparation and rendering", async () => {
  const definition = createRegistrationEmail({ loadRegistration: async () => null });
  assert.equal(await definition.prepare(input), null);
  assert.equal(await definition.render(input), null);
  assert.deepEqual(definition.renderPreview(previewData), renderPreview(RegistrationEmail, previewData));
  const skipped = email({
    id: "skip",
    name: "Skip",
    template: () => { throw new Error("must not render skipped email"); },
    mapToSend: () => null,
  });
  assert.equal(await skipped.render(), null);
});

test("loader failures propagate without rendering", async () => {
  const failure = new Error("lookup failed");
  let renders = 0;
  const definition = email({
    ...createRegistrationEmail({ loadRegistration: async () => { throw failure; } }),
    template: () => { renders += 1; return <p>Should not render</p>; },
  });
  await assert.rejects(() => definition.render(input), (error) => error === failure);
  assert.equal(renders, 0);
});

test("the mapper receives caller input unchanged and owns transformations", async () => {
  const original = { count: "3", name: "  Ada  " };
  let received: unknown;
  let calls = 0;
  const definition = email({
    id: "mapped",
    name: "Mapped",
    template: Greeting,
    mapToSend: (value: typeof original) => {
      received = value;
      calls += 1;
      const name = value.name.trim();
      return {
        data: { name },
        sendOptions: { subject: name },
        text: String(Number(value.count) + 1),
      };
    },
  });
  assert.equal((await definition.render(original))!.text, "4");
  assert.equal(received, original);
  assert.equal(original.name, "  Ada  ");
  assert.equal(calls, 1);
});

test("an email can have a no-argument mapper and needs no input", async () => {
  const definition = email({
    id: "static",
    name: "Static",
    template: Greeting,
    mapToSend: () => ({
      data: { name: "Everyone" },
      sendOptions: { subject: "Hello" },
      text: "Hello, everyone",
    }),
  });
  const rendered = await definition.render();
  assert.ok(rendered);
  assert.equal(rendered.text, "Hello, everyone");
  assert.match(definition.renderPreview({ name: "Preview" }).html, /Hello, Preview/);
});

test("identity and display name are checked", () => {
  for (const id of ["", "Register", "register email", "../register"]) {
    assert.throws(() => email({ ...simpleEmail(), id }), TypeError);
  }
  assert.throws(() => email({ ...simpleEmail(), name: " " }), TypeError);
});

test("empty output and subject header injection fail clearly", async () => {
  for (const subject of [" ", "Hello\r\nBcc: victim@example.com"]) {
    const definition = email({
      ...simpleEmail(),
      mapToSend: ({ name }: { name: string }) => ({ data: { name }, sendOptions: { subject }, text: "Hello" }),
    });
    await assert.rejects(() => definition.render({ name: "Ada" }), TypeError);
  }
  const emptyText = email({
    ...simpleEmail(),
    mapToSend: ({ name }: { name: string }) => ({ data: { name }, sendOptions: { subject: "Hello" }, text: " " }),
  });
  await assert.rejects(() => emptyText.prepare({ name: "Ada" }), /invalid text/);
  const emptyView = email({ ...simpleEmail(), template: () => null });
  await assert.rejects(() => emptyView.render({ name: "Ada" }), /empty html/);
});
