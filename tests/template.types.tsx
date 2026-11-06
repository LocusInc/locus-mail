// Compile-only assertions. An unused @ts-expect-error fails `npm run typecheck`.
import RegistrationEmail, { previewData } from "../examples/emails/register.email";
import { createRegistrationEmail } from "../examples/notifications/registration-created.notification";
import { email, renderPreview, type EmailData, type EmailInput } from "../src";

export async function checkTemplateTypes() {
  const registration = createRegistrationEmail({ loadRegistration: async () => null });
  const input: EmailInput<typeof registration> = { registrationId: "registration-123" };
  await registration.render(input);
  registration.renderPreview(previewData);
  renderPreview(RegistrationEmail, previewData);
  // @ts-expect-error Preview takes display props, not mapper inputs.
  registration.renderPreview(input);
  // @ts-expect-error Preview cannot render without a props object.
  registration.renderPreview();
  // @ts-expect-error Standalone preview enforces required component props.
  renderPreview(RegistrationEmail, { firstName: "Ada" });
  // @ts-expect-error Standalone preview retains prop value types.
  renderPreview(RegistrationEmail, { ...previewData, firstName: 42 });

  // @ts-expect-error The mapper requires a registration ID.
  await registration.render({});
  // @ts-expect-error The caller passes mapper inputs, not template props.
  await registration.render({ firstName: "Ada", verificationUrl: "https://example.com" });
  // @ts-expect-error The mapper's registrationId parameter must be a string.
  await registration.render({ registrationId: 42 });
  // @ts-expect-error Required mapper inputs cannot be omitted.
  await registration.render();
  // @ts-expect-error The React view requires a verification URL.
  const missingProps = <RegistrationEmail firstName="Ada" />;
  void missingProps;

  const reusable = email({
    id: "type-example",
    name: "Type example",
    template: RegistrationEmail,
    mapToSend: async ({ count }: { count: number }) => ({
      data: { firstName: count.toFixed(0), verificationUrl: "https://example.com" },
      sendOptions: { subject: "Hello", to: "ada@example.com", branding: "Locus" },
      text: "Hello",
    }),
  });
  const raw: EmailInput<typeof reusable> = { count: 3 };
  await reusable.render(raw);
  // @ts-expect-error Input types come from the mapper's signature.
  await reusable.render({ count: "3" });
  const prepared = await reusable.prepare(raw);
  if (prepared) {
    const data: EmailData<typeof reusable> = prepared.data;
    data.firstName.toUpperCase();
    prepared.sendOptions.branding.toUpperCase();
  }

  email({
    ...reusable,
    // @ts-expect-error Mapper must provide all required template props.
    mapToSend: () => ({ data: { firstName: "Ada" }, sendOptions: { subject: "Hi" }, text: "Hi" }),
  });
  email({
    ...reusable,
    // @ts-expect-error Template prop types come from the referenced React view.
    mapToSend: () => ({ data: { firstName: 42, verificationUrl: "https://example.com" }, sendOptions: { subject: "Hi" }, text: "Hi" }),
  });
  email({
    ...reusable,
    // @ts-expect-error Send options require a subject.
    mapToSend: () => ({ data: { firstName: "Ada", verificationUrl: "https://example.com" }, sendOptions: { to: "ada@example.com" }, text: "Hi" }),
  });
  email({
    ...reusable,
    // @ts-expect-error Fixtures belong in email files, not notification definitions.
    preview: { firstName: "Ada" },
  });
  email({
    ...reusable,
    // @ts-expect-error Templates return React elements, not HTML strings.
    template: () => "<p>Hello</p>",
  });

  const noInput = email({
    id: "no-input",
    name: "No input",
    template: RegistrationEmail,
    mapToSend: () => ({
      data: { firstName: "Ada", verificationUrl: "https://example.com" },
      sendOptions: { subject: "Hello" },
      text: "Hello",
    }),
  });
  await noInput.render();
  await noInput.prepare();
}
