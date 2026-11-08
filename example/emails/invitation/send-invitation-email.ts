import { email } from "@locus-ui/mail";
import InvitationEmail, { type InvitationEmailProps } from "./invitation.email";
import { getMailer } from "../mailer";

export type InvitationInput = InvitationEmailProps & {
  to: string;
};

export const invitation = email({
  id: "invitation",
  name: "Team invitation",
  template: InvitationEmail,
  mapToSend: ({ to, ...data }: InvitationInput) => {
    return {
      data,
      sendOptions: {
        to,
        subject: `You’re invited to ${data.organizationName}`,
      },
      text: `Hi ${data.firstName}, ${data.inviterName} has invited you to join ${data.organizationName}. Accept your invitation: ${data.invitationUrl}`,
    };
  },
});

export function sendInvitationEmail(input: InvitationInput, sender = getMailer()) {
  return sender.send(invitation, input);
}
