import { email } from "@locus-ui/mail";
import PasswordChangedEmail, { type PasswordChangedEmailProps } from "./password-changed.email";
import { getMailer } from "../mailer";

export type PasswordChangedInput = PasswordChangedEmailProps & {
  to: string;
};

export const passwordChanged = email({
  id: "password-changed",
  name: "Password changed",
  template: PasswordChangedEmail,
  mapToSend: ({ to, ...data }: PasswordChangedInput) => {
    return {
      data,
      sendOptions: {
        to,
        subject: "Your password has changed",
      },
      text: `Hi ${data.firstName}, your password was updated on ${data.changedAt}. If this wasn’t you, contact support: ${data.supportUrl}`,
    };
  },
});

export function sendPasswordChangedEmail(input: PasswordChangedInput, sender = getMailer()) {
  return sender.send(passwordChanged, input);
}
