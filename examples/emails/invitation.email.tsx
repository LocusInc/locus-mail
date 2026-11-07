import { Box, Text } from "@locus-ui/components";
import { emailStyles } from "./email-styles";

export interface InvitationEmailProps {
  firstName: string;
  inviterName: string;
  organizationName: string;
  invitationUrl: string;
}

export const previewData = {
  firstName: "Wally",
  inviterName: "Alex",
  organizationName: "Locus",
  invitationUrl: "https://example.com/invitation?token=preview-only",
} satisfies InvitationEmailProps;

export default function InvitationEmail({
  firstName,
  inviterName,
  organizationName,
  invitationUrl,
}: InvitationEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>You’re invited</title>
        <style>{emailStyles}</style>
      </head>
      <body>
        <div className="example-email-content">
          <Box
            mx="auto"
            px="8"
            py="8"
            style={{ maxWidth: 600, fontFamily: "Arial, sans-serif" }}
          >
            <Text as="h1" size="xl" weight="bold" mt="0" mb="6">
              You’re invited to {organizationName}
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              Hi {firstName}, {inviterName} has invited you to join their team.
            </Text>
            <Text
              mt="0"
              mb="5"
              style={{ lineHeight: 1.7, textAlign: "center" }}
            >
              <a
                href={invitationUrl}
                style={{
                  display: "inline-block",
                  backgroundColor: "#fc7f0a",
                  color: "#171717",
                  padding: "12px 20px",
                  borderRadius: 6,
                  textDecoration: "none",
                  fontWeight: 700,
                }}
              >
                Accept invitation
              </a>
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              If you weren’t expecting this invitation, you can ignore this
              email.
            </Text>
          </Box>
        </div>
      </body>
    </html>
  );
}
