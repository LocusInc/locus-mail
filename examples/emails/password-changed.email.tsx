import { Box, Text } from "@locus-ui/components";
import { emailStyles } from "./email-styles";

export interface PasswordChangedEmailProps {
  firstName: string;
  changedAt: string;
  supportUrl: string;
}

export const previewData = {
  firstName: "Wally",
  changedAt: "November 7, 2026 at 10:30 AM EST",
  supportUrl: "https://example.com/support/account-security",
} satisfies PasswordChangedEmailProps;

export default function PasswordChangedEmail({
  firstName,
  changedAt,
  supportUrl,
}: PasswordChangedEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your password has changed</title>
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
              Your password has changed
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              Hi {firstName}, your password was updated on {changedAt}.
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              If you made this change, there’s nothing else you need to do.
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              If this wasn’t you, contact support to secure your account.
            </Text>
            <Text
              mt="0"
              mb="5"
              style={{ lineHeight: 1.7, textAlign: "center" }}
            >
              <a
                href={supportUrl}
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
                Contact support
              </a>
            </Text>
          </Box>
        </div>
      </body>
    </html>
  );
}
