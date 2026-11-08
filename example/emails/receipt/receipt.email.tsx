import { Box, Text } from "@locus-ui/components";
import { emailStyles } from "../email-styles";

export interface ReceiptEmailProps {
  firstName: string;
  orderNumber: string;
  items: { name: string; amount: string }[];
  total: string;
  receiptUrl: string;
}

export const previewData = {
  firstName: "Wally",
  orderNumber: "DEMO-1042",
  items: [
    { name: "Monthly subscription", amount: "$24.00" },
    { name: "Tax", amount: "$3.12" },
  ],
  total: "$27.12 CAD",
  receiptUrl: "https://example.com/receipts/demo-1042",
} satisfies ReceiptEmailProps;

export default function ReceiptEmail({
  firstName,
  orderNumber,
  items,
  total,
  receiptUrl,
}: ReceiptEmailProps) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Your receipt</title>
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
              Thanks for your purchase, {firstName}!
            </Text>
            <Text mt="0" mb="5" style={{ lineHeight: 1.7 }}>
              Order {orderNumber}
            </Text>
            {items.map((item, index) => (
              <Text
                key={`${item.name}-${index}`}
                mt="0"
                mb="5"
                style={{ lineHeight: 1.7 }}
              >
                {item.name}: {item.amount}
              </Text>
            ))}
            <Text mt="0" mb="5" weight="bold" style={{ lineHeight: 1.7 }}>
              Total: {total}
            </Text>
            <Text
              mt="0"
              mb="5"
              style={{ lineHeight: 1.7, textAlign: "center" }}
            >
              <a
                href={receiptUrl}
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
                View receipt
              </a>
            </Text>
          </Box>
        </div>
      </body>
    </html>
  );
}
