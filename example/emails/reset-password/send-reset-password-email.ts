import { email } from "@locus-ui/mail";
import ResetPasswordEmail, { type ResetPasswordEmailProps } from "./reset-password.email";
import { getMailer } from "../mailer";

export type ResetPasswordInput = ResetPasswordEmailProps & {
  to: string;
};

export const resetPassword = email({
  id: "reset-password",
  name: "Password reset",
  template: ResetPasswordEmail,
  mapToSend: ({ to, ...data }: ResetPasswordInput) => {
    return {
      data,
      sendOptions: {
        to,
        subject: "Reset your password",
      },
      text: `Hi ${data.firstName}, reset the password for your ${data.organizationName} account: ${data.resetUrl}\n\nThis link expires in ${data.expiresInMinutes} minutes. If you did not request this, you can ignore this email.`,
    };
  },
});

export function sendResetPasswordEmail(input: ResetPasswordInput, sender = getMailer()) {
  return sender.send(resetPassword, input);
}
