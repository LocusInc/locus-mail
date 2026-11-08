import { Box, Text } from "@locus-ui/components";
import { emailStyles } from "./email-styles";

export interface ResetPasswordEmailProps {
  firstName: string;
  resetUrl: string;
  expiresInMinutes: number;
  organizationName: string;
}

export const previewData = {
  firstName: "Wally",
  resetUrl: "https://example.com/reset-password?token=preview-only",
  expiresInMinutes: 30,
  organizationName: "Locus Mail",
} satisfies ResetPasswordEmailProps;

export default function ResetPasswordEmail({
  firstName,
  resetUrl,
  expiresInMinutes,
  organizationName,
}: ResetPasswordEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Reset your password</title>
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
              Reset your password
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              Hi {firstName},
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              We received a request to reset the password for your{" "}
              {organizationName} account.
            </Text>
            <Text
              mt="0"
              mb="5"
              style={{ lineHeight: 1.7, textAlign: "center" }}
            >
              <a
                href={resetUrl}
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
                Reset password
              </a>
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              This link expires in {expiresInMinutes} minutes.
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              If you did not request a password reset, you can ignore this
              email. Your password will stay the same.
            </Text>
          </Box>
        </div>
      </body>
    </html>
  );
}
