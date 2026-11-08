import { email, z } from "../../../src";
import RegistrationEmail from "../emails/register.email";

// The application owns data collection and validation; the React view only
// declares the props it displays. This also checks values loaded from storage.
const registrationDataSchema = z.strictObject({
  firstName: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[^\r\n]*$/),
  verificationUrl: z.url({ protocol: /^https?$/ }),
  organizationName: z.string().trim().min(1).max(100).optional(),
  recipientEmail: z.email(),
});

export type RegistrationData = z.input<typeof registrationDataSchema>;

export interface RegistrationEmailDependencies {
  /** Return null when the registration no longer needs an email. */
  loadRegistration: (
    registrationId: string,
  ) => Promise<RegistrationData | null>;
}

export function createRegistrationEmail({
  loadRegistration,
}: RegistrationEmailDependencies) {
  return email({
    id: "register",
    name: "Registration confirmation",
    template: RegistrationEmail,
    mapToSend: async ({ registrationId }: { registrationId: string }) => {
      // These requirements belong to this notification, not to Locus Mail.
      if (typeof registrationId !== "string" || !registrationId.trim()) {
        throw new Error("A registration ID is required.");
      }

      const registration = await loadRegistration(registrationId);

      if (registration === null) {
        return null;
      }

      const { recipientEmail, ...data } =
        registrationDataSchema.parse(registration);

      return {
        data,
        sendOptions: {
          to: recipientEmail,
          subject: `Welcome, ${data.firstName}! Confirm your registration`,
        },
        text: `Welcome, ${data.firstName}!\n\nThanks for registering${data.organizationName ? ` at ${data.organizationName}` : ""}. Confirm your email address to get started:\n${data.verificationUrl}\n\nIf you did not register, you can ignore this email.`,
      };
    },
  });
}
