import { Box, Text } from "@locus-ui/components";
import { emailStyles } from "./email-styles";

export interface RegistrationProps {
  firstName: string;
  verificationUrl: string;
  organizationName?: string;
}

export const previewData: RegistrationProps = {
  firstName: "Wally",
  verificationUrl: "https://example.com/verify/preview",
  organizationName: "Locus Mail",
};

export default function RegistrationEmail({
  firstName,
  verificationUrl,
  organizationName,
}: RegistrationProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Confirm your registration</title>
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
              Welcome, {firstName}!
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              Thanks for registering
              {organizationName ? ` at ${organizationName}` : ""}. Confirm your
              email address to get started.
            </Text>
            <Text
              mt="0"
              mb="5"
              style={{ lineHeight: 1.7, textAlign: "center" }}
            >
              <a
                href={verificationUrl}
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
                Confirm registration
              </a>
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              If you did not register, you can ignore this email.
            </Text>
          </Box>
        </div>
      </body>
    </html>
  );
}
