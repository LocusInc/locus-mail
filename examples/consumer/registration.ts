import { email, z } from "locus-mail";
import RegistrationEmail from "./emails/register.email";

const schema = z.object({
  firstName: z.string().trim().min(1),
  verificationUrl: z.url({ protocol: /^https$/ }),
  recipient: z.email(),
});

export const registration = email({
  id: "register",
  name: "Registration",
  template: RegistrationEmail,
  mapToSend: (input: z.input<typeof schema>) => {
    const { recipient, ...data } = schema.parse(input);

    return {
      data,
      sendOptions: { to: recipient, subject: `Welcome, ${data.firstName}` },
      text: `Welcome, ${data.firstName}. Confirm your registration: ${data.verificationUrl}`,
    };
  },
});
