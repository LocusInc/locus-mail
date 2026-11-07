import {
  createMailer,
  createResendTransport,
  MailSendError,
  renderPreview,
  type DeliveryMessage,
} from "locus-mail";
import assert from "node:assert/strict";
import RegistrationEmail, { previewData } from "./emails/register.email";
import { registration } from "./registration";

const input = {
  firstName: "Wally",
  verificationUrl: "https://example.com/verify/real",
  recipient: "wally@example.com",
};

async function check() {
  const messages: DeliveryMessage[] = [];
  const mailer = createMailer({
    from: "Locus <mail@example.com>",
    transport: {
      name: "mock",
      send: async (message) => {
        messages.push(message);
        return { id: "mock-consumer-123" };
      },
    },
  });

  assert.deepEqual(await mailer.send(registration, input), {
    status: "sent",
    templateId: "register",
    provider: "mock",
    id: "mock-consumer-123",
  });
  assert.equal(messages.length, 1);
  assert.equal(
    messages[0].html,
    renderPreview(RegistrationEmail, {
      firstName: input.firstName,
      verificationUrl: input.verificationUrl,
    }).html,
  );
  assert.deepEqual(messages[0].to, [input.recipient]);
  assert.match(messages[0].text, /verify\/real/);
  assert.match(
    renderPreview(RegistrationEmail, previewData).html,
    /verify\/preview/,
  );

  await assert.rejects(
    mailer.send(registration, { ...input, recipient: "invalid" }),
    (error: unknown) => {
      assert.ok(error instanceof MailSendError);
      assert.equal(error.stage, "preparation");
      return true;
    },
  );
  assert.equal(messages.length, 1);

  let requests = 0;
  const resend = createResendTransport({
    apiKey: "mock-only-key",
    fetch: async (url, options) => {
      requests += 1;
      assert.equal(url, "https://api.resend.com/emails");
      assert.match(String(options?.body), /Welcome, Wally/);
      return Response.json({ id: "mock-resend-123" });
    },
  });
  const result = await createMailer({
    from: "mail@example.com",
    transport: resend,
  }).send(registration, input);
  assert.equal(result.status, "sent");
  assert.equal(requests, 1);
  console.log(
    "Consumer imports, rendering, runtime validation, mock transport, and mocked Resend passed.",
  );
}

export async function compileTimeChecks() {
  const mailer = createMailer({
    transport: { name: "mock", send: async () => ({ id: "mock" }) },
  });
  // @ts-expect-error Missing required fields must fail from installed declarations.
  await mailer.send(registration, { firstName: "Wally" });
  // @ts-expect-error Incorrect field types must fail from installed declarations.
  await mailer.send(registration, { ...input, firstName: 123 });
  // @ts-expect-error Sending requires an input argument.
  await mailer.send(registration);
}

void check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
