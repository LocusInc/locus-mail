import {
  createMailer,
  createResendTransport,
  MailSendError,
  renderPreview,
  type DeliveryMessage,
} from "@locus-ui/mail";
import assert from "node:assert/strict";
import { previewData as invitationData } from "./emails/invitation/invitation.email";
import { sendInvitationEmail } from "./emails/invitation/send-invitation-email";
import { previewData as passwordChangedData } from "./emails/password-changed/password-changed.email";
import { sendPasswordChangedEmail } from "./emails/password-changed/send-password-changed-email";
import { previewData as receiptData } from "./emails/receipt/receipt.email";
import { sendReceiptEmail } from "./emails/receipt/send-receipt-email";
import RegistrationEmail, {
  previewData,
} from "./emails/register/register.email";
import {
  registration,
  sendRegistrationEmail,
} from "./emails/register/send-registration-email";
import { previewData as resetPasswordData } from "./emails/reset-password/reset-password.email";
import { sendResetPasswordEmail } from "./emails/reset-password/send-reset-password-email";

const input = {
  firstName: "Wally",
  verificationUrl: "https://example.com/verify/real",
  to: "wally@example.com",
};

async function check() {
  assert.equal(Object.hasOwn(await import("@locus-ui/mail"), "z"), false);
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

  assert.deepEqual(await sendRegistrationEmail(input, mailer), {
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
  assert.deepEqual(messages[0].to, [input.to]);
  assert.match(messages[0].text, /verify\/real/);
  assert.match(
    renderPreview(RegistrationEmail, previewData).html,
    /verify\/preview/,
  );

  await assert.rejects(
    mailer.send(registration, { ...input, to: "invalid" }),
    (error: unknown) => {
      assert.ok(error instanceof MailSendError);
      assert.equal(error.stage, "validation");
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
  const results = [
    await sendInvitationEmail({ ...invitationData, to: input.to }, mailer),
    await sendPasswordChangedEmail(
      { ...passwordChangedData, to: input.to },
      mailer,
    ),
    await sendReceiptEmail({ ...receiptData, to: input.to }, mailer),
    await sendResetPasswordEmail(
      { ...resetPasswordData, to: input.to },
      mailer,
    ),
  ];

  assert.ok(results.every((result) => result.status === "sent"));
  assert.equal(messages.length, 5);

  for (const message of messages) {
    assert.match(message.html, /Wally/);
    assert.match(message.text, /Wally/);
    assert.deepEqual(message.to, [input.to]);
  }
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
