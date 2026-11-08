import { email } from "@locus-ui/mail";
import ReceiptEmail, { type ReceiptEmailProps } from "./receipt.email";
import { getMailer } from "../mailer";

export type ReceiptInput = ReceiptEmailProps & {
  to: string;
};

export const receipt = email({
  id: "receipt",
  name: "Purchase receipt",
  template: ReceiptEmail,
  mapToSend: ({ to, ...data }: ReceiptInput) => {
    return {
      data,
      sendOptions: {
        to,
        subject: `Your receipt for order ${data.orderNumber}`,
      },
      text: `Thanks for your purchase, ${data.firstName}!\n\nOrder ${data.orderNumber}\n${data.items.map((item) => `${item.name}: ${item.amount}`).join("\n")}\nTotal: ${data.total}\n\nView receipt: ${data.receiptUrl}`,
    };
  },
});

export function sendReceiptEmail(input: ReceiptInput, sender = getMailer()) {
  return sender.send(receipt, input);
}
