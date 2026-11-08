import { email } from "@locus-ui/mail";
import RegistrationEmail from "./register.email";
import { getMailer } from "../mailer";

export type RegistrationInput = {
  firstName: string;
  verificationUrl: string;
  to: string;
};

export const registration = email({
  id: "register",
  name: "Registration",
  template: RegistrationEmail,
  mapToSend: ({ firstName, verificationUrl, to }: RegistrationInput) => {
    return {
      data: {
        firstName,
        verificationUrl,
      },
      sendOptions: {
        to,
        subject: `Welcome, ${firstName}`,
      },
      text: `Welcome, ${firstName}. Confirm your registration: ${verificationUrl}`,
    };
  },
});

export function sendRegistrationEmail(input: RegistrationInput, sender = getMailer()) {
  return sender.send(registration, input);
}
